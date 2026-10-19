import { toLog, validateLog } from './log-time.mjs';
import * as R from './rules.mjs';
const {HttpError, normalizeCustomerName,cleanRequiredString,cleanOptionalString,assertStatus,rowToTask,malaysiaNow,resolveStatusEnd,validateTaskTimes,ACTIVE_STATUSES,isFuture,toMalaysiaTimestamp,CUSTOMER_COLORS}=R;
const has=(o,k)=>Object.hasOwn(o,k);
function task(s,id) { const t=s.tasks.find(t=>t.task_id===id); if(!t) throw new HttpError(404,`Task ${id} was not found.`,'TASK_NOT_FOUND'); return t; }
function customer(s,name) { return s.customers.find(c=>c.normalized_name===normalizeCustomerName(name)); }
function addCustomer(s,name,requestedColor) {
  const cleaned=cleanRequiredString(name,'Customer Name',100), normalized=normalizeCustomerName(cleaned);
  if(customer(s,cleaned)) throw new HttpError(400,'Customer Name already exists.','CUSTOMER_EXISTS');
  const color=requestedColor===undefined
    ? CUSTOMER_COLORS.find(color=>!s.customers.some(c=>c.color.toUpperCase()===color))
    : String(requestedColor).toUpperCase();
  if(requestedColor!==undefined&&!CUSTOMER_COLORS.includes(color)) throw new HttpError(400,'Color must be one of the 16 predefined colors.');
  if(!color) throw new HttpError(400,'All 16 Customer colors are in use.','CUSTOMER_COLORS_EXHAUSTED');
  if(s.customers.some(c=>c.color.toUpperCase()===color)) throw new HttpError(400,'Color is already assigned to another Customer.','CUSTOMER_COLOR_EXISTS');
  const c={name:cleaned,normalized_name:normalized,color}; s.customers.push(c); return c;
}
function cleanTrackerLink(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new HttpError(400,'Tracker Link must be a valid HTTP or HTTPS URL (maximum 2048 characters).','INVALID_TRACKER_LINK');
  let url;
  try { url = new URL(value); } catch { throw new HttpError(400,'Tracker Link must be a valid HTTP or HTTPS URL.','INVALID_TRACKER_LINK'); }
  if (!['http:','https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new HttpError(400,'Tracker Link must use HTTP or HTTPS and cannot contain embedded credentials.','INVALID_TRACKER_LINK');
  return url.href;
}
export async function operate(repo,method,path,body={}) {
  if(path==='/api/health' && method==='GET') return {status:'ok',timeZone:'Malaysia Time (UTC+08:00)'};
  if(path==='/api/log-time' && method==='GET') return (await repo.snapshot()).log_time.map(toLog);
  if(path==='/api/log-time' && method==='POST') return repo.transact(s=>{const row=validateLog(s,body,null,cleanTrackerLink);s.log_time.push(row);return toLog(row);});
  const lm=path.match(/^\/api\/log-time\/([^/]+)$/);
  if(lm&&['PATCH','DELETE'].includes(method))return repo.transact(s=>{
    const old=s.log_time.find(r=>r.id===decodeURIComponent(lm[1]));
    if(!old)throw new HttpError(404,'Log Time was not found.');
    if(method==='DELETE'){s.log_time=s.log_time.filter(r=>r.id!==old.id);return {id:old.id,deleted:true};}
    const row=validateLog(s,{...toLog(old),...body},old,cleanTrackerLink);Object.assign(old,row);return toLog(row);
  });
  if(path==='/api/tasks' && method==='GET') {const s=await repo.snapshot();return s.tasks.map(t=>({...rowToTask(t),timeSpentMinutes:s.log_time.filter(r=>r.task_id===t.task_id).reduce((n,r)=>n+toLog(r).durationMinutes,0)}));}
  if(path==='/api/customers' && method==='GET') return (await repo.snapshot()).customers.map(({name,color})=>({name,color}));
  if(path==='/api/customers' && method==='POST') return repo.transact(s=>{const c=addCustomer(s,body.name,has(body,'color')?body.color:undefined);return {name:c.name,normalizedName:c.normalized_name,color:c.color};});
  const cd=path.match(/^\/api\/customers\/([^/]+)$/);
  if(cd && method==='DELETE') return repo.transact(s=>{
    const c=customer(s,decodeURIComponent(cd[1]));
    if(!c) throw new HttpError(404,'Customer was not found.','CUSTOMER_NOT_FOUND');
    const taskCount=s.tasks.filter(t=>t.customer_name===c.name).length;
    const logCount=s.log_time.filter(r=>r.customer_name===c.name).length;
    if(logCount)throw new HttpError(409,`Cannot delete ${c.name}: it is referenced by ${logCount} Log Time records.`,'CUSTOMER_IN_USE');
    if(taskCount) { const error=new HttpError(409,`Cannot delete ${c.name}: it is referenced by ${taskCount} Task${taskCount===1?'':'s'}.`,'CUSTOMER_IN_USE');error.taskCount=taskCount;throw error; }
    s.customers=s.customers.filter(row=>row!==c);
    return {name:c.name,deleted:true};
  });
  const cm=path.match(/^\/api\/customers\/([^/]+)(\/color)?$/);
  if(cm && method==='PATCH') return repo.transact(s=>{
    const c=customer(s,decodeURIComponent(cm[1]));
    if(!c) throw new HttpError(404,'Customer was not found.','CUSTOMER_NOT_FOUND');
    if(cm[2]) {
      const color=String(body.color??'').toUpperCase();
      if(!CUSTOMER_COLORS.includes(color)) throw new HttpError(400,'Color must be one of the 16 predefined colors.');
      if(s.customers.some(other=>other!==c && other.color===color)) throw new HttpError(400,'Color is already assigned to another Customer.','CUSTOMER_COLOR_EXISTS');
      c.color=color;
    } else {
      const name=cleanRequiredString(body.name,'Customer Name',100), normalized=normalizeCustomerName(name);
      if(s.customers.some(other=>other!==c && other.normalized_name===normalized)) throw new HttpError(400,'Customer Name already exists.','CUSTOMER_EXISTS');
      for(const t of s.tasks) if(t.customer_name===c.name) t.customer_name=name;
      for(const r of s.log_time)if(r.customer_name===c.name)r.customer_name=name;
      c.name=name;c.normalized_name=normalized;
    }
    return {name:c.name,color:c.color};
  });
  if(path==='/api/tasks' && method==='POST') {
    const taskId=await repo.allocateId();
    return repo.transact(s=>{
      const customerName=cleanRequiredString(body.customerName,'Customer Name',100);
      const taskTitle=cleanRequiredString(body.taskTitle,'Task Title',100);
      const taskDescription=cleanOptionalString(body.taskDescription,'Task Description',255),note=cleanOptionalString(body.note,'Note',1000);
      const trackerLink=cleanTrackerLink(body.trackerLink);
      const status=body.status??'KIV';assertStatus(status);
      const created=malaysiaNow(),end=resolveStatusEnd(status,created,null,status==='Closed'||status==='Deleted');
      const c=customer(s,customerName)||addCustomer(s,customerName);
      const t={task_id:taskId,customer_name:c.name,task_title:taskTitle,task_description:taskDescription,note,created,end,status,tracker_link:trackerLink};
      s.tasks.push(t);return rowToTask(t);
    });
  }
  const tm=path.match(/^\/api\/tasks\/([^/]+)(\/time)?$/);
  if(tm) {
    const id=decodeURIComponent(tm[1]);
    if(method==='GET'&&!tm[2]) return rowToTask(task(await repo.snapshot(),id));
    if(method==='DELETE'&&!tm[2]) return repo.transact(s=>{
      const t=task(s,id); if(t.status==='Deleted') throw new HttpError(400,'Task is already Deleted.','ALREADY_DELETED');
      const now=malaysiaNow(); if(isFuture(t.created,now)) throw new HttpError(400,'Cannot delete Task because Created is later than current Malaysia Time (UTC+08:00).','FUTURE_CREATED');
      t.status='Deleted';t.end=now;return rowToTask(t);
    });
    if(method==='PATCH') return repo.transact(s=>{
      const t=task(s,id);
      if(tm[2]) {
        for(const k of Object.keys(body)) if(!['created','end','status'].includes(k)) throw new HttpError(400,`Field ${k} is not supported by Edit Time.`);
        let created=has(body,'created')?body.created:t.created,end=has(body,'end')?body.end:t.end,status=has(body,'status')?body.status:t.status;
        if(typeof created!=='string'||!Number.isFinite(Date.parse(created))) throw new HttpError(400,'Created must be a valid date/time string.');
        if(end!==null&&(typeof end!=='string'||!Number.isFinite(Date.parse(end)))) throw new HttpError(400,'End must be a valid date/time string or null.');
        assertStatus(status);created=toMalaysiaTimestamp(created);if(end!==null)end=toMalaysiaTimestamp(end);
        if(status!==t.status&&!ACTIVE_STATUSES.has(status)&&isFuture(created)) throw new HttpError(400,'Cannot close or delete Task because Created is later than current Malaysia Time (UTC+08:00).','FUTURE_CREATED');
        if(ACTIVE_STATUSES.has(status)&&!ACTIVE_STATUSES.has(t.status))end=null;
        else if(ACTIVE_STATUSES.has(status)&&end!==null)throw new HttpError(400,'An Active Task cannot be saved with End. Choose Closed or Deleted in the Edit Time confirmation flow.');
        if(!ACTIVE_STATUSES.has(status)&&end===null)throw new HttpError(400,'Closed and Deleted Tasks require End.');
        validateTaskTimes(created,end);Object.assign(t,{created,end,status});
      } else {
        for(const k of ['taskId','created','end']) if(has(body,k))throw new HttpError(400,`${k} cannot be changed through the normal Task PATCH endpoint.`);
        if(has(body,'customerName')) {const name=cleanRequiredString(body.customerName,'Customer Name',100),c=customer(s,name);if(!c)throw new HttpError(400,'Customer Name must match an existing Customer.','UNKNOWN_CUSTOMER');t.customer_name=c.name;}
        if(has(body,'taskTitle'))t.task_title=cleanRequiredString(body.taskTitle,'Task Title',100);
        if(has(body,'taskDescription'))t.task_description=cleanOptionalString(body.taskDescription,'Task Description',255);
        if(has(body,'note'))t.note=cleanOptionalString(body.note,'Note',1000);
        if(has(body,'trackerLink'))t.tracker_link=cleanTrackerLink(body.trackerLink);
        const status=has(body,'status')?body.status:t.status;assertStatus(status);
        t.end=resolveStatusEnd(status,t.created,t.end,status!==t.status);validateTaskTimes(t.created,t.end);t.status=status;
      }
      return rowToTask(t);
    });
  }
  throw new HttpError(404,'Endpoint was not found.','NOT_FOUND');
}

