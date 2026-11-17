import { computed, onScopeDispose, ref } from 'vue'
import { useUserApi, usePortalI18n } from '#imports'
import { useStoreData } from '~/composables/useStoreData'
import { usePortalToast } from '~/composables/portal/usePortalToast'
import { analyticsCSV, defaultAnalyticsFilters, validateRange, type AnalyticsFilters, type AnalyticsRow, type UserAnalytics } from './types'

export function useUserAnalytics() {
  const { fetchAPI, hydrateSession, loadCapabilities, capabilities } = useUserApi()
  const { t } = usePortalI18n()
  const toast = usePortalToast()
  const filters = ref(defaultAnalyticsFilters())
  const applied = ref<AnalyticsFilters>({ ...filters.value })
  const filterError = ref('')
  const unsupported = ref(false)
  // Fetch choices separately from the filtered result so selecting a model or
  // key never makes the other choices disappear. No key values are fetched.
  const choices = ref<UserAnalytics | null>(null)
  let controller: AbortController | undefined
  let disposed = false
  const { data, pending, error, refresh } = useStoreData<UserAnalytics | null>('user:analytics', async () => {
    controller?.abort()
    const requestController = new AbortController()
    controller = requestController
    hydrateSession()
    try {
      await loadCapabilities()
    } catch (cause) {
      const failure = cause as { statusCode?: number; status?: number }
      if (failure.statusCode !== 404 && failure.status !== 404) throw cause
      if (!disposed) unsupported.value = true
      return null
    }
    if (capabilities.value.analytics !== true) {
      if (!disposed) unsupported.value = true
      return null
    }
    const range = { from: applied.value.from, to: applied.value.to }
    const query = { ...range, ...(applied.value.model ? { model: applied.value.model } : {}), ...(applied.value.api_key_id ? { api_key_id: applied.value.api_key_id } : {}) }
    try {
      const result = await fetchAPI<UserAnalytics>('/analytics', { query, signal: requestController.signal })
      if (!disposed && !requestController.signal.aborted) {
        unsupported.value = false
        if (!applied.value.model && !applied.value.api_key_id) choices.value = result
      }
      return result
    } catch (cause) {
      const failure = cause as { statusCode?: number; status?: number }
      if (failure.statusCode === 404 || failure.status === 404) {
        // A filtered key may be deleted or reassigned; only an unfiltered 404
        // indicates an unsupported analytics endpoint.
        if (!applied.value.api_key_id && !disposed) { unsupported.value = true; return null }
      }
      throw cause
    }
  }, { default: () => null })
  onScopeDispose(() => { disposed = true; controller?.abort() })

  const result = computed(() => error.value || unsupported.value ? null : data.value)
  const modelOptions = computed(() => [
    { label: t('analytics.allModels'), value: '' },
    ...Array.from(new Set([...(choices.value?.per_model ?? []).map(row => row.model), applied.value.model].filter(Boolean))).sort().map(model => ({ label: model, value: model })),
  ])
  // Historical ledger IDs remain useful labels without exposing an API key.
  // A reassigned-away key can appear historically but is not offered as a
  // filter: the server checks current ownership before filtering.
  const modelRows = computed<AnalyticsRow[]>(() => (result.value?.per_model ?? []).map(row => ({ ...row, id: row.model, name: row.model || '—' })))
  const keyRows = computed<AnalyticsRow[]>(() => (result.value?.per_key ?? []).map(row => ({ ...row, id: String(row.api_key_id ?? 'unknown'), name: row.api_key_id === null ? t('analytics.unknownKey') : t('analytics.keyLabel', { id: row.api_key_id }) })))
  const errorMessage = computed(() => {
    const failure = error.value as { data?: { message?: string }; message?: string } | null
    return failure?.data?.message || failure?.message || t('analytics.loadFailed')
  })

  function applyFilters() {
    if (pending.value) return
    const invalid = validateRange(filters.value)
    if (invalid) { filterError.value = invalid === 'long' ? t('analytics.maxRange', { days: 366 }) : t('analytics.invalidRange'); return }
    if (filters.value.api_key_id && !/^[1-9]\d*$/.test(filters.value.api_key_id)) { filterError.value = t('analytics.key') + ': ID > 0'; return }
    filterError.value = ''
    applied.value = { ...filters.value, model: filters.value.model.trim() }
    void refresh()
  }

  function download(group: 'daily' | 'models' | 'keys') {
    if (!result.value || pending.value) return
    let url: string | undefined
    try {
      url = URL.createObjectURL(new Blob([analyticsCSV(result.value, group)], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${group}-${result.value.from.slice(0, 10)}-${result.value.to.slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.add({ title: t('analytics.downloadFailed'), color: 'error' })
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }
  return { t, filters, applied, filterError, unsupported, result, pending, error, errorMessage, refresh, applyFilters, download, modelOptions, modelRows, keyRows }
}
