import { computed, reactive, ref } from 'vue'
import { credentialWeightPatch } from '~/composables/upstreamQuota'
import { credentialWebsocketState, credentialUsingAPI } from '~/composables/credentialTransport'

import type { AccountShared, AccountCredential, AccountFields, FieldsPatch } from './types'
import { accountError } from './types'
import type { useAccountPolicy } from './useAccountPolicy'

// Metadata tab: editable credential fields, excluded models and the combined fields/policy save.
export function useAccountFields(ctx: AccountShared & ReturnType<typeof useAccountPolicy>) {
  const {
    t, fetchAPI, toast, message, credentialRoute, refreshData, credentials, savingFields, savingPolicy, credentialAction,
    detailsTarget, currentGeneration, ownsDetails, policy, policyConflict, policyPatch, loadPolicy
  } = ctx
  const fields = reactive<AccountFields>({ prefix: '', proxy_url: '', priority: '', weight: '', request_retry: '', note: '', websockets: false, using_api: false, disable_cooling: 'inherit', enabled: true })
  const excludedModels = ref('')
  const originalExcludedModels = ref('')
  const exclusionsLoaded = ref(false)
  const exclusionsLoading = ref(false)
  const exclusionsError = ref('')
  const coolingOptions = computed(() => [
    { label: t('cred.meta.coolingInherit'), value: 'inherit' },
    { label: t('cred.meta.coolingEnable'), value: 'enable' },
    { label: t('cred.meta.coolingDisable'), value: 'disable' }
  ])
  const originalFields = ref<Partial<AccountFields>>({})
  const fieldsError = ref('')

  function resetExclusions() {
    exclusionsLoaded.value = false; exclusionsLoading.value = false; exclusionsError.value = ''
    excludedModels.value = ''; originalExcludedModels.value = ''
  }
  function initializeFields(item: AccountCredential | null) {
    if (!item) return
    fieldsError.value = ''
    Object.assign(fields, {
      prefix: item.prefix || '', proxy_url: item.proxy_url || '',
      weight: item.weight == null ? '' : String(item.weight),
      priority: item.priority == null ? '' : String(item.priority), request_retry: item['request-retry'] == null ? '' : String(item['request-retry']),
      note: item.note || '', websockets: credentialWebsocketState(item) === 'on', using_api: credentialUsingAPI(item), disable_cooling: item['disable-cooling'] == null ? 'inherit' : item['disable-cooling'] ? 'disable' : 'enable', enabled: item.disabled === true ? false : item.disabled === false ? true : fields.enabled
    })
    originalFields.value = { ...fields }
  }
  async function loadExclusions() {
    if (!detailsTarget.value || exclusionsLoaded.value || exclusionsLoading.value) return
    const id = detailsTarget.value.id
    const generation = currentGeneration()
    exclusionsLoading.value = true; exclusionsError.value = ''
    try {
      // The list response omits exclusions; read metadata without displaying or retaining tokens.
      const metadata = await fetchAPI<{ weight?: number | null; excluded_models?: unknown; 'excluded-models'?: unknown }>(credentialRoute('/download'), { query: { id } })
      if (!ownsDetails(id, generation)) return
      if (fields.weight === originalFields.value.weight) {
        fields.weight = metadata.weight == null ? '' : String(metadata.weight)
        originalFields.value.weight = fields.weight
      }
      const models = metadata.excluded_models ?? metadata['excluded-models'] ?? []
      if (!Array.isArray(models) || models.some(model => typeof model !== 'string')) throw new Error(t('cred.err.exclusionsShape'))
      excludedModels.value = JSON.stringify(models, null, 2)
      originalExcludedModels.value = excludedModels.value
      exclusionsLoaded.value = true
    } catch (error) { if (ownsDetails(id, generation)) exclusionsError.value = message(error) }
    finally { if (ownsDetails(id, generation)) exclusionsLoading.value = false }
  }
  async function saveFields() {
    if (!detailsTarget.value || savingFields.value || savingPolicy.value || credentialAction.value) return
    const generation = currentGeneration()
    const body: FieldsPatch = { id: detailsTarget.value.id }
    for (const key of Object.keys(fields) as (keyof AccountFields)[]) {
      if (fields[key] === originalFields.value[key]) continue
      if (key === 'weight') {
        try {
          body.weight = credentialWeightPatch(fields.weight, String(fields.weight).trim() === '')

        } catch { fieldsError.value = t('cred.err.weight'); return }
      } else if (key === 'priority' || key === 'request_retry') {
        const raw = String(fields[key]).trim()
        if (raw && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))) { fieldsError.value = key === 'priority' ? t('cred.err.priorityInt') : t('cred.err.retryInt'); return }
        body[key] = raw ? Number(raw) : null
      } else if (key === 'disable_cooling') body['disable-cooling'] = fields[key] === 'inherit' ? null : fields[key] === 'disable'
      else if (key === 'using_api') body.using_api = Boolean(fields[key])
      else if (key === 'enabled') {
        // The status endpoint owns disabled state. Do not send an inferred enable when a list response omits it.
        if (typeof detailsTarget.value?.disabled === 'boolean') body.disabled = !fields.enabled
      } else body[key] = fields[key]
    }
    try {
      if (exclusionsLoaded.value && excludedModels.value !== originalExcludedModels.value) {
        const models = excludedModels.value.trim() ? JSON.parse(excludedModels.value) : []
        if (!Array.isArray(models) || models.some(model => typeof model !== 'string')) throw new Error(t('cred.err.excludedShape'))
        body.excluded_models = models
      }
      Object.assign(body, policyPatch())
    } catch (error) { fieldsError.value = message(error); return }
    if (Object.keys(body).length === 1) return
    savingFields.value = true; fieldsError.value = ''
    try {
      await fetchAPI(credentialRoute('/fields'), { method: 'PATCH', body })
      await refreshData()
      const updated = credentials.value.find(item => item.id === body.id)
      if (ownsDetails(body.id, generation)) {
        if (updated) {
          detailsTarget.value = updated; initializeFields(updated)
          // Older list responses omit weight; retain the value just persisted by this form.
          if (body.weight != null && updated.weight == null) { fields.weight = String(body.weight); originalFields.value.weight = fields.weight }
        }
        if (body.excluded_models) { excludedModels.value = JSON.stringify(body.excluded_models, null, 2); originalExcludedModels.value = excludedModels.value }
        if (body.version != null) { policy.value = null; await loadPolicy(true) }
      }
      toast.add({ title: t('cred.toast.fieldsUpdated'), color: 'success' })
    } catch (error) {
      if (ownsDetails(body.id, generation)) {
        policyConflict.value = accountError(error)?.statusCode === 409
        fieldsError.value = policyConflict.value ? t('cred.policy.conflictSaveFields') : message(error)
      }
    }
    finally { savingFields.value = false }
  }

  return {
    fields, excludedModels, exclusionsLoaded, exclusionsLoading, exclusionsError, coolingOptions, fieldsError,
    resetExclusions, initializeFields, loadExclusions, saveFields
  }
}
