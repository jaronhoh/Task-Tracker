import test from 'node:test'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { operate } from '../lib/service.mjs'

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
