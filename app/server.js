'use strict';

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.TASK_TRACKER_DB || path.join(__dirname, 'data', 'task-tracker.sqlite');
const STATUSES = ['Work in Progress', 'Pending with Customer', 'KIV', 'Closed', 'Deleted'];
const ACTIVE_STATUSES = new Set(['Work in Progress', 'Pending with Customer', 'KIV']);
const CUSTOMER_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#4ADE80', '#34D399', '#2DD4BF', '#22D3EE',
  '#38BDF8', '#60A5FA', '#818CF8', '#A78BFA',
  '#C084FC', '#E879F9', '#F472B6', '#A8A29E'
];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_sequence (
    sequence_name TEXT PRIMARY KEY,
    next_value INTEGER NOT NULL CHECK (next_value >= 1)
  );
  INSERT OR IGNORE INTO app_sequence(sequence_name, next_value) VALUES ('task_id', 1);

  CREATE TABLE IF NOT EXISTS customers (
    name TEXT PRIMARY KEY,
    normalized_name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    task_title TEXT NOT NULL CHECK (length(task_title) BETWEEN 1 AND 100),
    task_description TEXT,
    note TEXT,
    created TEXT NOT NULL,
    end TEXT,
    status TEXT NOT NULL CHECK (status IN ('Work in Progress', 'Pending with Customer', 'KIV', 'Closed', 'Deleted'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_name, task_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created);
`);

const app = express();
app.disable('x-powered-by');
// Test-only request arrival trace used to prove P0 same-Task write ordering.
app.locals.p0RequestTrace = [];
app.use((req, _res, next) => {
  if (process.env.TASK_TRACKER_TEST_TRACE === '1' && req.get('x-p0-request-id')) {
    app.locals.p0RequestTrace.push({
      requestId: req.get('x-p0-request-id'),
      method: req.method,
      path: req.originalUrl,
      receivedAt: Date.now(),
      sequence: app.locals.p0RequestTrace.length + 1
    });
  }
  next();
});
// Serialize writes to the same Task in HTTP arrival order, including PATCH /time and DELETE.
const taskWriteTails = new Map();
app.use((req, res, next) => {
  if (!['PATCH', 'DELETE'].includes(req.method)) return next();
  const match = req.path.match(/^\/api\/tasks\/([^/]+)(?:\/time)?$/);
  if (!match) return next();
  let taskId;
  try { taskId = decodeURIComponent(match[1]); } catch { return next(); }
  const previous = taskWriteTails.get(taskId) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const tail = previous.then(() => current);
  taskWriteTails.set(taskId, tail);
  previous.then(() => {
    const finish = () => {
      release();
      if (taskWriteTails.get(taskId) === tail) taskWriteTails.delete(taskId);
    };
    res.once('finish', finish);
    res.once('close', finish);
    next();
  }).catch(next);
});
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  if (req.body === undefined || req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});
// Vite builds the React UI here. API handlers and SQLite remain unchanged.
app.use(express.static(path.join(__dirname, 'dist')));

class HttpError extends Error {
  constructor(status, message, code = 'VALIDATION_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function malaysiaNow() {
  // ISO-8601 local wall time with explicit Malaysia UTC+08:00 offset.
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
}

function isFuture(value, now = malaysiaNow()) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > Date.parse(now);
}

function toMalaysiaTimestamp(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new HttpError(400, 'Date/time must be valid.');
  return new Date(parsed + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
}

function normalizeCustomerName(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-US');
}

function cleanRequiredString(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${label} is required.`);
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength) {
    throw new HttpError(400, `${label} must not exceed ${maxLength} characters.`);
  }
  return cleaned;
}

