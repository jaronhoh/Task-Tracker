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
  const { startServer } = await import('../scripts/test-server.mjs');
  const instance = await startServer(port,false);
  let browser;
  try {
    for (let n = 0; ; n++) { try { if ((await fetch(url + '/api/health')).ok) break; } catch {} if (n > 100) throw Error('Server unavailable'); await new Promise(r => setTimeout(r, 50)); }
    browser = await chromium.launch({ headless: true });
    const api = async (endpoint, body, method = 'POST') => { const r = await fetch(url + endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); assert.ok(r.ok, `${endpoint}: ${await r.clone().text()}`); return r.json(); };
    await run({ browser, url, api, temp });
  } finally {
    if (browser) await browser.close();
    await instance.close();
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
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['3','2','1']);
    assert.deepEqual(await page.locator('.weekly-group-row .group-count-badge').allTextContents(),['2','1']);
    assert.deepEqual(await page.locator('.weekly-group-row .group-count-badge').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),['Carry Over: 2 tasks','New This Week: 1 tasks']);
    assert.equal(await page.locator('[data-task-id]').count(),3);
    if(process.env.TASK_TRACKER_SCREENSHOT && timezoneId==='Asia/Kuala_Lumpur')await page.screenshot({path:process.env.TASK_TRACKER_SCREENSHOT,fullPage:true,animations:'disabled'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile page should not overflow');
    await page.locator('[data-task-id="TSK-0001"]').focus();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-task-id')),'TSK-0001');await page.locator('[data-task-id="TSK-0001"]').press('Enter');await page.locator('#taskDialog').waitFor();
    assert.equal(await page.locator('#taskCreated').inputValue(),'09/10/2026, 10:00');
    await page.keyboard.press('Escape');await page.locator('#taskDialog').waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement.id==='editTaskBtn');
    await page.locator('#globalSearch').fill(' tsk-0002 ');await page.locator('#searchBtn').click();
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['1','0','1']);
    assert.equal(await page.locator('.group-toggle[aria-expanded="false"]').count(),1);
    await page.locator('#clearSearchBtn').click();await page.locator('[data-view="status"]').click();
    assert.equal(await page.locator('.status-group-row').count(),4);
    assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['3','1','0','1','1']);
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
  const colorButton=page.getByRole('button',{name:'Customer Color for Renamed Customer'});await colorButton.click();await page.getByRole('listbox',{name:'Colors for Renamed Customer'}).getByRole('option',{name:'#FB923C'}).click();await page.getByRole('button',{name:'Customer Color for Renamed Customer'}).waitFor();
  await page.locator('#manageCustomersDialog [data-close="manageCustomersDialog"]').first().click();
  const fresh=await api(`/api/tasks/${original.taskId}`,undefined,'GET');assert.equal(fresh.customerName,'Renamed Customer');
  assert.equal((await api('/api/customers',undefined,'GET'))[0].color,'#FB923C');
  await api(`/api/tasks/${original.taskId}`,undefined,'DELETE');await page.reload();await page.locator('#healthBadge.ok').waitFor();assert.equal(await page.locator('[data-task-id]').count(),0);
  await page.locator('[data-view="all"]').click();await page.locator(`[data-task-id="${original.taskId}"]`).dblclick();await page.locator('#taskStatus').selectOption('KIV');await page.locator('#taskStatus').press('Tab');await page.getByText('Status saved.',{exact:true}).waitFor();
  await page.locator('#taskDialog [data-close="taskDialog"]').click();await page.locator('[data-view="weekly"]').click();await page.locator(`[data-task-id="${original.taskId}"]`).waitFor();
  const restored=await api(`/api/tasks/${original.taskId}`,undefined,'GET');assert.equal(restored.status,'KIV');assert.equal(restored.end,null);
  await ctx.close();
}));

