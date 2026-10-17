import type { Task, Customer } from './model'

// Count exactly the group's represented rows, including unresolved customer references.
export function customerSummary(tasks: Task[], customers: Customer[]) {
  const known=new Map(customers.map(customer=>[customer.name,customer]))
  const counts=new Map<string,{name:string;count:number;color?:string}>()
  for(const task of tasks) {
    const customer=known.get(task.customerName)
    const name=customer?.name??'Unassigned'
    const bucket=counts.get(name)??{name,count:0,color:customer?.color}
    bucket.count++
    counts.set(name,bucket)
  }
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'en'))
}
