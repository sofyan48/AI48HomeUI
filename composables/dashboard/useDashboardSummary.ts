import { computed } from 'vue'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useCapabilities } from '~/composables/useCapabilities'
import type { DashboardIssue, DashboardState } from '~/composables/dashboard/useDashboard'

type HealthColor = 'success' | 'warning' | 'info'

/** Derived readiness state: health verdict, suggested actions and data-status items. */
export function useDashboardSummary(state: DashboardState) {
  const { t } = useAdminI18n()
  const { supports } = useCapabilities()
  const { config, clientKeys, accountFiles, providerRows, availableModels, dataIssues } = state

  const availableProviders = computed(() => providerRows.value.reduce((sum, item) => sum + item.active, 0))
  const activeAccounts = computed(() => accountFiles.value.filter(item => item.disabled !== true && item.unavailable !== true).length)
  const debugEnabled = computed(() => config.value.debug === true || config.value.observability?.logs?.debug === true)
  const routing = computed(() => {
    const value = String(config.value['routing']?.strategy || config.value['routing-strategy'] || 'round-robin')
    return ['round-robin', 'weighted-round-robin', 'fill-first'].includes(value) ? value : 'Unknown'
  })

  const missingCapabilities = computed(() => [
    { id: 'Node topology', label: t('dashboard.capability.nodeTopology'), enabled: supports('topology', false) || supports('nodes', false), to: '/admin/system-nodes' },
    { id: 'Usage statistics', label: t('dashboard.capability.usageStatistics'), enabled: supports('usage_overview', false), to: '/admin/usage' },
    { id: 'Request logs', label: t('dashboard.capability.requestLogs'), enabled: supports('logs', false), to: '/admin/diagnostics' },
    { id: 'Error logs', label: t('dashboard.capability.errorLogs'), enabled: supports('request_error_logs', false), to: '/admin/diagnostics' },
    { id: 'User management', label: t('dashboard.capability.userManagement'), enabled: supports('users', false), to: '/admin/users' },
    { id: 'Access scopes', label: t('dashboard.capability.accessScopes'), enabled: supports('access_groups', false), to: '/admin/users' }
  ].filter(item => !item.enabled))

  // Issue labels are stored as stable English source names and translated at render time.
  function sourceLabel(label: string) {
    const labels: Record<string, string> = {
      Capabilities: t('dashboard.source.capabilities'),
      'Latest version': t('dashboard.source.latestVersion'),
      'Client keys': t('dashboard.source.clientKeys'),
      'Account credentials': t('dashboard.source.accountCredentials'),
      'Available models': t('dashboard.source.availableModels'),
      Topology: t('dashboard.source.topology'),
      Nodes: t('dashboard.source.nodes'),
      'Usage overview': t('dashboard.source.usageOverview'),
      Users: t('dashboard.source.users'),
      'OpenAI compatibility': t('dashboard.provider.openaiCompat')
    }
    return labels[label] || label
  }

  const statusItems = computed<DashboardIssue[]>(() => [
    ...dataIssues.value.map(item => ({ ...item, label: sourceLabel(item.label), detail: item.detail || t('dashboard.requestFailed') })),
    ...missingCapabilities.value.map(item => ({ label: item.label, detail: t('dashboard.notProvided'), to: item.to }))
  ])

  const verdict = (title: string, description: string, color: HealthColor = 'warning', label = t('dashboard.health.needsReview')) =>
    ({ title, description, label, color })

  const health = computed(() => {
    if (availableModels.value === null) {
      return verdict(t('dashboard.health.unconfirmedTitle'), t('dashboard.health.unconfirmedDesc'))
    }
    if (availableModels.value === 0) {
      return availableProviders.value || activeAccounts.value
        ? verdict(t('dashboard.health.noModelsTitle'), t('dashboard.health.noModelsDesc'))
        : verdict(t('dashboard.health.addUpstreamTitle'), t('dashboard.health.addUpstreamDesc'))
    }
    if (!clientKeys.value.length) return verdict(t('dashboard.health.createKeyTitle'), t('dashboard.health.createKeyDesc'))
    if (dataIssues.value.length || debugEnabled.value || routing.value === 'Unknown') {
      return verdict(t('dashboard.health.reviewTitle'), t('dashboard.health.reviewDesc'))
    }
    if (missingCapabilities.value.length) {
      return verdict(t('dashboard.health.limitedTitle'), t('dashboard.health.limitedDesc'), 'info', t('dashboard.health.limited'))
    }
    return verdict(t('dashboard.health.readyTitle'), t('dashboard.health.readyDesc'), 'success', t('dashboard.health.ready'))
  })

  const healthIcon = computed(() => health.value.color === 'success'
    ? 'i-tabler-rosette-discount-check'
    : health.value.color === 'info' ? 'i-tabler-info-circle' : 'i-tabler-alert-triangle')

  const suggestedActions = computed(() => {
    const actions: { label: string; to: string }[] = []
    if (availableModels.value === null) actions.push({ label: t('dashboard.action.reviewDataStatus'), to: '/admin/system-nodes' })
    if (availableModels.value === 0) {
      if (!activeAccounts.value) actions.push({ label: t('dashboard.action.addCredential'), to: '/admin/credentials' })
      actions.push({
        label: availableProviders.value ? t('dashboard.action.reviewModelServices') : t('dashboard.action.configureProviders'),
        to: '/admin/providers'
      })
    }
    if (!clientKeys.value.length) actions.push({ label: t('dashboard.action.createClientKey'), to: '/admin/access-keys' })
    if (routing.value === 'Unknown') actions.push({ label: t('dashboard.action.checkRouting'), to: '/admin/config' })
    if (debugEnabled.value) actions.push({ label: t('dashboard.action.reviewDebug'), to: '/admin/config' })
    if (dataIssues.value.length) actions.push({ label: t('dashboard.action.reviewDataStatus'), to: '/admin/system-nodes' })
    return actions.slice(0, 3)
  })

  return { availableProviders, activeAccounts, routing, statusItems, health, healthIcon, suggestedActions }
}
