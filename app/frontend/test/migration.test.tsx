import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskTable } from '../src/TaskTable'
import { createSaveQueue } from '../src/lib/api'
import { weekBounds, viewTasks, groupsFor, exportRows, epoch, toInput, type Task } from '../src/lib/model'

const bounds=weekBounds(new Date('2026-10-15T12:00:00Z'))
const fixture:Task[]=[{taskId:'TSK-0001',customerName:'Customer A',taskTitle:'Earlier',taskDescription:'Description',note:'Note',created:'2026-10-09T10:00:00+08:00',end:null,status:'Work in Progress'},{taskId:'TSK-0002',customerName:'Customer B',taskTitle:'New',taskDescription:'Description',note:'Note',created:'2026-10-13T10:00:00+08:00',end:null,status:'KIV'}]
function markup(tasks:Task[],view:'weekly'|'status'='weekly',selected:string|null=null){return renderToStaticMarkup(<TaskTable tasks={tasks} groups={groupsFor(tasks,view,bounds)} view={view} customers={[]} selected={selected} onSelect={()=>{}} onEdit={()=>{}} onOrdered={()=>{}}/>)}
test('migrated PRD sample renders two independent lists, eight fields, matching group totals',()=>{
  const tasks=viewTasks(fixture,'weekly','',bounds),html=markup(tasks)
  assert.match(html,/Carry Over \(1\)[\s\S]*TSK-0001[\s\S]*New This Week \(1\)[\s\S]*TSK-0002/)
  assert.equal((html.match(/data-task-id=/g)||[]).length,2)
  assert.equal((html.match(/<td /g)||[]).length,18)
  assert.equal(groupsFor(tasks,'weekly',bounds).reduce((n,[,t])=>n+t.length,0),tasks.length)
})
test('Malaysia Monday boundaries, historical terminal and future exclusions in React model',()=>{
  const tasks=[['before','2026-10-11T23:59:59','KIV'],['start','2026-10-12T00:00:00','Closed'],['end','2026-10-19T00:00:00','KIV'],['oldClosed','2026-10-09T00:00:00','Closed'],['deleted','2026-10-13T00:00:00','Deleted']].map(([taskId,created,status])=>({...fixture[0],taskId,created,status})) as Task[]
  assert.deepEqual(groupsFor(viewTasks(tasks,'weekly','',bounds),'weekly',bounds).map(([n,t])=>[n,t.map(t=>t.taskId)]),[['Carry Over',['before']],['New This Week',['start']]])
  assert.equal(epoch('2026-10-12T00:00:00'),bounds.start)
  assert.equal(weekBounds(new Date('2026-10-11T15:59:59Z')).end,bounds.start)
  assert.equal(weekBounds(new Date('2026-10-11T16:00:00Z')).start,bounds.start)
})
test('search and empty groups retain synchronized counts and full search field scope',()=>{
  const tasks=viewTasks(fixture,'weekly',' tsk-0002 ',bounds),html=markup(tasks)
  assert.match(html,/Carry Over \(0\)[\s\S]*No results found[\s\S]*New This Week \(1\)/)
  assert.doesNotMatch(html,/TSK-0001/)
  assert.equal((markup(viewTasks(fixture,'weekly','no match',bounds)).match(/No results found/g)||[]).length,2)
  for(const q of ['customer a','earlier','description','note'])assert.ok(viewTasks(fixture,'weekly',q,bounds).length)
  assert.equal(viewTasks(fixture,'weekly','work in progress',bounds).length,0)
})
test('editing status or Created recalculates membership and preserves selected row',()=>{
  const tasks=structuredClone(fixture);tasks[0].status='Closed'
  assert.doesNotMatch(markup(viewTasks(tasks,'weekly','',bounds)),/TSK-0001/)
  tasks[0].created='2026-10-14T00:00:00+08:00'
  const html=markup(viewTasks(tasks,'weekly','',bounds),'weekly','TSK-0001')
  assert.match(html,/New This Week \(2\)/);assert.match(html,/selected-row/)
})
test('Current Week Status retains four groups and same scope/counts',()=>{
  const tasks=viewTasks(fixture,'status','',bounds),html=markup(tasks,'status')
  assert.equal((html.match(/status-group-row/g)||[]).length,4)
  assert.match(html,/Work in Progress[\s\S]*TSK-0001[\s\S]*KIV[\s\S]*TSK-0002/)
  assert.doesNotMatch(html,/weekly-group-row/)
  assert.equal(groupsFor(tasks,'status',bounds).reduce((n,[,t])=>n+t.length,0),tasks.length)
})
test('save queue applies in order and recovers after a failed request',async()=>{
  const queue=createSaveQueue(),order:string[]=[]
  const first=queue.enqueue(async()=>{await new Promise(r=>setTimeout(r,10));order.push('first');throw Error('injected')})
  const second=queue.enqueue(async()=>{order.push('second');return 2})
  await assert.rejects(first,/injected/);assert.equal(await second,2);await queue.settled();assert.deepEqual(order,['first','second'])
})
test('export keeps all filtered records and group semantics; input time is browser-independent',()=>{
  const rows=exportRows(groupsFor(fixture,'weekly',bounds),true)
  assert.equal(rows.length,5);assert.equal(rows[1][0],'Carry Over (1)');assert.equal(rows[3][0],'New This Week (1)')
  assert.equal(toInput('2026-10-12T00:00:00'),'2026-10-12T00:00');assert.equal(toInput('2026-10-11T16:00:00Z'),'2026-10-12T00:00')
})
