import { billingImportApplySupportError, createBillingImportIdempotencyKey, billingImportStorageKey, isDefinitiveBillingImportFailure, readBillingImportPending, validateBillingImportResult, writeBillingImportPending, type BillingImportPendingApply } from '~/composables/billingImport'
import { billingCatalogSources, defaultBillingImportPreferences, readBillingImportPreferences, writeBillingImportPreferences, type BillingCatalogSource, type BillingImportPreferences } from '~/composables/billingPreferences'
import { computed, ref, reactive, watch, onMounted, onScopeDispose, provide, inject, type InjectionKey } from 'vue'
import { useApi, useAdminI18n, useRuntimeConfig } from '#imports'
export type ImportTarget = { provider: string; model: string }
export type BillingPriceImportProps = { providers: string[]; models: string[]; candidates: ImportTarget[]; availableTargets: ImportTarget[]; priceRules: { provider: string; model: string; source: string }[]; serviceTierSource: string }
const importKey: InjectionKey<ReturnType<typeof provideBillingPriceImport>> = Symbol('billingPriceImport')
export function useBillingPriceImport() {
  const state = inject(importKey)
  if (!state) throw new Error('Billing price import is not provided')
  return state
}
export function provideBillingPriceImport(props: BillingPriceImportProps, emit: (event: 'applied') => void) {
const { t, intlLocale } = useAdminI18n()
const formatDate = (value: string) => new Date(value).toLocaleString(intlLocale.value)
const catalogLabels = computed<Record<string, { label: string; description: string }>>(() => ({
  auto: { label: t('billing.catalog.auto'), description: t('billing.catalog.autoDescription') },
  openrouter: { label: 'OpenRouter', description: t('billing.catalog.openrouterDescription') },
  litellm: { label: 'LiteLLM', description: t('billing.catalog.litellmDescription') },
  'models.dev': { label: 'models.dev', description: t('billing.catalog.modelsDevDescription') }
}))
const catalogSourceOptions = computed(() => billingCatalogSources.map(option => ({ ...option, ...catalogLabels.value[option.value] })))
const matchModeOptions = computed(() => [{ label: t('billing.import.matchPrefix'), value: 'prefix' }, { label: t('billing.import.matchRegex'), value: 'regex' }])
function actionLabel(action: string) {
  const labels: Record<string, string> = { create: t('billing.import.action.create'), update_sync: t('billing.import.action.updateSync'), overwrite: t('billing.import.action.overwrite'), skip: t('billing.import.action.skip'), review: t('billing.import.action.review') }
  return labels[action] || action
}
function statusLabel(status: string) {
  const labels: Record<string, string> = { applied: t('billing.import.status.applied'), failed: t('billing.import.status.failed'), conflict: t('billing.import.status.conflict'), expired: t('billing.import.status.expired'), created: t('billing.import.status.created'), updated: t('billing.import.status.updated'), overwritten: t('billing.import.status.overwritten') }
  return labels[status] || status
}
// Maps the English messages thrown by composables/billingImport.ts; other messages (e.g. from the backend) pass through.
function libMessage(message?: string) {
  if (!message) return message || ''
  const labels: Record<string, string> = {
    'Safe import recovery requires Web Crypto.': t('billing.import.lib.webCrypto'),
    'Applying prices requires crypto.randomUUID.': t('billing.import.lib.randomUuid'),
    'Stored import recovery data is invalid.': t('billing.import.lib.invalidStored'),
    'Invalid import operation response.': t('billing.import.lib.invalidOperation'),
    'Invalid import row response.': t('billing.import.lib.invalidRow'),
    'Incomplete import result.': t('billing.import.lib.incomplete')
  }
  const prefix = Object.keys(labels).find(start => message.startsWith(start))
  return prefix ? labels[prefix]! : message
}
const open = ref(false)
const advancedDetails = ref<HTMLDetailsElement | null>(null)
const providerFilter = ref('__all_providers__')
const targetSet = ref('available')
const targetSetOptions = computed(() => [
  { label: t('billing.import.targetSetAll'), value: 'all' },
  { label: t('billing.import.targetSetAvailable'), value: 'available' },
  { label: t('billing.import.targetSetSynced'), value: 'synced' },
  { label: t('billing.import.manualTargets'), value: 'manual' }
])
const overwriteOptions = computed(() => [
  { label: t('billing.import.overwriteMissing'), value: 'missing' },
  { label: t('billing.import.overwriteSync'), value: 'sync' },
  { label: t('billing.import.overwriteAll'), value: 'all' }
])
const providerOptions = computed(() => [
  { label: t('billing.filter.allProviders'), value: '__all_providers__' },
  ...[...new Set([...props.candidates, ...props.availableTargets, ...props.priceRules].map(target => target.provider).filter(Boolean))].sort().map(provider => ({ label: provider, value: provider }))
])
const writeFields = computed<{ key: string; cost?: string; label: string }[]>(() => [
  { key: 'service_tier', label: t('billing.prices.serviceTier') }, { key: 'min_input_tokens', label: t('billing.priceForm.minInputTokens') },
  { key: 'input_price_per_million', cost: 'input', label: t('billing.priceForm.inputPerM') }, { key: 'output_price_per_million', cost: 'output', label: t('billing.priceForm.outputPerM') },
  { key: 'cache_read_price_per_million', cost: 'cache_read', label: t('billing.priceForm.cacheReadPerM') }, { key: 'cache_write_price_per_million', cost: 'cache_write', label: t('billing.priceForm.cacheWritePerM') },
  { key: 'request_price', cost: 'request', label: t('billing.col.perRequest') }
])
const source = ref<BillingCatalogSource>('auto')
const sourceDescription = computed(() => catalogSourceOptions.value.find(option => option.value === source.value)?.description)
let preferenceKey = ''
const importUnavailable = ref(false)
const checkingUpdates = ref(false)
const syncTargets = computed(() => [...new Map(props.priceRules.filter(rule => rule.source === 'sync').map(rule => [`${rule.provider.toLowerCase()}::${rule.model}`, { provider: rule.provider, model: rule.model }])).values()])

const { fetchAPI, apiBase, token } = useApi()
const runtimeConfig = useRuntimeConfig()
const effectiveToken = computed(() => String(token.value || runtimeConfig.public.secretKey || '').trim())
const applySupportError = billingImportApplySupportError()
const recoveryReady = ref(false)
const recoveryError = ref('')
const pendingApply = ref<BillingImportPendingApply | null>(null)
const discardPendingOpen = ref(false)
let storageKey = ''
let sessionVersion = 0
const emptyTarget = () => ({ provider: '', model: '' })
const targets = reactive([emptyTarget()])
const overwriteMode = ref('missing')
const defaultMultiplier = ref(1)
const includeZeroCost = ref(false)
const aliases = reactive<{ target_model: string; source_models: string }[]>([])
const multiplierRules = reactive<{ id: string; label: string; match_mode: string; pattern: string; multiplier: number }[]>([])
const rowMultipliers = reactive<{ row_key: string; multiplier: number }[]>([])
const matchOverrides = reactive<{ target_provider: string; target_model: string; source_provider: string; source_model: string }[]>([])
const loading = ref(false)
const applying = ref(false)
const error = ref('')
const preview = ref<any>(null)
const operation = ref<any>(null)
const operationId = ref('')
const operationLoading = ref(false)
const operationError = ref('')
let operationController: AbortController | null = null
let previewController: AbortController | null = null
let applyController: AbortController | null = null
let disposed = false
function preventUnload(event: BeforeUnloadEvent) {
  if (!applying.value) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onScopeDispose(() => {
  disposed = true
  sessionVersion++
  operationController?.abort()
  previewController?.abort()
  applyController?.abort()
  window.removeEventListener('beforeunload', preventUnload)
})
const busy = computed(() => loading.value || applying.value || operationLoading.value)
const automaticTargets = computed(() => {
  const candidates = targetSet.value === 'synced' ? syncTargets.value : targetSet.value === 'all' ? props.candidates : props.availableTargets
  return [...new Map(candidates.filter(target => providerFilter.value === '__all_providers__' || target.provider === providerFilter.value).map(target => [`${target.provider.toLowerCase()}::${target.model}`, { provider: target.provider, model: target.model }])).values()]
})
function openImport() {
  open.value = true
}
async function checkUpdates() {
  if (busy.value || pendingApply.value || importUnavailable.value || !syncTargets.value.length) return
  open.value = true
  providerFilter.value = '__all_providers__'
  targetSet.value = 'synced'
  targets.splice(0, targets.length, ...automaticTargets.value)
  overwriteMode.value = 'sync'
  await previewPrices(true)
}

function exportPreview() {
  if (!preview.value) return
  const url = URL.createObjectURL(new Blob([JSON.stringify(preview.value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'model-price-import-preview.json'
  link.click()
  URL.revokeObjectURL(url)
}
function setRowMultiplier(row: any) {
  rowMultipliers.push({ row_key: row.row_key, multiplier: row.multiplier })
  if (advancedDetails.value) advancedDetails.value.open = true
}
function pricesChanged(row: any) {
  if (!row.existing_rule || !row.final) return true
  const fields: [string, string][] = [
    ['input', 'input_price_per_million'], ['output', 'output_price_per_million'],
    ['cache_read', 'cache_read_price_per_million'], ['cache_write', 'cache_write_price_per_million'],
    ['request', 'request_price']
  ]
  return fields.some(([cost, field]) => Number(row.final[cost]) !== Number(row.existing_rule[field]))
}
function selectable(row: any) {
  return row.applicable && row.write_rule && row.action !== 'skip' && (!checkingUpdates.value || pricesChanged(row))
}
const changedRows = computed(() => (preview.value?.rows || []).filter(selectable).length)
const reviewRows = computed(() => (preview.value?.rows || []).filter((row: any) => row.action === 'review' || ['conflict', 'failed'].includes(row.status)).length)
watch(operationId, () => { operationError.value = '' })
async function lookupOperation() {
  const id = operationId.value.trim()
  if (!id || operationLoading.value || loading.value || applying.value) return
  operationLoading.value = true
  operationError.value = ''
  operation.value = null
  const controller = new AbortController()
  const session = sessionVersion
  operationController = controller
  try {
    const result = await fetchAPI(`/billing/model-prices/import/operations/${encodeURIComponent(id)}`, { method: 'GET', signal: controller.signal })
    if (!disposed && session === sessionVersion && !controller.signal.aborted) operation.value = result
  } catch (cause: any) {
    if (!disposed && session === sessionVersion && !controller.signal.aborted) operationError.value = cause?.message || t('billing.import.err.lookup')
  } finally {
    if (!disposed && session === sessionVersion && operationController === controller) {
      operationLoading.value = false
      operationController = null
    }
  }
}
const selected = ref<string[]>([])
const confirmOverwrite = ref(false)
let inputVersion = 0
function invalidatePreview() {
  inputVersion++
  previewController?.abort()
  checkingUpdates.value = false
  error.value = ''
  preview.value = null
  selected.value = []
  confirmOverwrite.value = false
}
watch([source, targets, overwriteMode, defaultMultiplier, includeZeroCost, aliases, multiplierRules, rowMultipliers, matchOverrides], invalidatePreview, { deep: true, flush: 'sync' })
function restorePreferences(preferences: BillingImportPreferences) {
  source.value = preferences.source
  overwriteMode.value = preferences.overwriteMode
  targetSet.value = preferences.targetSet
  defaultMultiplier.value = preferences.defaultMultiplier
  includeZeroCost.value = preferences.includeZeroCost
  aliases.splice(0, aliases.length, ...preferences.aliases)
  multiplierRules.splice(0, multiplierRules.length, ...preferences.multiplierRules)
  rowMultipliers.splice(0)
  matchOverrides.splice(0)
}
watch([source, overwriteMode, targetSet, defaultMultiplier, includeZeroCost, aliases, multiplierRules], () => {
  if (!preferenceKey || !import.meta.client) return
  try {
    writeBillingImportPreferences(window.localStorage, preferenceKey, {
      source: source.value, overwriteMode: overwriteMode.value, targetSet: targetSet.value,
      defaultMultiplier: defaultMultiplier.value, includeZeroCost: includeZeroCost.value,
      aliases: [...aliases], multiplierRules: [...multiplierRules]
    })
  } catch { /* Preference storage must not block imports. */ }
}, { deep: true })
watch(effectiveToken, async () => {
  const session = ++sessionVersion
  operationController?.abort()
  applyController?.abort()
  invalidatePreview()
  loading.value = false
  applying.value = false
  operationLoading.value = false
  operation.value = null
  operationId.value = ''
  operationError.value = ''
  importUnavailable.value = false
  pendingApply.value = null
  discardPendingOpen.value = false
  recoveryReady.value = false
  recoveryError.value = ''
  storageKey = ''
  preferenceKey = ''
  restorePreferences(defaultBillingImportPreferences())
  if (!effectiveToken.value || !import.meta.client) return
  try {
    const key = await billingImportStorageKey(new URL(apiBase, window.location.origin).href, effectiveToken.value)
    if (disposed || session !== sessionVersion) return
    storageKey = key
    preferenceKey = key.replace(':pending:', ':preferences:')
    try { restorePreferences(readBillingImportPreferences(window.localStorage, preferenceKey)) } catch { /* Import defaults still work when local storage is blocked. */ }
    pendingApply.value = readBillingImportPending(window.sessionStorage, key)
    recoveryReady.value = true
  } catch (cause: any) {
    if (!disposed && session === sessionVersion) recoveryError.value = t('billing.import.err.recoveryUnavailable', { reason: libMessage(cause?.message) || t('billing.import.err.recoveryStorage') })
  }
}, { immediate: true, flush: 'sync' })
watch([targetSet, automaticTargets], () => {
  if (targetSet.value === 'manual') {
    if (advancedDetails.value) advancedDetails.value.open = true
    return
  }
  targets.splice(0, targets.length, ...automaticTargets.value)
}, { immediate: true, deep: true, flush: 'sync' })
const addTarget = () => { targetSet.value = 'manual'; targets.push(emptyTarget()) }
const removeTarget = (index: number) => { targetSet.value = 'manual'; targets.splice(index, 1) }
const positive = (value: number) => typeof value === 'number' && Number.isFinite(value) && value > 0
const validationError = computed(() => {
  if (!targets.length) return t('billing.import.err.noTargets')
    if (targets.some(target => !target.provider.trim() || !target.model.trim())) return t('billing.import.err.targetIncomplete')
  const targetKeys = targets.map(target => `${target.provider.trim().toLowerCase()}::${target.model.trim()}`)
  if (new Set(targetKeys).size !== targetKeys.length) return t('billing.import.err.duplicateTargets')
  if (!positive(defaultMultiplier.value)) return t('billing.import.err.defaultMultiplier')
  if (aliases.some(alias => !alias.target_model.trim() || alias.source_models.split(',').some(model => !model.trim()))) return t('billing.import.err.alias')
  if (multiplierRules.some(rule => !rule.pattern.trim() || !positive(rule.multiplier))) return t('billing.import.err.multiplierRule')
  const rowKeys = rowMultipliers.map(row => row.row_key.trim())
  if (rowMultipliers.some(row => !row.row_key.trim() || !positive(row.multiplier)) || new Set(rowKeys).size !== rowKeys.length) return t('billing.import.err.rowMultiplier')
  const overrideKeys = matchOverrides.map(item => `${item.target_provider.trim().toLowerCase()}::${item.target_model.trim()}`)
  if (matchOverrides.some(item => !item.target_provider.trim() || !item.target_model.trim() || !item.source_provider.trim() || !item.source_model.trim()) || new Set(overrideKeys).size !== overrideKeys.length || overrideKeys.some(key => !targetKeys.includes(key))) return t('billing.import.err.override')
  return ''
})
const requiresOverwrite = computed(() => (preview.value?.rows || []).some((row: any) => selected.value.includes(row.row_key) && row.action === 'overwrite'))
async function previewPrices(updates = false, preferredSelection?: string[]) {
  if (busy.value || pendingApply.value || importUnavailable.value) return
  loading.value = true
  error.value = ''
  invalidatePreview()
  checkingUpdates.value = updates
  operation.value = null
  const version = inputVersion
  const session = sessionVersion
  const controller = new AbortController()
  previewController = controller
  try {
    if (validationError.value) throw new Error(validationError.value)
    const result: any = await fetchAPI('/billing/model-prices/import/preview', {
      method: 'POST',
      signal: controller.signal,
      body: {
        source: source.value,
        targets: targets.map(target => ({ provider: target.provider.trim(), model: target.model.trim(), service_tier: '*', min_input_tokens: 0 })),
        policy: {
          overwrite_mode: overwriteMode.value,
          default_multiplier: defaultMultiplier.value,
          include_zero_cost: includeZeroCost.value,
          aliases: aliases.map(alias => ({ target_model: alias.target_model.trim(), source_models: alias.source_models.split(',').map(model => model.trim()) })),
          multiplier_rules: multiplierRules.map((rule, index) => ({ id: rule.id || `rule-${index + 1}`, label: rule.label.trim(), match_mode: rule.match_mode, pattern: rule.pattern.trim(), multiplier: rule.multiplier })),
          row_multipliers: Object.fromEntries(rowMultipliers.map(row => [row.row_key.trim(), row.multiplier]))
        },
        match_overrides: matchOverrides.map(item => ({ target_provider: item.target_provider.trim(), target_model: item.target_model.trim(), source_provider: item.source_provider.trim(), source_model: item.source_model.trim() }))
      }
    })
    if (disposed || session !== sessionVersion || controller.signal.aborted || version !== inputVersion) return
    preview.value = result
    selected.value = (result.rows || []).filter((row: any) => selectable(row) && (!preferredSelection || preferredSelection.includes(row.row_key))).map((row: any) => row.row_key)
    confirmOverwrite.value = false
  } catch (cause: any) {
    if (!disposed && session === sessionVersion && !controller.signal.aborted && version === inputVersion) {
      if ([404, 405, 501].includes(cause?.statusCode)) importUnavailable.value = true
      else error.value = cause?.message || t('billing.import.err.preview')
    }
  } finally {
    if (!disposed && session === sessionVersion && previewController === controller) {
      loading.value = false
      previewController = null
    }
  }
}
async function applyPrices() {
  if (!preview.value || !selected.value.length || busy.value || pendingApply.value || (requiresOverwrite.value && !confirmOverwrite.value)) return
  if (!recoveryReady.value || applySupportError) {
    error.value = recoveryError.value || libMessage(applySupportError) || t('billing.import.err.initializing')
    return
  }
  try {
    const pending: BillingImportPendingApply = {
      version: 1,
      createdAt: new Date().toISOString(),
      input: {
        preview_id: preview.value.preview_id,
        preview_revision: preview.value.preview_revision,
        selected_keys: [...selected.value],
        confirm_overwrite: confirmOverwrite.value,
        idempotency_key: createBillingImportIdempotencyKey()
      }
    }
    writeBillingImportPending(window.sessionStorage, storageKey, pending)
    pendingApply.value = pending
  } catch (cause: any) {
    error.value = libMessage(cause?.message) || t('billing.import.err.saveRecovery')
    return
  }
  await retryPendingApply()
}
async function retryPendingApply() {
  if (busy.value || !recoveryReady.value || !pendingApply.value) return
  const pending = pendingApply.value
  const session = sessionVersion
  const controller = new AbortController()
  applyController = controller
  applying.value = true
  error.value = ''
  try {
    // Persist again before a retry, and never rebuild this body from editable controls.
    writeBillingImportPending(window.sessionStorage, storageKey, pending)
    const result = await fetchAPI('/billing/model-prices/import/apply', { method: 'POST', body: pending.input, signal: controller.signal })
    if (disposed || session !== sessionVersion || controller.signal.aborted) return
    validateBillingImportResult(result, pending.input)
    operation.value = result
    writeBillingImportPending(window.sessionStorage, storageKey, null)
    pendingApply.value = null
    invalidatePreview()
    emit('applied')
  } catch (cause: any) {
    if (disposed || session !== sessionVersion || controller.signal.aborted) return
    if (isDefinitiveBillingImportFailure(cause)) {
      try {
        writeBillingImportPending(window.sessionStorage, storageKey, null)
        pendingApply.value = null
        invalidatePreview()
      } catch {
        error.value = t('billing.import.err.clearRecovery')
        return
      }
    }
    error.value = libMessage(cause?.message) || t('billing.import.err.uncertain')
  } finally {
    if (!disposed && session === sessionVersion && applyController === controller) {
      applying.value = false
      applyController = null
    }
  }
}
function discardPendingApply() {
  if (busy.value || !storageKey) return
  try {
    writeBillingImportPending(window.sessionStorage, storageKey, null)
    pendingApply.value = null
    discardPendingOpen.value = false
    recoveryError.value = ''
    recoveryReady.value = true
    invalidatePreview()
  } catch {
    error.value = t('billing.import.err.removeRecovery')
  }
}
const failedRows = computed<any[]>(() => (operation.value?.rows || []).filter((row: any) => ['failed', 'conflict'].includes(row.status)))
async function retryFailedRows() {
  if (busy.value || pendingApply.value || !failedRows.value.length) return
  const rows = [...failedRows.value]
  const retryTargets = rows.map(row => ({ provider: row.provider, model: row.model }))
  if (retryTargets.some(target => typeof target.provider !== 'string' || !target.provider.trim() || typeof target.model !== 'string' || !target.model.trim())) {
    error.value = t('billing.import.err.noIdentities')
    return
  }
  targetSet.value = 'manual'
  const existingTargets = targets.filter(target => target.provider.trim() && target.model.trim())
  targets.splice(0, targets.length, ...new Map([...existingTargets, ...retryTargets].map(target => [`${target.provider.toLowerCase()}::${target.model}`, target])).values())
  // Preserve policy, but select only failed/conflicting exact row keys in the new preview.
  await previewPrices(false, rows.map(row => row.key))
}
const state = {
  t, formatDate, catalogSourceOptions, matchModeOptions, actionLabel, statusLabel, libMessage,
  open, advancedDetails, providerFilter, targetSet, targetSetOptions, overwriteOptions, providerOptions,
  writeFields, source, sourceDescription, importUnavailable, checkingUpdates, applySupportError,
  recoveryReady, recoveryError, pendingApply, discardPendingOpen, get storageKey() { return storageKey },
  targets, overwriteMode, defaultMultiplier, includeZeroCost, aliases, multiplierRules, rowMultipliers,
  matchOverrides, loading, applying, error, preview, operation, operationId, operationLoading, operationError,
  busy, openImport, checkUpdates, exportPreview, setRowMultiplier, pricesChanged, selectable, changedRows,
  reviewRows, lookupOperation, selected, confirmOverwrite, addTarget, removeTarget, validationError,
  requiresOverwrite, previewPrices, applyPrices, retryPendingApply, discardPendingApply, failedRows, retryFailedRows,
  providers: computed(() => props.providers), models: computed(() => props.models)
}
provide(importKey, state)
return state
}
