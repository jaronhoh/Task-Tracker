/**
 * Display the version of the code actually bundled into this running app.
 * Sites' latest saved source version can differ from its active deployment,
 * so do not label the bundled app version as a Sites deployment number.
 */
export interface BuildInfo { version: string; updatedAt: string }
declare const __TASK_TRACKER_BUILD__: BuildInfo | undefined

export function formatRelease(info: BuildInfo | undefined): string {
  const version = info?.version?.trim()
  const date = info?.updatedAt ? new Date(info.updatedAt) : null
  if (!version || !date || Number.isNaN(date.getTime())) return 'App version unavailable · Updated unavailable'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  const stamp = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
  return `App v${version.replace(/^v/i, '')} · Updated ${stamp} MYT`
}

export const releaseLabel = formatRelease(
  typeof __TASK_TRACKER_BUILD__ === 'undefined' ? undefined : __TASK_TRACKER_BUILD__
)
