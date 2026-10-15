const STATUSES = ['Work in Progress', 'Pending with Customer', 'KIV', 'Closed', 'Deleted'];
const ACTIVE_STATUSES = new Set(['Work in Progress', 'Pending with Customer', 'KIV']);
const CUSTOMER_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#4ADE80', '#34D399', '#2DD4BF', '#22D3EE',
  '#38BDF8', '#60A5FA', '#818CF8', '#A78BFA',
  '#C084FC', '#E879F9', '#F472B6', '#A8A29E'
];


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


export { HttpError, STATUSES, ACTIVE_STATUSES, CUSTOMER_COLORS, malaysiaNow, isFuture, toMalaysiaTimestamp, normalizeCustomerName, cleanRequiredString, cleanOptionalString, rowToTask, assertStatus, validateTaskTimes, resolveStatusEnd };
