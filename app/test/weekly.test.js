'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const elements = {};
  const element = id => elements[id] ||= { value: '', innerHTML: '', classList: { add() {}, toggle() {} }, querySelector: () => element('tbody'), querySelectorAll: () => [] };
  const context = vm.createContext({ document: { getElementById: element }, Intl, Date, console });
  const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8').replace(/init\(\);\s*$/, '');
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run(`currentWeekBounds = () => ({start: Date.parse('2026-10-12T00:00:00+08:00'), end: Date.parse('2026-10-19T00:00:00+08:00')});
    state.tasks = [
      {taskId:'TSK-0001', customerName:'Customer A', taskTitle:'Earlier', taskDescription:'Description', note:'Note', created:'2026-10-09T10:00:00+08:00', end:null, status:'Work in Progress'},
      {taskId:'TSK-0002', customerName:'Customer B', taskTitle:'New', taskDescription:'Description', note:'Note', created:'2026-10-13T10:00:00+08:00', end:null, status:'KIV'}
    ];`);
  return { run, elements, element };
}

test('PRD sample renders two independent lists, eight fields and matching cards', () => {
  const { run, elements } = setup();
  run('renderTable()');
  const html = elements.tbody.innerHTML;
  assert.match(html, /Carry Over<\\/span><span class="group-count-badge group-count-carry-over">1<\\/span>[\\s\\S]*TSK-0001[\\s\\S]*New This Week<\\/span><span class="group-count-badge group-count-new-this-week">1<\\/span>[\\s\\S]*TSK-0002/);
  assert.equal((html.match(/data-task-id=/g) || []).length, 2);
  assert.equal((html.match(/<td>/g) || []).length, 16);
  assert.match(elements.summaryRow.innerHTML, /Overall Total<\/span><strong>2/);
  for (const label of ['Carry Over', 'New This Week']) assert.ok(elements.summaryRow.innerHTML.includes(`${label}</span><strong>1`));
});

test('Malaysia Monday boundaries, historical terminal tasks and future tasks', () => {
  const { run } = setup();
  run(`state.tasks = [
    ['before','2026-10-11T23:59:59+08:00','KIV'],
    ['start','2026-10-12T00:00:00+08:00','Closed'],
    ['end','2026-10-19T00:00:00+08:00','KIV'],
    ['oldClosed','2026-10-09T00:00:00+08:00','Closed'],
    ['deleted','2026-10-13T00:00:00+08:00','Deleted']
  ].map(([taskId,created,status]) => ({taskId,created,status,customerName:'A'}));`);
  assert.equal(run('JSON.stringify(weeklyGroups(getDisplayedTasks()).map(([label,tasks]) => [label,tasks.map(t=>t.taskId)]))'), '[["Carry Over",["before"]],["New This Week",["start"]]]');
});

test('search and empty groups keep cards and lists synchronized', () => {
  const { run, elements, element } = setup();
  element('globalSearch').value = 'TSK-0002';
  run('renderTable()');
  assert.match(elements.tbody.innerHTML, /Carry Over<\\/span><span class="group-count-badge group-count-carry-over">0<\\/span>[\\s\\S]*No results found[\\s\\S]*New This Week<\\/span><span class="group-count-badge group-count-new-this-week">1<\\/span>/);
  assert.doesNotMatch(elements.tbody.innerHTML, /TSK-0001/);
  element('globalSearch').value = 'no match';
  run('renderTable()');
  assert.equal((elements.tbody.innerHTML.match(/No results found/g) || []).length, 2);
  assert.match(elements.summaryRow.innerHTML, /Overall Total<\/span><strong>0/);
});

test('editing status or Created recalculates group membership and selection', () => {
  const { run, elements } = setup();
  run(`state.selectedId = 'TSK-0001'; state.tasks[0].status = 'Closed'; renderTable()`);
  assert.doesNotMatch(elements.tbody.innerHTML, /TSK-0001/);
  assert.equal(elements.editTaskBtn.disabled, true);
  run(`state.tasks[0].created = '2026-10-14T00:00:00+08:00'; renderTable()`);
  assert.match(elements.tbody.innerHTML, /New This Week<\\/span><span class="group-count-badge group-count-new-this-week">2<\\/span>/);
  assert.match(elements.tbody.innerHTML, /selected-row/);
  assert.equal(elements.editTaskBtn.disabled, false);
});

