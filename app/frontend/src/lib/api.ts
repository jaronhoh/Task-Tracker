export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type':'application/json', ...options.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : payload?.error?.message || `Request failed (${response.status}).`)
  return payload as T
}
// Recover the tail after failure so a later edit can always be retried in order.
export function createSaveQueue() {
  let tail = Promise.resolve()
  return { enqueue<T>(save: () => Promise<T>): Promise<T> { const result = tail.then(save); tail = result.then(() => {}, () => {}); return result }, settled() { return tail } }
}
