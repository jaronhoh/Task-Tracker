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
    assert.equal((await page.locator('#tasksTable tbody tr').first().locator('td').nth(2).textContent()).trim(), 'AAA Sort Check');
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
