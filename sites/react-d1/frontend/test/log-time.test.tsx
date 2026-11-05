import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromAmPm, toAmPm, searchLogs, summarize, today, type Log } from '../src/LogTime'
const log=(date:string,durationMinutes:number)=>({date,durationMinutes} as Log)
test('Malaysia work dates and Monday boundaries determine independent Total/Today/This Week cards',()=>{
 const rows=[log('2026-10-11',120),log('2026-10-12',60),log('2026-10-18',90),log('2026-10-19',30)]
 const s=summarize(rows,new Date('2026-10-18T15:59:59Z'))
 assert.equal(s.total,4);assert.equal(s.todayMinutes,90);assert.equal(s.weekMinutes,150)
 const next=summarize(rows,new Date('2026-10-18T16:00:00Z'))
 assert.equal(next.date,'2026-10-19');assert.equal(next.weekMinutes,30);assert.equal(next.todayMinutes,30)
 assert.equal(today(new Date('2026-01-31T16:00:00Z')),'2026-02-01')
})

test('Log Time keyword search covers independent saved fields and restores full view on Clear',()=>{
 const rows=[
  {id:'first',taskTitle:'FDD Design',customerName:'JXM',taskDescription:'Discussion with client',note:'Prepare Workshop',activity:'Design',trackerLink:'https://example.com/TICKET-A',date:'2026-10-19'},
  {id:'second',taskTitle:'Internal Meeting',customerName:'MySelf',taskDescription:'Daily sync',note:'Email follow-up',activity:'Meeting',trackerLink:null,date:'2026-10-18'}
 ] as Log[]
 for(const q of ['fdd','jxm','DISCUSSION','workshop','design','ticket-a','2026-10-19',' fdd ']){
   assert.deepEqual(searchLogs(rows,q).map(r=>r.id),['first'],q)
 }
 assert.deepEqual(searchLogs(rows,'MeEtInG').map(r=>r.id),['second'])
 assert.deepEqual(searchLogs(rows,'zzz'),[])
 assert.equal(searchLogs(rows,''),rows)
 assert.equal(searchLogs(rows,'   '),rows)
})

test('AM/PM picker round trips exact minutes, midnight and noon without altering 24-hour persisted values',()=>{
 for(let h=0;h<24;h++)for(let m=0;m<60;m++){
   const expected=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')
   const p=toAmPm(expected)
   assert.equal(fromAmPm(p.hour,p.minute,p.period),expected)
 }
 assert.deepEqual(toAmPm('00:00'),{hour:'12',minute:'00',period:'AM'})
 assert.deepEqual(toAmPm('12:00'),{hour:'12',minute:'00',period:'PM'})
 assert.deepEqual(toAmPm('23:59'),{hour:'11',minute:'59',period:'PM'})
 assert.equal(fromAmPm('01','30','PM'),'13:30')
 for(const bad of [['00','00','AM'],['13','00','PM'],['01','60','AM'],['01','10',''],['','20','PM']]){
   assert.equal(fromAmPm(bad[0],bad[1],bad[2]),'')
 }
})
