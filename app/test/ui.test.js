'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Task Tracker server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Task Tracker server did not become healthy within 15 seconds.');
}

test('browser acceptance: create, auto-save, status groups, close flow and Excel export', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-tracker-ui-'));
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TASK_TRACKER_DB: path.join(tempDir, 'test.sqlite') },
    stdio: 'ignore'
  });
  let browser;
  try {
    await waitForHealth(baseUrl, child);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true, timezoneId: 'Asia/Kuala_Lumpur' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
    page.setDefaultTimeout(10000);
    await page.goto(baseUrl);
    try {
      await page.locator('#healthBadge.ok').waitFor({ state: 'visible' });
    } catch (error) {
      const badge = await page.locator('#healthBadge').textContent().catch(() => 'missing');
      const vendorStatus = await Promise.all(['/vendor/jquery/jquery.min.js','/vendor/datatables/dataTables.min.js','/vendor/datatables-css/dataTables.dataTables.min.css','/vendor/xlsx/xlsx.full.min.js'].map(async url => ({ url, status: (await page.request.get(baseUrl + url)).status() })));
      throw new Error(`UI initialization failed; badge=${badge}; vendors=${JSON.stringify(vendorStatus)}; browserErrors=${JSON.stringify(pageErrors)}; cause=${error.message}`);
    }
    assert.equal((await page.locator('#healthBadge').textContent()).trim(), 'API Connected');

    await page.locator('#newTaskBtn').click();
    await page.locator('#customerName').selectOption('__add_customer__');
    await page.locator('#newCustomerName').fill('QA Browser Customer');
    await page.locator('#customerForm button[type="submit"]').click();
    await page.locator('#customerDialog').waitFor({ state: 'hidden' });
    await page.locator('#taskTitle').fill('Browser Acceptance Task');
    await page.locator('#taskDescription').fill('Initial description');
    await page.locator('#taskNote').fill('Initial note');
    await page.locator('#taskDialogFooter button[type="submit"]').click();
    await page.locator('#taskDialog').waitFor({ state: 'hidden' });
    try {
      await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"]').waitFor({ timeout: 5000 });
    } catch (error) {
      const apiTasks = await page.request.get(baseUrl + '/api/tasks').then(response => response.json()).catch(e => String(e));
      const notice = await page.locator('#notice').textContent().catch(() => 'missing');
      throw new Error(`Task row missing; apiTasks=${JSON.stringify(apiTasks)}; notice=${notice}; browserErrors=${JSON.stringify(pageErrors)}; cause=${error.message}`);
    }

    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"]').click();
    await page.locator('#editTaskBtn').click();
    await page.locator('#taskTitle').fill('Browser Acceptance Task Updated');
    await page.locator('#taskTitle').press('Tab');
    await page.getByText('taskTitle saved.').waitFor();
    await page.locator('#taskDialog .icon-button[data-close="taskDialog"]').click();
    await page.locator('#taskDialog').waitFor({ state: 'hidden' });

    await page.locator('.view-tab[data-view="status"]').click();
    for (const status of ['Work in Progress', 'Pending with Customer', 'KIV', 'Closed']) {
      await page.locator('.status-group-row').filter({ hasText: status }).waitFor();
    }
    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"]').waitFor();

    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"]').click();
    await page.locator('#editTaskBtn').click();
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#taskStatus').selectOption('Deleted');
    assert.equal(await page.locator('#taskStatus').inputValue(), 'KIV');
    await page.locator('#timeDialog').waitFor({ state: 'hidden' });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#taskStatus').selectOption('Closed');
    await page.locator('#timeDialog').waitFor({ state: 'visible' });
    const malaysiaLocalEnd = await page.evaluate(() => {
      const d = new Date(Date.now() + 60_000);
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(d);
      const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    });
    await page.locator('#timeEnd').fill(malaysiaLocalEnd);
    await page.locator('#timeForm button[type="submit"]').click();
    await page.locator('#timeDialog').waitFor({ state: 'hidden' });
    await page.locator('#taskDialog .icon-button[data-close="taskDialog"]').click();
    await page.locator('#taskDialog').waitFor({ state: 'hidden' });
    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"] .status-pill.closed').waitFor();

    await page.locator('.view-tab[data-view="all"]').click();
    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"]').waitFor();
    await page.locator('#newTaskBtn').click();
    await page.locator('#customerName').selectOption('QA Browser Customer');
    await page.locator('#taskTitle').fill('AAA Sort Check');
    await page.locator('#taskDialogFooter button[type="submit"]').click();
    await page.locator('#taskDialog').waitFor({ state: 'hidden' });
    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0002"]').waitFor();
    await page.locator('#globalSearch').fill('browser acceptance');
    await page.locator('#searchBtn').click();
    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0001"]').waitFor();
    assert.equal(await page.locator('#tasksTable tbody tr[data-task-id="TSK-0002"]').count(), 0);
    await page.locator('#clearSearchBtn').click();
    await page.locator('#tasksTable tbody tr[data-task-id="TSK-0002"]').waitFor();
    await page.locator('#tasksTable thead th').nth(2).click();
    assert.equal(await page.locator('#tasksTable thead th').nth(2).getAttribute('aria-sort'), 'ascending');
    const firstTitle = (await page.locator('#tasksTable tbody tr').first().locator('td').nth(2).textContent()).trim();
    assert.equal(firstTitle, 'AAA Sort Check', `Expected ascending Task Title order; firstTitle=${firstTitle}`);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /^TaskTracker_ShowAllData_\d{8}\.xlsx$/);
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 1500))]);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});


