'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { chromium } = require('playwright');
const XLSX = require('xlsx');

async function harness(run) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'task-react-'));
  const socket = net.createServer().listen(0, '127.0.0.1');
  await once(socket, 'listening'); const port = socket.address().port;
  await new Promise(r => socket.close(r));
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, '../server.js')], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TASK_TRACKER_DB: path.join(temp, 'test.sqlite') }, stdio: 'ignore' });
  let browser;
  try {
    for (let n = 0; ; n++) { try { if ((await fetch(url + '/api/health')).ok) break; } catch {} if (n > 100) throw Error('Server unavailable'); await new Promise(r => setTimeout(r, 50)); }
    browser = await chromium.launch({ headless: true });
    const api = async (endpoint, body, method = 'POST') => { const r = await fetch(url + endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); assert.ok(r.ok, `${endpoint}: ${await r.clone().text()}`); return r.json(); };
    await run({ browser, url, api, temp });
  } finally {
    if (browser) await browser.close();
    child.kill(); await Promise.race([once(child, 'exit'), new Promise(r => setTimeout(r, 1000))]);
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
const task = (taskId, created, status = 'KIV') => ({ taskId, customerName: 'Customer A', taskTitle: `Task ${taskId}`, taskDescription: 'Description', note: 'Note', created, end: status === 'Closed' ? '2026-10-15T10:00:00+08:00' : null, status });
test('React UI: weekly totals, boundaries, search, timezone independence, mobile and keyboard focus', async () => harness(async ({browser,url}) => {
  const fixture = [task('TSK-0001','2026-10-09T10:00:00','Work in Progress'),task('TSK-0002','2026-10-12T00:00:00'),task('oldClosed','2026-10-09T10:00:00','Closed'),task('deleted','2026-10-13T10:00:00','Deleted'),task('future','2026-10-19T00:00:00')];
  for (const timezoneId of ['Asia/Kuala_Lumpur','America/Los_Angeles']) {
    const ctx = await browser.newContext({timezoneId,viewport:{width:390,height:844}}), page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-10-15T04:00:00Z'));
    await page.route('**/api/tasks', route => route.fulfill({json:fixture}));
    await page.route('**/api/customers', route => route.fulfill({json:[{name:'Customer A',color:'#F87171'}]}));
    page.setDefaultTimeout(8000);await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['2','1','1']);
    assert.deepEqual(await page.locator('.weekly-group-row').allTextContents(),['Carry Over (1)','New This Week (1)']);
    assert.equal(await page.locator('[data-task-id]').count(),2);
    if(process.env.TASK_TRACKER_SCREENSHOT && timezoneId==='Asia/Kuala_Lumpur')await page.screenshot({path:process.env.TASK_TRACKER_SCREENSHOT,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile page should not overflow');
    await page.locator('[data-task-id="TSK-0001"]').focus();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-task-id')),'TSK-0001');await page.locator('[data-task-id="TSK-0001"]').press('Enter');await page.locator('#taskDialog').waitFor();
    assert.equal(await page.locator('#taskCreated').inputValue(),'09/10/2026, 10:00');
    await page.keyboard.press('Escape');await page.locator('#taskDialog').waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement.id==='editTaskBtn');
    await page.locator('#globalSearch').fill(' tsk-0002 ');await page.locator('#searchBtn').click();
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['1','0','1']);
    assert.equal(await page.locator('.weekly-empty-row').count(),1);
    await page.locator('#clearSearchBtn').click();await page.locator('[data-view="status"]').click();
    assert.equal(await page.locator('.status-group-row').count(),4);
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['2','1','0','1','0']);
    await page.locator('#globalSearch').fill('unmatched');await page.locator('#searchBtn').click();
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['0','0','0','0','0']);
    await ctx.close();
  }
}));
test('React UI: TanStack sorting/pagination/reset and full filtered single-sheet Excel export', async () => harness(async ({browser,url,temp}) => {
  const ctx=await browser.newContext({acceptDownloads:true,timezoneId:'UTC'}),page=await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-15T17:00:00Z'));
  const fixture=Array.from({length:61},(_,i)=>({...task(`TSK-${String(i+1).padStart(4,'0')}`,'2026-10-13T10:00:00'),taskTitle:`Title ${String(i+1).padStart(3,'0')}`}));
  await page.route('**/api/tasks',r=>r.fulfill({json:fixture}));page.setDefaultTimeout(8000);await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
  await page.locator('[data-view="all"]').click();assert.equal(await page.locator('[data-task-id]').count(),25);
  await page.getByRole('button',{name:'Next page',exact:true}).click();await page.locator('[data-task-id="TSK-0026"]').waitFor();
  await page.locator('#globalSearch').fill('Title');await page.locator('#searchBtn').click();await page.locator('[data-task-id="TSK-0001"]').waitFor();
  await page.locator('#tasksTable thead th').nth(2).click();await page.locator('#tasksTable thead th').nth(2).click();
  assert.equal(await page.locator('[data-task-id]').first().getAttribute('data-task-id'),'TSK-0061');
  let downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').click();let download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'TaskTracker_ShowAllData_20261016.xlsx');
  const file=path.join(temp,'all.xlsx');await download.saveAs(file);const book=XLSX.readFile(file);
  assert.deepEqual(book.SheetNames,['Tasks']);const rows=XLSX.utils.sheet_to_json(book.Sheets.Tasks,{header:1});assert.equal(rows.length,62);assert.equal(rows[1][0],'TSK-0061');
  await page.locator('#pageSize').selectOption('50');assert.equal(await page.locator('[data-task-id]').count(),50);
  await page.getByRole('button',{name:'Next page',exact:true}).click();await page.locator('[data-task-id="TSK-0011"]').waitFor();
  await page.locator('#globalSearch').fill('TSK-0001');await page.locator('#searchBtn').click();await page.locator('[data-task-id="TSK-0001"]').waitFor();assert.equal(await page.locator('[data-task-id]').count(),1);
  assert.equal(await page.getByRole('button',{name:'Next page',exact:true}).isDisabled(),true);
  await page.locator('[data-view="weekly"]').click();downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').click();download=await downloadPromise;const weeklyFile=path.join(temp,'weekly.xlsx');await download.saveAs(weeklyFile);
  const weekly=XLSX.readFile(weeklyFile);assert.equal(weekly.SheetNames.length,1);const weeklyRows=XLSX.utils.sheet_to_json(weekly.Sheets.Tasks,{header:1});assert.equal(weeklyRows[1][0],'Carry Over (0)');assert.equal(weeklyRows[2][0],'New This Week (61)');assert.equal(weeklyRows.length,64);
  await ctx.close();
}));
test('React UI: ordered blur saves, retry, Customer rename/color, logical delete and restore', async () => harness(async ({browser,url,api}) => {
  const original=await api('/api/tasks',{customerName:'Original Customer',taskTitle:'Original title'});
  const ctx=await browser.newContext(),page=await ctx.newPage();page.setDefaultTimeout(8000);await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
  const row=page.locator(`[data-task-id="${original.taskId}"]`);await row.dblclick();
  const order=[];let failed=false;
  await page.route(`**/api/tasks/${original.taskId}`,async route=>{const body=route.request().postDataJSON();order.push(body);if(body.taskTitle==='First title'){await new Promise(r=>setTimeout(r,100));}if(body.note==='Retry note'&&!failed){failed=true;await route.fulfill({status:500,json:{error:'Injected save failure'}})}else await route.continue()});
  await page.locator('#taskTitle').fill('First title');await page.locator('#taskTitle').press('Tab');
  await page.locator('#taskNote').fill('Retry note');await page.locator('#taskNote').press('Tab');await page.locator('#taskDialogError').filter({hasText:'Your input has been kept'}).waitFor();
  assert.equal(await page.locator('#taskNote').inputValue(),'Retry note');assert.deepEqual(order.slice(0,2),[{taskTitle:'First title'},{note:'Retry note'}]);
  await page.getByRole('button',{name:'Retry saving changes'}).click();await page.locator('#taskDialogError').waitFor({state:'hidden'});
  assert.equal((await api(`/api/tasks/${original.taskId}`,undefined,'GET')).note,'Retry note');
  const before=order.length;await page.locator('#taskTitle').focus();await page.locator('#taskTitle').press('Tab');assert.equal(order.length,before,'unchanged field should not PATCH');
  await page.locator('#taskDialog [data-close="taskDialog"]').click();await page.locator('#manageCustomersBtn').click();
  await page.locator('.customer-name-editor').fill('Renamed Customer');await page.locator('.customer-name-editor').press('Tab');await page.locator('.customer-name-editor').waitFor();
  await page.waitForFunction(()=>document.querySelector('.customer-name-editor')?.value==='Renamed Customer');
  await page.locator('.customer-color-editor').selectOption('#FB923C');await page.waitForFunction(()=>document.querySelector('.customer-color-editor')?.value==='#FB923C');
  await page.locator('#manageCustomersDialog [data-close="manageCustomersDialog"]').first().click();
  const fresh=await api(`/api/tasks/${original.taskId}`,undefined,'GET');assert.equal(fresh.customerName,'Renamed Customer');
  assert.equal((await api('/api/customers',undefined,'GET'))[0].color,'#FB923C');
  await api(`/api/tasks/${original.taskId}`,undefined,'DELETE');await page.reload();await page.locator('#healthBadge.ok').waitFor();assert.equal(await page.locator('[data-task-id]').count(),0);
  await page.locator('[data-view="all"]').click();await page.locator(`[data-task-id="${original.taskId}"]`).dblclick();await page.locator('#taskStatus').selectOption('KIV');await page.locator('#taskStatus').press('Tab');await page.getByText('Status saved.',{exact:true}).waitFor();
  await page.locator('#taskDialog [data-close="taskDialog"]').click();await page.locator('[data-view="weekly"]').click();await page.locator(`[data-task-id="${original.taskId}"]`).waitFor();
  const restored=await api(`/api/tasks/${original.taskId}`,undefined,'GET');assert.equal(restored.status,'KIV');assert.equal(restored.end,null);
  await ctx.close();
}));
