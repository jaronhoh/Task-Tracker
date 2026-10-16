import type { Task } from './model'
export function filterStatus(tasks: Task[], status: string) {
  return status === 'All' ? tasks : tasks.filter(task => task.status === status)
}
