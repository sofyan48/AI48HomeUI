import { dateRangeError } from '~/composables/dateRange'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { billingModelCandidates } from '~/composables/billingModelCandidates'
import { normalizeBillingSettings, billingSettingsPayload } from '~/composables/billingPreferences'
import { computed, ref, provide, inject, onMounted } from 'vue'
import { useApi, useAdminI18n, useToast } from '#imports'
import { useBillingPresentation } from '~/composables/billing/useBillingPresentation'

const billingWorkspaceKey = Symbol('billingWorkspace')

export function useBillingWorkspace() {
  const workspace = inject(billingWorkspaceKey)
  if (!workspace) throw new Error('Billing workspace is not provided')
  return workspace
}

export function provideBillingWorkspace() {
const { fetchAPI } = useApi()
const { t, intlLocale } = useAdminI18n()
const allOptionValue = '__all__'
const toast = useToast()
const pageSizeOptions = [50, 100, 200].map(value => ({ label: String(value), value }))
const rangeOptions = computed(() => [
  { label: t('common.today'), value: 'today' }, { label: t('common.last7d'), value: '7d' },
  { label: t('common.last30d'), value: '30d' }, { label: t('common.custom'), value: 'custom' }
])
const rowValue = row => row?.original ?? row
const savedReportTimezone = useWorkspaceState('admin:billing:savedReportTimezone', () => ('UTC'))
const dateInputValue = date => date.toISOString().slice(0, 10)

function datesForRange(preset) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: savedReportTimezone.value, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = type => parts.find(item => item.type === type).value
  const to = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`)
  const from = new Date(to)
  if (preset === 'all') return { from: '', to: '' }
  if (preset === 'yesterday') { from.setUTCDate(to.getUTCDate() - 1); return { from: dateInputValue(from), to: dateInputValue(from) } }
  if (preset === 'month') from.setUTCDate(1)
  if (preset === '7d') from.setUTCDate(to.getUTCDate() - 6)
  if (preset === '30d') from.setUTCDate(to.getUTCDate() - 29)
  return { from: dateInputValue(from), to: dateInputValue(to) }
}
const defaultRange = () => datesForRange('7d')

const sections = computed(() => [
  { label: t('billing.section.overview'), value: 'overview', icon: 'i-tabler-chart-pie' },
  { label: t('billing.section.charges'), value: 'charges', icon: 'i-tabler-receipt-tax' },
  { label: t('billing.section.balances'), value: 'balances', icon: 'i-tabler-cash-banknote' },
  { label: t('billing.section.prices'), value: 'prices', icon: 'i-tabler-tag' }
])
const activeSection = ref('overview')
const pageError = useWorkspaceState('admin:billing:pageError', () => (''))
const overview = useWorkspaceState('admin:billing:overview', () => (null))
const chargesResponse = useWorkspaceState('admin:billing:chargesResponse', () => (null))
const balancesResponse = useWorkspaceState('admin:billing:balancesResponse', () => (null))
const priceResponse = useWorkspaceState('admin:billing:priceResponse', () => (null))
const usersResponse = useWorkspaceState('admin:billing:usersResponse', () => (null))
const modelCandidatesResponse = useWorkspaceState('admin:billing:modelCandidatesResponse', () => ({ available: [], static: [] }))
const modelCandidatesLoading = useWorkspaceState('admin:billing:modelCandidatesLoading', () => (false))
const modelCandidatesError = useWorkspaceState('admin:billing:modelCandidatesError', () => (''))
const modelCandidateSearch = ref('')
const availableModelsOnly = ref(true)
const selectedPriceCandidateKeys = ref([])
const overviewLoading = useWorkspaceState('admin:billing:overviewLoading', () => (false))
const chargesLoading = useWorkspaceState('admin:billing:chargesLoading', () => (false))
const balancesLoading = useWorkspaceState('admin:billing:balancesLoading', () => (false))
const priceImporter = ref(null)
const importProviderOptions = computed(() => [...new Set([...providerSearchOptions.value, ...modelCandidates.value.map(candidate => candidate.provider)])].sort())
const pricesLoading = useWorkspaceState('admin:billing:pricesLoading', () => (false))
const settingsLoading = useWorkspaceState('admin:billing:settingsLoading', () => (false))
const settingsSaving = useWorkspaceState('admin:billing:settingsSaving', () => (false))

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const settingsForm = ref(normalizeBillingSettings(null))
const settingsError = ref('')
const timezoneOptions = computed(() => {
  let supported = []
  try { supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [] } catch {}
  return [...new Set(['UTC', deviceTimezone, savedReportTimezone.value, 'Asia/Shanghai', 'Asia/Tokyo', 'Europe/London', 'America/New_York', ...supported])].sort((left, right) => left.localeCompare(right))
})
const timezoneError = computed(() => {
  const timezone = settingsForm.value.report_timezone?.trim()
  if (!timezone || /^[+-]/.test(timezone)) return t('billing.settings.timezoneInvalid')
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); return '' }
  catch { return t('billing.settings.timezoneInvalid') }
})
const overviewFilters = ref({ ...defaultRange(), user: '', provider: '', model: '' })
const appliedOverviewFilters = ref({ ...overviewFilters.value })
const chargeFilters = ref({ ...defaultRange(), user: '', provider: '', model: '' })
const appliedChargeFilters = ref({ ...chargeFilters.value })
const balanceFilters = ref({ ...defaultRange(), user: '' })
const appliedBalanceFilters = ref({ ...balanceFilters.value })
const priceFilters = ref({ search: '', enabled: '', service_tier: '', source: '' })
const overviewPreset = ref('7d')
const chargePreset = ref('7d')
const balancePreset = ref('7d')
const chargePageSize = ref(50)
const balancePageSize = ref(50)
const tierDiagnostics = useWorkspaceState('admin:billing:tierDiagnostics', () => (null))
const diagnosticsLoading = useWorkspaceState('admin:billing:diagnosticsLoading', () => (false))
const diagnosticsError = useWorkspaceState('admin:billing:diagnosticsError', () => (''))
const tierConfirmOpen = ref(false)
const matchingSettingsOpen = ref(false)
const savedTierSource = useWorkspaceState('admin:billing:savedTierSource', () => ('request'))
const chargePage = ref(1)
const balancePage = ref(1)

const adjustmentOpen = ref(false)
const adjustmentSaving = useWorkspaceState('admin:billing:adjustmentSaving', () => (false))
const adjustmentForm = ref({ type: 'recharge', user_id: '', amount: '', note: '' })
const priceFormOpen = ref(false)
const priceSaving = useWorkspaceState('admin:billing:priceSaving', () => (false))

const editingPrice = ref(null)
const modalError = ref('')
const deletePriceOpen = ref(false)
const deletePriceTarget = ref(null)
const priceDeleting = useWorkspaceState('admin:billing:priceDeleting', () => (false))
const togglingPrice = useWorkspaceState('admin:billing:togglingPrice', () => (''))
const chargeDetailOpen = ref(false)
const selectedCharge = ref(null)
const balanceDetailOpen = ref(false)
const selectedBalance = ref(null)

const actionColumn = { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
const rightAligned = { class: { th: 'text-right' } }
const chargeColumns = computed(() => [
  { accessorKey: 'created_at', header: t('billing.col.time') },
  { accessorKey: 'user', header: t('common.user') },
  { accessorKey: 'model', header: t('common.model') },
  { accessorKey: 'tokens', header: t('common.tokens'), meta: rightAligned },
  { accessorKey: 'amount', header: t('billing.col.charge'), meta: rightAligned },
  actionColumn
])
const balanceColumns = computed(() => [
  { accessorKey: 'created_at', header: t('billing.col.time') },
  { accessorKey: 'user_id', header: t('common.user') },
  { accessorKey: 'type', header: t('common.type') },
  { accessorKey: 'amount', header: t('billing.col.amount'), meta: rightAligned },
  { accessorKey: 'balance', header: t('billing.col.balance'), meta: rightAligned },
  { accessorKey: 'note', header: t('billing.col.note') },
  actionColumn
])
const priceColumns = computed(() => [
  { accessorKey: 'model', header: t('common.model') },
  { accessorKey: 'scope', header: t('billing.col.tierContext') },
  { accessorKey: 'input', header: t('billing.col.inputPerM'), meta: rightAligned },
  { accessorKey: 'output', header: t('billing.col.outputPerM'), meta: rightAligned },
  { accessorKey: 'cache_read', header: t('billing.col.cacheReadPerM'), meta: rightAligned },
  { accessorKey: 'cache_write', header: t('billing.col.cacheWritePerM'), meta: rightAligned },
  { accessorKey: 'request', header: t('billing.col.perRequest'), meta: rightAligned },
  { accessorKey: 'source', header: t('billing.col.source') },
  { accessorKey: 'state', header: t('common.enabled') },
  { accessorKey: 'updated', header: t('common.updated') },
  actionColumn
])
const enabledOptions = computed(() => [{ label: t('billing.prices.allRules'), value: allOptionValue }, { label: t('common.enabled'), value: 'true' }, { label: t('common.disabled'), value: 'false' }])
const sourceOptions = computed(() => [{ label: t('billing.source.manual'), value: 'manual' }, { label: t('common.default'), value: 'default' }, { label: t('billing.source.sync'), value: 'sync' }])
const priceSourceOptions = computed(() => [{ label: t('billing.prices.allSources'), value: allOptionValue }, ...sourceOptions.value])
const tierSourceOptions = computed(() => [{ label: t('billing.tierSource.request'), value: 'request' }, { label: t('billing.tierSource.response'), value: 'response' }])
const serviceTierOptions = computed(() => [{ label: t('billing.tier.all'), value: '*' }, { label: t('billing.tier.standard'), value: 'standard' }, { label: t('billing.tier.flex'), value: 'flex' }, { label: t('billing.tier.priority'), value: 'priority' }])
const contextPresetOptions = computed(() => [{ label: t('billing.context.base'), value: 'base' }, { label: t('billing.context.272k'), value: '272k' }, { label: t('billing.context.custom'), value: 'custom' }])
function priceSourceLabel(source) { return sourceOptions.value.find(option => option.value === source)?.label || source }
function balanceTypeLabel(type) { return type === 'recharge' ? t('billing.balances.recharge') : type === 'deduct' ? t('billing.balances.deduct') : type }
function dateErrorLabel(error) {
  if (error.startsWith('Enter a valid date and time')) return t('billing.date.invalidDateTime')
  if (error.startsWith('Enter a valid date')) return t('billing.date.invalidDate')
  if (error.startsWith('Start must be')) return t('billing.date.order')
  return error
}
const contextPreset = ref('base')
function applyContextPreset(value) { if (value === 'base') priceForm.value.min_input_tokens = '0'; else if (value === '272k') priceForm.value.min_input_tokens = '272001' }

const emptyPriceForm = () => ({ provider: '', model: '', service_tier: '*', min_input_tokens: '0', input_price_per_million: '0', output_price_per_million: '0', cache_read_price_per_million: '0', cache_write_price_per_million: '0', request_price: '0', source: 'manual', enabled: true, note: '' })
const priceForm = ref(emptyPriceForm())

const priceMenuItems = computed(() => [[
  { label: t('billing.prices.import'), icon: 'i-tabler-download', onSelect: () => priceImporter.value?.openImport() },
  { label: t('billing.prices.checkUpdates'), icon: 'i-tabler-refresh', disabled: pricesLoading.value || modelCandidatesLoading.value || !priceRules.value.some(rule => rule.source === 'sync'), onSelect: () => priceImporter.value?.checkUpdates() }
], [
  { label: t('billing.prices.matchingSettings'), icon: 'i-tabler-settings', onSelect: () => openMatchingSettings() }
]])
const maxTrendCharge = computed(() => Math.max(0.000001, ...dailyTrend.value.map(point => Number(point.charge_amount) || 0)))
const charges = computed(() => Array.isArray(chargesResponse.value?.items) ? chargesResponse.value.items : [])
const chargesTotal = computed(() => Number(chargesResponse.value?.total) || 0)
const chargePageCount = computed(() => Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)))
const chargeRangeStart = computed(() => chargesTotal.value ? ((chargePage.value - 1) * chargePageSize.value) + 1 : 0)
const chargeRangeEnd = computed(() => Math.min(chargePage.value * chargePageSize.value, chargesTotal.value))
const balanceRecords = computed(() => Array.isArray(balancesResponse.value?.items) ? balancesResponse.value.items : [])
const balancesTotal = computed(() => Number(balancesResponse.value?.total) || 0)
const priceRules = computed(() => Array.isArray(priceResponse.value?.items) ? priceResponse.value.items : [])
const priceSchemaVersion = computed(() => Number(priceResponse.value?.price_rule_schema_version || priceResponse.value?.schema_version || 1))
const priceTierOptions = computed(() => [...new Set(priceRules.value.map(rule => rule.service_tier).filter(Boolean))].sort())
const filteredPriceRules = computed(() => {
  const search = priceFilters.value.search.trim().toLowerCase()
  return [...priceRules.value].filter(rule =>
    (!search || [rule.provider, rule.model].some(value => String(value || '').toLowerCase().includes(search))) &&
    (!priceFilters.value.service_tier.trim() || rule.service_tier?.toLowerCase() === priceFilters.value.service_tier.trim().toLowerCase()) &&
    (!priceFilters.value.source || rule.source === priceFilters.value.source) &&
    (!priceFilters.value.enabled || String(Boolean(rule.enabled)) === priceFilters.value.enabled)
  ).sort((a, b) => String(a.provider || '').localeCompare(String(b.provider || '')) || String(a.model || '').localeCompare(String(b.model || '')) || String(a.service_tier || '').localeCompare(String(b.service_tier || '')) || Number(a.min_input_tokens || 0) - Number(b.min_input_tokens || 0))
})
const hasPriceFilters = computed(() => Boolean(priceFilters.value.search.trim() || priceFilters.value.service_tier.trim() || priceFilters.value.source || priceFilters.value.enabled))
function clearPriceFilters() { priceFilters.value = { search: '', enabled: '', service_tier: '', source: '' } }
const users = computed(() => Array.isArray(usersResponse.value?.users) ? usersResponse.value.users : [])
const userOptions = computed(() => users.value.map(user => ({ label: `${t('billing.adjust.userOption', { name: user.username, id: user.id, balance: formatCredits(user.credits) })}${user.credits_unlimited ? ` · ${t('billing.adjust.unlimited')}` : ''}`, value: String(user.id) })))
const userSearchOptions = computed(() => users.value.map(user => user.username))
const providerSearchOptions = computed(() => [...new Set([
  ...priceRules.value.map(rule => rule.provider),
  ...charges.value.map(charge => charge.provider),
  ...topProviders.value.map(item => item.label || item.provider)
].filter(Boolean))].sort())
const modelSearchOptions = computed(() => [...new Set([
  ...priceRules.value.map(rule => rule.model),
  ...charges.value.map(charge => charge.model),
  ...topModels.value.map(item => item.label || item.model),
  ...modelCandidates.value.map(item => item.model)
].filter(Boolean))].sort())
const modelCandidates = computed(() => billingModelCandidates(modelCandidatesResponse.value.available, modelCandidatesResponse.value.static, priceRules.value))
const filteredModelCandidates = computed(() => {
  const query = modelCandidateSearch.value.trim().toLowerCase()
  return modelCandidates.value.filter(candidate =>
    (!availableModelsOnly.value || candidate.available) &&
    (!query || [candidate.model, candidate.displayName, candidate.description, candidate.provider, candidate.ownedBy, candidate.type].some(value => String(value || '').toLowerCase().includes(query)))
  )
})
const selectedPriceCandidates = computed(() => selectedPriceCandidateKeys.value.map(key => modelCandidates.value.find(candidate => candidate.key === key)).filter(Boolean))
const loading = computed(() => overviewLoading.value || chargesLoading.value || balancesLoading.value || pricesLoading.value || settingsLoading.value)
function buildRangeQuery(source) {
  const query = {}
  if (source.from) query.from = source.from
  if (source.to) query.to = source.to

  if (source.user?.trim()) (/^\d+$/.test(source.user.trim()) ? query.user_id = source.user.trim() : query.user = source.user.trim())
  if (source.provider?.trim()) query.provider = source.provider.trim()
  if (source.model?.trim()) query.model = source.model.trim()
  return query
}
async function loadOverview() { overviewLoading.value = true; try { overview.value = await fetchAPI('/billing/overview', { query: buildRangeQuery(appliedOverviewFilters.value) }) } finally { overviewLoading.value = false } }
async function loadCharges() { chargesLoading.value = true; try { chargesResponse.value = await fetchAPI('/billing/charges', { query: { ...buildRangeQuery(appliedChargeFilters.value), limit: chargePageSize.value, offset: (chargePage.value - 1) * chargePageSize.value } }) } finally { chargesLoading.value = false } }
async function loadBalances() { balancesLoading.value = true; try { balancesResponse.value = await fetchAPI('/billing/balance-records', { query: { ...buildRangeQuery(appliedBalanceFilters.value), limit: balancePageSize.value, offset: (balancePage.value - 1) * balancePageSize.value } }) } finally { balancesLoading.value = false } }
async function loadPrices() { pricesLoading.value = true; try { priceResponse.value = await fetchAPI('/billing/model-prices') } finally { pricesLoading.value = false } }
function updateReportTimezone(timezone) {
  if (savedReportTimezone.value === timezone) return
  savedReportTimezone.value = timezone
  for (const [preset, filters, applied] of [[overviewPreset, overviewFilters, appliedOverviewFilters], [chargePreset, chargeFilters, appliedChargeFilters], [balancePreset, balanceFilters, appliedBalanceFilters]]) {
    if (preset.value === 'custom') continue
    const range = datesForRange(preset.value)
    Object.assign(filters.value, range)
    Object.assign(applied.value, range)
  }
}
async function loadSettings(preserveDraft = false) { settingsLoading.value = true; try { const settings = await fetchAPI('/billing/settings'); updateReportTimezone(settings?.report_timezone || 'UTC'); if (preserveDraft !== true) settingsForm.value = normalizeBillingSettings(settings); savedTierSource.value = settings?.service_tier_source || 'request' } finally { settingsLoading.value = false } }
async function loadDiagnostics() {
  diagnosticsLoading.value = true
  diagnosticsError.value = ''
  try { tierDiagnostics.value = await fetchAPI('/billing/settings/diagnostics') }
  catch (error) { tierDiagnostics.value = null; diagnosticsError.value = errorMessage(error, t('billing.settings.diagnosticsFailed')) }
  finally { diagnosticsLoading.value = false }
}
async function loadUsers() { try { usersResponse.value = await fetchAPI('/users') } catch { usersResponse.value = { users: [] } } }
async function loadModelCandidates() {
  if (modelCandidatesLoading.value) return
  modelCandidatesLoading.value = true; modelCandidatesError.value = ''
  try {
    const [available, staticResult] = await Promise.allSettled([fetchAPI('/models?scope=available'), fetchAPI('/models?scope=static')])
    modelCandidatesResponse.value = { available: available.status === 'fulfilled' ? available.value?.models : [], static: staticResult.status === 'fulfilled' ? staticResult.value?.models : [] }
    if (available.status === 'rejected' && staticResult.status === 'rejected') modelCandidatesError.value = t('billing.error.candidatesAll')
    else if (available.status === 'rejected' || staticResult.status === 'rejected') modelCandidatesError.value = t('billing.error.candidatesSome')
  } finally { modelCandidatesLoading.value = false }
}
async function safely(action, fallback) { pageError.value = ''; try { await action() } catch (error) { pageError.value = errorMessage(error, fallback) } }
async function loadPricesSafely() { await safely(loadPrices, t('billing.error.loadPrices')) }
async function refreshCurrent() {
  const actions = { overview: loadOverview, charges: loadCharges, balances: loadBalances, prices: loadPrices }
  await safely(actions[activeSection.value], t('billing.error.refresh'))
}
function selectRange(section, preset) {
  if (preset === 'custom') return
  const filters = { overview: overviewFilters, charges: chargeFilters, balances: balanceFilters }[section]
  Object.assign(filters.value, datesForRange(preset))
}
async function changePageSize(section) {
  if (section === 'charges') { chargePage.value = 1; await safely(loadCharges, t('billing.error.loadCharges')) }
  else { balancePage.value = 1; await safely(loadBalances, t('billing.error.loadBalances')) }
}
async function openMatchingSettings() { await safely(async () => { await loadSettings(); settingsError.value = ''; matchingSettingsOpen.value = true; if (priceSchemaVersion.value >= 2) await loadDiagnostics() }, t('billing.settings.loadFailed')) }
async function applyOverviewFilters() { const error = dateRangeError(overviewFilters.value.from, overviewFilters.value.to); if (error) { pageError.value = dateErrorLabel(error); return }; appliedOverviewFilters.value = { ...overviewFilters.value }; await safely(loadOverview, t('billing.error.loadOverview')) }
async function resetOverviewFilters() { overviewPreset.value = '7d'; overviewFilters.value = { ...defaultRange(), user: '', provider: '', model: '' }; appliedOverviewFilters.value = { ...overviewFilters.value }; await safely(loadOverview, t('billing.error.loadOverview')) }
async function applyChargeFilters() { const error = dateRangeError(chargeFilters.value.from, chargeFilters.value.to); if (error) { pageError.value = dateErrorLabel(error); return }; appliedChargeFilters.value = { ...chargeFilters.value }; chargePage.value = 1; await safely(loadCharges, t('billing.error.loadCharges')) }
async function resetChargeFilters() { chargePreset.value = '7d'; chargeFilters.value = { ...defaultRange(), user: '', provider: '', model: '' }; appliedChargeFilters.value = { ...chargeFilters.value }; chargePage.value = 1; await safely(loadCharges, t('billing.error.loadCharges')) }
async function applyBalanceFilters() { const error = dateRangeError(balanceFilters.value.from, balanceFilters.value.to); if (error) { pageError.value = dateErrorLabel(error); return }; appliedBalanceFilters.value = { ...balanceFilters.value }; balancePage.value = 1; await safely(loadBalances, t('billing.error.loadBalances')) }
async function resetBalanceFilters() { balancePreset.value = '7d'; balanceFilters.value = { ...defaultRange(), user: '' }; appliedBalanceFilters.value = { ...balanceFilters.value }; balancePage.value = 1; await safely(loadBalances, t('billing.error.loadBalances')) }
async function changeChargePage(delta) { const next = chargePage.value + delta; const pages = Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)); if (next < 1 || next > pages) return; chargePage.value = next; await safely(loadCharges, t('billing.error.loadCharges')) }
async function changeBalancePage(delta) { const next = balancePage.value + delta; const pages = Math.max(1, Math.ceil(balancesTotal.value / balancePageSize.value)); if (next < 1 || next > pages) return; balancePage.value = next; await safely(loadBalances, t('billing.error.loadBalances')) }

function openBalanceAdjustment(type) { modalError.value = ''; adjustmentForm.value = { type, user_id: '', amount: '', note: '' }; adjustmentOpen.value = true }
async function submitBalanceAdjustment() {
  modalError.value = ''
  const userID = Number(adjustmentForm.value.user_id)
  const amount = Number(adjustmentForm.value.amount)
  if (!Number.isInteger(userID) || userID <= 0) return modalError.value = t('billing.adjust.selectUser')
  if (!Number.isFinite(amount) || amount <= 0) return modalError.value = t('billing.adjust.amountPositive')
  if (adjustmentForm.value.type === 'deduct' && !adjustmentForm.value.note.trim()) return modalError.value = t('billing.adjust.noteRequired')
  adjustmentSaving.value = true
  try {
    await fetchAPI(`/billing/balance-records/${adjustmentForm.value.type}`, { method: 'POST', body: { user_id: userID, amount, note: adjustmentForm.value.note.trim() } })
    adjustmentOpen.value = false
    await Promise.all([loadOverview(), loadBalances(), loadUsers()])
    toast.add({ title: adjustmentForm.value.type === 'recharge' ? t('billing.adjust.recharged') : t('billing.adjust.deducted'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) { modalError.value = errorMessage(error, t('billing.adjust.failed')) } finally { adjustmentSaving.value = false }
}

async function openPriceForm(rule = null) {
  modalError.value = ''
  editingPrice.value = rule
  modelCandidateSearch.value = ''
  priceFormOpen.value = true
  await loadModelCandidates()
  priceForm.value = rule ? {
    provider: rule.provider || '', model: rule.model || '', service_tier: rule.service_tier || '*', min_input_tokens: String(rule.min_input_tokens ?? 0), input_price_per_million: String(rule.input_price_per_million ?? 0), output_price_per_million: String(rule.output_price_per_million ?? 0), cache_read_price_per_million: String(rule.cache_read_price_per_million ?? 0), cache_write_price_per_million: String(rule.cache_write_price_per_million ?? 0), request_price: String(rule.request_price ?? 0), source: rule.source || 'manual', enabled: Boolean(rule.enabled), note: rule.note || ''
  } : emptyPriceForm()
  contextPreset.value = String(priceForm.value.min_input_tokens) === '0' ? 'base' : String(priceForm.value.min_input_tokens) === '272001' ? '272k' : 'custom'
  const existingKey = rule ? `${String(rule.provider || '').toLowerCase()}::${rule.model || ''}` : ''
  selectedPriceCandidateKeys.value = existingKey ? [existingKey] : []
}
function isPriceCandidateSelected(candidate) { return selectedPriceCandidateKeys.value.includes(candidate.key) }
function togglePriceCandidate(candidate) {
  if (editingPrice.value) { selectedPriceCandidateKeys.value = [candidate.key]; return }
  selectedPriceCandidateKeys.value = isPriceCandidateSelected(candidate) ? selectedPriceCandidateKeys.value.filter(key => key !== candidate.key) : [...selectedPriceCandidateKeys.value, candidate.key]
}
function clearPriceCandidateSelection() { selectedPriceCandidateKeys.value = [] }
function providerMark(provider) { return String(provider || '?').split(/[-_\s]+/).map(part => part[0]).join('').slice(0, 3).toUpperCase() }

async function submitPrice() {
  modalError.value = ''
  const selected = selectedPriceCandidates.value
  if (!selected.length) return modalError.value = t('billing.priceForm.selectAtLeastOne')
  if (editingPrice.value && selected.length !== 1) return modalError.value = t('billing.priceForm.selectOneEditing')
  const numericFields = ['min_input_tokens', 'input_price_per_million', 'output_price_per_million', 'cache_read_price_per_million', 'cache_write_price_per_million', 'request_price']
  const body = { service_tier: priceForm.value.service_tier.trim() || '*', source: priceForm.value.source, enabled: priceForm.value.enabled, note: priceForm.value.note.trim() }
  for (const field of numericFields) { const value = Number(priceForm.value[field]); if (!Number.isFinite(value) || value < 0 || (field === 'min_input_tokens' && !Number.isSafeInteger(value))) return modalError.value = t('billing.priceForm.nonNegative', { field: field.replaceAll('_', ' ') }); body[field] = value }
  priceSaving.value = true
  try {
    if (editingPrice.value) {
      const candidate = selected[0]
      await fetchAPI(`/billing/model-prices/${encodeURIComponent(editingPrice.value.id)}`, { method: 'PATCH', body: { ...body, provider: candidate.provider, model: candidate.model } })
      toast.add({ title: t('billing.priceForm.updated'), color: 'success', icon: 'i-tabler-circle-check' })
    } else {
      const failed = []
      for (const candidate of selected) {
        try { await fetchAPI('/billing/model-prices', { method: 'POST', body: { ...body, provider: candidate.provider, model: candidate.model } }) }
        catch (error) { failed.push(`${candidate.provider}/${candidate.model}: ${errorMessage(error, t('billing.priceForm.createRuleFailed'))}`) }
      }
      if (failed.length) { modalError.value = t('billing.priceForm.partialFailure', { count: failed.length, details: failed.join(' | ') }); await loadPrices(); return }
      toast.add({ title: t('billing.priceForm.created', { count: selected.length }), color: 'success', icon: 'i-tabler-circle-check' })
    }
    priceFormOpen.value = false
    await loadPrices()
  } catch (error) { modalError.value = errorMessage(error, t('billing.priceForm.saveFailed')) } finally { priceSaving.value = false }
}

async function copyText(value) { try { await navigator.clipboard.writeText(String(value || '')); toast.add({ title: t('common.copied'), color: 'success' }) } catch {} }
function contextBandLabel(value) { const amount = Number(value || 0); return amount === 0 ? t('billing.context.base') : amount === 272001 ? t('billing.context.272k') : t('billing.context.from', { count: formatNumber(amount) }) }
async function togglePriceEnabled(rule, enabled) { togglingPrice.value = rule.id; try { await fetchAPI(`/billing/model-prices/${encodeURIComponent(rule.id)}`, { method: 'PATCH', body: { enabled } }); await loadPrices() } catch (error) { pageError.value = errorMessage(error, t('billing.priceForm.toggleFailed')) } finally { togglingPrice.value = '' } }
function confirmDeletePrice(rule) { deletePriceTarget.value = rule; deletePriceOpen.value = true }
async function deletePrice() { if (!deletePriceTarget.value) return; priceDeleting.value = true; try { await fetchAPI(`/billing/model-prices/${encodeURIComponent(deletePriceTarget.value.id)}`, { method: 'DELETE' }); deletePriceOpen.value = false; await loadPrices(); toast.add({ title: t('billing.delete.deleted'), color: 'success', icon: 'i-tabler-circle-check' }) } catch (error) { pageError.value = errorMessage(error, t('billing.delete.failed')) } finally { priceDeleting.value = false } }
async function saveSettings() {
  if (settingsSaving.value || diagnosticsLoading.value) return
  settingsError.value = timezoneError.value
  if (settingsError.value) return
  if (settingsForm.value.service_tier_source === 'response' && savedTierSource.value !== 'response') {
    await loadDiagnostics()
    if (diagnosticsError.value || !tierDiagnostics.value?.supported) {
      settingsError.value = diagnosticsError.value || t('billing.settings.responseTierUnsupported')
      return
    }
    tierConfirmOpen.value = true
    return
  }
  await persistSettings()
}
async function persistSettings() {
  if (settingsSaving.value) return
  settingsError.value = timezoneError.value
  if (settingsError.value) return
  settingsSaving.value = true
  try {
    const saved = await fetchAPI('/billing/settings', { method: 'PATCH', body: billingSettingsPayload(settingsForm.value) })
    settingsForm.value = normalizeBillingSettings(saved)
    savedTierSource.value = saved.service_tier_source
    updateReportTimezone(saved.report_timezone || 'UTC')
    tierConfirmOpen.value = false
    matchingSettingsOpen.value = false
    toast.add({ title: t('billing.settings.saved'), color: 'success', icon: 'i-tabler-circle-check' })
    await safely(async () => { await Promise.all([loadOverview(), loadCharges(), loadBalances()]) }, t('billing.settings.refreshFailed'))
  } catch (error) { settingsError.value = errorMessage(error, t('billing.settings.saveFailed')) }
  finally { settingsSaving.value = false }
}
function chargeUserName(charge) {
  if (charge.username) return charge.username
  const user = users.value.find(item => String(item.id) === String(charge.user_id))
  if (user?.username) return user.username
  return charge.user_id ? t('billing.userNumber', { id: charge.user_id }) : t('billing.unknownUser')
}
function balanceUserName(record) {
  const user = users.value.find(item => String(item.id) === String(record.user_id))
  return user?.username || (record.user_id ? t('billing.userNumber', { id: record.user_id }) : '—')
}
function share(amount, items) {
  const max = Math.max(0.000001, ...items.map(item => Number(item.amount) || 0))
  return Math.round(((Number(amount) || 0) / max) * 100)
}
function openBalanceDetail(record) { selectedBalance.value = record; balanceDetailOpen.value = true }
function openChargeDetail(charge) { selectedCharge.value = charge; chargeDetailOpen.value = true }
function totalChargeTokens(charge) { return (Number(charge.input_tokens) || 0) + (Number(charge.output_tokens) || 0) + (Number(charge.cache_tokens) || 0) }
function trendWidth(value) { return Math.max(2, Math.round(((Number(value) || 0) / maxTrendCharge.value) * 100)) }
function formatCredits(value) { return new Intl.NumberFormat(intlLocale.value, { minimumFractionDigits: 0, maximumFractionDigits: 6 }).format(Number(value) || 0) }
function formatNumber(value) { return new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0) }

function formatDateTime(value) { return value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short', timeZone: savedReportTimezone.value }).format(new Date(value)) : '—' }
function prettyJSON(value) { return JSON.stringify(value || {}, null, 2) }
function errorMessage(error, fallback = t('billing.error.unexpected')) { return error?.data?.message || error?.data?.error || error?.message || fallback }

async function loadBilling(preserveDraft = false) {
  await safely(async () => {
    await loadSettings(preserveDraft)
    await Promise.all([loadOverview(), loadCharges(), loadBalances(), loadPrices(), loadUsers(), loadModelCandidates()])
  }, t('billing.error.load'))
}
const presentation = useBillingPresentation({ overview, selectedBalance, selectedCharge, t, formatCredits, formatNumber, formatDateTime, balanceTypeLabel })
const { dailyTrend, topModels, topProviders } = presentation
const workspace = {
  ...presentation, t, activeSection, sections, pageError, savedReportTimezone, loading, refreshCurrent,
  settingsLoading, settingsSaving, openMatchingSettings, rangeOptions, rowValue,
  overview, overviewFilters, overviewPreset, overviewLoading, applyOverviewFilters, resetOverviewFilters,
  userSearchOptions, providerSearchOptions, modelSearchOptions, selectRange, trendWidth, share,
  formatCredits, formatNumber, formatDateTime, prettyJSON,
  charges, chargesTotal, chargesLoading, chargeFilters, chargePreset, chargeColumns, chargePage, chargePageSize,
  applyChargeFilters, resetChargeFilters, changeChargePage, changePageSize, chargeUserName, totalChargeTokens, openChargeDetail,
  balanceRecords, balancesTotal, balancesLoading, balanceFilters, balancePreset, balanceColumns, balancePage, balancePageSize,
  applyBalanceFilters, resetBalanceFilters, changeBalancePage, balanceUserName, balanceTypeLabel, openBalanceDetail,
  adjustmentOpen, adjustmentForm, adjustmentSaving, openBalanceAdjustment, submitBalanceAdjustment, userOptions, modalError,
  priceImporter, importProviderOptions, modelCandidates, modelCandidatesError, modelCandidatesLoading,
  priceRules, savedTierSource, loadPricesSafely, filteredPriceRules, priceMenuItems, priceFilters,
  allOptionValue, enabledOptions, sourceOptions, priceSourceOptions, priceSchemaVersion, priceTierOptions, hasPriceFilters,
  clearPriceFilters, settingsForm, priceColumns, pricesLoading, copyText, contextBandLabel, priceSourceLabel,
  togglingPrice, togglePriceEnabled, openPriceForm, confirmDeletePrice,
  matchingSettingsOpen, settingsError, timezoneError, timezoneOptions, tierSourceOptions,
  diagnosticsError, diagnosticsLoading, tierDiagnostics, saveSettings, tierConfirmOpen, persistSettings,
  priceFormOpen, editingPrice, selectedPriceCandidates, clearPriceCandidateSelection, modelCandidateSearch,
  availableModelsOnly, filteredModelCandidates, isPriceCandidateSelected, togglePriceCandidate, providerMark,
  priceForm, serviceTierOptions, contextPreset, contextPresetOptions, applyContextPreset, priceSaving, submitPrice,
  deletePriceOpen, deletePriceTarget, priceDeleting, deletePrice,
  balanceDetailOpen, selectedBalance, chargeDetailOpen, selectedCharge
}
provide(billingWorkspaceKey, workspace)
useDataSync('admin:billing:sync', () => loadBilling(true))
onMounted(loadBilling)
return workspace
}
