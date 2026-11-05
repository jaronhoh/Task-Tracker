import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deletedThisWeek, weekBounds, viewTasks, type Task } from '../src/lib/model'

const task=(taskId:string,status:Task['status'],end:string|null,created='2026-10-13T10:00:00+08:00') =>
 ({taskId,customerName:'Customer A',taskTitle:'Task '+taskId,taskDescription:null,note:null,created,end,status} satisfies Task)

test('CR-022 Deleted cards count only this Malaysia week by End (Monday inclusive, next Monday exclusive)',()=>{
 const bounds=weekBounds(new Date('2026-10-15T04:00:00Z'))
 const tasks=[
  task('live','KIV',null),
  task('deleted-before','Deleted','2026-10-11T23:59:00+08:00'),
  task('deleted-start','Deleted','2026-10-12T00:00:00+08:00','2026-10-02T08:00:00+08:00'),
  task('deleted-end','Deleted','2026-10-18T15:59:00Z','2026-10-02T08:00:00+08:00'),
  task('deleted-after','Deleted','2026-10-19T00:00:00+08:00'),
  task('deleted-missing-end','Deleted',null),
  task('closed-sunday','Closed','2026-10-18T21:59:00+08:00')
 ]
 assert.deepEqual(deletedThisWeek(tasks,'',bounds).map(t=>t.taskId),['deleted-end','deleted-start'])
 assert.deepEqual(deletedThisWeek(tasks,'deleted-start',bounds).map(t=>t.taskId),['deleted-start'])
 assert.deepEqual(deletedThisWeek(tasks,'deleted-before',bounds),[])
 assert.ok(!viewTasks(tasks,'weekly','',bounds).some(t=>t.status==='Deleted'))
 assert.ok(!viewTasks(tasks,'status','',bounds).some(t=>t.status==='Deleted'))
 assert.equal(deletedThisWeek(tasks,'',weekBounds(new Date('2026-10-18T16:00:00Z'))).length,1)
})
