'use strict';

const STATUSES = ['Work in Progress', 'Pending with Customer', 'KIV', 'Closed', 'Deleted'];
const ACTIVE = new Set(['Work in Progress', 'Pending with Customer', 'KIV']);
const CUSTOMER_COLORS = ['#F87171','#FB923C','#FBBF24','#A3E635','#4ADE80','#34D399','#2DD4BF','#22D3EE','#38BDF8','#60A5FA','#818CF8','#A78BFA','#C084FC','#E879F9','#F472B6','#A8A29E'];
const SEARCH_FIELDS = ['taskId', 'customerName', 'taskTitle', 'taskDescription', 'note'];
const state = {
  tasks: [], customers: [], view: 'weekly', selectedId: null,
  displayedTasks: [], table: null, editQueue: Promise.resolve(), customerBeforeAdd: ''
};

const $ = (id) => document.getElementById(id);
const taskDialog = $('taskDialog');
const customerDialog = $('customerDialog');
const timeDialog = $('timeDialog');

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

function showNotice(message, isError = false) {
  const notice = $('notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.hidden = false;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 5500);
}

function showDialogError(id, message) {
  const el = $(id);
  el.textContent = message;
  el.hidden = !message;
}

function malaysiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

function toLocalInput(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function localInputToMalaysia(value) {
  return value ? `${value}:00+08:00` : null;
}

function currentWeekBounds() {
  const now = new Date();
  const p = malaysiaParts(now);
  const date = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  const startWall = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offset));
  const nextWall = new Date(startWall.getTime() + 7 * 86400000);
  // A Malaysia midnight is the preceding UTC day at 16:00.
  return {
    start: Date.UTC(startWall.getUTCFullYear(), startWall.getUTCMonth(), startWall.getUTCDate()) - 8 * 3600000,
    end: Date.UTC(nextWall.getUTCFullYear(), nextWall.getUTCMonth(), nextWall.getUTCDate()) - 8 * 3600000
  };
}

function getViewTasks() {
  const { start, end } = currentWeekBounds();
  const weekly = state.tasks.filter(task => {
    const created = Date.parse(task.created);
    return (created < start && ACTIVE.has(task.status)) ||
      (created >= start && created < end && task.status !== 'Deleted');
  });
  if (state.view === 'weekly' || state.view === 'status') return weekly;
  return state.tasks.slice();
}

function getDisplayedTasks() {
  const query = $('globalSearch').value.trim().toLocaleLowerCase('en-US');
  const tasks = getViewTasks().filter(task => !query || SEARCH_FIELDS.some(field =>
    String(task[field] ?? '').toLocaleLowerCase('en-US').includes(query)));
  if (state.view === 'all') return tasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
  return tasks.sort((a, b) => a.customerName.localeCompare(b.customerName, undefined, { sensitivity: 'base' }) ||
    a.taskId.localeCompare(b.taskId));
}

function statusClass(status) {
  if (status === 'Closed') return 'closed';
  if (status === 'Deleted') return 'deleted';
  return '';
}

function customerHtml(task) {
  const customer = state.customers.find(c => c.name === task.customerName);
  const color = customer?.color || '#94a3b8';
  return `<span class="customer-pill"><span class="color-dot" style="background:${escapeHtml(color)}"></span>${escapeHtml(task.customerName)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function renderSummary(tasks) {
  const summary = $('summaryRow');
  const cards = [];
  if (state.view === 'weekly') {
    const { start, end } = currentWeekBounds();
    const carry = tasks.filter(t => Date.parse(t.created) < start && ACTIVE.has(t.status)).length;
    const fresh = tasks.filter(t => Date.parse(t.created) >= start && Date.parse(t.created) < end && t.status !== 'Deleted').length;
    cards.push(['Overall Total', tasks.length], ['Carry Over', carry], ['New This Week', fresh]);
  } else if (state.view === 'status') {
    cards.push(['Overall Total', tasks.length]);
    for (const status of ['Work in Progress', 'Pending with Customer', 'KIV', 'Closed']) {
      cards.push([status, tasks.filter(t => t.status === status).length]);
    }
  } else {
    cards.push(['All Records', state.tasks.length], ['Displayed', tasks.length], ['Deleted', state.tasks.filter(t => t.status === 'Deleted').length]);
  }
  summary.innerHTML = cards.map(([label, value]) =>
    `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join('');
}