function cleanOptionalString(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be a string or null.`);
  if (value.length > maxLength) throw new HttpError(400, `${label} must not exceed ${maxLength} characters.`);
  return value;
}

function rowToTask(row) {
  return {
    taskId: row.task_id,
    customerName: row.customer_name,
    taskTitle: row.task_title,
    taskDescription: row.task_description,
    note: row.note,
    created: row.created,
    end: row.end,
    status: row.status
  };
}

function getTask(taskId) {
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
  if (!row) throw new HttpError(404, `Task ${taskId} was not found.`, 'TASK_NOT_FOUND');
  return row;
}

function getCustomer(name) {
  return db.prepare('SELECT * FROM customers WHERE normalized_name = ?').get(normalizeCustomerName(name));
}

function nextTaskId() {
  // Deliberately commit ID allocation before creating the Task. A later failure
  // may leave a gap, but an allocated ID can never be reused after rollback.
  const allocate = db.transaction(() => {
    const row = db.prepare("SELECT next_value FROM app_sequence WHERE sequence_name = 'task_id'").get();
    const allocated = row.next_value;
    db.prepare("UPDATE app_sequence SET next_value = ? WHERE sequence_name = 'task_id'").run(allocated + 1);
    return `TSK-${String(allocated).padStart(4, '0')}`;
  });
  return allocate();
}

function availableColor() {
  const used = new Set(db.prepare('SELECT color FROM customers').all().map(row => row.color.toUpperCase()));
  return CUSTOMER_COLORS.find(color => !used.has(color.toUpperCase()));
}

function createCustomerInTransaction(name) {
  const cleaned = cleanRequiredString(name, 'Customer Name', 100);
  const normalized = normalizeCustomerName(cleaned);
  const existing = db.prepare('SELECT * FROM customers WHERE normalized_name = ?').get(normalized);
  if (existing) throw new HttpError(400, 'Customer Name already exists.', 'CUSTOMER_EXISTS');
  const color = availableColor();
  if (!color) throw new HttpError(400, 'All 16 Customer colors are in use.', 'CUSTOMER_COLORS_EXHAUSTED');
  db.prepare('INSERT INTO customers(name, normalized_name, color) VALUES (?, ?, ?)').run(cleaned, normalized, color);
  return { name: cleaned, normalizedName: normalized, color };
}

function assertStatus(status) {
  if (!STATUSES.includes(status)) {
    throw new HttpError(400, `Status must be one of: ${STATUSES.join(', ')}.`);
  }
}

function validateTaskTimes(created, end) {
  if (end !== null && Date.parse(end) < Date.parse(created)) {
    throw new HttpError(400, 'End must be greater than or equal to Created.');
  }
}

function resolveStatusEnd(status, created, existingEnd, statusChanged) {
  const now = malaysiaNow();
  if (ACTIVE_STATUSES.has(status)) return null;
  if (statusChanged || existingEnd === null) {
    if (isFuture(created, now)) {
      throw new HttpError(400, 'Cannot generate End because Created is later than current Malaysia Time (UTC+08:00).', 'FUTURE_CREATED');
    }
    return now;
  }
  return existingEnd;
}

function createTask(body) {
  const taskId = nextTaskId();
  const now = malaysiaNow();
  const customerName = cleanRequiredString(body.customerName, 'Customer Name', 100);
  const taskTitle = cleanRequiredString(body.taskTitle, 'Task Title', 100);
  const taskDescription = cleanOptionalString(body.taskDescription, 'Task Description', 255);
  const note = cleanOptionalString(body.note, 'Note', 1000);
  const status = body.status ?? 'KIV';
  assertStatus(status);
  const created = now;
  const end = resolveStatusEnd(status, created, null, status === 'Closed' || status === 'Deleted');

  const create = db.transaction(() => {
    let customer = getCustomer(customerName);
    if (!customer) customer = createCustomerInTransaction(customerName);
    db.prepare(`
      INSERT INTO tasks(task_id, customer_name, task_title, task_description, note, created, end, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(taskId, customer.name, taskTitle, taskDescription, note, created, end, status);
    return rowToTask(getTask(taskId));
  });
  return create();
}