test('Customer deletion guard remains active on desktop and mobile', async () => harness(async ({browser,url,api}) => {
  const linkedName=`Linked Customer ${Date.now()}`;
  const created=await api('/api/tasks',{customerName:linkedName,taskTitle:'Linked task'});
  for(const width of [1440,390]) {
    const unusedName=`Unused Customer ${width}`;await api('/api/customers',{name:unusedName});
    const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.setDefaultTimeout(8000);page.on('dialog',d=>d.accept());
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();await page.locator('#manageCustomersBtn').click();
    await page.waitForFunction(name=>[...document.querySelectorAll('.customer-management-row input')].some(input=>input.value===name),linkedName);
    await page.locator(`[aria-label="Delete ${linkedName}"]`).click();
    await page.locator('#manageCustomersError').filter({hasText:'referenced by 1 Task'}).waitFor();
    await page.locator(`[aria-label="Delete ${unusedName}"]`).click();
    await page.waitForFunction(name=>![...document.querySelectorAll('.customer-management-row input')].some(input=>input.value===name),unusedName);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await ctx.close();
  }
  assert.ok(created.taskId);
}));

test('CR-009–011: timed Alerts, Manage Customers Add, inline Delete and mobile fit', async () => harness(async ({browser,url,api}) => {
  for (const width of [1440,390]) {
    const taskRecord=await api('/api/tasks',{customerName:`CR${width} Customer`,taskTitle:'Referenced customer'});
    await api('/api/customers',{name:`CR${width} Unused`});
    const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();
    await page.clock.install();page.setDefaultTimeout(8000);page.on('dialog',d=>d.accept());
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();await page.locator('#manageCustomersBtn').click();await page.waitForFunction(()=>document.querySelectorAll('.customer-management-row').length>=2);
    await page.getByRole('button',{name:'Add Customer',exact:true}).first().click();
    await page.locator('#manageNewCustomerName').fill(`CR${width} Added`);
    await page.getByRole('button',{name:'Customer Color',exact:true}).click();
    const colorList=page.getByRole('listbox',{name:'Available customer colors'});
    const option=colorList.getByRole('option').first();const chosen=await option.locator('code').innerText();await option.click();
    await page.locator('.managed-customer-add').getByRole('button',{name:'Add Customer',exact:true}).click();
    await page.getByText(`Customer CR${width} Added added.`,{exact:true}).waitFor();
    assert.equal((await api('/api/customers',undefined,'GET')).find(c=>c.name===`CR${width} Added`).color,chosen);
    const addedRow=page.locator('.customer-management-row').filter({has:page.locator(`input[value="CR${width} Added"]`)});
    const bounds=await addedRow.evaluate(row=>{const input=row.querySelector('.customer-name-editor').getBoundingClientRect();const color=row.querySelector('button[aria-label^="Customer Color for"]').getBoundingClientRect();const del=row.querySelector('button[aria-label^="Delete "]').getBoundingClientRect();return {input:{x:input.x,y:input.y,width:input.width,height:input.height},color:{x:color.x,y:color.y,width:color.width,height:color.height},del:{x:del.x,y:del.y,width:del.width,height:del.height},row:{width:row.getBoundingClientRect().width}}});
    if(width>=768){assert.ok(Math.abs(bounds.input.y-bounds.color.y)<8,JSON.stringify(bounds));assert.ok(Math.abs(bounds.input.y-bounds.del.y)<8,'Delete aligns with the customer controls on desktop');}
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Manage Customers must not overflow on mobile');
    await page.clock.fastForward(2000);
    const seedCustomer=page.locator('.customer-management-row').filter({has:page.locator(`input[value="CR${width} Customer"]`)}).locator('.customer-name-editor');await seedCustomer.fill(`CR${width} Renamed`);await page.keyboard.press('Tab');
    await page.getByText('Customer saved; linked Tasks updated.',{exact:true}).waitFor();
    assert.equal(await page.locator('#notification-region [data-slot="alert"]').count(),2,'rapid messages stack independently');
    await page.clock.fastForward(3000);await page.locator('#notification-region [data-slot="alert"]').waitFor({state:'visible'});
    assert.equal(await page.locator('#notification-region [data-slot="alert"]').count(),1,'first notification expires at five seconds');
    await page.clock.fastForward(2000);await page.locator('#notification-region [data-slot="alert"]').waitFor({state:'hidden'});
    await page.locator('#manageCustomersDialog [data-close="manageCustomersDialog"]').last().click();
    await page.locator('#newTaskBtn').click();await page.locator('#taskDialog').waitFor();
    await page.getByRole('button',{name:'Customer Name'}).click();
    await page.getByRole('option',{name:new RegExp(`CR${width} Added`)}).waitFor();
    if(process.env.TASK_TRACKER_EVIDENCE_DIR)await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`cr009-011-${width}.png`),fullPage:true,animations:'disabled'});
    await ctx.close();
    assert.ok(taskRecord.taskId);
  }
}));

