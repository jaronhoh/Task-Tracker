'use strict';

process.env.TASK_TRACKER_DB = ':memory:';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db } = require('../server');

function resetDb() {
  db.exec('DELETE FROM tasks; DELETE FROM customers;');
  db.prepare("UPDATE app_sequence SET next_value = 1 WHERE sequence_name = 'task_id'").run();
}

async function createTask(overrides = {}) {
  const response = await request(app).post('/api/tasks').send({
    customerName: 'QA Alpha',
    taskTitle: 'QA Task',
    ...overrides
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}

test.beforeEach(() => resetDb());

test('health endpoint reports Malaysia time zone', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.match(response.body.timeZone, /UTC\+08:00/);
});

test('GET tasks returns a direct JSON array', async () => {
  const response = await request(app).get('/api/tasks');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.equal(response.body.length, 0);
});

test('POST creates Task, auto-creates Customer and assigns KIV by default', async () => {
  const task = await createTask();
  assert.equal(task.taskId, 'TSK-0001');
  assert.equal(task.status, 'KIV');
  assert.equal(task.end, null);
  assert.ok(task.created.endsWith('+08:00'));
  assert.equal(task.customerName, 'QA Alpha');
  const customers = await request(app).get('/api/customers');
  assert.equal(customers.body.length, 1);
  assert.ok(customers.body[0].color);
});

test('PATCH unknown Customer returns 400 and performs no partial update', async () => {
  const task = await createTask();
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({
    taskTitle: 'Should not save',
    customerName: 'Not a real customer'
  });
  assert.equal(response.status, 400);
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(after.body.taskTitle, 'QA Task');
  assert.equal(after.body.customerName, 'QA Alpha');
});

test('Active Task write corrects invalid non-null End to null', async () => {
  const task = await createTask();
  db.prepare('UPDATE tasks SET end = ? WHERE task_id = ?').run('2020-01-01T00:00:00+08:00', task.taskId);
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'repair' });
  assert.equal(response.status, 200);
  assert.equal(response.body.end, null);
  assert.equal(response.body.note, 'repair');
});

test('Active to Closed sets End to server Malaysia time', async () => {
  const task = await createTask();
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ status: 'Closed' });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'Closed');
  assert.ok(response.body.end);
  assert.ok(Date.parse(response.body.end) >= Date.parse(response.body.created));
});

