import type { Group, View } from './model'
export function toggleCard(current: string, clicked: string, view: View) {
  const total = view === 'weekly' ? 'Overall Total' : 'All'
  return current === clicked ? total : clicked
}
export function selectGroups(groups: Group[], view: View, selected: string): Group[] {
  return view === 'all' || selected === (view === 'weekly' ? 'Overall Total' : 'All')
    ? groups : groups.filter(([label]) => label === selected)
}