// Release acceptance: run only in an environment with supported browser QA.
test('Sites correction: all cards, repeated clicks, accordions, export and line tabs', async () => harness(async ({browser,url,temp}) => {
  const fixture=[task('carry','2026-10-09T10:00:00','Work in Progress'),task('new','2026-10-13T10:00:00','KIV'),task('closed','2026-10-09T10:00:00','Closed')];
  for(const width of [1440,390]) {
    const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true}), page=await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-10-15T04:00:00Z'));
    await page.route('**/api/tasks',r=>r.fulfill({json:fixture}));
    await page.route('**/api/customers',r=>r.fulfill({json:[{name:'Customer A',color:'#F87171'}]}));
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
    const ids=async()=> (await page.locator('[data-task-id]').evaluateAll(ns=>ns.map(n=>n.dataset.taskId))).sort();
    const card=label=>page.locator('#summaryRow').getByRole('button',{name:new RegExp('^'+label+'\\s')});
    for(const [label,expected] of [['Overall Total',['carry','closed','new']],['Carry Over',['carry','closed']],['New This Week',['new']]]) {
      await card(label).click();assert.deepEqual(await ids(),expected);
      assert.equal(await card(label).getAttribute('aria-pressed'),'true');
      assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['3','2','1']);
      console.log(JSON.stringify({width,view:'weekly',card:label,ids:await ids()}));
      if(process.env.TASK_TRACKER_EVIDENCE_DIR&&label==='New This Week')await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`weekly-${width}.png`),fullPage:true,animations:'disabled'});
      if(label!=='Overall Total'){await card(label).click();assert.deepEqual(await ids(),['carry','closed','new']);}
    }
    for(const toggle of await page.locator('.group-toggle').all()){
      await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      await toggle.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      await toggle.press('Space');assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();
    }
    await card('Carry Over').click();const pending=page.waitForEvent('download');await page.locator('#exportBtn').click();
    const download=await pending,file=path.join(temp,'filtered-'+width+'.xlsx');await download.saveAs(file);
    const book=XLSX.readFile(file),rows=XLSX.utils.sheet_to_json(book.Sheets.Tasks,{header:1});
    assert.equal(rows.length,4);assert.equal(rows[1][0],'Carry Over (2)');
    await page.locator('[data-view="status"]').click();
    assert.equal(await page.locator('.group-toggle[aria-expanded="false"]').count(),1);
    for(const [label,expected] of [['All',['carry','closed','new']],['Work in Progress',['carry']],['Pending with Customer',[]],['KIV',['new']],['Closed',['closed']]]){
      await card(label).click();assert.deepEqual(await ids(),expected);
      assert.equal(await card(label).getAttribute('aria-pressed'),'true');
      assert.deepEqual(await page.locator('#summaryRow strong').allTextContents(),['3','1','0','1','1']);
      console.log(JSON.stringify({width,view:'status',card:label,ids:await ids()}));
      if(process.env.TASK_TRACKER_EVIDENCE_DIR&&label==='KIV')await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`status-${width}.png`),fullPage:true,animations:'disabled'});
      if(label!=='All'){await card(label).click();assert.deepEqual(await ids(),['carry','closed','new']);}
    }
    for(const toggle of await page.locator('.group-toggle').all()){
      const initial=await toggle.getAttribute('aria-expanded');
      await toggle.press('Enter');assert.notEqual(await toggle.getAttribute('aria-expanded'),initial);
      await toggle.press('Space');assert.equal(await toggle.getAttribute('aria-expanded'),initial);
      await toggle.click();await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),initial);
    }
    const tabPositions=await page.locator('.view-tab').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));
    assert.ok(tabPositions.every(y=>y===tabPositions[0]),'tabs remain one line');
    await page.locator('#globalSearch').fill('unmatched');await page.locator('#searchBtn').click();
    assert.equal(await page.locator('.group-toggle[aria-expanded="false"]').count(),4);
    await page.locator('#clearSearchBtn').click();assert.equal(await page.locator('.group-toggle[aria-expanded="true"]').count(),3);
    await page.locator('[data-task-id="carry"]').press('Enter');await page.locator('#taskDialog').waitFor();await page.keyboard.press('Escape');
    await page.locator('#taskDialog').waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.id==='editTaskBtn');
    const chrome=await page.locator('.view-tab').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return {top:s.borderTopWidth,left:s.borderLeftWidth,right:s.borderRightWidth,bg:s.backgroundColor,bottom:s.borderBottomColor}}));
    for(const s of chrome){assert.equal(s.top,'0px');assert.equal(s.left,'0px');assert.equal(s.right,'0px');assert.equal(s.bg,'rgba(0, 0, 0, 0)');}
    assert.equal(chrome[1].bottom,'rgb(37, 99, 235)');
    await page.locator('[data-view="weekly"]').click();await page.locator('[data-view="weekly"]').press('ArrowRight');
    await page.locator('[data-view="status"][aria-selected="true"]').waitFor();
    assert.equal(await page.locator('[data-view="status"]').getAttribute('aria-selected'),'true');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.TASK_TRACKER_EVIDENCE_DIR)await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`correction-${width}.png`),fullPage:true,animations:'disabled'});
    await ctx.close();
  }
}));