test('P0-009 and P0-013 UI: failed Auto Save keeps input; exhausted color pool disables Customer add', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-tracker-p0-ui-'));
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TASK_TRACKER_DB: path.join(tempDir, 'p0.sqlite') },
    stdio: 'ignore'
  });
  let browser;
  try {
    await waitForHealth(baseUrl, child);
    const taskResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'P0 Auto Save Customer', taskTitle: 'Original P0 title' })
    });
    assert.equal(taskResponse.status, 201);
    const task = await taskResponse.json();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ timezoneId: 'Asia/Kuala_Lumpur' });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(baseUrl);
    await page.locator('#healthBadge.ok').waitFor({ state: 'visible' });
    await page.locator(`#tasksTable tbody tr[data-task-id="${task.taskId}"]`).waitFor();
    await page.locator(`#tasksTable tbody tr[data-task-id="${task.taskId}"]`).click();
    await page.locator('#editTaskBtn').click();

    await page.route(`**/api/tasks/${task.taskId}`, async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'P0_INJECTED_FAILURE', message: 'P0 injected Auto Save failure' } })
        });
      } else {
        await route.continue();
      }
    });
    await page.locator('#taskTitle').fill('Unsaved P0 title');
    await page.locator('#taskTitle').press('Tab');
    await page.locator('#taskDialogError').filter({ hasText: 'Your input has been kept' }).waitFor();
    assert.equal(await page.locator('#taskTitle').inputValue(), 'Unsaved P0 title');
    const persisted = await fetch(`${baseUrl}/api/tasks/${task.taskId}`).then(response => response.json());
    assert.equal(persisted.taskTitle, 'Original P0 title');

    await page.unrouteAll({ behavior: 'wait' });
    await page.locator('#taskDialog .icon-button[data-close="taskDialog"]').click();
    await page.locator('#taskDialog').waitFor({ state: 'hidden' });

    for (let index = 1; index <= 15; index += 1) {
      const response = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `P0 UI Color Customer ${String(index).padStart(2, '0')}` })
      });
      assert.equal(response.status, 201);
    }
    const customers = await fetch(`${baseUrl}/api/customers`).then(response => response.json());
    assert.equal(customers.length, 16);
    await page.reload();
    await page.locator('#healthBadge.ok').waitFor({ state: 'visible' });
    await page.locator('#newTaskBtn').click();
    await page.waitForFunction(() => document.querySelectorAll('#customerName option').length === 18);
    const addCustomerOption = page.locator('#customerName option[value="__add_customer__"]');
    await addCustomerOption.waitFor({ state: 'attached' });
    assert.equal(await addCustomerOption.evaluate(option => option.disabled), true);
    assert.equal(await page.locator('#customerDialog').isVisible(), false);
    assert.equal((await fetch(`${baseUrl}/api/customers`).then(response => response.json())).length, 16);
  } finally {
    if (browser) await browser.close();
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 1500))]);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});


test('P0-015 UI: Edit Time rejects End before Created and Created after existing End', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-tracker-p0-time-'));
  const port = await unusedPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TASK_TRACKER_DB: path.join(tempDir, 'time.sqlite') },
    stdio: 'ignore'
  });
  let browser;
  try {
    await waitForHealth(baseUrl, child);
    const createResponse = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'P0 Time Customer', taskTitle: 'P0 Time Validation', status: 'Closed' })
    });
    assert.equal(createResponse.status, 201);
    const task = await createResponse.json();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ timezoneId: 'Asia/Kuala_Lumpur' });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(baseUrl);
    await page.locator('#healthBadge.ok').waitFor({ state: 'visible' });
    await page.locator('.view-tab[data-view="all"]').click();
    await page.locator(`#tasksTable tbody tr[data-task-id="${task.taskId}"]`).waitFor();
    await page.locator(`#tasksTable tbody tr[data-task-id="${task.taskId}"]`).click();
    await page.locator('#editTimeBtn').click();
    await page.locator('#timeDialog').waitFor({ state: 'visible' });

    const createdValue = await page.locator('#timeCreated').inputValue();
    const endValue = await page.locator('#timeEnd').inputValue();
    const toLocalInput = epoch => new Date(epoch + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const createdEpoch = Date.parse(`${createdValue}:00+08:00`);
    await page.locator('#timeEnd').fill(toLocalInput(createdEpoch - 60_000));
    await page.locator('#timeForm button[type="submit"]').click();
    await page.locator('#timeDialogError').filter({ hasText: 'End cannot be earlier than Created.' }).waitFor();
    assert.equal(await page.locator('#timeDialog').isVisible(), true);

    const endEpoch = Date.parse(`${endValue}:00+08:00`);
    await page.locator('#timeEnd').fill(endValue);
    await page.locator('#timeCreated').fill(toLocalInput(endEpoch + 60_000));
    await page.locator('#timeForm button[type="submit"]').click();
    await page.locator('#timeDialogError').filter({ hasText: 'End cannot be earlier than Created.' }).waitFor();
    const persisted = await fetch(`${baseUrl}/api/tasks/${task.taskId}`).then(response => response.json());
    assert.equal(persisted.created, task.created);
    assert.equal(persisted.end, task.end);
    assert.equal(persisted.status, 'Closed');
  } finally {
    if (browser) await browser.close();
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 1500))]);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
