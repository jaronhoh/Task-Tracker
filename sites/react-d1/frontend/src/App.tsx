import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Download, Users, Pencil, Clock3, Search, ListTodo, RotateCcw, CircleCheck, CircleX, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { selectGroups, toggleCard } from './lib/summary-filter'
import { api } from './lib/api'
import { groupsFor, viewTasks, weekBounds, exportRows, malaysiaParts, type Task, type Customer, type View, type Status } from './lib/model'
import { LogTime } from './LogTime'
import { ThemeToggle } from './ThemeToggle'
import { TaskTable } from './TaskTable'
import { TaskEditor, CustomerManager, TimeEditor } from './Editors'

export default function App() {
  const [tasks,setTasks]=useState<Task[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[view,setView]=useState<View>('weekly'),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null)
  const [workspace,setWorkspace]=useState('tasks')
  const [cardFilter,setCardFilter]=useState('Overall Total')
  const [health,setHealth]=useState('Connecting…'),[notices,setNotices]=useState<NoticeItem[]>([]),[loading,setLoading]=useState(true)
  const [editor,setEditor]=useState<Task|null|undefined>(undefined),[manage,setManage]=useState(false),[time,setTime]=useState<{task:Task;special?:Status}|null>(null),[ordered,setOrdered]=useState<Task[]>([])
  const refresh=useCallback(async()=>{const [t,c]=await Promise.all([api<Task[]>('/api/tasks'),api<Customer[]>('/api/customers')]);setTasks(t);setCustomers(c)},[])
  const notify=useCallback((message:string,variant:NoticeVariant='success')=>{const id=crypto.randomUUID();setNotices(items=>[...items,{id,message,variant}])},[])
  const dismissNotice=useCallback((id:string)=>setNotices(items=>items.filter(item=>item.id!==id)),[])
  useEffect(()=>{void(async()=>{try{await api('/api/health');await refresh();setHealth('API Connected')}catch(e){setHealth('API Unavailable');notify((e as Error).message,'error')}finally{setLoading(false)}})()},[refresh,notify])
  const bounds=weekBounds()
  const searched=useMemo(()=>viewTasks(tasks,view,query,bounds),[tasks,view,query,bounds.start,bounds.end])
  const scopeGroups=useMemo(()=>groupsFor(searched,view,bounds),[searched,view,bounds.start,bounds.end])
  const groups=useMemo(()=>selectGroups(scopeGroups,view,cardFilter),[scopeGroups,view,cardFilter])
  const displayed=useMemo(()=>view==='all'?searched:groups.flatMap(([,rows])=>rows),[view,searched,groups])
  const picked=displayed.find(t=>t.taskId===selected)
  const cards:viewCard[]=view==='status'?[['All',searched.length],...groupsFor(searched,'status',bounds).map(([n,t]):viewCard=>[n,t.length])]:view==='all'?[['All Records',tasks.length],['Displayed',displayed.length],['Deleted',tasks.filter(t=>t.status==='Deleted').length]]:[['Overall Total',searched.length],...scopeGroups.map(([n,t]):viewCard=>[n,t.length])]
  function changeView(value:string){setView(value as View);setCardFilter(value==='weekly'?'Overall Total':'All');setSearch('');setQuery('');setSelected(null)}
  async function exportExcel(){try{const XLSX=await import('xlsx');const g=view==='all'?groupsFor(ordered,view,bounds):groups;const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(exportRows(g,view!=='all')),'Tasks');const d=malaysiaParts();XLSX.writeFile(book,`TaskTracker_${{weekly:'WeeklyTask',status:'CurrentWeekStatus',all:'ShowAllData'}[view]}_${d.year}${d.month}${d.day}.xlsx`)}catch(e){notify(`Export failed: ${(e as Error).message}`,'error')}}
  return <div className="min-h-screen"><header className="border-b bg-card"><div className="mx-auto max-w-[1600px] px-5 sm:px-10 app-header py-7 flex flex-wrap items-center justify-between gap-4"><div className="flex gap-3 items-center min-w-0"><div className="rounded-lg bg-primary text-primary-foreground p-2.5"><ListTodo className="size-5"/></div><div><h1 className="text-xl font-semibold tracking-tight">Task Tracker</h1><p className="text-xs text-muted-foreground mt-1">A clearer view of your work.</p></div></div><div className="header-meta flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><Badge id="healthBadge" variant="outline" className={health==='API Connected'?'ok':''}><span className={`color-dot ${health==='API Connected'?'bg-emerald-500':'bg-neutral-400'}`}/>{health}</Badge><span>Malaysia Time · UTC+8</span></div><ThemeToggle/></div></header>
    <main className="mx-auto max-w-[1600px] px-5 sm:px-10 py-8 grid gap-6"><Tabs value={workspace} onValueChange={setWorkspace}><TabsList variant="line" className="line-tabs" aria-label="Workspace"><TabsTrigger className="view-tab" value="tasks">Task Tracker</TabsTrigger><TabsTrigger className="view-tab" value="logs">Log Time</TabsTrigger></TabsList></Tabs><section style={{display:workspace==='tasks'?'contents':'none'}}><div className="flex flex-wrap justify-between gap-4 items-start"><div><h2 className="text-2xl font-semibold tracking-tight">Your workspace</h2><p className="mt-1 text-sm text-muted-foreground">Track progress, keep context, and plan your week.</p></div><Button id="newTaskBtn" disabled={loading} onClick={()=>setEditor(null)}><Plus/> New Task</Button></div>
    <Tabs className="min-w-0 max-w-full" value={view} onValueChange={changeView}><TabsList variant="line" className="line-tabs w-full min-w-0 max-w-full justify-start overflow-x-auto" aria-label="Task views">{([['weekly','Weekly Task'],['status','Current Week Status'],['all','Show All Data']] as const).map(([v,label])=><TabsTrigger key={v} value={v} className="view-tab flex-none shrink-0" data-view={v}>{label}</TabsTrigger>)}</TabsList></Tabs>
    <section id="summaryRow" className="summary-row grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5" aria-label="Task summary filters">{cards.map(([label,n])=><Card key={label} className={`summary-card shadow-none gap-2 ${view!=='all'?'p-0':'py-5'} ${view!=='all'&&cardFilter===label?'status-filter-selected':''}`}><CardContent className={view!=='all'?'p-0':'px-5'}>{view!=='all'?<button type="button" className="status-filter-button" aria-pressed={cardFilter===label} onClick={()=>{setCardFilter(current=>toggleCard(current,label,view));setSelected(null)}}><span className="text-xs text-muted-foreground">{label}</span><strong className="block mt-2 text-3xl tracking-tight font-semibold">{n}</strong></button>:<><span className="text-xs text-muted-foreground">{label}</span><strong className="block mt-2 text-3xl tracking-tight font-semibold">{n}</strong></>}</CardContent></Card>)}</section>
    <div className="flex flex-wrap items-center gap-2"><form className="flex gap-2 items-center mr-auto flex-wrap" onSubmit={e=>{e.preventDefault();setQuery(search)}}><label htmlFor="globalSearch" className="sr-only">Global Search</label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input id="globalSearch" type="search" placeholder="Search tasks…" className="pl-9 w-64" value={search} onChange={e=>setSearch(e.target.value)}/></div><Button variant="outline" id="searchBtn" type="submit">Search</Button><Button variant="ghost" id="clearSearchBtn" type="button" onClick={()=>{setSearch('');setQuery('')}}>Clear</Button></form><Button id="manageCustomersBtn" variant="outline" onClick={()=>setManage(true)}><Users/>Manage Customers</Button><Button id="editTaskBtn" variant="outline" disabled={!picked} onClick={()=>picked&&setEditor(picked)}><Pencil/>Edit Task</Button>{view==='all'&&<Button id="editTimeBtn" variant="outline" disabled={!picked} onClick={()=>picked&&setTime({task:picked})}><Clock3/>Edit Time</Button>}<Button id="exportBtn" variant="outline" disabled={loading} onClick={exportExcel}><Download/>Export to Excel</Button></div>
    {health==='API Unavailable'&&<Button variant="outline" onClick={()=>window.location.reload()}><RotateCcw/>Retry connection</Button>}
    {!loading&&displayed.length===0&&<p role="status">No results found</p>}
    {loading?<p role="status" className="text-muted-foreground py-12">Loading tasks…</p>:<TaskTable key={JSON.stringify([view,query,bounds.start])} tasks={displayed} groups={groups} view={view} customers={customers} selected={selected} onSelect={setSelected} onEdit={setEditor} onOrdered={setOrdered}/>}
    <p className="text-xs text-muted-foreground">Click a row to select · Double-click or press Enter to edit</p>
    </section>{workspace==='logs'&&<LogTime tasks={tasks} customers={customers} refreshTasks={refresh} notify={notify}/>}</main>
    {editor!==undefined&&<TaskEditor key={editor?.taskId??'new'} task={editor===null?null:tasks.find(t=>t.taskId===editor.taskId)??editor} customers={customers} refresh={refresh} notify={notify} onClose={()=>setEditor(undefined)} onTime={(task,special)=>setTime({task,special})}/>}
    {manage&&<CustomerManager customers={customers} refresh={refresh} notify={notify} onClose={()=>setManage(false)}/>}
    {time&&<TimeEditor task={time.task} special={time.special} refresh={refresh} notify={notify} onClose={()=>setTime(null)}/>}
    <div id="notification-region" className="notification-region" aria-label="Notifications">{notices.map(n=><NoticeAlert key={n.id} notice={n} onDismiss={dismissNotice}/>)}</div>
  </div>
}
type viewCard=[string,number]
type NoticeVariant='success'|'error'|'info'
type NoticeItem={id:string;message:string;variant:NoticeVariant}
function NoticeAlert({notice:n,onDismiss}:{notice:NoticeItem;onDismiss:(id:string)=>void}) {
  useEffect(()=>{const timer=window.setTimeout(()=>onDismiss(n.id),5000);return()=>window.clearTimeout(timer)},[n.id,onDismiss])
  return <Alert id={`notice-${n.id}`} role={n.variant==='error'?'alert':'status'} aria-live={n.variant==='error'?'assertive':'polite'} variant={n.variant==='error'?'destructive':'default'} className={`notification-alert notification-${n.variant}`}><span className="notification-icon">{n.variant==='success'?<CircleCheck aria-hidden="true"/>:n.variant==='error'?<CircleX aria-hidden="true"/>:<Info aria-hidden="true"/>}</span><AlertTitle>{n.variant==='success'?'Success':n.variant==='error'?'Error':'Information'}</AlertTitle><AlertDescription>{n.message}</AlertDescription><button type="button" className="notification-dismiss" aria-label="Dismiss notification" onClick={()=>onDismiss(n.id)}><X aria-hidden="true"/></button></Alert>
}

