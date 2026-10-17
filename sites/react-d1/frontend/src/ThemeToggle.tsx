import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const key = 'task-tracker-theme'
type Theme = 'light' | 'dark'
function preference(): Theme | null {
  try { const value = localStorage.getItem(key); return value === 'light' || value === 'dark' ? value : null } catch { return null }
}
function systemTheme(): Theme { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
function apply(theme: Theme) { document.documentElement.dataset.theme = theme }

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => preference() ?? systemTheme())
  useEffect(() => {
    apply(theme)
  }, [theme])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncSystem = () => { if (!preference()) setTheme(systemTheme()) }
    const syncStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) setTheme(preference() ?? systemTheme()) }
    media.addEventListener('change', syncSystem)
    window.addEventListener('storage', syncStorage)
    return () => { media.removeEventListener('change', syncSystem); window.removeEventListener('storage', syncStorage) }
  }, [])
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`
  return <Button id="themeToggle" type="button" variant="outline" size="icon" aria-label={label} title={label} onClick={() => {
    const next = theme === 'light' ? 'dark' : 'light'
    apply(next)
    setTheme(next)
    try { localStorage.setItem(key, next) } catch { /* Theme still works when browser storage is unavailable. */ }
  }}>{theme === 'light' ? <Moon aria-hidden="true"/> : <Sun aria-hidden="true"/>}</Button>
}
