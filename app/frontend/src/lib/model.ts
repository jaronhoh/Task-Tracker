export const STATUSES = ['Work in Progress', 'Pending with Customer', 'KIV', 'Closed', 'Deleted'] as const
export type Status = typeof STATUSES[number]
export type View = 'weekly' | 'status' | 'all'
export interface Task { taskId: string; customerName: string; taskTitle: string; taskDescription: string | null; note: string | null; created: string; end: string | null; status: Status }
export interface Customer { name: string; color: string }
export const ACTIVE = new Set<string>(STATUSES.slice(0, 3))
export const COLORS = ['#F87171','#FB923C','#FBBF24','#A3E635','#4ADE80','#34D399','#2DD4BF','#22D3EE','#38BDF8','#60A5FA','#818CF8','#A78BFA','#C084FC','#E879F9','#F472B6','#A8A29E']
export const FIELDS = ['taskId','customerName','taskTitle','taskDescription','note','created','end','status'] as const
export const HEADERS = ['Task ID','Customer Name','Task Title','Task Description','Note','Created','End','Status']
export const SEARCH_FIELDS = FIELDS.slice(0, 5)
export type Group = [string, Task[]]

// The API also accepts offset timestamps. Unzoned values always mean Malaysia wall time.
export function epoch(value: string) { return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+08:00`) }
export function malaysiaParts(now = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]))
}
export function weekBounds(now = new Date()) {
  const p = malaysiaParts(now)
  const wall = new Date(Date.UTC(+p.year, +p.month - 1, +p.day))
  const start = wall.getTime() - ((wall.getUTCDay() + 6) % 7) * 86400000 - 8 * 3600000
  return { start, end: start + 7 * 86400000 }
}
export function viewTasks(tasks: Task[], view: View, query = '', bounds = weekBounds()) {
  const q = query.trim().toLocaleLowerCase('en-US')
  return tasks.filter(t => view === 'all' || (epoch(t.created) < bounds.start && ACTIVE.has(t.status)) || (epoch(t.created) >= bounds.start && epoch(t.created) < bounds.end && t.status !== 'Deleted'))
    .filter(t => !q || SEARCH_FIELDS.some(f => String(t[f] ?? '').toLocaleLowerCase('en-US').includes(q)))
    .sort((a,b) => a.customerName.localeCompare(b.customerName, undefined, { sensitivity:'base' }) || a.taskId.localeCompare(b.taskId))
}
export function groupsFor(tasks: Task[], view: View, bounds = weekBounds()): Group[] {
  if (view === 'weekly') return [['Carry Over', tasks.filter(t => epoch(t.created) < bounds.start && ACTIVE.has(t.status))], ['New This Week', tasks.filter(t => epoch(t.created) >= bounds.start && epoch(t.created) < bounds.end && t.status !== 'Deleted')]]
  if (view === 'status') return STATUSES.slice(0,4).map(s => [s, tasks.filter(t => t.status === s)])
  return [['All Tasks', tasks]]
}
export function formatTime(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-MY',{ timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false }).format(new Date(epoch(value)))
}
export function toInput(value: string | null) { return value ? new Date(epoch(value) + 8 * 3600000).toISOString().slice(0,16) : '' }
export function fromInput(value: string) { return value ? `${value}:00+08:00` : null }
export function exportRows(groups: Group[], grouped: boolean): (string | number)[][] {
  return [HEADERS, ...groups.flatMap(([name,tasks]) => [ ...(grouped ? [[`${name} (${tasks.length})`]] : []), ...tasks.map(t => FIELDS.map(f => t[f] ?? '')) ])]
}
