import { useEffect, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { SearchPicker } from './SearchPicker'
import { Modal, ErrorText } from './Editors'
import { api, createSaveQueue } from './lib/api'
import { ACTIVE, malaysiaParts, weekBounds, type Task, type Customer } from './lib/model'

export const ACTIVITIES=['Design','Setup','Development','Testing','Support','Question','Deployment','Traveling','Fine tuning','Meeting','Other']
export type Log={id:string;taskId:string|null;customerName:string;taskTitle:string;taskDescription:string|null;note:string|null;trackerLink:string|null;activity:string;date:string;startTime:string;endTime:string;durationMinutes:number;created:string;updated:string}
type Draft={taskId:string|null;customerName:string;taskTitle:string;taskDescription:string;note:string;trackerLink:string;activity:string;date:string;startTime:string;endTime:string}
type TextField='taskTitle'|'taskDescription'|'note'|'trackerLink'
const TIME_FIELDS=['date','startTime','endTime'] as const
const OTHER_FIELDS=['taskId','customerName','taskTitle','taskDescription','note','trackerLink','activity'] as const
const validTime=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s)
const timeMinutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3))
export function today(now=new Date()){const p=malaysiaParts(now);return p.year+'-'+p.month+'-'+p.day}
export function summarize(logs:Log[],now=new Date()){
  const date=today(now),bounds=weekBounds(now)
  const inWeek=(r:Log)=>{const epoch=Date.parse(r.date+'T00:00:00+08:00');return epoch>=bounds.start&&epoch<bounds.end}
  return {date,inWeek,total:logs.length,todayMinutes:logs.filter(r=>r.date===date).reduce((n,r)=>n+r.durationMinutes,0),weekMinutes:logs.filter(inWeek).reduce((n,r)=>n+r.durationMinutes,0)}
}
export function searchLogs(rows:Log[],keyword:string):Log[]{
  const query=keyword.trim().toLocaleLowerCase()
  if(!query)return rows
  return rows.filter(r=>[r.taskTitle,r.customerName,r.taskDescription,r.note,r.activity,r.trackerLink,r.date].some(v=>(v??'').toLocaleLowerCase().includes(query)))
}
const hours=(minutes:number)=>(minutes/60).toFixed(2)
export function LogTime({tasks,customers,refreshTasks,notify}:{tasks:Task[];customers:Customer[];refreshTasks:()=>Promise<void>;notify:(s:string)=>void}) {
  const [logs,setLogs]=useState<Log[]>([])
  const [view,setView]=useState('today'),[search,setSearch]=useState(''),[query,setQuery]=useState('')
  const [selected,setSelected]=useState<string|null>(null),[editor,setEditor]=useState<Log|null|undefined>()
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[deleting,setDeleting]=useState(false)
  const [remove,setRemove]=useState<Log|null>(null),[collapsed,setCollapsed]=useState<Set<string>>(new Set())
  async function load(){setLogs(await api<Log[]>('/api/log-time'))}
  useEffect(()=>{void load().catch(e=>setError((e as Error).message)).finally(()=>setLoading(false))},[])
  async function refresh(){await load();await refreshTasks()}
  const summary=summarize(logs)
  const scoped=logs.filter(r=>view==='all'||(view==='today'?r.date===summary.date:summary.inWeek(r)))
  const visible=searchLogs(scoped,query)
  const dates=[...new Set(visible.map(r=>r.date))].sort().reverse()
  return <section className="grid gap-6 min-w-0" aria-label="Log Time workspace">
    <div className="flex justify-between gap-3 flex-wrap items-start"><div><h2 className="text-2xl font-semibold">Log Time</h2><p className="text-sm text-muted-foreground mt-1">Record your work in Malaysia time.</p></div><Button id="newLogBtn" disabled={loading} onClick={()=>setEditor(null)}><Plus/>New Log Time</Button></div>
    <Tabs value={view} onValueChange={value=>{setView(value);setSearch('');setQuery('');setSelected(null)}}><TabsList variant="line" className="line-tabs w-full justify-start overflow-x-auto" aria-label="Log Time views">{[['today','Today'],['week','This Week'],['all','Show All Data']].map(([value,label])=><TabsTrigger className="view-tab flex-none shrink-0" value={value} key={value}>{label}</TabsTrigger>)}</TabsList></Tabs>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Log Time summary">{[['Total',String(summary.total)],['Today',hours(summary.todayMinutes)+'h'],['This Week',hours(summary.weekMinutes)+'h']].map(([label,value])=><Card key={label} className="shadow-none py-5"><CardContent className="px-5"><span className="text-xs text-muted-foreground">{label}</span><strong className="block mt-2 text-3xl font-semibold" data-log-summary={label}>{value}</strong></CardContent></Card>)}</div>
    <form className="flex flex-wrap gap-2 items-center" role="search" aria-label="Search Log Time" onSubmit={e=>{e.preventDefault();setQuery(search);setSelected(null)}}><label htmlFor="logGlobalSearch" className="sr-only">Search Log Time records</label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input id="logGlobalSearch" type="search" placeholder="Search Log Time…" className="pl-9 w-64 max-w-full" value={search} onChange={e=>setSearch(e.target.value)}/></div><Button id="logSearchBtn" type="submit" variant="outline">Search</Button><Button id="logClearSearchBtn" type="button" variant="ghost" onClick={()=>{setSearch('');setQuery('');setSelected(null)}}>Clear</Button></form>
    <ErrorText id="logLoadError" error={error}/>{error&&<Button variant="outline" onClick={()=>void refresh().then(()=>setError('')).catch(e=>setError((e as Error).message))}>Retry</Button>}
    {loading?<p role="status">Loading Log Time…</p>:!dates.length?<p role="status">{query.trim()&&scoped.length?'No results found':'No Log Time records'}</p>:<div className="border rounded-xl bg-card min-w-0 overflow-x-auto"><Table id="logTimeTable" className="min-w-[720px]"><TableHeader><TableRow>{['Time (Start–End)','Task Title','Customer','Activity','Spend','Actions'].map(label=><TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{dates.map(date=>{const rows=visible.filter(r=>r.date===date).sort((a,b)=>a.startTime.localeCompare(b.startTime)||a.id.localeCompare(b.id));return <DateGroup key={date} date={date} rows={rows} customers={customers} selected={selected} onSelect={setSelected} collapsed={collapsed.has(date)} toggle={()=>setCollapsed(s=>{const n=new Set(s);n.has(date)?n.delete(date):n.add(date);return n})} edit={setEditor} remove={setRemove}/>})}</TableBody></Table></div>}
    {editor!==undefined&&<LogEditor key={editor?.id??'new'} log={editor??null} tasks={tasks} customers={customers} onClose={()=>setEditor(undefined)} onSaved={refresh} notify={notify}/>}
    {remove&&<Modal id="deleteLogDialog" title="Delete Log Time" description={'Delete '+remove.date+' '+remove.startTime+'–'+remove.endTime+' · '+remove.taskTitle+'?'} onClose={()=>{if(!deleting)setRemove(null)}} wide={false} returnId="newLogBtn"><div className="flex justify-end gap-2"><Button variant="outline" disabled={deleting} onClick={()=>setRemove(null)}>Cancel</Button><Button disabled={deleting} onClick={async()=>{setDeleting(true);try{await api('/api/log-time/'+encodeURIComponent(remove.id),{method:'DELETE'});await refresh();setRemove(null);setSelected(null);setError('');notify('Log Time deleted.')}catch(e){setError((e as Error).message);setRemove(null)}finally{setDeleting(false)}}}>Delete Log Time</Button></div></Modal>}
  </section>
}
function DateGroup({date,rows,customers,selected,onSelect,collapsed,toggle,edit,remove}:{date:string;rows:Log[];customers:Customer[];selected:string|null;onSelect:(id:string)=>void;collapsed:boolean;toggle:()=>void;edit:(r:Log)=>void;remove:(r:Log)=>void}) {
  return <>
    <TableRow><TableCell colSpan={6} className="bg-muted/50"><button className="flex gap-3 font-semibold py-1" type="button" aria-expanded={!collapsed} onClick={toggle}><span aria-hidden="true">{collapsed?'▸':'▾'}</span>{date}<span>{hours(rows.reduce((n,r)=>n+r.durationMinutes,0))}h</span></button></TableCell></TableRow>
    {!collapsed&&rows.map(r=><TableRow key={r.id} data-log-id={r.id} className={'cursor-pointer '+(selected===r.id?'selected-row':'')} tabIndex={0} aria-selected={selected===r.id} onClick={()=>onSelect(r.id)} onDoubleClick={()=>{onSelect(r.id);edit(r)}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onSelect(r.id);edit(r)}else if(e.key===' '){e.preventDefault();onSelect(r.id)}}}><TableCell className="whitespace-nowrap">{r.startTime}–{r.endTime}</TableCell><TableCell className="max-w-64 whitespace-normal break-words">{r.taskTitle}</TableCell><TableCell><span className="inline-flex gap-2 items-center"><span className="color-dot" style={{background:customers.find(c=>c.name===r.customerName)?.color}}/>{r.customerName}</span></TableCell><TableCell>{r.activity}</TableCell><TableCell>{hours(r.durationMinutes)}h</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" onClick={e=>{e.stopPropagation();onSelect(r.id);edit(r)}} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} aria-label={'Edit '+r.taskTitle}>Edit</Button><Button variant="ghost" onClick={e=>{e.stopPropagation();remove(r)}} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} aria-label={'Delete '+r.taskTitle}>Delete</Button></div></TableCell></TableRow>)}
  </>
}
function LogEditor({log,tasks,customers,onClose,onSaved,notify}:{log:Log|null;tasks:Task[];customers:Customer[];onClose:()=>void;onSaved:()=>Promise<void>;notify:(message:string)=>void}) {
  const initial:Draft={taskId:log?.taskId??null,customerName:log?.customerName??'',taskTitle:log?.taskTitle??'',taskDescription:log?.taskDescription??'',note:log?.note??'',trackerLink:log?.trackerLink??'',activity:log?.activity??'',date:log?.date??today(),startTime:log?.startTime??'',endTime:log?.endTime??''}
  const [draft,setDraft]=useState<Draft>(initial)
  const draftRef=useRef(draft);draftRef.current=draft
  const latest=useRef(log)
  const queue=useRef(createSaveQueue())
  const [custom,setCustom]=useState(!!log&&!log.taskId),[error,setError]=useState('')
  const [busy,setBusy]=useState(false),[saving,setSaving]=useState(0),[saveStatus,setSaveStatus]=useState('')
  function replaceDraft(next:Draft){draftRef.current=next;setDraft(next)}
  function change<K extends keyof Draft>(field:K,value:Draft[K]){replaceDraft({...draftRef.current,[field]:value})}
  async function autoSave(patch:Partial<Draft>):Promise<boolean>{
    if(!log)return false
    setSaving(n=>n+1);setSaveStatus('Saving…')
    try {
      await queue.current.enqueue(async()=>{
        const previous=latest.current!
        if((Object.keys(patch) as (keyof Draft)[]).every(key=>String(previous[key]??'')===String(patch[key]??'')))return
        const saved=await api<Log>('/api/log-time/'+encodeURIComponent(log.id),{method:'PATCH',body:JSON.stringify({...patch,expectedUpdated:previous.updated})})
        latest.current=saved
        try{await onSaved()}catch{setError('Saved successfully, but refreshing the table failed. Please reload.')}
      })
      setSaveStatus('Saved')
      setError('')
      return true
    } catch(e) {
      setError('Save failed: '+(e as Error).message+'. Your input has been kept. Correct it or retry.')
      setSaveStatus('Save failed')
      return false
    } finally {setSaving(n=>n-1)}
  }
  function saveField(field:TextField,value:string){
    if(!log)return
    if(field==='taskTitle'&&(!custom||!value.trim())){if(custom)setError('Custom Task Title is required.');return}
    void autoSave({[field]:value})
  }
  function choose(id:string){
    const t=tasks.find(t=>t.taskId===id)
    if(!t||t.taskId===draftRef.current.taskId)return
    const d=draftRef.current,source=tasks.find(t=>t.taskId===d.taskId)
    if((d.taskDescription||d.note||d.trackerLink)&&(!source||d.taskDescription!==(source.taskDescription??'')||d.note!==(source.note??'')||d.trackerLink!==(source.trackerLink??''))&&!window.confirm('Replace the edited description, note and tracker link with the selected task details? Cancel keeps your draft.'))return
    const copied:Partial<Draft>={taskId:t.taskId,customerName:t.customerName,taskTitle:t.taskTitle,taskDescription:t.taskDescription??'',note:t.note??'',trackerLink:t.trackerLink??''}
    replaceDraft({...d,...copied});setCustom(false)
    if(log)void autoSave(copied)
  }
  function switchToCustom(){
    if(draftRef.current.taskId===null){setCustom(true);return}
    replaceDraft({...draftRef.current,taskId:null});setCustom(true)
    if(log)void autoSave({taskId:null})
  }
  const timeDirty=!!log&&TIME_FIELDS.some(key=>draft[key]!==latest.current?.[key])
  const ordinaryDirty=!!log&&OTHER_FIELDS.some(key=>String(draft[key]??'')!==String(latest.current?.[key]??''))
  async function close(){
    if(busy)return
    await queue.current.settled()
    const d=draftRef.current,saved=latest.current
    if(log&&saved&&(TIME_FIELDS.some(key=>d[key]!==saved[key])||OTHER_FIELDS.some(key=>String(d[key]??'')!==String(saved[key]??'')))&&!window.confirm('Some changes are not saved. Close and discard those changes?'))return
    onClose()
  }
  async function saveTime(){
    if(!log||saving>0)return
    const d=draftRef.current
    if(d.date>today()){setError('Date cannot be in the future.');return}
    if(!validTime(d.startTime)||!validTime(d.endTime)||timeMinutes(d.endTime)<=timeMinutes(d.startTime)){setError('End Time must be later than Start Time on the same Date. Use HH:mm.');return}
    if(!d.date){setError('Date is required.');return}
    await autoSave({date:d.date,startTime:d.startTime,endTime:d.endTime})
  }
  async function create(e:React.FormEvent){
    e.preventDefault();if(log||busy)return
    const d=draftRef.current
    if(!d.taskId&&!custom){setError('Choose a Task or Add Custom Task.');return}
    if(!d.customerName||!d.taskTitle.trim()||!d.activity){setError('Customer, Task Title and Activity are required.');return}
    if(!validTime(d.startTime)||!validTime(d.endTime)||timeMinutes(d.endTime)<=timeMinutes(d.startTime)){setError('End Time must be later than Start Time on the same Date.');return}
    if(d.date>today()){setError('Date cannot be in the future.');return}
    setBusy(true);setError('')
    try{await api('/api/log-time',{method:'POST',body:JSON.stringify(d)});await onSaved();notify('Log Time created.');onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  const start=validTime(draft.startTime)?timeMinutes(draft.startTime):0,end=validTime(draft.endTime)?timeMinutes(draft.endTime):0
  return <Modal id="logDialog" title={log?'Edit Log Time':'New Log Time'} description={log?'Editable fields save automatically on leaving the field. Use Save Time for Date and Start/End Time.':'Each entry covers one Malaysia work date. Overlapping intervals are not allowed.'} onClose={()=>void close()} returnId="newLogBtn">
    <form className="grid gap-4" onSubmit={create}><fieldset disabled={busy} className="grid gap-4 min-w-0">
      <label>Customer Name *<SearchPicker id="logCustomer" label="Log Customer" value={draft.customerName} disabled={!!draft.taskId} options={customers.map(c=>({value:c.name,label:c.name,color:c.color}))} onChange={v=>{change('customerName',v);if(log)void autoSave({customerName:v})}}/></label>
      <label>Task Title *<SearchPicker id="logTask" label="Log Task Title" value={draft.taskId??''} placeholder={draft.taskId?draft.taskTitle+' · historical task':custom?'Custom Task':'Select Task…'} options={tasks.filter(t=>ACTIVE.has(t.status)).map(t=>({value:t.taskId,label:t.taskTitle,columns:[t.taskTitle,t.taskDescription??'',t.customerName],searchText:[t.taskTitle,t.taskDescription,t.customerName].join(' ')}))} onChange={choose} actionsAtTop actions={[{label:'+ Add Custom Task',onClick:switchToCustom}]}/></label>
      {custom&&<label>Custom Task Title *<Input id="logCustomTitle" required maxLength={100} value={draft.taskTitle} onChange={e=>change('taskTitle',e.target.value)} onBlur={e=>saveField('taskTitle',e.target.value)}/></label>}
      <label>Task Description / Comment<Textarea id="logDescription" maxLength={10000} value={draft.taskDescription} onChange={e=>change('taskDescription',e.target.value)} onBlur={e=>saveField('taskDescription',e.target.value)}/></label>
      <label>Note<Textarea id="logNote" maxLength={10000} value={draft.note} onChange={e=>change('note',e.target.value)} onBlur={e=>saveField('note',e.target.value)}/></label>
      <label>Tracker Link<Input id="logLink" type="url" maxLength={2048} value={draft.trackerLink} onChange={e=>change('trackerLink',e.target.value)} onBlur={e=>saveField('trackerLink',e.target.value)}/></label>
      <label>Activity *<SearchPicker id="logActivity" label="Log Activity" value={draft.activity} options={ACTIVITIES.map(value=>({value,label:value}))} onChange={v=>{change('activity',v);if(log)void autoSave({activity:v})}}/></label>
      <div className="grid gap-4 sm:grid-cols-3"><label>Date *<Input id="logDate" type="date" required max={today()} value={draft.date} onChange={e=>change('date',e.target.value)}/></label><label>Start Time *<Input id="logStart" type="text" inputMode="numeric" placeholder="HH:mm" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" required value={draft.startTime} onChange={e=>change('startTime',e.target.value)}/></label><label>End Time *<Input id="logEnd" type="text" inputMode="numeric" placeholder="HH:mm" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" required value={draft.endTime} onChange={e=>change('endTime',e.target.value)}/></label></div>
      <label>Spend Time (Hour)<Input id="logSpend" readOnly value={hours(Math.max(0,end-start))}/></label>
    </fieldset><ErrorText id="logDialogError" error={error}/>
    {log?<div className="flex flex-wrap items-center justify-between gap-3"><p id="logAutoSaveStatus" role="status" className="text-sm text-muted-foreground">{saving>0?'Saving…':saveStatus||'Editable fields save automatically when you leave a field.'}{timeDirty?' · Time changes not saved':''}{ordinaryDirty&&saveStatus==='Save failed'?' · Retry the field to save':''}</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>void close()}>Close</Button><Button id="saveLogTimeChanges" type="button" disabled={busy||saving>0||!timeDirty} onClick={()=>void saveTime()}>{saving>0?'Saving…':'Save Time'}</Button></div></div>:
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy?'Saving…':'Save Log Time'}</Button></div>}</form>
  </Modal>
}
