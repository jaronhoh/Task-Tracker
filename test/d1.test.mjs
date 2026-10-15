import test from 'node:test';
import assert from 'node:assert/strict';
import { runtime } from './runtime.mjs';
import { handle } from '../lib/handler.mjs';
import { Repository } from '../db/repository.mjs';
import { mkdtemp,mkdir } from 'node:fs/promises';
import path from 'node:path';
test('independent repository instances preserve parallel field changes in D1',async()=>{
 const r=await runtime();try {
 const created=await handle(new Request('http://test/api/tasks',{method:'POST',body:JSON.stringify({customerName:'D1',taskTitle:'Original'})}),r.db).then(r=>r.json());
 await Promise.all([new Repository(r.db).transact(s=>{s.tasks[0].note='Concurrent note';}),new Repository(r.db).transact(s=>{s.tasks[0].task_title='Concurrent title';})]);
 const stored=(await new Repository(r.db).snapshot()).tasks[0];assert.equal(stored.note,'Concurrent note');assert.equal(stored.task_title,'Concurrent title');assert.equal(stored.task_id,created.taskId);
 }finally{await r.close();}
});
test('disk-backed D1 retains tasks, customers and ID sequence after runtime restart',async()=>{
 await mkdir('.sites-runtime/persistence-tests',{recursive:true});
 const directory=await mkdtemp(path.resolve('.sites-runtime/persistence-tests/run-'));
 let r=await runtime(directory);
 const create=()=>handle(new Request('http://test/api/tasks',{method:'POST',body:JSON.stringify({customerName:'Persistent customer',taskTitle:'Survives restart'})}),r.db).then(r=>r.json());
 const first=await create();await r.close();
 r=await runtime(directory);
 try{const s=await new Repository(r.db).snapshot();assert.equal(s.tasks[0].task_id,first.taskId);assert.equal(s.customers[0].name,'Persistent customer');const next=await create();assert.equal(next.taskId,'TSK-0002');}finally{await r.close();}
});