function renderTable() {
  const tasks = getDisplayedTasks();
  state.displayedTasks = tasks;
  renderSummary(tasks);
  if (state.table) {
    state.table.destroy();
    state.table = null;
  }
  const rows = tasks.map(task => [
    escapeHtml(task.taskId),
    customerHtml(task),
    escapeHtml(task.taskTitle),
    escapeHtml(task.taskDescription || ''),
    escapeHtml(task.note || ''),
    escapeHtml(formatDateTime(task.created)),
    escapeHtml(formatDateTime(task.end)),
    `<span class="status-pill ${statusClass(task.status)}">${escapeHtml(task.status)}</span>`
  ]);
  state.table = $('#tasksTable').DataTable({
    data: rows,
    columns: [
      { title: 'Task ID' }, { title: 'Customer Name' }, { title: 'Task Title' },
      { title: 'Task Description' }, { title: 'Note' }, { title: 'Created' },
      { title: 'End' }, { title: 'Status' }
    ],
    paging: state.view === 'all',
    pageLength: 25,
    lengthMenu: [25, 50, 100],
    searching: false,
    info: state.view === 'all',
    ordering: false,
    autoWidth: false,
    language: { emptyTable: 'No results found', zeroRecords: 'No results found' },
    createdRow: (row, _data, index) => {
      row.dataset.taskId = tasks[index]?.taskId || '';
      if (tasks[index]?.taskId === state.selectedId) row.classList.add('selected-row');
    }
  });
  $('emptyState').hidden = tasks.length !== 0;
  $('editTaskBtn').disabled = !state.selectedId || !tasks.some(t => t.taskId === state.selectedId);
  $('editTimeBtn').hidden = state.view !== 'all';
  $('editTimeBtn').disabled = !state.selectedId || !tasks.some(t => t.taskId === state.selectedId);
}

async function loadAll() {
  const [tasks, customers] = await Promise.all([api('/api/tasks'), api('/api/customers')]);
  state.tasks = tasks;
  state.customers = customers;
  renderTable();
}

function selectedTask() {
  return state.tasks.find(task => task.taskId === state.selectedId) || null;
}

function setView(view) {
  state.view = view;
  state.selectedId = null;
  $('globalSearch').value = '';
  document.querySelectorAll('.view-tab').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  renderTable();
}

function fillCustomerSelect(selectedName = '') {
  const select = $('customerName');
  select.innerHTML = '<option value="">Select Customer…</option>' +
    state.customers.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('') +
    '<option value="__add_customer__">＋ Add Customer</option>';
  select.value = selectedName || '';
}

function openNewTask() {
  $('taskForm').reset();
  $('taskId').value = '';
  $('taskDialogTitle').textContent = 'New Task';
  $('taskStatus').value = 'KIV';
  $('taskCreated').value = formatDateTime(new Date().toISOString());
  $('taskEnd').value = '';
  $('taskCreated').readOnly = true;
  $('taskEnd').readOnly = true;
  $('taskStatus').disabled = false;
  $('taskDialogFooter').hidden = false;
  $('taskDialogFooter').querySelector('button[type="submit"]').textContent = 'Create Task';
  $('autoSaveHint').hidden = true;
  $('customerName').disabled = false;
  $('taskTitle').readOnly = false;
  $('taskDescription').readOnly = false;
  $('taskNote').readOnly = false;
  fillCustomerSelect();
  showDialogError('taskDialogError', '');
  taskDialog.showModal();
}

