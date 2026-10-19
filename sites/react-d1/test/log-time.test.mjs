import test from 'node:test';
import assert from 'node:assert/strict';
import { runtime } from './runtime.mjs';
import { operate } from '../lib/service.mjs';
import { Repository } from '../db/repository.mjs';
import { ACTIVITIES } from '../lib/log-time.mjs';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const entry=(task,extra={})=>({taskId:task?.taskId??null,customerName:'Customer A',taskTitle:task?.taskTitle??'One off',activity:'Development',date:'2026-01-05',startTime:'09:00',endTime:'10:00',...extra});
test('additive D1 migration preserves every legacy row, revision token and task sequence',async()=>{
 const r=await runtime(false,'0001_add_tracker_link.sql');try{
  await r.db.prepare("INSERT INTO customers VALUES ('Preserved','preserved','#F87171')").run();
  await r.db.prepare("INSERT INTO tasks (task_id,customer_name,task_title,task_description,note,created,end,status,tracker_link) VALUES ('TSK-0032','Preserved','历史任务','Description','Note','2026-01-01T09:00:00+08:00',NULL,'KIV','https://example.com/')").run();
  await r.db.prepare("UPDATE app_sequence SET next_value=33").run();
  const snapshot=async()=>Promise.all(['customers','tasks','app_sequence','app_revision'].map(async t=>(await r.db.prepare(`SELECT * FROM ${t}`).all()).results));
  const before=await snapshot(),sql=await readFile(new URL('../drizzle/0002_log_time.sql',import.meta.url),'utf8');
  for(const statement of sql.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await r.db.prepare(statement).run();
  assert.deepEqual(await snapshot(),before);assert.equal((await r.db.prepare('SELECT * FROM log_time').all()).results.length,0);
 }finally{await r.close();}
});
async function fixture(run){const r=await runtime();try{const repo=new Repository(r.db),call=(method,url,body)=>operate(repo,method,url,body);const task=await call('POST','/api/tasks',{customerName:'Customer A',taskTitle:'Task A',taskDescription:'Original',note:'Original note',trackerLink:'https://example.com/'});await run({r,repo,call,task});}finally{await r.close();}}
test('Log Time: precise aggregation, dates, reassignment, custom and closed/deleted history',()=>fixture(async({call,task,repo})=>{
 const baseline=await repo.snapshot();const a=await call('POST','/api/log-time',entry(task));const b=await call('POST','/api/log-time',entry(task,{date:'2026-01-06',endTime:'11:00',durationMinutes:999}));
 assert.equal(b.durationMinutes,120);assert.equal((await call('GET','/api/tasks'))[0].timeSpentMinutes,180);assert.equal((await repo.snapshot()).sequence,baseline.sequence);
 const taskB=await call('POST','/api/tasks',{customerName:'Customer A',taskTitle:'Task B'});
 const moved=await call('PATCH',`/api/log-time/${a.id}`,{taskId:taskB.taskId,taskTitle:taskB.taskTitle,taskDescription:'Local edit'});assert.equal(moved.id,a.id);
 let tasks=await call('GET','/api/tasks');assert.equal(tasks[0].timeSpentMinutes,120);assert.equal(tasks[1].timeSpentMinutes,60);assert.equal(tasks[1].taskDescription,null);
 await call('PATCH',`/api/log-time/${a.id}`,{taskId:null,taskTitle:'One off'});assert.equal((await call('GET','/api/tasks'))[1].timeSpentMinutes,0);
 await call('PATCH',`/api/tasks/${task.taskId}`,{status:'Closed'});
 await assert.rejects(()=>call('POST','/api/log-time',entry(task,{date:'2026-01-07'})),/active Task/);
 const corrected=await call('PATCH',`/api/log-time/${b.id}`,{endTime:'12:00'});assert.equal(corrected.durationMinutes,180);
 await call('DELETE',`/api/tasks/${task.taskId}`);assert.equal((await call('GET','/api/log-time')).length,2);
 await call('PATCH',`/api/log-time/${b.id}`,{note:'Historical correction'});
 await call('DELETE',`/api/log-time/${b.id}`);assert.equal((await call('GET','/api/tasks'))[0].timeSpentMinutes,0);
 assert.equal((await repo.snapshot()).tasks[0].task_description,'Original');
}));
test('Log Time: overlap, adjacent, invalid calendar/time/activity/customer/URL and all activities',()=>fixture(async({call,task})=>{
 await call('POST','/api/log-time',entry(task));
 await assert.rejects(()=>call('POST','/api/log-time',entry(null,{startTime:'09:30',endTime:'10:30'})),/overlaps/);
 const adjacent=await call('POST','/api/log-time',entry(null,{startTime:'10:00',endTime:'11:00'}));
 await assert.rejects(()=>call('PATCH',`/api/log-time/${adjacent.id}`,{startTime:'09:59'}),/overlaps/);
 for(const extra of [{date:'2026-02-30'},{date:'2999-01-01'},{date:''},{startTime:'23:00',endTime:'01:00'},{startTime:'24:00'},{startTime:'09:00',endTime:'09:00'},{activity:'Invented'},{customerName:'Missing'},{taskTitle:''},{taskId:'TSK-MISSING'},{trackerLink:'javascript:alert(1)'},{trackerLink:'https://user:pass@example.com/'}])await assert.rejects(()=>call('POST','/api/log-time',entry(task,{date:'2026-01-08',...extra})));
 for(let i=0;i<ACTIVITIES.length;i++){const r=await call('POST','/api/log-time',entry(null,{activity:ACTIVITIES[i],date:`2026-02-${String(i+1).padStart(2,'0')}`}));assert.equal(r.activity,ACTIVITIES[i]);}
}));
test('Log Time: cross-repository concurrent overlaps cannot both commit',()=>fixture(async({r,task})=>{
 const results=await Promise.allSettled(Array.from({length:8},()=>operate(new Repository(r.db),'POST','/api/log-time',entry(task))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await new Repository(r.db).snapshot()).log_time.length,1);
}));
test('Log Time: customer delete/rename and stale editor protection',()=>fixture(async({call,task})=>{
 await call('POST','/api/customers',{name:'Log only'});
 const custom=await call('POST','/api/log-time',entry(null,{customerName:'Log only'}));
 await assert.rejects(()=>call('DELETE','/api/customers/Log%20only'),/Log Time/);
 await call('PATCH','/api/customers/Log%20only',{name:'Renamed'});let rows=await call('GET','/api/log-time');assert.equal(rows[0].customerName,'Renamed');
 await assert.rejects(()=>call('PATCH',`/api/log-time/${custom.id}`,{expectedUpdated:'stale',note:'Lost update'}),/another window/);
 await call('DELETE',`/api/log-time/${custom.id}`);await call('DELETE','/api/customers/Renamed');
}));
test('Log Time: restart persistence and initial additive migration preserves complete legacy rows',async()=>{
 const sql=await readFile(new URL('../drizzle/0002_log_time.sql',import.meta.url),'utf8');assert.doesNotMatch(sql,/\b(DROP|DELETE|UPDATE|ALTER|INSERT|REPLACE|TRUNCATE)\b/i);
 await mkdir('.sites-runtime/log-persistence',{recursive:true});const dir=await mkdtemp(path.resolve('.sites-runtime/log-persistence/run-'));let r=await runtime(dir),repo=new Repository(r.db);
 const task=await operate(repo,'POST','/api/tasks',{customerName:'Customer A',taskTitle:'Preserve'});const before=await repo.snapshot();await operate(repo,'POST','/api/log-time',entry(task));await r.close();
 r=await runtime(dir);try{const after=await new Repository(r.db).snapshot();assert.deepEqual(after.tasks,before.tasks);assert.deepEqual(after.customers,before.customers);assert.equal(after.sequence,before.sequence);assert.equal(after.log_time.length,1);}finally{await r.close();}
});
