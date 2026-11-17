import { onMounted, onScopeDispose } from 'vue'

// Re-reads persisted quota snapshots while the page is visible and when the tab
// regains focus. It never triggers collection; Home keeps snapshots fresh on its own.
export function useQuotaAutoRefresh(refresh: () => Promise<unknown>, interval = 60_000, minGap = 15_000) {
  let timer: ReturnType<typeof setInterval> | undefined
  let busy = false
  let last = Date.now()
  const active = () => document.visibilityState === 'visible' && navigator.onLine

  async function tick(force = false) {
    if (busy || !active() || (!force && Date.now() - last < minGap)) return
    busy = true
    last = Date.now()
    try { await refresh() } catch { /* The owning surface displays request failures. */ } finally { busy = false }
  }
  const onFocus = () => { void tick() }

  onMounted(() => {
    timer = setInterval(() => { void tick(true) }, interval)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
  })
  onScopeDispose(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onFocus)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('online', onFocus)
  })
}