function openEditTask(task) {
  $('taskForm').reset();
  $('taskId').value = task.taskId;
  $('taskDialogTitle').textContent = `Edit Task · ${task.taskId}`;
  fillCustomerSelect(task.customerName);
  $('taskTitle').value = task.taskTitle;
  $('taskDescription').value = task.taskDescription || '';
  $('taskNote').value = task.note || '';
  $('taskStatus').value = task.status;
  $('taskCreated').value = formatDateTime(task.created);
  $('taskEnd').value = formatDateTime(task.end);
  $('taskCreated').readOnly = true;
  $('taskEnd').readOnly = true;
  $('taskStatus').disabled = false;
  $('taskDialogFooter').hidden = true;
  $('autoSaveHint').hidden = false;
  $('customerName').disabled = false;
  $('taskTitle').readOnly = false;
  $('taskDescription').readOnly = false;
  $('taskNote').readOnly = false;
  showDialogError('taskDialogError', '');
  taskDialog.showModal();
}

function queuePatch(field, value, input) {
  const taskId = $('taskId').value;
  if (!taskId) return;
  state.editQueue = state.editQueue.then(async () => {
    try {
      const result = await api(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH', body: JSON.stringify({ [field]: value })
      });
      const oldValue = input.value;
      await loadAll();
      $('taskId').value = taskId;
      const fresh = state.tasks.find(t => t.taskId === taskId);
      if (fresh) {
        $('taskCreated').value = formatDateTime(fresh.created);
        $('taskEnd').value = formatDateTime(fresh.end);
      }
      showDialogError('taskDialogError', '');
      showNotice(`${field === 'status' ? 'Status' : field} saved.`);
      return result;
    } catch (error) {
      showDialogError('taskDialogError', `Save failed: ${error.message} Your input has been kept; correct it or retry.`);
      showNotice(`Save failed: ${error.message}`, true);
      // The edited value remains in the input so the user can retry.
      input.focus();
    }
  });
}

async function createTask(event) {
  event.preventDefault();
  if ($('taskId').value) return; // Edit Task uses blur-based Auto Save, never form submission.
  showDialogError('taskDialogError', '');
  try {
    const task = await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        customerName: $('customerName').value,
        taskTitle: $('taskTitle').value,
        taskDescription: $('taskDescription').value || null,
        note: $('taskNote').value || null,
        status: $('taskStatus').value
      })
    });
    taskDialog.close();
    state.selectedId = task.taskId;
    await loadAll();
    showNotice(`Created ${task.taskId}.`);
  } catch (error) {
    showDialogError('taskDialogError', error.message);
  }
}

async function createCustomer(event) {
  event.preventDefault();
  showDialogError('customerDialogError', '');
  try {
    const customer = await api('/api/customers', {
      method: 'POST', body: JSON.stringify({ name: $('newCustomerName').value })
    });
    customerDialog.close();
    await loadAll();
    fillCustomerSelect(customer.name);
    $('customerName').value = customer.name;
    if ($('taskId').value && taskDialog.open) queuePatch('customerName', customer.name, $('customerName'));
    showNotice(`Customer ${customer.name} added.`);
  } catch (error) {
    showDialogError('customerDialogError', error.message);
  }
}