test('Current Week Status retains four groups, scope and counts', () => {
  const { run, elements } = setup();
  run(`state.view = 'status'; renderTable()`);
  assert.equal((elements.tbody.innerHTML.match(/status-group-row/g) || []).length, 4);
  assert.match(elements.tbody.innerHTML, /Work in Progress[\s\S]*TSK-0001[\s\S]*KIV[\s\S]*TSK-0002/);
  assert.match(elements.summaryRow.innerHTML, /Overall Total<\/span><strong>2/);
  assert.doesNotMatch(elements.tbody.innerHTML, /weekly-group-row/);
});

test('tasks closed this week remain in weekly groups and Closed status', () => {
  const { run, elements } = setup();
  run(`state.tasks = [
    {taskId:'TSK-0001', customerName:'A', taskTitle:'Older closed this week', created:'2026-10-09T10:00:00+08:00', end:'2026-10-14T12:00:00+08:00', status:'Closed'},
    {taskId:'TSK-0002', customerName:'B', taskTitle:'New closed this week', created:'2026-10-13T10:00:00+08:00', end:'2026-10-15T12:00:00+08:00', status:'Closed'},
    {taskId:'TSK-0003', customerName:'C', taskTitle:'Old closed before week', created:'2026-10-01T10:00:00+08:00', end:'2026-10-10T12:00:00+08:00', status:'Closed'}
  ]; renderTable()`);
  assert.ok(elements.tbody.innerHTML.includes('<span>Carry Over</span><span class="group-count-badge group-count-carry-over">1</span>'));
  assert.ok(elements.tbody.innerHTML.includes('<span>New This Week</span><span class="group-count-badge group-count-new-this-week">1</span>'));
  assert.ok(elements.tbody.innerHTML.indexOf('TSK-0001') < elements.tbody.innerHTML.indexOf('TSK-0002'));
  assert.doesNotMatch(elements.tbody.innerHTML, /TSK-0003/);
  assert.match(elements.summaryRow.innerHTML, /Overall Total<\/span><strong>2/);
  run("state.view = 'status'; renderTable()");
  assert.ok(elements.tbody.innerHTML.includes('<span>Closed</span><span class="group-count-badge group-count-closed">2</span>'));
  assert.ok(elements.tbody.innerHTML.includes('data-task-id="TSK-0001"'));
  assert.ok(elements.tbody.innerHTML.includes('data-task-id="TSK-0002"'));
  assert.doesNotMatch(elements.tbody.innerHTML, /TSK-0003/);
  assert.match(elements.summaryRow.innerHTML, /Closed<\/span><strong>2/);
});

test('closed End uses Malaysia Monday inclusive/exclusive bounds', () => {
  const { run } = setup();
  run(`state.tasks = [
    {taskId:'at-start',customerName:'A',created:'2026-10-01T00:00:00+08:00',end:'2026-10-12T00:00:00+08:00',status:'Closed'},
    {taskId:'at-end',customerName:'A',created:'2026-10-01T00:00:00+08:00',end:'2026-10-19T00:00:00+08:00',status:'Closed'}
  ]`);
  assert.equal(run("JSON.stringify(getViewTasks().map(t=>t.taskId))"), '["at-start"]');
});

test('status group badges use semantic color keys and display zero counts', () => {
  const { run, elements } = setup();
  run("state.view = 'status'; renderTable()");
  for (const [key, count] of [['work-in-progress', 1], ['pending-with-customer', 0], ['kiv', 1], ['closed', 0]]) {
    assert.ok(elements.tbody.innerHTML.includes(`group-count-badge group-count-${key}">${count}</span>`));
  }
});