test('DELETE is logical and can be read back', async () => {
  const task = await createTask();
  const response = await request(app).delete(`/api/tasks/${task.taskId}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'Deleted');
  assert.ok(response.body.end);
  const read = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.taskId, task.taskId);
});

test('future Created blocks Active to Closed with no partial update', async () => {
  const task = await createTask();
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
  db.prepare('UPDATE tasks SET created = ? WHERE task_id = ?').run(future, task.taskId);
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({
    status: 'Closed',
    note: 'must roll back'
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'FUTURE_CREATED');
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(after.body.status, 'KIV');
  assert.equal(after.body.end, null);
  assert.equal(after.body.note, null);
});

test('allocated Task ID is not reused after failed create', async () => {
  const failed = await request(app).post('/api/tasks').send({ customerName: 'QA Alpha' });
  assert.equal(failed.status, 400);
  const next = await createTask();
  assert.equal(next.taskId, 'TSK-0002');
});

test('Customer rename updates all Task references', async () => {
  const first = await createTask({ taskTitle: 'First' });
  const second = await createTask({ taskTitle: 'Second' });
  const response = await request(app).patch('/api/customers/QA%20Alpha').send({ name: 'QA Alpha Renamed' });
  assert.equal(response.status, 200);
  const tasks = await request(app).get('/api/tasks');
  assert.equal(tasks.body.find(t => t.taskId === first.taskId).customerName, 'QA Alpha Renamed');
  assert.equal(tasks.body.find(t => t.taskId === second.taskId).customerName, 'QA Alpha Renamed');
});

test('Customer colors are unique and only predefined colors can be assigned', async () => {
  await createTask();
  const response = await request(app).post('/api/customers').send({ name: 'QA Beta' });
  assert.equal(response.status, 201);
  assert.notEqual(response.body.color, (await request(app).get('/api/customers')).body[0].color);
  const invalid = await request(app).patch('/api/customers/QA%20Beta/color').send({ color: '#000000' });
  assert.equal(invalid.status, 400);
});

test('Edit Time saves status and End atomically and validates order', async () => {
  const task = await createTask();
  const created = task.created;
  const end = new Date(Date.parse(created) + 60 * 60 * 1000).toISOString().replace('Z', '+00:00');
  const response = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({
    created, end, status: 'Closed'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'Closed');
  assert.equal(Date.parse(response.body.end), Date.parse(end));
  const invalid = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({
    created: end, end: created, status: 'Closed'
  });
  assert.equal(invalid.status, 400);
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(Date.parse(after.body.end), Date.parse(end));
  assert.equal(after.body.created, created);
});

test('terminal status transitions refresh End and restoring Active clears End', async () => {
  const task = await createTask();
  const closed = await request(app).patch(`/api/tasks/${task.taskId}`).send({ status: 'Closed' });
  assert.equal(closed.status, 200);
  const firstEnd = closed.body.end;
  const deleted = await request(app).patch(`/api/tasks/${task.taskId}`).send({ status: 'Deleted' });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.status, 'Deleted');
  assert.ok(Date.parse(deleted.body.end) >= Date.parse(firstEnd));
  const reopened = await request(app).patch(`/api/tasks/${task.taskId}`).send({ status: 'Work in Progress' });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.end, null);
});

test('POST can create terminal Task and generates End on server', async () => {
  const task = await createTask({ status: 'Closed' });
  assert.equal(task.status, 'Closed');
  assert.ok(task.end);
  assert.ok(Date.parse(task.end) >= Date.parse(task.created));
});

test('PATCH omitted optional fields preserves values; null and empty string clear them', async () => {
  const task = await createTask({ taskDescription: 'Keep this', note: 'Keep note' });
  const unchanged = await request(app).patch(`/api/tasks/${task.taskId}`).send({ taskTitle: 'Updated title' });
  assert.equal(unchanged.body.taskDescription, 'Keep this');
  assert.equal(unchanged.body.note, 'Keep note');
  const cleared = await request(app).patch(`/api/tasks/${task.taskId}`).send({ taskDescription: null, note: '' });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.taskDescription, null);
  assert.equal(cleared.body.note, null);
});

test('required fields and maximum lengths are validated', async () => {
  const missing = await request(app).post('/api/tasks').send({ customerName: 'QA Alpha' });
  assert.equal(missing.status, 400);
  const longTitle = await request(app).post('/api/tasks').send({
    customerName: 'QA Alpha', taskTitle: 'x'.repeat(101)
  });
  assert.equal(longTitle.status, 400);
  const task = await createTask();
  const longNote = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'x'.repeat(1001) });
  assert.equal(longNote.status, 400);
});

test('Customer matching trims spaces and ignores case on Task creation', async () => {
  await request(app).post('/api/customers').send({ name: 'QA Alpha' }).expect(201);
  const task = await createTask({ customerName: '  qA aLpHa  ' });
  assert.equal(task.customerName, 'QA Alpha');
  assert.equal((await request(app).get('/api/customers')).body.length, 1);
});

test('Customer color pool permits 16 unique colors and rejects the 17th', async () => {
  const { CUSTOMER_COLORS } = require('../server');
  for (let i = 0; i < CUSTOMER_COLORS.length; i += 1) {
    const response = await request(app).post('/api/customers').send({ name: `Customer ${i + 1}` });
    assert.equal(response.status, 201);
  }
  const overflow = await request(app).post('/api/customers').send({ name: 'Customer 17' });
  assert.equal(overflow.status, 400);
  assert.equal(overflow.body.error.code, 'CUSTOMER_COLORS_EXHAUSTED');
  assert.equal((await request(app).get('/api/customers')).body.length, 16);
});

test('Edit Time rejects future Created terminal transition without partial writes', async () => {
  const task = await createTask();
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
  const response = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({
    created: future, status: 'Closed', end: new Date().toISOString()
  });
  assert.equal(response.status, 400);
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(after.body.status, 'KIV');
  assert.equal(after.body.end, null);
  assert.equal(after.body.created, task.created);
});


test('Edit Time restoring terminal Task to Active clears End automatically', async () => {
  const task = await createTask({ status: 'Closed' });
  assert.ok(task.end);
  const response = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({ status: 'KIV' });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'KIV');
  assert.equal(response.body.end, null);
});


test('concurrent Task creation allocates unique permanent IDs', async () => {
  const responses = await Promise.all(Array.from({ length: 20 }, (_, index) =>
    request(app).post('/api/tasks').send({ customerName: 'QA Alpha', taskTitle: `Concurrent ${index}` })
  ));
  assert.ok(responses.every(response => response.status === 201));
  const ids = responses.map(response => response.body.taskId);
  assert.equal(new Set(ids).size, 20);
  const sorted = ids.slice().sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
  assert.deepEqual(sorted, Array.from({ length: 20 }, (_, index) => `TSK-${String(index + 1).padStart(4, '0')}`));
});

test('concurrent case-insensitive Customer creation allows only one canonical Customer', async () => {
  const responses = await Promise.all([
    request(app).post('/api/customers').send({ name: 'QA Race Customer' }),
    request(app).post('/api/customers').send({ name: ' qa race customer ' })
  ]);
  assert.equal(responses.filter(response => response.status === 201).length, 1);
  assert.equal(responses.filter(response => response.status === 400).length, 1);
  const customers = await request(app).get('/api/customers');
  assert.equal(customers.body.length, 1);
});

test('Customer rename rolls back when linked Task update fails', async () => {
  const task = await createTask();
  db.exec(`
    CREATE TRIGGER fail_task_customer_rename
    BEFORE UPDATE OF customer_name ON tasks
    WHEN NEW.customer_name = 'QA Alpha Renamed'
    BEGIN
      SELECT RAISE(ABORT, 'injected rename failure');
    END;
  `);
  try {
    const response = await request(app).patch('/api/customers/QA%20Alpha').send({ name: 'QA Alpha Renamed' });
    assert.equal(response.status, 500);
    const customers = await request(app).get('/api/customers');
    assert.equal(customers.body.length, 1);
    assert.equal(customers.body[0].name, 'QA Alpha');
    const after = await request(app).get(`/api/tasks/${task.taskId}`);
    assert.equal(after.body.customerName, 'QA Alpha');
  } finally {
    db.exec('DROP TRIGGER IF EXISTS fail_task_customer_rename');
  }
});

test('concurrent PATCH operations preserve both independent field changes', async () => {
  const task = await createTask();
  const responses = await Promise.all([
    request(app).patch(`/api/tasks/${task.taskId}`).send({ taskTitle: 'Concurrent title' }),
    request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'Concurrent note' })
  ]);
  assert.ok(responses.every(response => response.status === 200));
  const final = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(final.body.taskTitle, 'Concurrent title');
  assert.equal(final.body.note, 'Concurrent note');
});


test('invalid JSON returns HTTP 400 instead of an internal server error', async () => {
  const response = await request(app).post('/api/tasks')
    .set('Content-Type', 'application/json')
    .send('{ invalid');
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
});

test('empty JSON body returns validation error instead of HTTP 500', async () => {
  const response = await request(app).post('/api/tasks').send({});
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});


test('Task creation rolls back auto-created Customer when Task insert fails', async () => {
  db.exec(`
    CREATE TRIGGER fail_task_insert
    BEFORE INSERT ON tasks
    WHEN NEW.task_title = 'Injected Failure'
    BEGIN
      SELECT RAISE(ABORT, 'injected task insert failure');
    END;
  `);
  try {
    const failed = await request(app).post('/api/tasks').send({
      customerName: 'QA Atomic Customer', taskTitle: 'Injected Failure'
    });
    assert.equal(failed.status, 500);
    assert.deepEqual((await request(app).get('/api/customers')).body, []);
    const next = await createTask({ customerName: 'QA Alpha' });
    assert.equal(next.taskId, 'TSK-0002');
  } finally {
    db.exec('DROP TRIGGER IF EXISTS fail_task_insert');
  }
});

test('Customer rename collision is rejected without changing linked Tasks', async () => {
  const first = await createTask({ customerName: 'QA Alpha' });
  await request(app).post('/api/customers').send({ name: 'QA Beta' }).expect(201);
  const response = await request(app).patch('/api/customers/QA%20Alpha').send({ name: ' qa beta ' });
  assert.equal(response.status, 400);
  const after = await request(app).get(`/api/tasks/${first.taskId}`);
  assert.equal(after.body.customerName, 'QA Alpha');
  const customers = await request(app).get('/api/customers');
  assert.deepEqual(customers.body.map(customer => customer.name).sort(), ['QA Alpha', 'QA Beta']);
});

test('DELETE rejects future Created and preserves the entire Task', async () => {
  const task = await createTask();
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
  db.prepare('UPDATE tasks SET created = ? WHERE task_id = ?').run(future, task.taskId);
  const response = await request(app).delete(`/api/tasks/${task.taskId}`);
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'FUTURE_CREATED');
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(after.body.status, 'KIV');
  assert.equal(after.body.end, null);
  assert.equal(after.body.created, future);
});

test('Edit Time rejects Created later than existing End without partial update', async () => {
  const task = await createTask({ status: 'Closed' });
  const laterCreated = new Date(Date.parse(task.end) + 60_000).toISOString().replace('Z', '+00:00');
  const response = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({ created: laterCreated });
  assert.equal(response.status, 400);
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(after.body.created, task.created);
  assert.equal(after.body.end, task.end);
  assert.equal(after.body.status, 'Closed');
});


test('Edit Time canonicalizes UTC input to Malaysia UTC+8 without changing the instant', async () => {
  const task = await createTask();
  const endUtc = new Date(Date.parse(task.created) + 60_000).toISOString();
  const response = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({
    end: endUtc, status: 'Closed'
  });
  assert.equal(response.status, 200);
  assert.ok(response.body.created.endsWith('+08:00'));
  assert.ok(response.body.end.endsWith('+08:00'));
  assert.equal(Date.parse(response.body.end), Date.parse(endUtc));
});


// P0 execution batch 1: D019/D013 End consistency and atomicity.
test('P0-001 PASS: Active KIV with invalid End is repaired on a valid write', async () => {
  const task = await createTask({ status: 'KIV' });
  const invalidEnd = '2020-01-01T00:00:00+08:00';
  db.prepare('UPDATE tasks SET end = ? WHERE task_id = ?').run(invalidEnd, task.taskId);
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'P0-001 repair' });
  assert.equal(response.status, 200);
  assert.equal(response.body.end, null);
  assert.equal(response.body.status, 'KIV');
  assert.equal(response.body.taskId, task.taskId);
  assert.equal(response.body.note, 'P0-001 repair');
  const stored = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(task.taskId);
  assert.equal(stored.end, null);
  assert.equal(stored.note, 'P0-001 repair');
});

test('P0-002 PASS: all three Active statuses clear invalid End on write', async () => {
  for (const status of ['Work in Progress', 'Pending with Customer', 'KIV']) {
    const task = await createTask({ status, taskTitle: `P0-002 ${status}` });
    db.prepare('UPDATE tasks SET end = ? WHERE task_id = ?').run('2020-01-01T00:00:00+08:00', task.taskId);
    const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: `checked ${status}` });
    assert.equal(response.status, 200, status);
    assert.equal(response.body.status, status);
    assert.equal(response.body.end, null);
    assert.equal(db.prepare('SELECT end FROM tasks WHERE task_id = ?').get(task.taskId).end, null);
  }
});

test('P0-003 PASS: Closed with NULL End is repaired using current Malaysia time', async () => {
  const task = await createTask({ status: 'Closed' });
  db.prepare('UPDATE tasks SET end = NULL WHERE task_id = ?').run(task.taskId);
  const before = Date.now();
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'P0-003 repair' });
  const after = Date.now();
  assert.equal(response.status, 200);
  assert.ok(response.body.end);
  assert.ok(Date.parse(response.body.end) >= Date.parse(task.created));
  assert.ok(Date.parse(response.body.end) >= before - 1000 && Date.parse(response.body.end) <= after + 1000);
  assert.ok(response.body.end.endsWith('+08:00'));
  assert.equal(db.prepare('SELECT end FROM tasks WHERE task_id = ?').get(task.taskId).end, response.body.end);
});

test('P0-004 PASS: Deleted with NULL End is repaired without physical deletion', async () => {
  const task = await createTask({ status: 'Deleted' });
  db.prepare('UPDATE tasks SET end = NULL WHERE task_id = ?').run(task.taskId);
  const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'P0-004 repair' });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'Deleted');
  assert.equal(response.body.taskId, task.taskId);
  assert.ok(response.body.end);
  assert.ok(response.body.end.endsWith('+08:00'));
  assert.ok(db.prepare('SELECT 1 FROM tasks WHERE task_id = ?').get(task.taskId));
});

test('P0-005 PASS: future Created rejects repair of Closed/Deleted NULL End without partial writes', async () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
  for (const status of ['Closed', 'Deleted']) {
    const task = await createTask({ status, taskTitle: `P0-005 ${status}` });
    db.prepare('UPDATE tasks SET created = ?, end = NULL, note = ? WHERE task_id = ?').run(future, 'original note', task.taskId);
    const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'must not persist' });
    assert.equal(response.status, 400, status);
    assert.equal(response.body.error.code, 'FUTURE_CREATED');
    const stored = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(task.taskId);
    assert.equal(stored.status, status);
    assert.equal(stored.end, null);
    assert.equal(stored.created, future);
    assert.equal(stored.note, 'original note');
  }
});

test('P0-006 PASS: future Created blocks Active to Closed and Active to Deleted', async () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
  for (const targetStatus of ['Closed', 'Deleted']) {
    const task = await createTask({ taskTitle: `P0-006 to ${targetStatus}` });
    db.prepare('UPDATE tasks SET created = ? WHERE task_id = ?').run(future, task.taskId);
    const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ status: targetStatus });
    assert.equal(response.status, 400, targetStatus);
    assert.equal(response.body.error.code, 'FUTURE_CREATED');
    const stored = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(task.taskId);
    assert.equal(stored.status, 'KIV');
    assert.equal(stored.end, null);
    assert.equal(stored.created, future);
  }
});

test('P0-007 PASS: database failure after End repair calculation rolls back all Task fields', async () => {
  const task = await createTask({ status: 'Closed' });
  db.prepare('UPDATE tasks SET end = NULL WHERE task_id = ?').run(task.taskId);
  const before = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(task.taskId);
  db.exec(`
    CREATE TRIGGER p0_007_force_update_failure
    BEFORE UPDATE ON tasks
    WHEN NEW.task_id = '${task.taskId}'
    BEGIN
      SELECT RAISE(ABORT, 'P0-007 injected failure');
    END;
  `);
  try {
    const response = await request(app).patch(`/api/tasks/${task.taskId}`).send({ note: 'must roll back' });
    assert.equal(response.status, 500);
    const after = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(task.taskId);
    assert.deepEqual(after, before);
  } finally {
    db.exec('DROP TRIGGER IF EXISTS p0_007_force_update_failure');
  }
});
