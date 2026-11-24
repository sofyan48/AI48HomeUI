import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

// Keep rule channels distinct from Home's static catalog channels. AI Studio,
// Copilot, and custom channels remain editable without a catalog request.
const channels = [
  ['claude', 'Claude'], ['gemini', 'Gemini'], ['gemini-interactions', 'Google Interactions'],
  ['vertex', 'Vertex'], ['aistudio', 'AI Studio'], ['codex', 'Codex'],
  ['codex-free', 'Codex Free'], ['codex-team', 'Codex Team'], ['codex-plus', 'Codex Plus'],
  ['codex-pro', 'Codex Pro'], ['kimi', 'Kimi'], ['kimi-ai', 'Kimi AI'],
  ['antigravity', 'Antigravity'], ['xai', 'xAI'], ['devin', 'Devin'], ['meta', 'Meta'],
  ['copilot', 'GitHub Copilot'], ['x-ai', 'x-ai'], ['grok', 'grok'], ['muse', 'muse'],
] as const
const catalogChannels = new Set<string>(channels.map(([id]) => id).filter(id => id !== 'aistudio' && id !== 'copilot'))
export type OAuthChannelModel = {
  id: string
  display_name?: string
  name?: string
  [key: string]: unknown
}
type Draft = { oauthExcludedModelsJson?: string }
type Fetch = (path: string) => Promise<unknown>
type Translator = (key: string) => string

export function parseExclusionRules(text: string): string[] {
  return [...new Set(text.split(/\r?\n/).map(rule => rule.trim()).filter(Boolean))]
}

export function readExclusionMap(text: string | undefined): Record<string, string[]> | null {
  try {
    const value: unknown = JSON.parse(text || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    if (Object.values(value).some(rules => !Array.isArray(rules) || rules.some(rule => typeof rule !== 'string'))) return null
    return value as Record<string, string[]>
  } catch {
    return null
  }
}

export function useOAuthExclusions(
  draft: Ref<Draft>, fetchAPI: Fetch, t: Translator,
  channelModels: Ref<OAuthChannelModel[]>, modelsLoading: Ref<boolean>,
) {
  const exclusionChannel = ref('claude')
  const modelSearch = ref('')
  const modelsError = ref('')
  const unavailable = ref(false)
  const exclusionRulesText = ref('')
  let requestVersion = 0
  let disposed = false
  const excludedMap = computed(() => readExclusionMap(draft.value.oauthExcludedModelsJson))
  const excludedForChannel = computed(() => {
    const map = excludedMap.value
    return map && Object.hasOwn(map, exclusionChannel.value) ? map[exclusionChannel.value]! : []
  })
  const channelOptions = computed(() => {
    const labels = new Map<string, string>(channels)
    return [...new Set([...Object.keys(excludedMap.value || {}), ...labels.keys(), exclusionChannel.value])]
      .filter(Boolean).map(value => ({ value, label: labels.get(value) || value }))
  })
  const hasModelCatalog = computed(() => catalogChannels.has(exclusionChannel.value) && !unavailable.value)
  const filteredChannelModels = computed(() => {
    const query = modelSearch.value.trim().toLowerCase()
    return channelModels.value.filter(model => !query ||
      ['id', 'display_name', 'name', 'owned_by', 'type', 'description'].some(key =>
        String(model[key] || '').toLowerCase().includes(query)))
  })

  function setExcludedRules(rules: string[]) {
    if (!excludedMap.value || !exclusionChannel.value) return
    const map = { ...excludedMap.value }
    if (rules.length) Object.defineProperty(map, exclusionChannel.value, { value: rules, enumerable: true, configurable: true, writable: true })
    else delete map[exclusionChannel.value]
    draft.value.oauthExcludedModelsJson = JSON.stringify(map, null, 2)
  }
  function updateExclusionRules(value: string | number) {
    exclusionRulesText.value = String(value)
    setExcludedRules(parseExclusionRules(String(value)))
  }
  function toggleExcluded(id: string, checked: boolean | 'indeterminate') {
    const rules = new Set(excludedForChannel.value)
    if (checked === true) rules.add(id)
    else rules.delete(id)
    setExcludedRules([...rules])
  }
  function clearExcludedChannel() { setExcludedRules([]) }

  async function loadChannelModels() {
    if (disposed) return
    const version = ++requestVersion
    const channel = exclusionChannel.value
    unavailable.value = false
    modelsError.value = ''
    channelModels.value = []
    modelsLoading.value = false
    if (!catalogChannels.has(channel)) return
    modelsLoading.value = true
    try {
      const response = await fetchAPI(`/routing/model-definitions/${encodeURIComponent(channel)}`)
      if (version !== requestVersion) return
      const models = response && typeof response === 'object' && 'models' in response ? response.models : null
      if (!Array.isArray(models) || models.some(model => !model || typeof model.id !== 'string')) {
        throw new Error(t('config.models.invalidResponse'))
      }
      channelModels.value = models
    } catch (error: unknown) {
      if (version !== requestVersion) return
      const status = error && typeof error === 'object'
        ? ('statusCode' in error ? error.statusCode : 'status' in error ? error.status : undefined) : undefined
      if (status === 400 || status === 404) unavailable.value = true
      else modelsError.value = error instanceof Error ? error.message : t('config.models.loadFailed')
    } finally {
      if (version === requestVersion) modelsLoading.value = false
    }
  }

  watch(excludedForChannel, rules => {
    // Keep a trailing newline while typing, but reflect catalog toggles and reloads.
    if (JSON.stringify(parseExclusionRules(exclusionRulesText.value)) !== JSON.stringify(rules)) {
      exclusionRulesText.value = rules.join('\n')
    }
  }, { immediate: true, flush: 'sync' })
  watch(exclusionChannel, () => {
    exclusionRulesText.value = excludedForChannel.value.join('\n')
    modelSearch.value = ''
    void loadChannelModels()
  }, { flush: 'sync' })
  onScopeDispose(() => { disposed = true; requestVersion++ })
  return {
    exclusionChannel, modelSearch, modelsError, channelOptions, hasModelCatalog,
    excludedForChannel, filteredChannelModels, loadChannelModels, toggleExcluded,
    clearExcludedChannel, exclusionRulesText, updateExclusionRules,
  }
}
