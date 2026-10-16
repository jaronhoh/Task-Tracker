import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Download, Users, Pencil, Clock3, Search, ListTodo, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from './lib/api'
import { groupsFor, viewTasks, weekBounds, exportRows, malaysiaParts, type Task, type Customer, type View, type Status } from './lib/model'
import { TaskTable } from './TaskTable'
import { TaskEditor, CustomerManager, TimeEditor } from './Editors'

export default function App() {
  const [tasks,setTasks]=useState<Task[]>([]),[customers,setCustomers]=useState<Customer[]>([]),[view,setView]=useState<View>('weekly'),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null)
  const [health,setHealth]=useState('Connecting…'),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true)
  const [editor,setEditor]=useState<Task|null|undefined>(undefined),[manage,setManage]=useState(false),[time,setTime]=useState<{task:Task;special?:Status}|null>(null),[ordered,setOrdered]=useState<Task[]>([])
  const refresh=useCallback(async()=>{const [t,c]=await Promise.all([api<Task[]>('/api/tasks'),api<Customer[]>('/api/customers')]);setTasks(t);setCustomers(c)},[])
  useEffect(()=>{void(async()=>{try{await api('/api/health');await refresh();setHealth('API Connected')}catch(e){setHealth('API Unavailable');setNotice((e as Error).message)}finally{setLoading(false)}})()},[refresh])
  const bounds=weekBounds()
  const displayed=useMemo(()=>viewTasks(tasks,view,query,bounds),[tasks,view,query,bounds.start,bounds.end])
  const groups=useMemo(()=>groupsFor(displayed,view,bounds),[displayed,view,bounds.start,bounds.end])
  const picked=displayed.find(t=>t.taskId===selected)
  const cards:viewCard[]=view==='all'?[['All Records',tasks.length],['Displayed',displayed.length],['Deleted',tasks.filter(t=>t.status==='Deleted').length]]:[['Overall Total',displayed.length],...groups.map(([n,t]):viewCard=>[n,t.length])]
  function changeView(value:string){setView(value as View);setSearch('');setQuery('');setSelected(null)}
  async function exportExcel(){try{const XLSX=await import('xlsx');const g=view==='all'?groupsFor(ordered,view,bounds):groups;const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(exportRows(g,view!=='all')),'Tasks');const d=malaysiaParts();XLSX.writeFile(book,`TaskTracker_${{weekly:'WeeklyTask',status:'CurrentWeekStatus',all:'ShowAllData'}[view]}_${d.year}${d.month}${d.day}.xlsx`)}catch(e){setNotice(`Export failed: ${(e as Error).message}`)}}
  return <div className="min-h-screen"><header className="border-b bg-white"><div className="mx-auto max-w-[1600px] px-5 sm:px-10 py-7 flex flex-wrap items-center justify-between gap-4"><div className="flex gap-3 items-center"><div className="rounded-lg bg-primary text-white p-2.5"><ListTodo className="size-5"/></div><div><h1 className="text-xl font-semibold tracking-tight">Task Tracker</h1><p className="text-xs text-muted-foreground mt-1">A clearer view of your work.</p></div></div><div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><Badge id="healthBadge" variant="outline" className={health==='API Connected'?'ok':''}><span className={`color-dot ${health==='API Connected'?'bg-emerald-500':'bg-neutral-400'}`}/>{health}</Badge><span>Malaysia Time · UTC+8</span></div></div></header>
    <main className="mx-auto max-w-[1600px] px-5 sm:px-10 py-8 grid gap-6"><div className="flex flex-wrap justify-between gap-4 items-start"><div><h2 className="text-2xl font-semibold tracking-tight">Your workspace</h2><p className="mt-1 text-sm text-muted-foreground">Track progress, keep context, and plan your week.</p></div><Button id="newTaskBtn" disabled={loading} onClick={()=>setEditor(null)}><Plus/> New Task</Button></div>
    <Tabs value={view} onValueChange={changeView}><TabsList className="max-w-full overflow-x-auto" aria-label="Task views">{([['weekly','Weekly Task'],['status','Current Week Status'],['all','Show All Data']] as const).map(([v,label])=><TabsTrigger key={v} value={v} className="view-tab" data-view={v}>{label}</TabsTrigger>)}</TabsList></Tabs>
    <section id="summaryRow" className="summary-row grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5" aria-live="polite">{cards.map(([label,n])=><Card key={label} className="summary-card shadow-none gap-2 py-5"><CardContent className="px-5"><span className="text-xs text-muted-foreground">{label}</span><strong className="block mt-2 text-3xl tracking-tight font-semibold">{n}</strong></CardContent></Card>)}</section>
    <div className="flex flex-wrap items-center gap-2"><form className="flex gap-2 items-center mr-auto flex-wrap" onSubmit={e=>{e.preventDefault();setQuery(search)}}><label htmlFor="globalSearch" className="sr-only">Global Search</label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input id="globalSearch" type="search" placeholder="Search tasks…" className="pl-9 w-64" value={search} onChange={e=>setSearch(e.target.value)}/></div><Button variant="outline" id="searchBtn" type="submit">Search</Button><Button variant="ghost" id="clearSearchBtn" type="button" onClick={()=>{setSearch('');setQuery('')}}>Clear</Button></form><Button id="manageCustomersBtn" variant="outline" onClick={()=>setManage(true)}><Users/>Manage Customers</Button><Button id="editTaskBtn" variant="outline" disabled={!picked} onClick={()=>picked&&setEditor(picked)}><Pencil/>Edit Task</Button>{view==='all'&&<Button id="editTimeBtn" variant="outline" disabled={!picked} onClick={()=>picked&&setTime({task:picked})}><Clock3/>Edit Time</Button>}<Button id="exportBtn" variant="outline" disabled={loading} onClick={exportExcel}><Download/>Export to Excel</Button></div>
    {notice&&<p id="notice" role="status" className="border rounded-lg bg-white p-3 text-sm">{notice}</p>}{health==='API Unavailable'&&<Button variant="outline" onClick={()=>window.location.reload()}><RotateCcw/>Retry connection</Button>}
    {loading?<p role="status" className="text-muted-foreground py-12">Loading tasks…</p>:<TaskTable tasks={displayed} groups={groups} view={view} customers={customers} selected={selected} onSelect={setSelected} onEdit={setEditor} onOrdered={setOrdered}/>}
    <p className="text-xs text-muted-foreground">Click a row to select · Double-click or press Enter to edit</p>
    </main>
    {editor!==undefined&&<TaskEditor key={editor?.taskId??'new'} task={editor===null?null:tasks.find(t=>t.taskId===editor.taskId)??editor} customers={customers} refresh={refresh} notify={setNotice} onClose={()=>setEditor(undefined)} onTime={(task,special)=>setTime({task,special})}/>}
    {manage&&<CustomerManager customers={customers} refresh={refresh} notify={setNotice} onClose={()=>setManage(false)}/>}
    {time&&<TimeEditor task={time.task} special={time.special} refresh={refresh} notify={setNotice} onClose={()=>setTime(null)}/>}
  </div>
}
type viewCard=[string,number]
