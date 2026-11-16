import { computed, inject, provide, type InjectionKey, type Ref } from 'vue'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDashboardSummary } from '~/composables/dashboard/useDashboardSummary'

export type DashboardIssue = { label: string; detail: string; to: string }
export type ProviderRow = { label: string; path: string; total: number; active: number; disabled: number }

const providers = [
  { label: 'Gemini', path: '/config/api-keys/gemini' },
  { label: 'Google Interactions', path: '/config/api-keys/interactions' },
  { label: 'Claude', path: '/config/api-keys/claude' },
  { label: 'Codex', path: '/config/api-keys/codex' },
  { label: 'Vertex', path: '/config/api-keys/vertex' },
  { label: 'OpenAI compatibility', path: '/config/api-keys/openai-compatibility' },
  { label: 'xAI', path: '/config/api-keys/xai' }
]

const firstArray = (value: any, keys: string[]): any[] => {
  if (Array.isArray(value)) return value
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key]
  return []
}

/**
 * State and loader for /admin/dashboard. The page calls `provideDashboard()` once;
 * sections read the same instance with `useDashboard()`.
 */
function createDashboard() {
  const { fetchAPI } = useApi()
  const { refreshCapabilities, supports } = useCapabilities()
  const { t } = useAdminI18n()

  const loading = useWorkspaceState('admin:dashboard:loading', () => false)
  const loadError = useWorkspaceState('admin:dashboard:loadError', () => '')
  const lastUpdated = useWorkspaceState<Date | null>('admin:dashboard:lastUpdated', () => null)
  const snapshot = useWorkspaceState('admin:dashboard:snapshot', () => false)
  const config = useWorkspaceState<Record<string, any>>('admin:dashboard:config', () => ({}))
  const latestVersion = useWorkspaceState('admin:dashboard:latestVersion', () => '')
  const clientKeys = useWorkspaceState<any[]>('admin:dashboard:clientKeys', () => [])
  const accountFiles = useWorkspaceState<any[]>('admin:dashboard:accountFiles', () => [])
  const providerRows = useWorkspaceState<ProviderRow[]>('admin:dashboard:providerRows', () => [])
  const availableModels = useWorkspaceState<number | null>('admin:dashboard:availableModels', () => null)
  const topology = useWorkspaceState<any>('admin:dashboard:topology', () => null)
  const nodes = useWorkspaceState<any[]>('admin:dashboard:nodes', () => [])
  const usage = useWorkspaceState<any>('admin:dashboard:usage', () => null)
  const dataIssues = useWorkspaceState<DashboardIssue[]>('admin:dashboard:dataIssues', () => [])
  const snapshotUsers = useWorkspaceState<any[]>('admin:dashboard:snapshotUsers', () => [])

  const runtimeMode = computed(() => String(config.value['mode'] || config.value['runtime-mode'] || '').toLowerCase())
  const visibleProviders = computed(() => runtimeMode.value === 'cpa' ? providers.filter(item => item.label !== 'xAI') : providers)

  const issueDetail = (error: any) => error?.statusCode ? `HTTP ${error.statusCode}` : error?.message || ''

  async function loadProviderRow(provider: { label: string; path: string }, optional: Optional): Promise<ProviderRow> {
    const groups = await optional<any[]>(provider.label, provider.path, [], '/admin/providers')
    const entries = Array.isArray(groups)
      ? groups.flatMap(group => Array.isArray(group?.keys)
        ? group.keys.map((key: any) => ({ ...key, disabled: key?.disabled === true || group?.disabled === true }))
        : [])
      : []
    const disabled = entries.filter((item: any) => item.disabled).length
    return { ...provider, total: entries.length, disabled, active: entries.length - disabled }
  }

  function usageQuery() {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    from.setHours(0, 0, 0, 0)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return new URLSearchParams({ from: from.toISOString(), to: now.toISOString(), timezone })
  }

  type Optional = <T>(label: string, path: string, fallback: T, to: string) => Promise<T>

  async function refreshDashboard() {
    if (loading.value) return
    loading.value = true
    loadError.value = ''
    try {
      const configResponse = await fetchAPI<Record<string, any>>('/config')
      const issues: DashboardIssue[] = []
      try {
        await refreshCapabilities(true)
      } catch (error: any) {
        issues.push({ label: 'Capabilities', detail: issueDetail(error), to: '/admin/system-nodes' })
      }
      // Optional sources degrade to a fallback and surface as a data-status issue.
      const optional: Optional = async (label, path, fallback, to) => {
        try {
          return await fetchAPI<any>(path)
        } catch (error: any) {
          issues.push({ label, detail: issueDetail(error), to })
          return fallback
        }
      }
      const rawConfig = configResponse?.config && typeof configResponse.config === 'object' ? configResponse.config : configResponse
      config.value = rawConfig || {}

      const hasTopology = supports('topology', false)
      const hasNodes = supports('nodes', false)
      const [version, keys, files, models, rows, topologyResponse, nodeResponse, overview, users] = await Promise.all([
        optional<any>('Latest version', '/server/latest-version', null, '/admin/system-nodes'),
        optional<any>('Client keys', '/access/api-keys', null, '/admin/access-keys'),
        optional<any>('Account credentials', '/credentials', { items: [] }, '/admin/credentials'),
        optional<any>('Available models', '/models?scope=available', null, '/admin/providers'),
        Promise.all(visibleProviders.value.map(provider => loadProviderRow(provider, optional))),
        hasTopology ? optional<any>('Topology', '/topology', null, '/admin/system-nodes') : Promise.resolve(null),
        hasNodes && !hasTopology ? optional<any>('Nodes', '/nodes', { nodes: [] }, '/admin/system-nodes') : Promise.resolve(null),
        supports('usage_overview', false)
          ? optional<any>('Usage overview', `/usage/overview?${usageQuery()}`, null, '/admin/usage')
          : Promise.resolve(null),
        supports('users', false) ? optional<any>('Users', '/users', { items: [] }, '/admin/users') : Promise.resolve({ items: [] })
      ])
      let nodeFallback = nodeResponse
      if (!topologyResponse && hasTopology && hasNodes) {
        nodeFallback = await optional<any>('Nodes', '/nodes', { nodes: [] }, '/admin/system-nodes')
      }

      latestVersion.value = String(version?.['latest-version'] || version?.latest_version || '')
      // A missing key endpoint falls back to the legacy config list.
      clientKeys.value = keys == null
        ? (Array.isArray(rawConfig?.['api-keys']) ? rawConfig['api-keys'] : [])
        : firstArray(keys, ['items', 'api_key_entries', 'keys'])
      accountFiles.value = firstArray(files, ['credentials', 'files', 'items'])
      availableModels.value = Array.isArray(models?.models)
        ? models.models.length
        : models?.models && typeof models.models === 'object' ? Object.values(models.models).flat().length : null
      providerRows.value = rows
      topology.value = topologyResponse
      nodes.value = Array.isArray(nodeFallback?.nodes) ? nodeFallback.nodes : []
      usage.value = overview
      snapshotUsers.value = firstArray(users, ['items', 'users'])
      dataIssues.value = issues
      lastUpdated.value = new Date()
      snapshot.value = true
    } catch (error: any) {
      loadError.value = error?.message || t('dashboard.loadErrorFallback')
    } finally {
      loading.value = false
    }
  }

  const state = {
    loading, loadError, lastUpdated, snapshot, config, latestVersion, clientKeys, accountFiles, providerRows,
    availableModels, topology, nodes, usage, dataIssues, snapshotUsers, runtimeMode
  }
  return { ...state, ...useDashboardSummary(state), refreshDashboard }
}

export type DashboardState = {
  config: Ref<Record<string, any>>
  clientKeys: Ref<any[]>
  accountFiles: Ref<any[]>
  providerRows: Ref<ProviderRow[]>
  availableModels: Ref<number | null>
  dataIssues: Ref<DashboardIssue[]>
}

export type Dashboard = ReturnType<typeof createDashboard>
const dashboardKey: InjectionKey<Dashboard> = Symbol('admin-dashboard')

export function provideDashboard(): Dashboard {
  const dashboard = createDashboard()
  provide(dashboardKey, dashboard)
  return dashboard
}

export function useDashboard(): Dashboard {
  const dashboard = inject(dashboardKey)
  if (!dashboard) throw new Error('useDashboard() must be used inside pages/admin/dashboard.vue')
  return dashboard
}