function renderCustomerManagement() {
  const list = $('customerManagementList');
  const colorsInUse = new Map(state.customers.map(c => [c.color.toUpperCase(), c.name]));
  list.innerHTML = state.customers.map((customer, index) => {
    const colorOptions = CUSTOMER_COLORS.map(color => {
      const owner = colorsInUse.get(color);
      const disabled = owner && owner !== customer.name ? 'disabled' : '';
      return `<option value="${color}" ${customer.color.toUpperCase() === color ? 'selected' : ''} ${disabled}>${color}${disabled ? ' (in use)' : ''}</option>`;
    }).join('');
    return `<div class="customer-management-row" data-customer-row="${index}">
      <label>Customer Name
        <input class="customer-name-editor" data-original="${escapeHtml(customer.name)}" value="${escapeHtml(customer.name)}" maxlength="100">
      </label>
      <label>Customer Color
        <span class="customer-color-choice"><span class="color-dot" style="background:${escapeHtml(customer.color)}"></span>
        <select class="customer-color-editor" data-name="${escapeHtml(customer.name)}" data-original="${escapeHtml(customer.color)}">${colorOptions}</select></span>
      </label>
    </div>`;
  }).join('');
  list.querySelectorAll('.customer-name-editor').forEach(input => input.addEventListener('blur', async () => {
    const oldName = input.dataset.original;
    const newName = input.value.trim();
    if (!newName || newName === oldName) {
      if (!newName) input.value = oldName;
      return;
    }
    try {
      await api(`/api/customers/${encodeURIComponent(oldName)}`, {
        method: 'PATCH', body: JSON.stringify({ name: newName })
      });
      await loadAll();
      renderCustomerManagement();
      showDialogError('manageCustomersError', '');
      showNotice(`Customer renamed to ${newName}; linked Tasks were updated.`);
    } catch (error) {
      showDialogError('manageCustomersError', error.message);
      input.focus();
    }
  }));
  list.querySelectorAll('.customer-color-editor').forEach(select => select.addEventListener('change', async () => {
    const customerName = select.dataset.name;
    const originalColor = select.dataset.original;
    try {
      await api(`/api/customers/${encodeURIComponent(customerName)}/color`, {
        method: 'PATCH', body: JSON.stringify({ color: select.value })
      });
      await loadAll();
      renderCustomerManagement();
      showDialogError('manageCustomersError', '');
      showNotice(`Color updated for ${customerName}.`);
    } catch (error) {
      select.value = originalColor;
      const dot = select.closest('.customer-color-choice').querySelector('.color-dot');
      dot.style.background = originalColor;
      showDialogError('manageCustomersError', error.message);
    }
  }));
  list.querySelectorAll('.customer-color-editor').forEach(select => select.addEventListener('change', () => {
    const dot = select.closest('.customer-color-choice').querySelector('.color-dot');
    dot.style.background = select.value;
  }));
}

async function openManageCustomers() {
  try {
    await loadAll();
    showDialogError('manageCustomersError', '');
    renderCustomerManagement();
    $('manageCustomersDialog').showModal();
  } catch (error) {
    showNotice(error.message, true);
  }
}

function openTimeDialog(task) {
  $('timeTaskLabel').textContent = `${task.taskId} · ${task.taskTitle}`;
  $('timeCreated').value = toLocalInput(task.created);
  $('timeEnd').value = toLocalInput(task.end);
  $('timeStatus').value = task.status;
  showDialogError('timeDialogError', '');
  timeDialog.showModal();
}

async function saveTime(event) {
  event.preventDefault();
  showDialogError('timeDialogError', '');
  const task = selectedTask();
  if (!task) return;
  const created = localInputToMalaysia($('timeCreated').value);
  const end = localInputToMalaysia($('timeEnd').value);
  const status = $('timeStatus').value;
  if (ACTIVE.has(status) && end) {
    showDialogError('timeDialogError', 'You entered End for an Active Task. Choose Closed or Deleted before saving.');
    return;
  }
  if (!ACTIVE.has(status) && !end) {
    showDialogError('timeDialogError', 'Closed and Deleted Tasks require End.');
    return;
  }
  if (end && Date.parse(end) < Date.parse(created)) {
    showDialogError('timeDialogError', 'End cannot be earlier than Created.');
    return;
  }
  try {
    await api(`/api/tasks/${encodeURIComponent(task.taskId)}/time`, {
      method: 'PATCH', body: JSON.stringify({ created, end, status })
    });
    timeDialog.close();
    await loadAll();
    showNotice(`Time saved for ${task.taskId}.`);
  } catch (error) {
    showDialogError('timeDialogError', error.message);
  }
}