function patchTask(taskId, body) {
  const existing = getTask(taskId);
  for (const forbidden of ['taskId', 'created', 'end']) {
    if (Object.prototype.hasOwnProperty.call(body, forbidden)) {
      throw new HttpError(400, `${forbidden} cannot be changed through the normal Task PATCH endpoint.`);
    }
  }

  const patch = db.transaction(() => {
    const current = getTask(taskId);
    let customerName = current.customer_name;
    if (Object.prototype.hasOwnProperty.call(body, 'customerName')) {
      const requested = cleanRequiredString(body.customerName, 'Customer Name', 100);
      const customer = getCustomer(requested);
      if (!customer) throw new HttpError(400, 'Customer Name must match an existing Customer.', 'UNKNOWN_CUSTOMER');
      customerName = customer.name;
    }

    const taskTitle = Object.prototype.hasOwnProperty.call(body, 'taskTitle')
      ? cleanRequiredString(body.taskTitle, 'Task Title', 100) : current.task_title;
    const taskDescription = Object.prototype.hasOwnProperty.call(body, 'taskDescription')
      ? cleanOptionalString(body.taskDescription, 'Task Description', 255) : current.task_description;
    const note = Object.prototype.hasOwnProperty.call(body, 'note')
      ? cleanOptionalString(body.note, 'Note', 1000) : current.note;
    const status = Object.prototype.hasOwnProperty.call(body, 'status') ? body.status : current.status;
    assertStatus(status);

    const statusChanged = status !== current.status;
    // Enforce consistency on every server-side write, not only status changes.
    const end = resolveStatusEnd(status, current.created, current.end, statusChanged);
    validateTaskTimes(current.created, end);

    db.prepare(`
      UPDATE tasks
      SET customer_name = ?, task_title = ?, task_description = ?, note = ?, status = ?, end = ?
      WHERE task_id = ?
    `).run(customerName, taskTitle, taskDescription, note, status, end, taskId);
    return rowToTask(getTask(taskId));
  });
  return patch();
}

function editTaskTime(taskId, body) {
  const allowed = new Set(['created', 'end', 'status']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw new HttpError(400, `Field ${key} is not supported by Edit Time.`);
  }

  const edit = db.transaction(() => {
    const current = getTask(taskId);
    let created = Object.prototype.hasOwnProperty.call(body, 'created') ? body.created : current.created;
    let end = Object.prototype.hasOwnProperty.call(body, 'end') ? body.end : current.end;
    const status = Object.prototype.hasOwnProperty.call(body, 'status') ? body.status : current.status;
    if (typeof created !== 'string' || !Number.isFinite(Date.parse(created))) {
      throw new HttpError(400, 'Created must be a valid date/time string.');
    }
    if (end !== null && (typeof end !== 'string' || !Number.isFinite(Date.parse(end)))) {
      throw new HttpError(400, 'End must be a valid date/time string or null.');
    }
    assertStatus(status);
    created = toMalaysiaTimestamp(created);
    if (end !== null) end = toMalaysiaTimestamp(end);

    if (status !== current.status && !ACTIVE_STATUSES.has(status) && isFuture(created)) {
      throw new HttpError(400, 'Cannot close or delete Task because Created is later than current Malaysia Time (UTC+08:00).', 'FUTURE_CREATED');
    }
    if (ACTIVE_STATUSES.has(status) && !ACTIVE_STATUSES.has(current.status)) {
      // Restoring a Closed/Deleted Task to Active always clears End.
      end = null;
    } else if (ACTIVE_STATUSES.has(status) && end !== null) {
      throw new HttpError(400, 'An Active Task cannot be saved with End. Choose Closed or Deleted in the Edit Time confirmation flow.');
    }
    if (!ACTIVE_STATUSES.has(status) && end === null) {
      throw new HttpError(400, 'Closed and Deleted Tasks require End.');
    }
    validateTaskTimes(created, end);

    // Created edits must not invalidate an existing End. Status + End are saved
    // atomically for the special Active -> Closed/Deleted flow.
    db.prepare('UPDATE tasks SET created = ?, end = ?, status = ? WHERE task_id = ?')
      .run(created, end, status, taskId);
    return rowToTask(getTask(taskId));
  });
  return edit();
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timeZone: 'Malaysia Time (UTC+08:00)' }));

app.get('/api/customers', (_req, res) => {
  const customers = db.prepare('SELECT name, color FROM customers ORDER BY name COLLATE NOCASE ASC').all();
  res.json(customers);
});

app.post('/api/customers', (req, res, next) => {
  try {
    const customer = db.transaction(() => createCustomerInTransaction(req.body.name))();
    res.status(201).json(customer);
  } catch (error) { next(error); }
});

