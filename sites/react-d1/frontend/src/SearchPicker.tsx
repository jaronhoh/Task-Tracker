import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type Option = {value:string;label:string;color?:string;searchText?:string;disabled?:boolean}
type Action = {label:string;disabled?:boolean;onClick:()=>void}
export function colorOption(color:string):Option {
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).join(', ')
  return {value:color,label:color,color,searchText:`${color} rgb(${rgb})`}
}
export function SearchPicker({id,label,listLabel=label,value,options,onChange,disabled=false,placeholder='Select…',actions=[],up=false}:{id?:string;label:string;listLabel?:string;value:string;options:Option[];onChange:(value:string)=>void;disabled?:boolean;placeholder?:string;actions?:Action[];up?:boolean}) {
  const uid=useId(),listId=`${uid}-options`
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null)
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0)
  const filtered=options.filter(o=>(o.searchText??o.label).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const selected=options.find(o=>o.value===value)
  const activeOption=filtered[active]
  function close(restore=true){setOpen(false);if(restore)trigger.current?.focus()}
  function show(){if(disabled)return;setQuery('');setActive(Math.max(0,options.findIndex(o=>o.value===value&&!o.disabled)));setOpen(true)}
  function choose(option:Option){if(option.disabled)return;close();onChange(option.value)}
  function move(direction:number){for(let n=1;n<=filtered.length;n++){const next=(active+direction*n+filtered.length)%filtered.length;if(!filtered[next].disabled){setActive(next);break}}}
  useEffect(()=>{if(open)input.current?.focus()},[open])
  useEffect(()=>{if(open)root.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({block:'nearest'})},[active,open])
  useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open])
  return <div ref={root} className="relative min-w-0 search-picker" data-popover-open={open?'true':undefined} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(open)move(e.key==='ArrowDown'?1:-1);else show()}else if(e.key==='Enter'&&open&&e.target===input.current){e.preventDefault();if(activeOption)choose(activeOption)}}}>
    <button ref={trigger} id={id} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?listId:undefined} disabled={disabled} className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-left" onClick={()=>open?close():show()}>
      <span className="inline-flex min-w-0 items-center gap-2">{selected?.color&&<span className="size-3 shrink-0 rounded-full border" style={{backgroundColor:selected.color}} aria-hidden="true"/>}<span className={selected?'truncate':'text-muted-foreground'}>{selected?.label??placeholder}</span></span><ChevronDown className="size-4 shrink-0" aria-hidden="true"/>
    </button>
    {open&&<div className={`absolute ${up?'bottom-full mb-1':'top-full mt-1'} z-50 w-full min-w-40 rounded-md border bg-card p-1 shadow-lg`}>
      <input ref={input} type="text" role="combobox" aria-label={`Search ${label}`} aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={activeOption&&!activeOption.disabled?`${uid}-${active}`:undefined} placeholder="Search…" className="mb-1 w-full rounded border bg-card px-2 py-2 text-sm" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}}/>
      <div id={listId} role="listbox" aria-label={listLabel} className="max-h-40 overflow-y-auto overscroll-contain bg-card">
        {filtered.map((option,index)=><button id={`${uid}-${index}`} data-option-index={index} key={option.value} type="button" role="option" tabIndex={-1} aria-selected={option.value===value} disabled={option.disabled} className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-muted disabled:opacity-50 ${index===active?'bg-muted':''}`} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(option)}>{option.color&&<span className="size-3 shrink-0 rounded-full border" style={{backgroundColor:option.color}} aria-hidden="true"/>}<span className="flex-1">{option.color?<code>{option.label}</code>:option.label}</span>{option.disabled&&<span className="text-xs">In use</span>}{option.value===value&&<Check className="size-4" aria-label="Selected"/>}</button>)}
      </div>
      {!filtered.length&&<p role="status" className="px-2 py-3 text-sm text-muted-foreground">No results found</p>}
      {!!actions.length&&<div className="mt-1 border-t pt-1">{actions.map(action=><button key={action.label} type="button" disabled={action.disabled} className="w-full rounded px-2 py-2 text-left hover:bg-muted disabled:opacity-50" onClick={()=>{close();action.onClick()}}>{action.label}</button>)}</div>}
    </div>}
  </div>
}
