import { computed, ref, watch } from 'vue'
import { readTelemetryChoice, saveTelemetryChoice, usageRanges } from '~/composables/requestTelemetry'
import type { useAdminI18n } from '~/composables/useAdminI18n'

type Translate = ReturnType<typeof useAdminI18n>['t']

export const allOptionValue = '__all__'

export type UsageFilters = {
  from: string
  to: string
  provider: string
  model: string
  status: string
  statusCode: string
  requestId: string
  user: string
  /** Organization ID ('' = all) and optional member user ID inside it. */
  organization: string
  member: string
  clientKey: string
  credentialId: string
  credentialType: string
  endpoint: string
  homeIp: string
  cpaNode: string
  search: string
}

const dateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const datesForRange = (preset: string) => {
  const to = new Date()
  const from = new Date(to)
  if (preset === 'all') return { from: '', to: '' }
  if (preset === 'yesterday') {
    from.setDate(to.getDate() - 1)
    return { from: dateInputValue(from), to: dateInputValue(from) }
  }
  if (preset === 'month') from.setDate(1)
  if (preset === '7d') from.setDate(to.getDate() - 6)
  if (preset === '30d') from.setDate(to.getDate() - 29)
  return { from: dateInputValue(from), to: dateInputValue(to) }
}

export const defaultFilters = (): UsageFilters => ({
  ...datesForRange('7d'),
  provider: '',
  model: '',
  status: '',
  statusCode: '',
  requestId: '',
  user: '',
  organization: '',
  member: '',
  clientKey: '',
  credentialId: '',
  credentialType: '',
  endpoint: '',
  homeIp: '',
  cpaNode: '',
  search: '',
})

/** Draft and applied overview filters, the saved range preset and the shared query builder. */
type ScopeLabels = { organizationName: (id: string) => string, memberName: (organization: string, member: string) => string }

export function useUsageFilters(t: Translate, initialScope: Partial<Pick<UsageFilters, 'organization' | 'member'>> = {}, labels?: ScopeLabels) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const rangeOptions = computed(() => [
    { label: t('common.today'), value: 'today' },
    { label: t('usage.range.yesterday'), value: 'yesterday' },
    { label: t('common.last7d'), value: '7d' },
    { label: t('common.last30d'), value: '30d' },
    { label: t('usage.range.month'), value: 'month' },
    { label: t('usage.range.all'), value: 'all' },
    { label: t('common.custom'), value: 'custom' },
  ])
  const rangePreset = ref(readTelemetryChoice('cpahome:usage:range', '7d', usageRanges))
  watch(rangePreset, value => saveTelemetryChoice('cpahome:usage:range', value, usageRanges))
  const showAdvancedFilters = ref(false)
  const credentialTypeOptions = computed(() => [{ label: t('usage.allCredentialTypes'), value: allOptionValue }, { label: 'OAuth', value: 'oauth' }, { label: t('usage.providerApiKey'), value: 'provider_api_key' }, { label: t('usage.fileAuth'), value: 'file_auth' }, { label: 'Vertex', value: 'vertex' }, { label: t('common.unknown'), value: 'unknown' }])

  const filters = ref<UsageFilters>({ ...defaultFilters(), ...datesForRange(rangePreset.value), ...initialScope })
  const appliedFilters = ref<UsageFilters>({ ...filters.value })
  // Auto-refresh eligibility follows the applied range, not the draft selection.
  const appliedPreset = ref(rangePreset.value)

  const overviewScopeLabel = computed(() => {
    const source = appliedFilters.value
    const range = source.from || source.to ? `${source.from || t('common.last24h')} – ${source.to || t('usage.scope.now')}` : t('usage.scope.defaultRange')
    const organization = source.organization && (labels?.organizationName(source.organization) || `#${source.organization}`)
    const member = source.member && (labels?.memberName(source.organization, source.member) || `#${source.member}`)
    const extras = [
      organization && (member ? t('organizations.scope.chipMember', { name: organization, member }) : t('organizations.scope.chip', { name: organization })),
      source.provider && t('usage.scope.provider', { value: source.provider }),
      source.model && t('usage.scope.model', { value: source.model }),
      source.endpoint && t('usage.scope.endpoint', { value: source.endpoint }),
      source.homeIp && t('usage.scope.homeIp', { value: source.homeIp }),
      source.credentialType && t('usage.scope.credential', { value: source.credentialType }),
    ].filter(Boolean)
    return [range, ...extras].join(' · ')
  })

  const buildCommonParams = (source: UsageFilters) => {
    const params = new URLSearchParams()
    if (source.from) params.set('from', source.from)
    if (source.to) params.set('to', source.to)
    if (timezone) params.set('timezone', timezone)
    if (source.provider.trim()) params.set('provider', source.provider.trim())
    if (source.model.trim()) params.set('model', source.model.trim())
    if (source.endpoint.trim()) params.set('endpoint', source.endpoint.trim())
    if (source.homeIp.trim()) params.set('home_ip', source.homeIp.trim())
    if (source.credentialType.trim()) params.set('credential_type', source.credentialType.trim())
    if (source.organization) {
      params.set('user_id', source.organization)
      if (source.member) params.set('actor_user_id', source.member)
    }
    return params
  }

  const insightQuery = computed(() => buildCommonParams(appliedFilters.value).toString())

  const selectRange = (preset: any) => {
    if (preset !== 'custom') Object.assign(filters.value, datesForRange(preset))
  }

  return {
    allOptionValue,
    rangeOptions,
    rangePreset,
    showAdvancedFilters,
    credentialTypeOptions,
    filters,
    appliedFilters,
    appliedPreset,
    overviewScopeLabel,
    buildCommonParams,
    insightQuery,
    selectRange
  }
}
