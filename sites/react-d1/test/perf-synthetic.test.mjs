import test from 'node:test'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { operate } from '../lib/service.mjs'
import { runtime } from './runtime.mjs'
import { Repository } from '../db/repository.mjs'

// This isolates task Time Spent aggregation at synthetic 100/1,000/10,000 logs.
// It is NOT a Cloudflare D1 quota/latency benchmark or a production load test.
test('PERF-01 synthetic task Time Spent aggregation for 100 / 1,000 / 10,000 logs',async()=>{
  const tasks=Array.from({length:200},(_,i)=>({
    task_id:'TSK-'+String(i+1).padStart(4,'0'),
    customer_name:'Synthetic Only',task_title:'Synthetic '+i,task_description:null,
    note:null,created:'2026-10-12T09:00:00+08:00',end:null,status:'KIV',tracker_link:null
  }))
  for(const count of [100,1000,10000]){
    const logs=Array.from({length:count},(_,i)=>({id:'synthetic-'+i,task_id:tasks[i%tasks.length].task_id,start_time:'09:00',end_time:'10:00'}))
    const repo={snapshot:async()=>({tasks,log_time:logs})}
    const t0=performance.now()
    const result=await operate(repo,'GET','/api/tasks')
    const milliseconds=Number((performance.now()-t0).toFixed(1))
    assert.equal(result.length,200)
    assert.equal(result.reduce((total,t)=>total+t.timeSpentMinutes,0),count*60)
    assert.ok(result.every(t=>Number.isFinite(t.timeSpentMinutes)))
    console.log('PERF-01 synthetic aggregation:',JSON.stringify({tasks:tasks.length,logTimeRows:count,elapsedMs:milliseconds}))
  }
})

test('PERF-01 real isolated Miniflare D1 100/1000/10000-record GET and aggregate smoke',async()=>{
  const env=await runtime()
  try{
    const db=env.db,repo=new Repository(db)
    const task=await operate(repo,'POST','/api/tasks',{customerName:'Synthetic Only',taskTitle:'Synthetic D1 volume'})
    const times=[]
    const begin=performance.now()
    for(const [lower,upper] of [[0,100],[100,1000],[1000,10000]]){
      // 100 x 100 integer cross join inserts unique minute intervals across
      // historical dates (10 unique minutes per date), without production data.
      await db.prepare(`WITH RECURSIVE digits(n) AS
        (SELECT 0 UNION ALL SELECT n+1 FROM digits WHERE n < 99)
        INSERT INTO log_time
        (id,task_id,customer_name,task_title,activity,work_date,start_time,end_time,created,updated)
        SELECT 'synthetic-volume-' || (a.n*100+b.n),
               ?, 'Synthetic Only', 'Synthetic D1 volume', 'Development',
               date('2024-01-01', '+' || CAST((a.n*100+b.n)/10 AS INTEGER) || ' days'),
               printf('09:%02d', (a.n*100+b.n) % 10),
               printf('09:%02d', ((a.n*100+b.n) % 10)+1),
               '2024-01-01T09:00:00+08:00','2024-01-01T09:00:00+08:00'
        FROM digits a CROSS JOIN digits b
        WHERE a.n*100+b.n >= ? AND a.n*100+b.n < ?`).bind(task.taskId,lower,upper).run()
      const t0=performance.now()
      const currentTasks=await operate(repo,'GET','/api/tasks')
      const t1=performance.now()
      const currentLogs=await operate(repo,'GET','/api/log-time')
      const t2=performance.now()
      assert.equal(currentTasks.length,1)
      assert.equal(currentTasks[0].timeSpentMinutes,upper)
      assert.equal(currentLogs.length,upper)
      const stat={logRows:upper,taskGetMs:Number((t1-t0).toFixed(1)),logGetMs:Number((t2-t1).toFixed(1))}
      times.push(stat)
      console.log('PERF-01 isolated D1:',JSON.stringify(stat))
    }
    assert.equal(times.length,3)
    assert.ok(performance.now()-begin>0)
  }finally{await env.close()}
})
