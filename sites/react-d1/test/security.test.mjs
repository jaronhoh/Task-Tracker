import test from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../lib/handler.mjs'
import { runtime } from './runtime.mjs'

function request(method,path,headers={},body) {
  return new Request('https://task-tracker.example'+path,{
    method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})
  })
}
async function blocked(request,status,code) {
  const neverDb=new Proxy({},{
    get() { throw new Error('SECURITY REGRESSION: attempted D1 access on denied request') }
  })
  const r=await handle(request,neverDb)
  assert.equal(r.status,status)
  assert.equal((await r.json()).error.code,code)
  assert.equal(r.headers.get('Cache-Control'),'no-store')
  assert.equal(r.headers.get('Cross-Origin-Resource-Policy'),'same-origin')
  assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff')
}

test('CR-024 rejects explicit cross-origin/same-site requests before all D1 reads or writes',async()=>{
  for(const [method,path,body] of [
    ['GET','/api/tasks'],
    ['GET','/api/customers'],
    ['GET','/api/log-time'],
    ['GET','/api/tasks/TSK-0001'],
    ['GET','/api/health'],
    ['POST','/api/tasks',{customerName:'QA',taskTitle:'Forbidden'}],
    ['PATCH','/api/tasks/TSK-0001',{note:'Forbidden'}],
    ['PATCH','/api/tasks/TSK-0001/time',{status:'Deleted'}],
    ['DELETE','/api/tasks/TSK-0001'],
    ['POST','/api/customers',{name:'Forbidden'}],
    ['PATCH','/api/customers/QA',{name:'Forbidden'}],
    ['PATCH','/api/customers/QA/color',{color:'#000000'}],
    ['DELETE','/api/customers/QA'],
    ['POST','/api/log-time',{taskTitle:'Forbidden'}],
    ['PATCH','/api/log-time/1',{note:'Forbidden'}],
    ['DELETE','/api/log-time/1']
  ]) {
    await blocked(request(method,path,{'sec-fetch-site':'cross-site','content-type':'application/json'},body),403,'CROSS_ORIGIN_API_DENIED')
    await blocked(request(method,path,{'sec-fetch-site':'same-site','content-type':'application/json'},body),403,'CROSS_ORIGIN_API_DENIED')
  }
})

test('CR-024 rejects foreign, null or malformed Origin on internal API routes',async()=>{
  for(const origin of ['https://external.example','null','???','http://task-tracker.example','https://task-tracker.example.evil.invalid']){
    await blocked(request('GET','/api/tasks',{origin}),403,'CROSS_ORIGIN_API_DENIED')
    await blocked(request('POST','/api/tasks',{origin,'content-type':'application/json'},{customerName:'QA',taskTitle:'Forbidden'}),403,'CROSS_ORIGIN_API_DENIED')
  }
})

test('CR-024 rejects form/text writes without JSON Content-Type before D1 access',async()=>{
  for(const contentType of ['', 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']){
    await blocked(request('POST','/api/tasks',contentType?{'content-type':contentType}:{}),415,'UNSUPPORTED_MEDIA_TYPE')
    await blocked(request('PATCH','/api/tasks/TSK-0001',contentType?{'content-type':contentType}:{}),415,'UNSUPPORTED_MEDIA_TYPE')
  }
})

test('CR-024 keeps same-origin Owner-browser-shaped internal operations working on isolated D1',async()=>{
  const r=await runtime()
  const headers={'origin':'https://task-tracker.example','sec-fetch-site':'same-origin','content-type':'application/json'}
  try{
    let res=await handle(request('POST','/api/tasks',headers,{customerName:'Synthetic QA',taskTitle:'Authorized local test'}),r.db)
    assert.equal(res.status,201);const created=await res.json();assert.ok(created.taskId)
    res=await handle(request('GET','/api/tasks',{'sec-fetch-site':'same-origin'}),r.db)
    assert.equal(res.status,200);const listed=await res.json()
    assert.equal(listed.length,1);assert.equal(listed[0].taskId,created.taskId)
    res=await handle(request('PATCH','/api/tasks/'+created.taskId,headers,{note:'Updated'}),r.db)
    assert.equal(res.status,200);assert.equal((await res.json()).note,'Updated')
    res=await handle(request('GET','/api/health',{'sec-fetch-site':'same-origin'}),r.db)
    assert.equal(res.status,200);assert.equal((await res.json()).status,'ok')
  }finally{await r.close()}
})

// These tests do NOT authenticate a user. Owner-only access must still be
// verified on the actual Sites edge, where this isolated harness does not run.