function exportExcel() {
  if (!window.XLSX) {
    showNotice('Excel export library did not load. Check network access and retry.', true);
    return;
  }
  const rows = state.displayedTasks.map(t => ({
    'Task ID': t.taskId, 'Customer Name': t.customerName, 'Task Title': t.taskTitle,
    'Task Description': t.taskDescription || '', Note: t.note || '',
    Created: t.created, End: t.end || '', Status: t.status
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['Task ID', 'Customer Name', 'Task Title', 'Task Description', 'Note', 'Created', 'End', 'Status']
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  const date = malaysiaParts();
  const ymd = `${date.year}${date.month}${date.day}`;
  const viewName = { weekly: 'WeeklyTask', status: 'CurrentWeekStatus', all: 'ShowAllData' }[state.view];
  XLSX.writeFile(workbook, `TaskTracker_${viewName}_${ymd}.xlsx`);
}

function bindEvents() {
  document.querySelectorAll('.view-tab').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('newTaskBtn').addEventListener('click', openNewTask);
  $('manageCustomersBtn').addEventListener('click', openManageCustomers);
  $('editTaskBtn').addEventListener('click', () => { const task = selectedTask(); if (task) openEditTask(task); });
  $('editTimeBtn').addEventListener('click', () => { const task = selectedTask(); if (task) openTimeDialog(task); });
  $('exportBtn').addEventListener('click', exportExcel);
  $('searchBtn').addEventListener('click', renderTable);
  $('globalSearch').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); renderTable(); } });
  $('clearSearchBtn').addEventListener('click', () => { $('globalSearch').value = ''; renderTable(); });
  $('taskForm').addEventListener('submit', createTask);
  $('customerForm').addEventListener('submit', createCustomer);
  $('timeForm').addEventListener('submit', saveTime);
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => {
    const dialogId = button.dataset.close;
    $(dialogId).close();
    if (dialogId === 'customerDialog' && $('customerName').value === '__add_customer__') $('customerName').value = '';
  }));
  $('customerName').addEventListener('change', () => {
    if ($('customerName').value === '__add_customer__') {
      state.customerBeforeAdd = '';
      $('newCustomerName').value = '';
      showDialogError('customerDialogError', '');
      customerDialog.showModal();
    }
  });
  for (const [id, field] of [['taskTitle', 'taskTitle'], ['taskDescription', 'taskDescription'], ['taskNote', 'note'], ['taskStatus', 'status'], ['customerName', 'customerName']]) {
    $(id).addEventListener('blur', () => {
      if (!$('taskId').value || !taskDialog.open) return;
      const value = $(id).value;
      if (id === 'customerName' && value === '__add_customer__') return;
      if (id === 'taskTitle' && !value.trim()) {
        showDialogError('taskDialogError', 'Task Title is required.');
        return;
      }
      if (id === 'customerName' && !value) {
        showDialogError('taskDialogError', 'Customer Name is required.');
        return;
      }
      queuePatch(field, value, $(id));
    });
  }
  $('tasksTable').addEventListener('click', event => {
    const row = event.target.closest('tbody tr[data-task-id]');
    if (!row || !row.dataset.taskId) return;
    state.selectedId = row.dataset.taskId;
    document.querySelectorAll('#tasksTable tbody tr').forEach(tr => tr.classList.toggle('selected-row', tr === row));
    $('editTaskBtn').disabled = false;
    $('editTimeBtn').disabled = state.view !== 'all';
  });
  $('tasksTable').addEventListener('dblclick', event => {
    const row = event.target.closest('tbody tr[data-task-id]');
    if (!row) return;
    const task = state.tasks.find(t => t.taskId === row.dataset.taskId);
    if (task) openEditTask(task);
  });
}

async function init() {
  bindEvents();
  try {
    await api('/api/health');
    $('healthBadge').textContent = 'API Connected';
    $('healthBadge').classList.add('ok');
    await loadAll();
  } catch (error) {
    $('healthBadge').textContent = 'API Unavailable';
    showNotice(`Could not connect to Task Tracker API: ${error.message}. Start the server and refresh this page.`, true);
  }
}

init();
