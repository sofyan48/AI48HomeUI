import { computed, ref } from 'vue'
import { automaticTestModel, cloneValue, unsetCloakMode } from '~/composables/upstream-providers/categories'

// Editor form refs, select options and per-category capability flags. Transient, component-local state.
export function useProviderEditorState({ t, selectedProviderRoute }) {
  const providerEditorOpen = ref(false)
  const providerEditorMode = ref('create')
  const editingProviderEntry = ref(null)
  const editingProviderIndex = ref(-1)
  const providerForm = ref({})
  const excludedModelsText = ref('')
  const headerRows = ref([{ name: '', value: '' }])
  const providerKey = ref('')
  const compatKeyRows = ref([])
  let compatKeyRowId = 0
  function addCompatKey(source = {}) {
    compatKeyRows.value.push({ rowId: ++compatKeyRowId, source: cloneValue(source), secret: '', proxy: source['proxy-url'] || '', weight: source.weight ?? '' })
  }
  const isCompat = computed(() => selectedProviderRoute.value === 'openai-compatibility')
  const primaryProviderKey = computed(() => isCompat.value ? compatKeyRows.value[0]?.secret.trim() || '' : providerKey.value.trim())
  const cloakMode = ref(unsetCloakMode)
  const cloakStrictMode = ref(false)
  const cloakSensitiveWordsText = ref('')
  const cloakSensitiveWordsReplaceText = ref('')
  const cloakSensitivePatternsReplaceText = ref('')
  const cloakCacheUserID = ref('inherit')
  // Per-key connection pool override: inherit keeps the group policy, enabled writes a pool block, disabled writes enabled: false.
  const connectionPoolMode = ref('inherit')
  const connectionPoolIdleTimeout = ref('')
  const connectionPoolMaxIdle = ref('')
  const connectionPoolOptions = computed(() => [{ label: t('upstream.providers.poolInherit'), value: 'inherit' }, { label: t('upstream.providers.poolEnabled'), value: 'enabled' }, { label: t('upstream.providers.poolDisabled'), value: 'disabled' }])
  const vertexInteractions = ref('inherit')
  const triStateOptions = computed(() => [{ label: t('upstream.providers.triInherit'), value: 'inherit' }, { label: t('upstream.providers.triTrue'), value: 'true' }, { label: t('upstream.providers.triFalse'), value: 'false' }])
  const cloakModeOptions = computed(() => [{ label: t('upstream.providers.cloakNotSet'), value: unsetCloakMode }, { label: t('upstream.providers.cloakAuto'), value: 'auto' }, { label: t('upstream.providers.cloakAlways'), value: 'always' }, { label: t('upstream.providers.cloakNever'), value: 'never' }])
  const cloakCacheOptions = computed(() => [{ label: t('upstream.providers.cacheDefault'), value: 'inherit' }, { label: t('upstream.providers.cachePerKey'), value: 'enabled' }, { label: t('upstream.providers.cachePerRequest'), value: 'disabled' }])
  const requestRetryText = ref('')
  const coolingPolicy = ref('inherit')
  const coolingPolicyOptions = computed(() => [{ label: t('upstream.providers.coolingInherit'), value: 'inherit' }, { label: t('upstream.providers.coolingDisable'), value: 'disabled' }, { label: t('upstream.providers.coolingEnable'), value: 'enabled' }])
  const codexCloakingPolicy = ref('inherit')
  const codexCloakingOptions = computed(() => [{ label: t('upstream.providers.codexUnset'), value: 'inherit' }, { label: t('upstream.providers.codexDisable'), value: 'disabled' }, { label: t('upstream.providers.codexUse'), value: 'enabled' }])
  const requestScopedErrorsText = ref('')
  const supportsRequestScopedErrors = computed(() => selectedProviderRoute.value !== 'vertex-api-key')
  const supportsContextLimit = computed(() => selectedProviderRoute.value !== 'vertex-api-key')

  const supportsWebsockets = computed(() => ['codex-api-key', 'xai-api-key'].includes(selectedProviderRoute.value))
  const supportsTest = computed(() => ['claude-api-key', 'openai-compatibility'].includes(selectedProviderRoute.value))
  const testModel = ref(automaticTestModel)
  const testModelOptions = computed(() => [{ label: t('upstream.providers.testAuto'), value: automaticTestModel }, ...providerForm.value.models.filter(model => String(model.name || '').trim()).map(model => ({ label: model.alias?.trim() ? `${model.name} · ${model.alias}` : model.name, value: model.name }))])
  const supportsModelMapping = computed(() => true)
  const requiresBaseURL = computed(() => ['codex-api-key', 'xai-api-key', 'openai-compatibility'].includes(selectedProviderRoute.value))
  const supportsDiscovery = computed(() => ['gemini-api-key', 'interactions-api-key', 'claude-api-key', 'codex-api-key', 'meta-api-key', 'openai-compatibility'].includes(selectedProviderRoute.value))
  const editorError = ref('')

  function addProviderModel() { providerForm.value.models.push({ name: '', alias: '' }) }
  function removeProviderModel(index) { providerForm.value.models.splice(index, 1) }

  return {
    providerEditorOpen, providerEditorMode, editingProviderEntry, editingProviderIndex, providerForm, excludedModelsText,
    headerRows, providerKey, compatKeyRows, addCompatKey, isCompat, primaryProviderKey,
    cloakMode, cloakStrictMode, cloakSensitiveWordsText, cloakSensitiveWordsReplaceText, cloakSensitivePatternsReplaceText, cloakCacheUserID,
    connectionPoolMode, connectionPoolIdleTimeout, connectionPoolMaxIdle, connectionPoolOptions, vertexInteractions, triStateOptions,
    cloakModeOptions, cloakCacheOptions, requestRetryText, coolingPolicy, coolingPolicyOptions, codexCloakingPolicy, codexCloakingOptions,
    requestScopedErrorsText, supportsRequestScopedErrors, supportsContextLimit, supportsWebsockets, supportsTest, testModel, testModelOptions,
    supportsModelMapping, requiresBaseURL, supportsDiscovery, editorError, addProviderModel, removeProviderModel
  }
}