test('CR-012: real Chromium theme acceptance, persistence, OS preference, surfaces and preserved state at 1440/390px', async () => harness(async ({browser,url,api}) => {
  await api('/api/customers',{name:'Customer A',color:'#F87171'});
  await api('/api/tasks',{customerName:'Customer A',taskTitle:'Theme acceptance task',taskDescription:'A stable task',note:'Preserve colors'});
  const evidence=process.env.TASK_TRACKER_EVIDENCE_DIR;
  if(evidence)fs.mkdirSync(evidence,{recursive:true});
  for(const width of [1440,390]) {
    const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:'dark'}), page=await ctx.newPage();
    page.setDefaultTimeout(8000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
    const theme=()=>page.locator('html').getAttribute('data-theme');
    const toggle=page.locator('#themeToggle');
    assert.equal(await theme(),'dark');assert.equal(await toggle.getAttribute('aria-label'),'Switch to light mode');
    assert.equal(await toggle.locator('svg.lucide-sun').count(),1);
    await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    assert.equal(await toggle.locator('svg.lucide-moon').count(),1);
    await page.locator('#globalSearch').fill('retain search');
    await toggle.focus();await toggle.press('Enter');assert.equal(await theme(),'dark');
    assert.equal(await page.locator('#globalSearch').inputValue(),'retain search');
    assert.equal(await page.evaluate(()=>localStorage.getItem('task-tracker-theme')),'dark');
    await page.reload();await page.locator('#healthBadge.ok').waitFor();assert.equal(await theme(),'dark');
    await page.emulateMedia({colorScheme:'light'});assert.equal(await theme(),'dark');
    await toggle.press('Space');assert.equal(await theme(),'light');
    await page.reload();await page.locator('#healthBadge.ok').waitFor();assert.equal(await theme(),'light');
    await page.emulateMedia({colorScheme:'dark'});assert.equal(await theme(),'light');
    const box=await toggle.boundingBox();assert.ok(box.x+box.width<=width&&box.y<100,'toggle visible at top right');
    const peer=await ctx.newPage();await peer.goto(url);await peer.locator('#healthBadge.ok').waitFor();
    for(const mode of ['light','dark']) {
      if(await theme()!==mode)await toggle.click();
      assert.equal(await theme(),mode);
      const bg=await page.locator('header').evaluate(n=>getComputedStyle(n).backgroundColor);
      assert.equal(bg,mode==='dark'?'rgb(24, 24, 27)':'rgb(255, 255, 255)');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
      for(const view of ['weekly','status','all']) {
        await page.locator(`[data-view="${view}"]`).click();
        await page.waitForFunction(v=>document.querySelector(`[data-view="${v}"]`).getAttribute('data-state')==='active',view);
        if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-${view}.png`),fullPage:true,animations:'disabled'});
      }
      await page.locator('#newTaskBtn').click();await page.locator('#taskTitle').fill('Unsaved theme draft');
      const other=mode==='dark'?'light':'dark';
      if(await peer.locator('html').getAttribute('data-theme')!==other)await peer.locator('#themeToggle').click();
      await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,other);
      assert.equal(await page.locator('#taskTitle').inputValue(),'Unsaved theme draft');
      await peer.locator('#themeToggle').click();await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,mode);
      await page.locator('button[aria-label="Customer Name"]').click();
      await page.getByRole('listbox',{name:'Customers',exact:true}).waitFor();
      assert.equal(await page.getByRole('listbox',{name:'Customers',exact:true}).evaluate(n=>getComputedStyle(n).backgroundColor),bg);
      const swatches=await page.getByRole('listbox',{name:'Customers',exact:true}).locator('[style]').evaluateAll(nodes=>nodes.map(n=>n.style.backgroundColor));
      assert.deepEqual(swatches,['rgb(248, 113, 113)']);
      if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-new-dropdown.png`),fullPage:true,animations:'disabled'});
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      await page.locator('#taskDialog').waitFor({state:'hidden'});
      await page.locator('[data-task-id]').first().dblclick();await page.locator('#taskDialog').waitFor();
      if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-edit.png`),fullPage:true,animations:'disabled'});
      await page.keyboard.press('Escape');
      await page.locator('#manageCustomersBtn').click();
      const colorButton=page.locator('[aria-label^="Customer Color for"]').first();await colorButton.click();
      if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-customer-colors.png`),fullPage:true,animations:'disabled'});
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      await page.locator('#manageCustomersDialog').waitFor({state:'hidden'});
      // Generate a controlled API failure only in this isolated local test database.
      await page.route('**/api/tasks',r=>r.request().method()==='POST'?r.fulfill({status:500,json:{error:'Theme alert acceptance'}}):r.continue());
      await page.locator('#newTaskBtn').click();await page.locator('button[aria-label="Customer Name"]').click();
      await page.getByRole('option',{name:/Customer A/}).click();await page.locator('#taskTitle').fill('Alert test');
      await page.getByRole('button',{name:'Create Task',exact:true}).click();await page.locator('#taskDialogError').waitFor();
      assert.equal(await page.locator('#taskDialogError').evaluate(n=>getComputedStyle(n).backgroundColor),mode==='dark'?'rgb(59, 25, 30)':'rgb(254, 242, 242)');
      if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-alert.png`),fullPage:true,animations:'disabled'});
      await page.unroute('**/api/tasks');await page.getByRole('button',{name:'Create Task',exact:true}).click();
      await page.locator('.notification-success').waitFor();
      assert.equal(await page.locator('.notification-success').evaluate(n=>getComputedStyle(n).backgroundColor),mode==='dark'?'rgb(16, 43, 32)':'rgb(240, 253, 244)');
      if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-success.png`),fullPage:true,animations:'disabled'});
      await page.locator('.notification-dismiss').click();
      await page.route('**/api/health',r=>r.fulfill({status:500,json:{error:'Theme error alert'}}));
      await page.reload();await page.locator('.notification-error').waitFor();
      assert.equal(await page.locator('.notification-error').evaluate(n=>getComputedStyle(n).backgroundColor),mode==='dark'?'rgb(59, 25, 30)':'rgb(254, 242, 242)');
      if(evidence)await page.screenshot({path:path.join(evidence,`theme-${mode}-${width}-error.png`),fullPage:true,animations:'disabled'});
      await page.unroute('**/api/health');await page.reload();await page.locator('#healthBadge.ok').waitFor();
    }
    assert.deepEqual(errors,[]);await ctx.close();
  }
  const blocked=await browser.newContext({colorScheme:'dark'}),p=await blocked.newPage();
  await p.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})});
  await p.goto(url);await p.locator('#healthBadge.ok').waitFor();assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');
  await p.locator('#themeToggle').click();assert.equal(await p.locator('html').getAttribute('data-theme'),'light');await blocked.close();
}));

