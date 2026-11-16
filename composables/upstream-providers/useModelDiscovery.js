import { computed, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { upstreamStatusError } from '~/composables/upstream-providers/categories'

// Upstream model discovery through the management `/requests/api-call` proxy.
export function useModelDiscovery({ t, fetchAPI, selectedProviderRoute, editor }) {
  const { providerEditorMode, providerEditorOpen, editingProviderEntry, providerForm, headerRows, compatKeyRows, isCompat, primaryProviderKey, requiresBaseURL } = editor
  const discoveredModels = useWorkspaceState('admin:upstream-providers:discoveredModels', () => ([]))
  const discoverySearch = ref('')
  const discoveryVisible = ref(false)
  const discoveryLoaded = useWorkspaceState('admin:upstream-providers:discoveryLoaded', () => (false))
  const selectedDiscovered = ref([])
  const discoveryError = useWorkspaceState('admin:upstream-providers:discoveryError', () => (''))
  const discovering = useWorkspaceState('admin:upstream-providers:discovering', () => (false))
  let discoveryGeneration = 0
  const discoveryAuthIndex = computed(() => {
    if (providerEditorMode.value !== 'edit') return ''
    const entry = editingProviderEntry.value
    if (isCompat.value) {
      if (compatKeyRows.value.length === 1) {
        const credential = compatKeyRows.value[0]?.source
        return String(credential?.auth_index || credential?.id || credential?.uuid || '').trim()
      }
      return compatKeyRows.value.length === 0 && entry?.__v8KeyIndex === -1
        ? String(entry.__v8Group?.auth_index || entry.__v8Group?.id || entry.__v8Group?.uuid || '').trim()
        : ''
    }
    return String(entry?.auth_index || entry?.id || '').trim()
  })
  const discoveryHeaders = computed(() => Object.fromEntries(headerRows.value.filter(row => row.name.trim()).map(row => [row.name.trim(), row.value])))
  const discoveryAuthLabel = computed(() => primaryProviderKey.value ? t('upstream.providers.authEnteredKey') : discoveryAuthIndex.value ? t('upstream.providers.authSavedCredential') : hasProviderAuthHeader.value ? t('upstream.providers.authHeader') : t('upstream.providers.authRequired'))
  const hasProviderAuthHeader = computed(() => Object.entries(discoveryHeaders.value).some(([name, value]) =>
    name.toLowerCase() === (['gemini-api-key', 'interactions-api-key'].includes(selectedProviderRoute.value) ? 'x-goog-api-key' : selectedProviderRoute.value === 'claude-api-key' ? 'x-api-key' : 'authorization') && String(value).trim()))
  const discoveryReady = computed(() => (primaryProviderKey.value || discoveryAuthIndex.value || hasProviderAuthHeader.value) && (!requiresBaseURL.value || String(providerForm.value['base-url'] || '').trim()))
  const existingModelNames = computed(() => new Set(providerForm.value.models.map(model => String(model.name || '').trim().toLowerCase()).filter(Boolean)))
  const filteredDiscoveredModels = computed(() => discoveredModels.value.filter(model => `${model.name} ${model.displayName || ''} ${model.description || ''}`.toLowerCase().includes(discoverySearch.value.trim().toLowerCase())))
  const defaultDiscoveryURL = computed(() => {
    const rawBase = String(providerForm.value['base-url'] || '').trim().replace(/\/+$/, '')
    const base = rawBase && !/^https?:\/\//i.test(rawBase) ? `https://${rawBase}` : rawBase
    const route = selectedProviderRoute.value
    if (['gemini-api-key', 'interactions-api-key'].includes(route)) return `${(base || 'https://generativelanguage.googleapis.com').replace(/\/v1beta(?:\/.*)?$/i, '')}/v1beta/models`
    if (route === 'claude-api-key') return `${(base || 'https://api.anthropic.com').replace(/\/v1(?:\/.*)?$/i, '')}/v1/models`
    if (route === 'meta-api-key') return /\/models$/i.test(base) ? base : `${base || 'https://api.meta.ai/v1'}/models`
    if (!base) return ''
    if (route === 'codex-api-key') return /\/v1\/models$/i.test(base) ? base : /\/v1$/i.test(base) ? `${base}/models` : `${base}/v1/models`
    return /\/models$/i.test(base) ? base : `${base}/models`
  })

  async function discoverModels() {
    discoveryVisible.value = true
    discoveryError.value = ''
    selectedDiscovered.value = []
    const route = selectedProviderRoute.value
    const key = primaryProviderKey.value
    const authIndex = discoveryAuthIndex.value
    let url
    try {
      url = new URL(defaultDiscoveryURL.value)
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.hash) throw new Error()
    } catch {
      discoveryError.value = t('upstream.providers.invalidBaseUrl')
      return
    }
    const header = { ...discoveryHeaders.value }
    const addHeader = (name, value) => {
      if (!Object.keys(header).some(item => item.toLowerCase() === name.toLowerCase()) && value) header[name] = value
    }
    if (['gemini-api-key', 'interactions-api-key'].includes(route)) addHeader('x-goog-api-key', key || (authIndex ? '$TOKEN$' : ''))
    else if (route === 'claude-api-key') {
      addHeader('x-api-key', key || (authIndex ? '$TOKEN$' : ''))
      addHeader('anthropic-version', '2023-06-01')
    } else addHeader('Authorization', key ? `Bearer ${key}` : authIndex ? 'Bearer $TOKEN$' : '')
    const generation = ++discoveryGeneration
    discovering.value = true
    try {
      const seen = new Set()
      const models = []
      let pageToken = ''
      for (let page = 0; page < (['gemini-api-key', 'interactions-api-key'].includes(route) ? 20 : 1); page++) {
        const pageURL = new URL(url)
        if (pageToken) pageURL.searchParams.set('pageToken', pageToken)
        const request = (requestHeader, index) => fetchAPI('/requests/api-call', { method: 'POST', body: { auth_index: index || undefined, method: 'GET', url: pageURL.href, header: requestHeader } })
        let response
        try {
          response = await request(header, authIndex)
          if (!response?.status_code || response.status_code < 200 || response.status_code >= 300) throw new Error(upstreamStatusError(t, response))
        } catch (error) {
          if (route !== 'openai-compatibility' || !(key || authIndex || Object.keys(header).length)) throw error
          response = await request({}, '')
        }
        if (generation !== discoveryGeneration || !providerEditorOpen.value) return
        if (!response?.status_code || response.status_code < 200 || response.status_code >= 300) throw new Error(upstreamStatusError(t, response))
        let payload
        try { payload = JSON.parse(response.body) } catch { throw new Error(t('upstream.providers.notJson')) }
        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.models
        if (!Array.isArray(list)) throw new Error(t('upstream.providers.expectedArray'))
        for (const item of list) {
          const name = typeof item === 'string' ? item : item && typeof item === 'object' ? (item.id || item.name || item.model || item.value) : ''
          const normalized = typeof name === 'string' ? (['gemini-api-key', 'interactions-api-key'].includes(route) ? name.replace(/^\/?models\//i, '') : name).trim() : ''
          if (!normalized || seen.has(normalized.toLowerCase())) continue
          seen.add(normalized.toLowerCase())
          const displayName = item && typeof item === 'object' && typeof (item.display_name || item.displayName || item.alias) === 'string'
            ? (item.display_name || item.displayName || item.alias).trim()
            : ''
          models.push({ name: normalized, displayName: displayName && displayName !== normalized ? displayName : '', description: typeof item?.description === 'string' ? item.description : '' })
        }
        pageToken = typeof payload?.nextPageToken === 'string' ? payload.nextPageToken : ''
        if (!pageToken) break
      }
      discoveredModels.value = models
      discoveryLoaded.value = true
    } catch (error) {
      if (generation === discoveryGeneration) discoveryError.value = error?.message || t('upstream.providers.discoverFailed')
    } finally {
      if (generation === discoveryGeneration) discovering.value = false
    }
  }

  function clearDiscoveryResults() {
    discoveryGeneration++
    discovering.value = false
    discoveredModels.value = []
    selectedDiscovered.value = []
    discoveryError.value = ''
    discoverySearch.value = ''
    discoveryVisible.value = false
    discoveryLoaded.value = false
  }

  function selectAllDiscoveredModels() {
    selectedDiscovered.value = [...new Set([...selectedDiscovered.value, ...filteredDiscoveredModels.value.filter(model => !existingModelNames.value.has(model.name.toLowerCase())).map(model => model.name)])]
  }

  function toggleDiscoveredModel(name, checked) {
    selectedDiscovered.value = checked
      ? [...selectedDiscovered.value, name]
      : selectedDiscovered.value.filter(item => item !== name)
  }

  function applyDiscoveredModels() {
    const existing = new Set(providerForm.value.models.map(model => String(model.name || '').trim().toLowerCase()))
    for (const model of discoveredModels.value) {
      if (!selectedDiscovered.value.includes(model.name) || existing.has(model.name.toLowerCase())) continue
      if (providerForm.value.models.length === 1 && !String(providerForm.value.models[0].name || '').trim() && !String(providerForm.value.models[0].alias || '').trim()) providerForm.value.models.splice(0, 1)
      providerForm.value.models.push({ name: model.name, alias: '', ...(model.displayName ? { 'display-name': model.displayName } : {}) })
      existing.add(model.name.toLowerCase())
    }
    selectedDiscovered.value = []
  }

  return {
    discoveredModels, discoverySearch, discoveryVisible, discoveryLoaded, selectedDiscovered, discoveryError, discovering,
    discoveryAuthIndex, discoveryAuthLabel, discoveryReady, existingModelNames, filteredDiscoveredModels,
    discoverModels, clearDiscoveryResults, selectAllDiscoveredModels, toggleDiscoveredModel, applyDiscoveredModels
  }
}
