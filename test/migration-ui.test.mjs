import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import XLSX from 'xlsx';
import { startServer } from '../scripts/test-server.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
test('migration acceptance: customer management, restore, pagination, weekly boundaries, export contents and mobile',async()=>{
 const instance=process.env.TEST_BASE_URL?null:await startServer(0);
 const base=process.env.TEST_BASE_URL||`http://127.0.0.1:${instance.server.address().port}`;
 const browser=await chromium.launch({headless:true,downloadsPath:path.resolve('.sites-runtime/downloads')});
 try {
  const context=await browser.newContext({acceptDownloads:true,timezoneId:'America/New_York'});
  const page=await context.newPage();
  const api=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.ok(r.ok,await r.clone().text());return r.json();};
  const tasks=[];for(let i=0;i<28;i++)tasks.push(await api('/api/tasks','POST',{customerName:'Migration Customer',taskTitle:`Pagination ${String(i).padStart(2,'0')}`}));
  await api(`/api/tasks/${tasks[0].taskId}/time`,'PATCH',{created:'2020-01-01T00:00:00+08:00'});
  await api(`/api/tasks/${tasks[1].taskId}/time`,'PATCH',{created:'2020-01-01T00:00:00+08:00',end:'2020-01-02T00:00:00+08:00',status:'Closed'});
  await api(`/api/tasks/${tasks[2].taskId}`,'DELETE');
  await page.goto(base);await page.locator('#healthBadge.ok').waitFor();
  await page.locator(`tr[data-task-id="${tasks[0].taskId}"]`).waitFor();
  assert.equal(await page.locator(`tr[data-task-id="${tasks[1].taskId}"]`).count(),0);
  assert.equal(await page.locator(`tr[data-task-id="${tasks[2].taskId}"]`).count(),0);
  await page.locator('[data-view="all"]').click();
  assert.equal(await page.locator('#tasksTable tbody tr[data-task-id]').count(),25);
  await page.locator('.dt-paging-button.next').click();
  assert.equal(await page.locator('#tasksTable tbody tr[data-task-id]').count(),3);
  await page.locator('#globalSearch').fill(tasks[2].taskId);await page.locator('#searchBtn').click();
  await page.locator(`tr[data-task-id="${tasks[2].taskId}"]`).click();await page.locator('#editTaskBtn').click();
  await page.locator('#taskStatus').selectOption('KIV');await page.locator('#taskStatus').press('Tab');await page.getByText('Status saved.').waitFor();
  await page.locator('#taskDialog .icon-button[data-close="taskDialog"]').click();
  const restored=await api(`/api/tasks/${tasks[2].taskId}`);assert.equal(restored.status,'KIV');assert.equal(restored.end,null);
  await page.locator('#manageCustomersBtn').click();
  await page.locator('.customer-name-editor').fill('Renamed Migration');await page.locator('.customer-name-editor').press('Tab');
  await page.getByText('Customer renamed to Renamed Migration; linked Tasks were updated.').waitFor();
  await page.locator('.customer-color-editor').selectOption('#FB923C');await page.getByText('Color updated for Renamed Migration.').waitFor();
  await page.locator('#manageCustomersDialog [data-close]').first().click();
  const customers=await api('/api/customers');assert.equal(customers[0].name,'Renamed Migration');assert.equal(customers[0].color,'#FB923C');
  assert.ok((await api('/api/tasks')).every(t=>t.customerName==='Renamed Migration'));
  await page.locator('#clearSearchBtn').click();
  // The original acceptance suite checks the native download event/filename.
  // Capture generated workbook bytes here to verify content without relying on OS download permissions.
  await page.evaluate(()=>{window.XLSX.writeFile=(book,name)=>{window.__export={name,bytes:window.XLSX.write(book,{type:'base64',bookType:'xlsx'})};};});
  await page.locator('#exportBtn').click();const exported=await page.evaluate(()=>window.__export);
  assert.match(exported.name,/^TaskTracker_ShowAllData_\d{8}\.xlsx$/);
  const workbook=XLSX.read(Buffer.from(exported.bytes,'base64'),{type:'buffer'});
  const rows=XLSX.utils.sheet_to_json(workbook.Sheets.Tasks);
  assert.equal(rows.length,28);assert.ok(rows.every(r=>r['Customer Name']==='Renamed Migration'));
  await page.reload();await page.locator('#healthBadge.ok').waitFor();assert.equal((await api('/api/tasks')).length,28);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#newTaskBtn').click();await page.locator('#taskDialog').waitFor();
  const bounds=await page.locator('#taskDialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391);
  await page.screenshot({path:'.sites-runtime/mobile.png'});
  await context.close();
 } finally {await browser.close();if(instance)await instance.close();}
});