test('CR-013/014: single-row customer summaries, exact filtered counts, colors, overflow and keyboard in both themes', async()=>harness(async({browser,url})=>{
  const customers=Array.from({length:16},(_,i)=>({name:i<3?['JXM','MMM','VSTEC'][i]:`Customer ${String(i).padStart(2,'0')}`,color:['#F87171','#60A5FA','#4ADE80'][i%3]}));
  const fixture=customers.flatMap((c,i)=>Array.from({length:i===0?3:1},(_,j)=>({...task(`C${i}-${j}`,'2026-10-09T10:00:00','Work in Progress'),customerName:c.name})))
    .concat([{...task('missing','2026-10-09T10:00:00','Work in Progress'),customerName:'Missing'}, {...task('blank','2026-10-09T10:00:00','Work in Progress'),customerName:''}, {...task('new','2026-10-13T10:00:00','KIV'),customerName:'MMM'}, {...task('pending','2026-10-09T10:00:00','Pending with Customer'),customerName:'JXM'}]);
  const evidence=process.env.TASK_TRACKER_EVIDENCE_DIR;if(evidence)fs.mkdirSync(evidence,{recursive:true});
  for(const width of [1440,390])for(const mode of ['light','dark']) {
    const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:mode}),page=await ctx.newPage();page.setDefaultTimeout(8000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-15T04:00:00Z'));
    let live=fixture;
    await page.route('**/api/tasks',r=>r.fulfill({json:live}));
    await page.route('**/api/customers',r=>r.fulfill({json:customers}));
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
    const verify=async()=>{
      const groups=await page.locator('.status-group-row').evaluateAll(nodes=>nodes.map(n=>{
        const header=n.querySelector('.group-header'),toggle=n.querySelector('.group-toggle'),summary=n.querySelector('.customer-summary');
        const badges=[...n.querySelectorAll('.customer-count-badge')];
        const rect=header.getBoundingClientRect(),control=toggle.getBoundingClientRect();
        let next=n.nextElementSibling;const rows=[];while(next&&!next.classList.contains('status-group-row')){if(next.dataset.taskId)rows.push({id:next.dataset.taskId,customer:next.children[1].textContent});next=next.nextElementSibling;}
        return {label:toggle.querySelector('span').textContent,total:+n.querySelector('.group-count-badge').textContent,expanded:toggle.getAttribute('aria-expanded')==='true',rows,badges:badges.map(b=>({name:b.dataset.customer,count:+b.dataset.count,color:b.querySelector('.color-dot').style.backgroundColor})),rect:{left:rect.left,right:rect.right,height:rect.height},controlRight:control.right,summary:summary?{width:summary.clientWidth,scrollWidth:summary.scrollWidth,overflow:getComputedStyle(summary).overflowX,wrap:getComputedStyle(summary).whiteSpace}:null,ys:badges.map(b=>b.getBoundingClientRect().top)};
      }));
      for(const g of groups){
        assert.equal(g.badges.reduce((n,b)=>n+b.count,0),g.total,g.label+' counts');
        assert.ok(g.rect.left>=0&&g.rect.right<=width,g.label+' header inside viewport');
        assert.ok(g.rect.height<55,'header stays compact on one line');
        assert.ok(g.controlRight<=width,'toggle remains visible');
        assert.ok(g.ys.every(y=>Math.abs(y-g.ys[0])<1),'all badges on one row');
        if(g.summary){assert.equal(g.summary.wrap,'nowrap');assert.equal(g.summary.overflow,'auto');assert.ok(g.summary.width>0);}
        if(g.expanded){const expected={};for(const row of g.rows){const name=customers.some(c=>c.name===row.customer)?row.customer:'Unassigned';expected[name]=(expected[name]||0)+1;}assert.deepEqual(Object.fromEntries(g.badges.map(b=>[b.name,b.count])),expected);}
        for(const b of g.badges){const c=customers.find(c=>c.name===b.name);if(c){const rgb=c.color==='#F87171'?'rgb(248, 113, 113)':c.color==='#60A5FA'?'rgb(96, 165, 250)':'rgb(74, 222, 128)';assert.equal(b.color,rgb);}}
      }
      const style=await page.locator('.line-tabs').evaluate(n=>{const s=getComputedStyle(n);return {border:s.borderBottomWidth,shadow:s.boxShadow}});
      assert.equal(style.border,'0px');assert.equal(style.shadow,'none');
      const active=page.locator('.view-tab[data-state="active"]');assert.equal(await active.evaluate(n=>getComputedStyle(n).borderBottomWidth),'2px');
      assert.equal(await active.evaluate(n=>getComputedStyle(n).borderBottomColor),mode==='light'?'rgb(37, 99, 235)':'rgb(147, 197, 253)');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      return groups;
    };
    for(const view of ['weekly','status']) {
      await page.locator(`[data-view="${view}"]`).click();await verify();
      const first=page.locator('.group-toggle').first();const summaryText=await page.locator('.customer-summary').first().textContent();
      await first.click();assert.equal(await first.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('.customer-summary').first().textContent(),summaryText);await verify();
      if(evidence)await page.screenshot({path:path.join(evidence,`cr013-014-${mode}-${width}-${view}-collapsed.png`),fullPage:true,animations:'disabled'});
      await first.press('Enter');assert.equal(await first.getAttribute('aria-expanded'),'true');
      await first.press('Space');assert.equal(await first.getAttribute('aria-expanded'),'false');await first.click();
      const summary=page.locator('.customer-summary').first();
      const overflow=await summary.evaluate(n=>n.scrollWidth>n.clientWidth);assert.ok(overflow,'many customers overflow');
      await summary.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.customer-summary').scrollLeft>0);
      assert.ok(await summary.evaluate(n=>n.scrollLeft>0),'keyboard horizontal scroll works');
      await verify();
      if(evidence)await page.screenshot({path:path.join(evidence,`cr013-014-${mode}-${width}-${view}.png`),fullPage:true,animations:'disabled'});
      await page.locator('#globalSearch').fill('JXM');await page.locator('#searchBtn').click();
      const searched=await verify();assert.ok(searched.every(g=>g.badges.every(b=>b.name==='JXM')));
      await page.locator('#clearSearchBtn').click();await verify();
    }
    const card=page.locator('#summaryRow').getByRole('button',{name:/^Work in Progress\s/});await card.click();const filtered=await verify();assert.equal(filtered.length,1);
    assert.equal(filtered[0].label,'Work in Progress');assert.equal(filtered[0].badges.find(b=>b.name==='Unassigned').count,2);
    await card.click();await verify();
    await page.locator('#globalSearch').fill('nothing matches');await page.locator('#searchBtn').click();assert.ok((await verify()).every(g=>g.total===0&&g.badges.length===0));
    await page.locator('#clearSearchBtn').click();
    await page.locator('[data-view="weekly"]').click();await page.locator('[data-view="weekly"]').press('ArrowRight');
    await page.locator('[data-view="status"][aria-selected="true"]').waitFor();await verify();
    await page.locator('[data-view="all"]').click();assert.equal(await page.locator('.customer-summary').count(),0);
    // Refreshed task/customer responses must recompute, using no production writes.
    live=fixture.slice(0,1);await page.reload();await page.locator('#healthBadge.ok').waitFor();const refreshed=await verify();assert.equal(refreshed.reduce((n,g)=>n+g.total,0),1);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({release:'CR-013/014',width,mode,result:'passed'}));await ctx.close();
  }
}));
