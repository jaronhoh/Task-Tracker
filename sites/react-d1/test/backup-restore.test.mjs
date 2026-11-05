import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './runtime.mjs'
import { operate } from '../lib/service.mjs'
import { Repository } from '../db/repository.mjs'

// This is a synthetic, isolated D1 export-and-restore rehearsal.
// It does NOT prove native ChatGPT Sites production backup capabilities.
const tables=['customers','tasks','log_time','app_sequence','app_revision']
const rows=async(db,table)=>(await db.prepare('SELECT * FROM '+table).all()).results
const normalized=rs=>rs.map(r=>Object.fromEntries(Object.entries(r).sort(([a],[b])=>a.localeCompare(b)))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))

test('H2: isolated synthetic D1 backup/restore preserves all fields, IDs, sequence and revision token',async()=>{
  const source=await runtime(), restored=await runtime()
  try{
    const repo=new Repository(source.db)
    const task=await operate(repo,'POST','/api/tasks',{customerName:'Synthetic Customer',taskTitle:'Synthetic Task',taskDescription:'test only'})
    await operate(repo,'POST','/api/log-time',{taskId:task.taskId,customerName:'Synthetic Customer',taskTitle:'Synthetic Task',activity:'Development',date:'2026-10-12',startTime:'09:00',endTime:'10:45'})
    const before={}
    for(const t of tables)before[t]=await rows(source.db,t)
    for(const t of ['log_time','tasks','customers','app_sequence','app_revision'])await restored.db.prepare('DELETE FROM '+t).run()
    for(const t of ['customers','tasks','log_time','app_sequence','app_revision']){
      for(const row of before[t]){
        const cols=Object.keys(row)
        const sql='INSERT INTO '+t+' ('+cols.map(c=>'"'+c+'"').join(',')+') VALUES ('+cols.map(()=>'?').join(',')+')'
        await restored.db.prepare(sql).bind(...cols.map(c=>row[c])).run()
      }
    }
    for(const t of tables)assert.deepEqual(normalized(await rows(restored.db,t)),normalized(before[t]),t+' changed on isolated restore')
    const after=await operate(new Repository(restored.db),'GET','/api/tasks')
    assert.equal(after.length,1)
    assert.equal(after[0].taskId,task.taskId)
    assert.equal(after[0].timeSpentMinutes,105)
    assert.equal((await operate(new Repository(restored.db),'GET','/api/log-time')).length,1)
  }finally{await source.close();await restored.close()}
})
