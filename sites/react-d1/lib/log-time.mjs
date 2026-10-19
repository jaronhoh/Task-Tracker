import { HttpError, ACTIVE_STATUSES, cleanRequiredString, cleanOptionalString, malaysiaNow } from './rules.mjs';
export const ACTIVITIES = ['Design','Setup','Development','Testing','Support','Question','Deployment','Traveling','Fine tuning','Meeting','Other'];
export function minutes(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new HttpError(400,'Time must use HH:mm.');
  return Number(time.slice(0,2))*60+Number(time.slice(3));
}
export function toLog(row) {
  return {id:row.id,taskId:row.task_id,customerName:row.customer_name,taskTitle:row.task_title,taskDescription:row.task_description,note:row.note,trackerLink:row.tracker_link,activity:row.activity,date:row.work_date,startTime:row.start_time,endTime:row.end_time,durationMinutes:minutes(row.end_time)-minutes(row.start_time),created:row.created,updated:row.updated};
}
export function validateLog(state, body, old, cleanLink) {
  if(old&&body.expectedUpdated!==undefined&&body.expectedUpdated!==old.updated)throw new HttpError(409,'This Log Time changed in another window. Reopen it before saving.','WRITE_CONFLICT');
  const date=body.date;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new HttpError(400,'Date must be a valid calendar date.');
  if(date>malaysiaNow().slice(0,10))throw new HttpError(400,'Date cannot be in the future.');
  const start=minutes(body.startTime),end=minutes(body.endTime);
  if(end<=start)throw new HttpError(400,'End Time must be later than Start Time on the same Date; overnight entries are not allowed.');
  if(state.log_time.some(r=>r.id!==old?.id&&r.work_date===date&&minutes(r.start_time)<end&&minutes(r.end_time)>start))throw new HttpError(409,'This interval overlaps another Log Time record.','TIME_OVERLAP');
  if(!ACTIVITIES.includes(body.activity))throw new HttpError(400,'Choose a valid Activity.');
  const customer=state.customers.find(c=>c.name===body.customerName);
  if(!customer)throw new HttpError(400,'Choose an existing Customer.');
  const taskId=body.taskId??null;
  if(taskId!==null){
    const task=state.tasks.find(t=>t.task_id===taskId);
    if(!task)throw new HttpError(400,'Task was not found.');
    if(taskId!==old?.task_id&&!ACTIVE_STATUSES.has(task.status))throw new HttpError(400,'Choose an active Task.');
    // A retained historical link keeps its saved customer after task edits.
    if(!(old?.task_id===taskId&&old.customer_name===customer.name)&&task.customer_name!==customer.name)throw new HttpError(400,'Linked Customer must match the selected Task.');
  }
  const now=malaysiaNow();
  return {id:old?.id??crypto.randomUUID(),task_id:taskId,customer_name:customer.name,task_title:cleanRequiredString(body.taskTitle,'Task Title',100),task_description:cleanOptionalString(body.taskDescription,'Task Description',10000),note:cleanOptionalString(body.note,'Note',10000),tracker_link:cleanLink(body.trackerLink),activity:body.activity,work_date:date,start_time:body.startTime,end_time:body.endTime,created:old?.created??now,updated:now};
}