app.patch('/api/customers/:customerName', (req, res, next) => {
  try {
    const oldName = req.params.customerName;
    const newName = cleanRequiredString(req.body.name, 'Customer Name', 100);
    const customer = db.transaction(() => {
      const current = getCustomer(oldName);
      if (!current) throw new HttpError(404, 'Customer was not found.', 'CUSTOMER_NOT_FOUND');
      const normalized = normalizeCustomerName(newName);
      const collision = db.prepare('SELECT name FROM customers WHERE normalized_name = ? AND normalized_name <> ?')
        .get(normalized, current.normalized_name);
      if (collision) throw new HttpError(400, 'Customer Name already exists.', 'CUSTOMER_EXISTS');
      db.prepare('UPDATE customers SET name = ?, normalized_name = ? WHERE normalized_name = ?')
        .run(newName, normalized, current.normalized_name);
      db.prepare('UPDATE tasks SET customer_name = ? WHERE customer_name = ?').run(newName, current.name);
      return db.prepare('SELECT name, color FROM customers WHERE normalized_name = ?').get(normalized);
    });
    res.json(customer());
  } catch (error) { next(error); }
});

app.patch('/api/customers/:customerName/color', (req, res, next) => {
  try {
    const oldName = decodeURIComponent(req.params.customerName);
    const color = String(req.body.color ?? '').toUpperCase();
    if (!CUSTOMER_COLORS.includes(color)) throw new HttpError(400, 'Color must be one of the 16 predefined colors.');
    const update = db.transaction(() => {
      const customer = getCustomer(oldName);
      if (!customer) throw new HttpError(404, 'Customer was not found.', 'CUSTOMER_NOT_FOUND');
      const used = db.prepare('SELECT name FROM customers WHERE color = ? AND normalized_name <> ?').get(color, customer.normalized_name);
      if (used) throw new HttpError(400, 'Color is already assigned to another Customer.', 'CUSTOMER_COLOR_EXISTS');
      db.prepare('UPDATE customers SET color = ? WHERE normalized_name = ?').run(color, customer.normalized_name);
      return db.prepare('SELECT name, color FROM customers WHERE normalized_name = ?').get(customer.normalized_name);
    });
    res.json(update());
  } catch (error) { next(error); }
});

app.get('/api/tasks', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY task_id ASC').all();
  res.json(rows.map(rowToTask));
});

app.post('/api/tasks', (req, res, next) => {
  try { res.status(201).json(createTask(req.body)); }
  catch (error) { next(error); }
});

app.get('/api/tasks/:taskId', (req, res, next) => {
  try { res.json(rowToTask(getTask(req.params.taskId))); }
  catch (error) { next(error); }
});

app.patch('/api/tasks/:taskId/time', (req, res, next) => {
  try { res.json(editTaskTime(req.params.taskId, req.body)); }
  catch (error) { next(error); }
});

app.patch('/api/tasks/:taskId', (req, res, next) => {
  try { res.json(patchTask(req.params.taskId, req.body)); }
  catch (error) { next(error); }
});

app.delete('/api/tasks/:taskId', (req, res, next) => {
  try {
    const task = db.transaction(() => {
      const current = getTask(req.params.taskId);
      if (current.status === 'Deleted') throw new HttpError(400, 'Task is already Deleted.', 'ALREADY_DELETED');
      const now = malaysiaNow();
      if (isFuture(current.created, now)) {
        throw new HttpError(400, 'Cannot delete Task because Created is later than current Malaysia Time (UTC+08:00).', 'FUTURE_CREATED');
      }
      db.prepare("UPDATE tasks SET status = 'Deleted', end = ? WHERE task_id = ?").run(now, current.task_id);
      return rowToTask(getTask(current.task_id));
    })();
    res.json(task);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' } });
  }
  if (error && error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body must not exceed 1 MB.' } });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(400).json({ error: { code: 'UNIQUE_CONSTRAINT', message: 'A unique value is already in use.' } });
  }
  console.error(error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
});

if (require.main === module) {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => console.log(`Task Tracker listening on ${HOST}:${PORT}`));
}

module.exports = { app, db, malaysiaNow, CUSTOMER_COLORS, STATUSES, nextTaskId };

