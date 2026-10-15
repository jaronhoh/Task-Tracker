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
  assert.equal(response.body.end, end);
  const invalid = await request(app).patch(`/api/tasks/${task.taskId}/time`).send({
    created: end, end: created, status: 'Closed'
  });
  assert.equal(invalid.status, 400);
  const after = await request(app).get(`/api/tasks/${task.taskId}`);
  assert.equal(after.body.end, end);
  assert.equal(after.body.created, created);
});
