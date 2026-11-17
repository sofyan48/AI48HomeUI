import { computed, ref } from 'vue'

import type { AccountShared, ConcurrencyPolicy, PolicyPatch, ConcurrencyState, FlightDetails } from './types'
import { accountError } from './types'
import type { ApiQuery } from '~/composables/useApi'

// Concurrency tab: per-credential concurrency policy draft/save and live in-flight snapshots.
export function useAccountPolicy(ctx: AccountShared) {
  const {
    t, fetchAPI, supports, toast, message, unavailable, refreshData, snapshotsSupported, snapshotsAvailable,
    savingFields, savingPolicy, credentialAction, detailsTarget, currentGeneration, ownsDetails
  } = ctx
  const policyAvailable = ref(true)
  const policySupported = computed(() => supports('credential_concurrency_limits_v2', false) && policyAvailable.value)
  const policy = ref<ConcurrencyPolicy | null>(null)
  const policyTotal = ref('')
  const policyModels = ref<{ key: number; model: string; limit: string }[]>([])
  const policyDraft = () => JSON.stringify([String(policyTotal.value), policyModels.value.map(({ model, limit }) => [model, String(limit)])])
  const originalPolicyDraft = ref(policyDraft())
  const policyDirty = computed(() => policyDraft() !== originalPolicyDraft.value)
  const policyError = ref('')
  const policyConflict = ref(false)
  const loadingPolicy = ref(false)
  let policyRequest = 0
  let modelKey = 0
  const concurrencyState = ref<ConcurrencyState | null>(null)
  const flightDetails = ref<FlightDetails | null>(null)
  const concurrencyError = ref('')
  const loadingConcurrency = ref(false)
  let concurrencyRequest = 0

  // Invalidates in-flight policy/concurrency reads when the details owner changes.
  function cancelPolicyRequests() { policyRequest++; concurrencyRequest++ }
  function resetPolicyDraft() {
    policyConflict.value = false; policyTotal.value = ''; policyModels.value = []
    originalPolicyDraft.value = policyDraft()
  }

  function addPolicyModel() {
    if (!savingFields.value && !savingPolicy.value && !policyConflict.value) policyModels.value.push({ key: ++modelKey, model: '', limit: '' })
  }
  function canonicalPolicyModel(raw: string) {
    // Match Home's limiter key normalization, including recognized reasoning suffixes.
    const trim = (value: string) => value.replace(/^[ \t\r\n\v\f]+|[ \t\r\n\v\f]+$/g, '')
    let model = trim(raw).toLowerCase()
    const suffix = model.match(/\(([^()]*)\)$/)
    if (suffix && (['-1', 'none', 'auto', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(suffix[1]!) || (/^\d{1,10}$/.test(suffix[1]!) && Number(suffix[1]) <= 2147483647))) {
      const base = trim(model.slice(0, suffix.index))
      if (base) model = base
    }
    if (!model || new TextEncoder().encode(model).length > 256 || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(model)) throw new Error(t('cred.policy.invalidModel'))
    return model
  }
  function policyLimit(raw: string) {
    const text = String(raw ?? '').trim()
    if (!text) return null
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error(t('cred.policy.invalidLimit'))
    return Number(text) || null
  }
  function policyPatch(): PolicyPatch {
    if (!policySupported.value) {
      if (policyDirty.value) throw new Error(t('cred.policy.unavailableRetained'))
      return {}
    }
    if (loadingPolicy.value || !policy.value || policy.value.credential_id !== detailsTarget.value?.id) throw new Error(t('cred.policy.loadFirst'))
    if (policyConflict.value) throw new Error(t('cred.policy.conflict'))
    const total = policyLimit(policyTotal.value)
    const models: Record<string, number> = Object.create(null)
    const seen = new Set()
    for (const entry of policyModels.value) {
      if (!entry.model.trim()) throw new Error(t('cred.policy.emptyModel'))
      const model = canonicalPolicyModel(entry.model)
      if (seen.has(model)) throw new Error(t('cred.policy.duplicate', { model }))
      seen.add(model)
      const limit = policyLimit(entry.limit)
      if (limit) models[model] = limit
    }
    const body: PolicyPatch = {}
    if (total !== (policy.value.max_in_flight ?? null)) body.max_in_flight = total
    if (JSON.stringify(Object.entries(models).sort()) !== JSON.stringify(Object.entries(policy.value.max_in_flight_by_model || {}).sort())) body.max_in_flight_by_model = models
    if (Object.keys(body).length) body.version = policy.value.version
    return body
  }
  function applyPolicy(result: ConcurrencyPolicy) {
    policy.value = result
    policyTotal.value = result.max_in_flight == null ? '' : String(result.max_in_flight)
    policyModels.value = Object.entries(result.max_in_flight_by_model || {}).sort(([a], [b]) => a.localeCompare(b)).map(([model, limit]) => ({ key: ++modelKey, model, limit: String(limit) }))
    originalPolicyDraft.value = policyDraft()
  }
  async function loadPolicy(internal = false) {
    if (!detailsTarget.value || !policySupported.value || savingPolicy.value || (savingFields.value && internal !== true)) return
    const requestID = ++policyRequest
    const id = detailsTarget.value.id
    const generation = currentGeneration()
    loadingPolicy.value = true
    policyError.value = ''
    try {
      const result = await fetchAPI<ConcurrencyPolicy>(`/credentials/${encodeURIComponent(id)}/concurrency-policy`)
      if (requestID !== policyRequest || !ownsDetails(id, generation)) return
      if (result.credential_id !== id) throw new Error(t('cred.policy.wrongCredential'))
      applyPolicy(result)
      policyConflict.value = false
    } catch (error) {
      if (requestID === policyRequest && ownsDetails(id, generation)) {
        if (unavailable(error)) policyAvailable.value = false
        policyError.value = unavailable(error) ? t('cred.policy.unavailable') : message(error)
      }
    }
    finally { if (requestID === policyRequest) loadingPolicy.value = false }
  }
  async function savePolicy() {
    if (!detailsTarget.value || !policySupported.value || savingFields.value || savingPolicy.value || loadingPolicy.value || credentialAction.value) return
    const id = detailsTarget.value.id
    const generation = currentGeneration()
    const requestID = ++policyRequest
    let body
    try {
      body = policyPatch()
      if (!Object.keys(body).length) return
    } catch (error) { policyError.value = message(error); return }
    savingPolicy.value = true
    policyError.value = ''
    try {
      const result = await fetchAPI<ConcurrencyPolicy>(`/credentials/${encodeURIComponent(id)}/concurrency-policy`, { method: 'PATCH', body })
      if (requestID !== policyRequest || !ownsDetails(id, generation)) return
      applyPolicy(result)
      await refreshData()
      toast.add({ title: t('cred.policy.updated'), color: 'success' })
    } catch (error) {
      if (requestID !== policyRequest || !ownsDetails(id, generation)) return
      if (unavailable(error)) policyAvailable.value = false
      policyConflict.value = accountError(error)?.statusCode === 409
      policyError.value = policyConflict.value ? t('cred.policy.conflictSave') : message(error)
    } finally { savingPolicy.value = false }
  }

  async function loadConcurrency(offset = 0) {
    if (!detailsTarget.value || loadingConcurrency.value) return
    const id = detailsTarget.value.id
    const generation = currentGeneration()
    const requestID = ++concurrencyRequest
    loadingConcurrency.value = true; concurrencyError.value = ''
    try {
      const query: ApiQuery = { credential_id: id, limit: 25, offset }
      if (supports('credential_in_flight_snapshot_cursor', false)) {
        if (offset && flightDetails.value?.snapshot_cursor) query.snapshot_cursor = flightDetails.value.snapshot_cursor
        else query.stable_snapshot = true
      }
      const [states, details] = await Promise.all([
        policySupported.value ? fetchAPI<{ items?: ConcurrencyState[] }>('/credentials/concurrency').catch(error => {
          if (unavailable(error)) {
            if (requestID === concurrencyRequest && ownsDetails(id, generation)) policyAvailable.value = false
            return { items: [] }
          }
          throw error
        }) : Promise.resolve({ items: [] }),
        snapshotsSupported.value ? fetchAPI<FlightDetails>('/credentials/in-flight', { query }) : Promise.resolve(null)
      ])
      if (requestID !== concurrencyRequest || !ownsDetails(id, generation)) return
      concurrencyState.value = (states.items || []).find(item => item.credential_id === id) || null
      flightDetails.value = offset && details ? { ...details, items: [...(flightDetails.value?.items || []), ...(details.items || [])] } : details
    } catch (error) {
      if (requestID === concurrencyRequest && ownsDetails(id, generation)) {
        if (unavailable(error)) snapshotsAvailable.value = false
        concurrencyError.value = unavailable(error) ? t('cred.err.concurrencyUnavailable') : accountError(error)?.statusCode === 409 ? t('cred.err.snapshotExpired') : message(error)
      }
    } finally { if (requestID === concurrencyRequest) loadingConcurrency.value = false }
  }

  return {
    policySupported, policy, policyTotal, policyModels, policyDirty, policyError, policyConflict, loadingPolicy,
    concurrencyState, flightDetails, concurrencyError, loadingConcurrency, cancelPolicyRequests, resetPolicyDraft,
    addPolicyModel, policyPatch, loadPolicy, savePolicy, loadConcurrency
  }
}
