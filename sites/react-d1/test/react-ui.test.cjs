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
    if(process.env.TASK_TRACKER_SCREENSHOT && timezoneId==='Asia/Kuala_Lumpur')await page.screenshot({path:process.env.TASK_TRACKER_SCREENSHOT,fullPage:true});
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

test('Task form enhancements: Tracker Link, lifecycle row, swatches and guarded Customer delete', async () => harness(async ({browser,url,api}) => {
  const created=await api('/api/tasks',{customerName:'Linked Customer',taskTitle:'Linked task',trackerLink:'https://tracker.example/item/1'});
  await api('/api/customers',{name:'Unused Customer'});
  for(const width of [1440,390]) {
    const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.setDefaultTimeout(8000);page.on('dialog',d=>d.accept());
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();
    await page.locator('[data-view="all"]').click();
    const link=page.getByRole('link',{name:`Open Tracker Link for ${created.taskId}`});
    assert.equal(await link.getAttribute('href'),'https://tracker.example/item/1');assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
    await page.locator(`[data-task-id="${created.taskId}"]`).dblclick();await page.locator('#taskDialog').waitFor();
    assert.equal(await page.locator('#trackerLink').inputValue(),'https://tracker.example/item/1');
    const row=page.locator('[data-testid="task-lifecycle-row"]');
    if(width>=640){const tops=await row.locator('label').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));assert.ok(tops.every(y=>y===tops[0]),'Status / Created / End share one desktop row');}
    await page.locator('#trackerLink').fill('javascript:alert(1)');await page.locator('#trackerLink').press('Tab');
    assert.match(await page.locator('#taskDialogError').innerText(),/HTTP or HTTPS/);
    await page.locator('#trackerLink').fill('https://tracker.example/item/2');await page.locator('#trackerLink').press('Tab');
    await page.getByText('trackerLink saved.',{exact:true}).waitFor();
    await page.locator('#taskDialog [data-close="taskDialog"]').click();
    const updated=await api(`/api/tasks/${created.taskId}`,undefined,'GET');assert.equal(updated.trackerLink,'https://tracker.example/item/2');
    await page.locator('#manageCustomersBtn').click();
    const colorButton=page.getByRole('button',{name:'Customer Color for Linked Customer'});await colorButton.click();
    const options=page.getByRole('listbox',{name:'Colors for Linked Customer'});
    assert.ok(await options.getByRole('option',{name:'#F87171'}).count());
    const swatch=options.getByRole('option',{name:'#F87171'}).locator('span',{ });
    assert.equal(await swatch.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(248, 113, 113)');
    await colorButton.press('Escape');
    console.log('Manage Customers debug', await page.locator('.customer-management-row').evaluateAll(rows=>rows.map(row=>({inputs:[...row.querySelectorAll('input')].map(i=>i.value),buttons:[...row.querySelectorAll('button')].map(b=>({label:b.getAttribute('aria-label'),text:b.innerText}))}))));
    await page.getByRole('button',{name:'Delete Linked Customer'}).click();
    await page.locator('#manageCustomersError').filter({hasText:'referenced by 1 Task'}).waitFor();
    await page.getByRole('button',{name:'Delete Unused Customer'}).click();
    await page.waitForFunction(()=>!document.querySelector('.customer-management-row input')?.value.includes('Unused Customer'));
    await ctx.close();
  }
}));

test('CR-009–011: timed Alerts, Manage Customers Add, inline Delete and mobile fit', async () => harness(async ({browser,url,api}) => {
  for (const width of [1440,390]) {
    const taskRecord=await api('/api/tasks',{customerName:`CR${width} Customer`,taskTitle:'Referenced customer'});
    await api('/api/customers',{name:`CR${width} Unused`});
    const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();
    await page.clock.install();page.setDefaultTimeout(8000);page.on('dialog',d=>d.accept());
    await page.goto(url);await page.locator('#healthBadge.ok').waitFor();await page.locator('#manageCustomersBtn').click();
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
    if(width>=768){assert.ok(Math.abs(bounds.input.y-bounds.color.y)<2);assert.ok(Math.abs(bounds.input.y-bounds.del.y)<2,'Delete aligns with the customer controls on desktop');}
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Manage Customers must not overflow on mobile');
    await page.clock.fastForward(2000);
    await page.locator('.customer-name-editor').first().fill(`CR${width} Renamed`);await page.locator('.customer-name-editor').first().press('Tab');
    await page.getByText('Customer saved; linked Tasks updated.',{exact:true}).waitFor();
    assert.equal(await page.locator('#notification-region [data-slot="alert"]').count(),2,'rapid messages stack independently');
    await page.clock.fastForward(3000);await page.locator('#notification-region [data-slot="alert"]').waitFor({state:'visible'});
    assert.equal(await page.locator('#notification-region [data-slot="alert"]').count(),1,'first notification expires at five seconds');
    await page.clock.fastForward(2000);await page.locator('#notification-region [data-slot="alert"]').waitFor({state:'hidden'});
    await page.locator('#manageCustomersDialog [data-close="manageCustomersDialog"]').click();
    await page.locator('#newTaskBtn').click();await page.locator('#taskDialog').waitFor();
    await page.getByRole('button',{name:'Customer Name'}).click();
    await page.getByRole('option',{name:new RegExp(`CR${width} Added`)}).waitFor();
    if(process.env.TASK_TRACKER_EVIDENCE_DIR)await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`cr009-011-${width}.png`),fullPage:true});
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
      if(process.env.TASK_TRACKER_EVIDENCE_DIR&&label==='New This Week')await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`weekly-${width}.png`),fullPage:true});
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
      if(process.env.TASK_TRACKER_EVIDENCE_DIR&&label==='KIV')await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`status-${width}.png`),fullPage:true});
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
    if(process.env.TASK_TRACKER_EVIDENCE_DIR)await page.screenshot({path:path.join(process.env.TASK_TRACKER_EVIDENCE_DIR,`correction-${width}.png`),fullPage:true});
    await ctx.close();
  }
}));
