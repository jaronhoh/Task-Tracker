import { useRef, useState, useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog'
import { api, createSaveQueue } from './lib/api'
import { ACTIVE, STATUSES, COLORS, formatTime, fromInput, toInput, epoch, type Task, type Customer, type Status } from './lib/model'

export function Modal({id,title,description,children,onClose,wide=true,returnId='newTaskBtn'}:{id:string;title:string;description:string;children:ReactNode;onClose:()=>void;wide?:boolean;returnId?:string}) {
  return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent id={id} showCloseButton={false} className={`max-h-[90dvh] overflow-y-auto ${wide?'sm:max-w-[800px]':'sm:max-w-lg'}`} onInteractOutside={e=>e.preventDefault()} onCloseAutoFocus={e=>{e.preventDefault();document.getElementById(returnId)?.focus()}}><DialogHeader><DialogTitle className="pr-8">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><Button className="icon-button absolute right-3 top-3" variant="ghost" size="icon" aria-label="Close" data-close={id} type="button" onClick={onClose}><X/></Button>{children}</DialogContent></Dialog>
}
export function ErrorText({id,error}:{id:string;error:string}) { return error?<p id={id} role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>:null }
type Draft = {customerName:string;taskTitle:string;taskDescription:string;note:string;status:Status}
type Props = {task:Task|null;customers:Customer[];refresh:()=>Promise<void>;onClose:()=>void;notify:(message:string)=>void;onTime:(task:Task,status:Status)=>void}
export function TaskEditor({task,customers,refresh,onClose,notify,onTime}:Props) {
  const [draft,setDraft] = useState<Draft>({customerName:task?.customerName??'',taskTitle:task?.taskTitle??'',taskDescription:task?.taskDescription??'',note:task?.note??'',status:task?.status??'KIV'})
  const latest=useRef(task)
  useEffect(()=>{latest.current=task;if(task)setDraft(d=>({...d,status:task.status}))},[task?.status,task?.end])
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(0)
  const [adding,setAdding]=useState(false)
  const [busy,setBusy]=useState(false)
  const queue=useRef(createSaveQueue())
  const scheduled=useRef<Record<string,string>>({})
  const currentDraft=useRef(draft);currentDraft.current=draft
  const change=(field:keyof Draft,value:string)=>setDraft(d=>({...d,[field]:value}))
  async function save(field:keyof Draft,value:string) {
    if(!task || value==='__add_customer__')return
    if((field==='taskTitle'||field==='customerName')&&!value.trim()){setError(`${field==='taskTitle'?'Task Title':'Customer Name'} is required.`);return}
    const previous=scheduled.current[field] ?? String(latest.current?.[field]??'')
    if(previous===value)return
    scheduled.current[field]=value
    setSaving(n=>n+1)
    try {
      await queue.current.enqueue(async()=>{
        const updated=await api<Task>(`/api/tasks/${encodeURIComponent(task.taskId)}`,{method:'PATCH',body:JSON.stringify({[field]:value})})
        latest.current=updated
        await refresh()
      })
      setError('');notify(`${field==='status'?'Status':field} saved.`)
    } catch(e) {
      if(scheduled.current[field]===value)delete scheduled.current[field]
      setError(`Save failed: ${(e as Error).message} Your input has been kept; correct it or retry.`)
    } finally {setSaving(n=>n-1)}
  }
  async function close() {await queue.current.settled();onClose()}
  async function create(e:React.FormEvent) {
    e.preventDefault();if(task||busy)return;setBusy(true);setError('')
    try{const t=await api<Task>('/api/tasks',{method:'POST',body:JSON.stringify({...draft,taskDescription:draft.taskDescription||null,note:draft.note||null})});await refresh();notify(`Created ${t.taskId}.`);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <Modal id="taskDialog" title={task?`Edit Task · ${task.taskId}`:'New Task'} description={task?'Edit fields and leave a field to save automatically.':'Create a task to track your work.'} onClose={()=>void close()} returnId={task?'editTaskBtn':'newTaskBtn'}>
    <form id="taskForm" onSubmit={create} className="grid gap-5"><input id="taskId" type="hidden" value={task?.taskId??''}/><div className="grid gap-5 sm:grid-cols-2">
      <label>Customer Name *<span className="flex items-center gap-2"><span id="customerColorPreview" className="color-dot" style={{background:customers.find(c=>c.name===draft.customerName)?.color}}/><select id="customerName" required value={draft.customerName} onChange={e=>{if(e.target.value==='__add_customer__')setAdding(true);else change('customerName',e.target.value)}} onBlur={e=>void save('customerName',e.target.value)}><option value="">Select Customer…</option>{customers.map(c=><option key={c.name}>{c.name}</option>)}<option value="__add_customer__" disabled={customers.length>=16}>＋ Add Customer{customers.length>=16?' (all 16 colors used)':''}</option></select></span></label>
      <label>Task Title *<Input id="taskTitle" required maxLength={100} value={draft.taskTitle} onChange={e=>change('taskTitle',e.target.value)} onBlur={e=>void save('taskTitle',e.target.value)}/></label>
      <label className="sm:col-span-2">Task Description<Input id="taskDescription" maxLength={255} value={draft.taskDescription} onChange={e=>change('taskDescription',e.target.value)} onBlur={e=>void save('taskDescription',e.target.value)}/></label>
      <label className="sm:col-span-2">Note<Textarea id="taskNote" rows={4} maxLength={1000} value={draft.note} onChange={e=>change('note',e.target.value)} onBlur={e=>void save('note',e.target.value)}/></label>
      <label>Status<select id="taskStatus" value={draft.status} onChange={e=>{const value=e.target.value as Status;if(task&&ACTIVE.has(latest.current!.status)&&!ACTIVE.has(value)){if(window.confirm('This Task has no End time. To close or delete it, confirm and enter End in the next dialog. No changes will be saved until you click Save Time.'))onTime(latest.current!,value)}else change('status',value)}} onBlur={e=>void save('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Created<Input id="taskCreated" readOnly value={formatTime(latest.current?.created??new Date().toISOString())}/></label><label>End<Input id="taskEnd" readOnly value={formatTime(latest.current?.end??null)}/></label>
    </div><ErrorText id="taskDialogError" error={error}/>{error&&task&&<Button type="button" variant="outline" disabled={saving>0} onClick={()=>{for(const f of Object.keys(draft) as (keyof Draft)[])void save(f,currentDraft.current[f])}}>Retry saving changes</Button>}
      {!task?<div id="taskDialogFooter" className="flex justify-end gap-2"><Button type="button" variant="outline" data-close="taskDialog" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy?'Creating…':'Create Task'}</Button></div>:<p id="autoSaveHint" role="status" className="text-sm text-muted-foreground">{saving?'Saving…':'Editable fields save automatically when you leave a field.'}</p>}
    </form>
    {adding&&<AddCustomer refresh={refresh} onClose={()=>setAdding(false)} onAdded={name=>{change('customerName',name);setAdding(false);void save('customerName',name)}}/>}
  </Modal>
}
function AddCustomer({refresh,onClose,onAdded}:{refresh:()=>Promise<void>;onClose:()=>void;onAdded:(name:string)=>void}) {
  const [name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  return <Modal id="customerDialog" title="Add Customer" description="A unique available color is assigned automatically." onClose={onClose} wide={false} returnId="customerName"><form id="customerForm" className="grid gap-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const c=await api<Customer>('/api/customers',{method:'POST',body:JSON.stringify({name})});await refresh();onAdded(c.name)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><label>Customer Name *<Input id="newCustomerName" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><ErrorText id="customerDialogError" error={error}/><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>Add Customer</Button></div></form></Modal>
}
export function CustomerManager({customers,refresh,onClose,notify}:{customers:Customer[];refresh:()=>Promise<void>;onClose:()=>void;notify:(s:string)=>void}) {
  const [error,setError]=useState('')
  return <Modal id="manageCustomersDialog" title="Manage Customers" description="Names and colors are shared by all Tasks. Each color belongs to one Customer. Changes save automatically." onClose={onClose} returnId="manageCustomersBtn"><ErrorText id="manageCustomersError" error={error}/><div id="customerManagementList" className="grid gap-5">{customers.map(c=><CustomerRow key={c.name} customer={c} customers={customers} save={async(body,color)=>{await api(`/api/customers/${encodeURIComponent(c.name)}${color?'/color':''}`,{method:'PATCH',body:JSON.stringify(body)});await refresh();setError('');notify('Customer saved; linked Tasks updated.')}} error={e=>setError(e)}/>)}</div><div className="flex justify-end"><Button data-close="manageCustomersDialog" onClick={onClose}>Done</Button></div></Modal>
}
function CustomerRow({customer,customers,save,error}:{customer:Customer;customers:Customer[];save:(body:object,color?:boolean)=>Promise<void>;error:(s:string)=>void}) {
  const [name,setName]=useState(customer.name),[busy,setBusy]=useState(false)
  return <div className="customer-management-row grid gap-3 sm:grid-cols-2 border-b pb-5"><label>Customer Name<Input className="customer-name-editor" value={name} maxLength={100} disabled={busy} onChange={e=>setName(e.target.value)} onBlur={async()=>{if(name===customer.name)return;setBusy(true);try{await save({name})}catch(e){error((e as Error).message)}finally{setBusy(false)}}}/></label><label>Customer Color<span className="flex items-center gap-2"><span className="color-dot" style={{background:customer.color}}/><select className="customer-color-editor" disabled={busy} value={customer.color.toUpperCase()} onChange={async e=>{setBusy(true);try{await save({color:e.target.value},true)}catch(e){error((e as Error).message)}finally{setBusy(false)}}}>{COLORS.map(color=><option key={color} disabled={customers.some(c=>c.name!==customer.name&&c.color.toUpperCase()===color)}>{color}</option>)}</select></span></label></div>
}
export function TimeEditor({task,special,refresh,onClose,notify}:{task:Task;special?:Status;refresh:()=>Promise<void>;onClose:()=>void;notify:(s:string)=>void}) {
  const [created,setCreated]=useState(toInput(task.created)),[end,setEnd]=useState(special?'':toInput(task.end)),[status,setStatus]=useState<Status>(special??task.status),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  return <Modal id="timeDialog" title={special?'Close Task':'Edit Time'} description="Malaysia Time · UTC+08:00. Changes save together only after Save Time." wide={false} onClose={onClose} returnId={special?'taskStatus':'editTimeBtn'}><form id="timeForm" className="grid gap-4" onSubmit={async e=>{e.preventDefault();if(busy)return;const start=special?task.created:fromInput(created)!;let finish=fromInput(end);if(ACTIVE.has(status)&&!ACTIVE.has(task.status))finish=null;if(special&&ACTIVE.has(status)){setError('Choose Closed or Deleted to complete this confirmation flow.');return}if(ACTIVE.has(status)&&finish){setError('You entered End for an Active Task. Choose Closed or Deleted before saving.');return}if(!ACTIVE.has(status)&&!finish){setError('Closed and Deleted Tasks require End.');return}if(finish&&epoch(finish)<epoch(start)){setError('End cannot be earlier than Created.');return}setBusy(true);try{await api(`/api/tasks/${encodeURIComponent(task.taskId)}/time`,{method:'PATCH',body:JSON.stringify(special?{end:finish,status}:{created:start,end:finish,status})});await refresh();notify(`Time saved for ${task.taskId}.`);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><p id="timeTaskLabel" className="text-sm text-muted-foreground">{task.taskId} · {task.taskTitle}</p><label>Created<Input id="timeCreated" type="datetime-local" required disabled={!!special} value={created} onChange={e=>setCreated(e.target.value)}/></label><label>End<Input id="timeEnd" type="datetime-local" required={!ACTIVE.has(status)} value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Status<select id="timeStatus" value={status} onChange={e=>setStatus(e.target.value as Status)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label><ErrorText id="timeDialogError" error={error}/><div className="flex justify-end gap-2"><Button type="button" variant="outline" data-close="timeDialog" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>Save Time</Button></div></form></Modal>
}
