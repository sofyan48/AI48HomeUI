import { computed, inject, provide, type InjectionKey } from 'vue'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

type PeriodWindowStatus = { id: string; enabled: boolean; limit: number | null; used: number; remaining: number | null; active: boolean; reset_at?: string | null }
type PeriodLimitsStatus = { windows?: PeriodWindowStatus[] }


function createWorkspaceDashboard() {
  const { t } = usePortalI18n()
  const { currentUser: user, serverInfo, fetchAPI } = useUserApi()
  const periodLimits = useWorkspaceState<PeriodLimitsStatus | null>('user:workspace:period-limits', () => null)
  const activePeriodWindows = computed(() => (periodLimits.value?.windows || []).filter(window => window.enabled && window.limit != null))
  const curlExample = computed(() => {
    const url = new URL(serverInfo.value.cpa_public_url || 'https://api.gonkagate.com/v1')
    const basePath = url.pathname.replace(/\/+$/, '')
    url.pathname = `${basePath.endsWith('/v1') ? basePath : `${basePath}/v1`}/chat/completions`
    url.search = ''
    url.hash = ''
    const endpoint = url.toString().replace(/'/g, "'\\''")
    return [
      `curl '${endpoint}' \\`,
      '  -H "Authorization: Bearer gp-..." \\',
      '  -H "Content-Type: application/json" \\',
      "  -d '{",
      '    "model": "<model-id>",',
      '    "messages": [{"role": "user", "content": "Hello"}]',
      "  }'"
    ].join('\n')
  })
  function periodWindowLabel(id: string) { return id === '5h' ? t('ws.window.5h') : id === '1d' ? t('ws.window.1d') : id === '7d' ? t('ws.window.7d') : id === '30d' ? t('ws.window.30d') : id }
  function periodWindowRatio(window: PeriodWindowStatus) { const limit = Number(window.limit); return limit > 0 ? Math.max(0, Math.min(1, Number(window.used || 0) / limit)) : 1 }
  function periodWindowColor(window: PeriodWindowStatus) { const ratio = periodWindowRatio(window); return ratio >= 1 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ratio >= 0.8 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400' }
  function periodWindowBarColor(window: PeriodWindowStatus) { const ratio = periodWindowRatio(window); return ratio >= 1 ? 'bg-red-600 dark:bg-red-400' : ratio >= 0.8 ? 'bg-amber-600 dark:bg-amber-400' : 'bg-violet-600 dark:bg-violet-400' }
  function formatPercent(value: number) { return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }
  const limitAlert = computed(() => {
    const highest = Math.max(0, ...activePeriodWindows.value.map(periodWindowRatio))
    if (!activePeriodWindows.value.length) return null
    if (highest >= 1) return { label: t('ws.dashboard.limitReached'), color: 'error' as const }
    if (highest >= 0.8) return { label: t('ws.dashboard.nearLimit'), color: 'warning' as const }
    return null
  })
  const dashboardStatusLine = computed(() => {
    if (limitAlert.value?.color === 'error') return t('ws.dashboard.statusReached')
    if (limitAlert.value) return t('ws.dashboard.statusNear')
    if (user.value && Number(user.value.credits) <= 0) return t('ws.dashboard.statusEmpty')
    return t('ws.dashboard.statusReady')
  })
  async function loadPeriodLimits() {
    try { periodLimits.value = await fetchAPI<PeriodLimitsStatus>('/period-limits') }
    catch (error: any) { if (error?.statusCode !== 404) throw error; periodLimits.value = null }
  }
  return { activePeriodWindows, curlExample, periodWindowLabel, periodWindowRatio, periodWindowColor, periodWindowBarColor, formatPercent, limitAlert, dashboardStatusLine, loadPeriodLimits }
}
const dashboardKey: InjectionKey<ReturnType<typeof createWorkspaceDashboard>> = Symbol('workspace-dashboard')
export function provideWorkspaceDashboard() {
  const dashboard = createWorkspaceDashboard()
  provide(dashboardKey, dashboard)
  return dashboard
}
export function useWorkspaceDashboard() {
  const dashboard = inject(dashboardKey)
  if (!dashboard) throw new Error('Workspace dashboard is not provided')
  return dashboard
}
