import { computed, inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import { useUserApi, type BillingCharge, type BillingOverview } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage, useWorkspaceFormat } from './common'

export type WorkspaceSection = 'dashboard' | 'api-keys' | 'settings' | 'billing'
type BillingRange = { from: string; to: string }
type WorkspaceBillingOverview = BillingOverview & {
  request_count?: number
  input_tokens?: number
  output_tokens?: number
  cache_tokens?: number
  total_charge_amount?: number
}
type BillingChargesResponse = { items?: BillingCharge[]; data?: BillingCharge[]; total?: number; limit?: number; offset?: number }

function presetRange(preset: string): BillingRange {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  if (preset === 'month') start.setUTCDate(1)
  else start.setUTCDate(start.getUTCDate() - (preset === '30d' ? 29 : preset === '7d' ? 6 : 0))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}
function overviewValue(response: any): WorkspaceBillingOverview {
  return (response?.overview && typeof response.overview === 'object' ? response.overview : response || {}) as WorkspaceBillingOverview
}
export function rowValue(row: any): BillingCharge { return row?.original ?? row }
export const dashboardMetricIcons = ['i-tabler-calendar-stats', 'i-tabler-sun', 'i-tabler-calendar-month', 'i-tabler-activity']

function createWorkspaceBilling(section: Ref<WorkspaceSection>) {
  const { t } = usePortalI18n()
  const { fetchAPI } = useUserApi()
  const { formatCredits, formatNumber, formatCompactNumber } = useWorkspaceFormat()
  const selectedOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:selected-overview', () => null)
  const todayOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:today-overview', () => null)
  const monthOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:month-overview', () => null)
  const charges = useWorkspaceState<BillingCharge[]>('user:workspace:charges', () => [])
  const chargesTotal = useWorkspaceState('user:workspace:charges-total', () => 0)
  const billingLoading = useWorkspaceState('user:workspace:billing-loading', () => false)
  const billingError = useWorkspaceState('user:workspace:billing-error', () => '')
  let billingRequest = 0

  const rangeOptions = computed(() => [
    { label: t('ws.range.today'), value: 'today' },
    { label: t('ws.range.7d'), value: '7d' },
    { label: t('ws.range.30d'), value: '30d' },
    { label: t('ws.range.custom'), value: 'custom' }
  ])
  const pageSizeOptions = [5, 20, 50, 100].map(value => ({ label: String(value), value }))
  const rangePreset = ref('today')
  const rangeFrom = ref('')
  const rangeTo = ref('')
  const appliedRange = ref<BillingRange>(presetRange('today'))
  const chargePage = ref(1)
  const chargePageSize = ref(5)
  const chargePages = computed(() => Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)))
  const chargeRangeStart = computed(() => chargesTotal.value ? (chargePage.value - 1) * chargePageSize.value + 1 : 0)
  const chargeRangeEnd = computed(() => Math.min(chargePage.value * chargePageSize.value, chargesTotal.value))
  const topModels = computed(() => (selectedOverview.value?.top_models || []).slice(0, 5))
  const chargeColumns = computed(() => [
    { accessorKey: 'created_at', header: t('ws.billing.col.time') },
    { accessorKey: 'provider', header: t('ws.billing.col.provider') },
    { accessorKey: 'model', header: t('ws.billing.col.model') },
    { accessorKey: 'input_tokens', header: t('ws.billing.col.inputTokens') },
    { accessorKey: 'output_tokens', header: t('ws.billing.col.outputTokens') },
    { accessorKey: 'amount', header: t('ws.billing.col.charge') },
    { accessorKey: 'balance_after', header: t('ws.billing.col.balanceAfter') }
  ])
  const billingMetrics = computed(() => [
    { label: t('ws.billing.selectedRange'), value: formatCredits(selectedOverview.value?.total_charge_amount ?? selectedOverview.value?.today_spend), detail: `${appliedRange.value.from} – ${appliedRange.value.to}` },
    { label: t('ws.billing.today'), value: formatCredits(todayOverview.value?.total_charge_amount ?? todayOverview.value?.today_spend), detail: t('ws.billing.todayDetail') },
    { label: t('ws.billing.thisMonth'), value: formatCredits(monthOverview.value?.total_charge_amount ?? monthOverview.value?.month_spend), detail: t('ws.billing.monthDetail') },
    { label: t('ws.dashboard.requests'), value: formatNumber(selectedOverview.value?.request_count), detail: t('ws.billing.tokensDetail', { input: formatNumber(selectedOverview.value?.input_tokens), output: formatNumber(selectedOverview.value?.output_tokens) }) }
  ])
  const dashboardUsageMetrics = computed(() => [
    { label: t('ws.dashboard.creditsSpent'), value: formatCredits(selectedOverview.value?.total_charge_amount ?? selectedOverview.value?.today_spend), icon: 'i-tabler-coins' },
    { label: t('ws.dashboard.requests'), value: formatNumber(selectedOverview.value?.request_count), icon: 'i-tabler-arrows-exchange' },
    { label: t('ws.dashboard.inputTokens'), value: formatCompactNumber(selectedOverview.value?.input_tokens), icon: 'i-tabler-arrow-bar-to-right' },
    { label: t('ws.dashboard.outputTokens'), value: formatCompactNumber(selectedOverview.value?.output_tokens), icon: 'i-tabler-arrow-bar-to-left' }
  ])

  async function loadDashboardBilling() {
    billingLoading.value = true
    billingError.value = ''
    try {
      const request = ++billingRequest
      const [selectedResponse, todayResponse, monthResponse] = await Promise.all([
        fetchAPI<any>('/billing/overview', { query: appliedRange.value }),
        fetchAPI<any>('/billing/overview', { query: presetRange('today') }),
        fetchAPI<any>('/billing/overview', { query: presetRange('month') })
      ])
      if (request !== billingRequest) return
      todayOverview.value = overviewValue(todayResponse)
      selectedOverview.value = overviewValue(selectedResponse)
      monthOverview.value = overviewValue(monthResponse)
    } catch (error: any) {
      billingError.value = errorMessage(error, t('ws.billing.loadSummaryFailed'))
    } finally {
      billingLoading.value = false
    }
  }
  async function loadBilling() {
    if (section.value === 'dashboard') return loadDashboardBilling()
    const request = ++billingRequest
    const selected = appliedRange.value
    const today = presetRange('today')
    const month = presetRange('month')
    const limit = chargePageSize.value
    const offset = (chargePage.value - 1) * limit
    billingLoading.value = true
    billingError.value = ''
    try {
      const [selectedResponse, todayResponse, monthResponse, chargesResponse] = await Promise.all([
        fetchAPI<any>('/billing/overview', { query: selected }),
        fetchAPI<any>('/billing/overview', { query: today }),
        fetchAPI<any>('/billing/overview', { query: month }),
        fetchAPI<BillingChargesResponse>('/billing/charges', { query: { ...selected, limit, offset } })
      ])
      if (request !== billingRequest) return
      selectedOverview.value = overviewValue(selectedResponse)
      todayOverview.value = overviewValue(todayResponse)
      monthOverview.value = overviewValue(monthResponse)
      charges.value = Array.isArray(chargesResponse?.items) ? chargesResponse.items : Array.isArray(chargesResponse?.data) ? chargesResponse.data : []
      chargesTotal.value = Number(chargesResponse?.total) || 0
    } catch (error: any) {
      if (request === billingRequest) billingError.value = errorMessage(error, t('ws.billing.loadFailed'))
    } finally {
      if (request === billingRequest) billingLoading.value = false
    }
  }
  function selectRange(preset: string) {
    if (preset === 'custom') {
      rangeFrom.value = appliedRange.value.from
      rangeTo.value = appliedRange.value.to
      return
    }
    appliedRange.value = presetRange(preset)
    chargePage.value = 1
    void loadBilling()
  }
  function applyBillingRange() {
    if (!rangeFrom.value || !rangeTo.value || rangeFrom.value > rangeTo.value) {
      billingError.value = t('ws.billing.invalidRange')
      return
    }
    appliedRange.value = { from: rangeFrom.value, to: rangeTo.value }
    chargePage.value = 1
    void loadBilling()
  }
  function changePageSize() {
    chargePage.value = 1
    void loadBilling()
  }
  function changeChargePage(delta: number) {
    const next = chargePage.value + delta
    if (next < 1 || next > chargePages.value) return
    chargePage.value = next
    void loadBilling()
  }
  return {
    monthOverview, charges, chargesTotal, billingLoading, billingError,
    rangeOptions, pageSizeOptions, rangePreset, rangeFrom, rangeTo, appliedRange,
    chargePage, chargePageSize, chargePages, chargeRangeStart, chargeRangeEnd,
    topModels, chargeColumns, billingMetrics, dashboardUsageMetrics,
    loadDashboardBilling, loadBilling, selectRange, applyBillingRange, changePageSize, changeChargePage
  }
}

const billingKey: InjectionKey<ReturnType<typeof createWorkspaceBilling>> = Symbol('workspace-billing')
export function provideWorkspaceBilling(section: Ref<WorkspaceSection>) {
  const billing = createWorkspaceBilling(section)
  provide(billingKey, billing)
  return billing
}
export function useWorkspaceBilling() {
  const billing = inject(billingKey)
  if (!billing) throw new Error('Workspace billing is not provided')
  return billing
}
