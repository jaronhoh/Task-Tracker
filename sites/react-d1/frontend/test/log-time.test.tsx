import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize, today, type Log } from '../src/LogTime'
const log=(date:string,durationMinutes:number)=>({date,durationMinutes} as Log)
test('Malaysia work dates and Monday boundaries determine independent Total/Today/This Week cards',()=>{
 const rows=[log('2026-10-11',120),log('2026-10-12',60),log('2026-10-18',90),log('2026-10-19',30)]
 const s=summarize(rows,new Date('2026-10-18T15:59:59Z'))
 assert.equal(s.total,4);assert.equal(s.todayMinutes,90);assert.equal(s.weekMinutes,150)
 const next=summarize(rows,new Date('2026-10-18T16:00:00Z'))
 assert.equal(next.date,'2026-10-19');assert.equal(next.weekMinutes,30);assert.equal(next.todayMinutes,30)
 assert.equal(today(new Date('2026-01-31T16:00:00Z')),'2026-02-01')
})
