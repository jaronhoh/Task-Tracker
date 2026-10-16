import React from 'react'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskTable } from '../src/TaskTable'
import { createSaveQueue } from '../src/lib/api'
import { weekBounds, viewTasks, groupsFor, exportRows, epoch, toInput, type Task } from '../src/lib/model'

const bounds=weekBounds(new Date('2026-10-15T12:00:00Z'))
const fixture:Task[]=[{taskId:'TSK-0001',customerName:'Customer A',taskTitle:'Earlier',taskDescription:'Description',note:'Note',created:'2026-10-09T10:00:00+08:00',end:null,status:'Work in Progress'},{taskId:'TSK-0002',customerName:'Customer B',taskTitle:'New',taskDescription:'Description',note:'Note',created:'2026-10-13T10:00:00+08:00',end:null,status:'KIV'}]
function markup(tasks:Task[],view:'weekly'|'status'='weekly',selected:string|null=null){return renderToStaticMarkup(<TaskTable tasks={tasks} groups={groupsFor(tasks,view,bounds)} view={view} customers={[]} selected={selected} onSelect={()=>{}} onEdit={()=>{}} onOrdered={()=>{}}/>)}
test('migrated PRD sample renders two independent lists, eight data fields plus tracker link, matching group totals',()=>{
  const tasks=viewTasks(fixture,'weekly','',bounds),html=markup(tasks)
  assert.match(html,/Carry Over: 1 tasks[\s\S]*TSK-0001[\s\S]*New This Week: 1 tasks[\s\S]*TSK-0002/)
  assert.equal((html.match(/data-task-id=/g)||[]).length,2)
  assert.equal((html.match(/<td /g)||[]).length,20)
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
  assert.match(html,/Carry Over: 0 tasks[\s\S]*New This Week: 1 tasks/)
  assert.doesNotMatch(html,/TSK-0001/)
  assert.equal((markup(viewTasks(fixture,'weekly','no match',bounds)).match(/aria-expanded="false"/g)||[]).length,2)
  for(const q of ['customer a','earlier','description','note'])assert.ok(viewTasks(fixture,'weekly',q,bounds).length)
  assert.equal(viewTasks(fixture,'weekly','work in progress',bounds).length,0)
})
test('editing status or Created recalculates membership and preserves selected row',()=>{
  const tasks=structuredClone(fixture);tasks[0].status='Closed'
  assert.doesNotMatch(markup(viewTasks(tasks,'weekly','',bounds)),/TSK-0001/)
  tasks[0].created='2026-10-14T00:00:00+08:00'
  const html=markup(viewTasks(tasks,'weekly','',bounds),'weekly','TSK-0001')
  assert.match(html,/New This Week: 2 tasks/);assert.match(html,/selected-row/)
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

test('6b14576 closed-this-week eligibility, rendered groups, search and export agree',()=>{
  const tasks:Task[]=[
    {...fixture[0],taskId:'oldClosedNow',status:'Closed',end:'2026-10-14T12:00:00+08:00'},
    {...fixture[1],taskId:'newClosedNow',status:'Closed',end:'2026-10-15T12:00:00+08:00'},
    {...fixture[0],taskId:'oldClosedBefore',status:'Closed',end:'2026-10-10T12:00:00+08:00'},
    ...fixture,
    {...fixture[0],taskId:'deleted',status:'Deleted',end:'2026-10-14T12:00:00+08:00'}
  ]
  const weekly=viewTasks(tasks,'weekly','',bounds)
  const groups=groupsFor(weekly,'weekly',bounds)
  assert.deepEqual(groups.map(([n,t])=>[n,t.map(t=>t.taskId)]),[['Carry Over',['oldClosedNow','TSK-0001']],['New This Week',['newClosedNow','TSK-0002']]])
  assert.match(markup(weekly),/Carry Over: 2 tasks[\s\S]*oldClosedNow[\s\S]*New This Week: 2 tasks[\s\S]*newClosedNow/)
  const status=viewTasks(tasks,'status','',bounds)
  assert.deepEqual(status,weekly)
  assert.deepEqual(groupsFor(status,'status',bounds).map(([n,t])=>[n,t.length]),[['Work in Progress',1],['Pending with Customer',0],['KIV',1],['Closed',2]])
  assert.match(markup(status,'status'),/Closed: 2 tasks[\s\S]*oldClosedNow[\s\S]*newClosedNow/)
  assert.equal(viewTasks(tasks,'weekly','oldClosedNow',bounds).length,1)
  const rows=exportRows(groups,true)
  assert.equal(rows.length,7)
  assert.ok(rows.some(r=>r[0]==='oldClosedNow'&&r[7]==='Closed'))
  assert.equal(viewTasks(tasks,'all','',bounds).length,tasks.length)
})

test('closed End includes Malaysia Monday start, excludes next Monday and missing End',()=>{
  const tasks:Task[]=[['at-start','2026-10-12T00:00:00'],['at-end','2026-10-19T00:00:00'],['before','2026-10-11T23:59:59'],['last','2026-10-18T23:59:59'],['no-end',null]].map(([taskId,end])=>({...fixture[0],taskId:taskId!,status:'Closed',end}))
  for(const view of ['weekly','status'] as const)assert.deepEqual(viewTasks(tasks,view,'',bounds).map(t=>t.taskId),['at-start','last'])
})


test('colored group badges expose exact live counts including zero in both views',()=>{
  for(const view of ['weekly','status'] as const){
    const tasks=viewTasks(fixture,view,'',bounds),html=markup(tasks,view)
    const groups=groupsFor(tasks,view,bounds)
    assert.equal((html.match(/class="[^"]*group-count-badge/g)||[]).length,groups.length)
    for(const [label,items] of groups){
      const colorClass='group-count-'+label.toLowerCase().replace(/\s+/g,'-')
      assert.ok(html.includes(colorClass))
      assert.ok(html.includes(`aria-label="${label}: ${items.length} tasks">${items.length}</span>`))
    }
    const empty=markup([],view)
    for(const [label] of groups)assert.ok(empty.includes(`aria-label="${label}: 0 tasks">0</span>`))
  }
})


test('accordion headers are keyboard buttons and only populated groups start expanded',()=>{
  for(const view of ['weekly','status'] as const){
    const html=markup(fixture,view)
    assert.equal((html.match(/aria-expanded="true"/g)||[]).length,2)
    assert.equal((html.match(/class="group-toggle"/g)||[]).length,view==='weekly'?2:4)
    assert.equal((html.match(/data-task-id=/g)||[]).length,2)
  }
})

test('status filters select every status, All restores scope, search counts remain independent',async()=>{
  const {filterStatus}=await import('../src/lib/status-filter')
  const tasks:Task[]=['Work in Progress','Pending with Customer','KIV','Closed'].map((status,i)=>({...fixture[1],taskId:String(i),status,end:status==='Closed'?'2026-10-15T10:00:00+08:00':null})) as Task[]
  const searched=viewTasks(tasks,'status','customer b',bounds)
  const counts=groupsFor(searched,'status',bounds).map(([,rows])=>rows.length)
  for(const status of ['Work in Progress','Pending with Customer','KIV','Closed'])assert.deepEqual(filterStatus(searched,status).map(t=>t.status),[status])
  assert.deepEqual(filterStatus(searched,'All'),searched)
  assert.deepEqual(groupsFor(searched,'status',bounds).map(([,rows])=>rows.length),counts)
  assert.equal(filterStatus(viewTasks(tasks,'status','unmatched',bounds),'All').length,0)
})


test('weekly and status cards toggle, retain pre-filter counts and export only selected groups',async()=>{
  const {selectGroups,toggleCard}=await import('../src/lib/summary-filter')
  for(const view of ['weekly','status'] as const){
    const scope=groupsFor(fixture,view,bounds), total=view==='weekly'?'Overall Total':'All'
    for(const [label,rows] of scope){
      const chosen=toggleCard(total,label,view)
      assert.deepEqual(selectGroups(scope,view,chosen),[[label,rows]])
      assert.equal(toggleCard(chosen,label,view),total)
      assert.deepEqual(selectGroups(scope,view,total),scope)
      const exported=exportRows(selectGroups(scope,view,chosen),true)
      assert.equal(exported.length,rows.length+2)
    }
    assert.equal(scope.flatMap(([,rows])=>rows).length,fixture.length)
  }
})
