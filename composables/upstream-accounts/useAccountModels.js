import { computed, ref } from 'vue'
import { credentialModelCards, normalizeCredentialModels } from '~/composables/credentialModelCards'

// Models tab: registered models joined with runtime model states into one card per exposed ID.
export function useAccountModels(ctx) {
  const { t, fetchAPI, message, unavailable, credentialRoute, currentGeneration, ownsDetails } = ctx
  const modelsError = ref('')
  const modelsLoading = ref(false)
  const credentialModels = ref([])
  const modelStates = ref(null)
  const modelStatesNotice = ref('')
  const modelCards = computed(() => credentialModelCards(credentialModels.value, modelStates.value?.credential?.models || []))
  const modelScope = ref('all')
  const modelScopeOptions = computed(() => [{ label: t('cred.models.scopeAll'), value: 'all' }, { label: t('cred.models.scopeRegistered'), value: 'registered' }, { label: t('cred.models.scopeHistory'), value: 'history' }])
  const scopedModelCards = computed(() => {
    const registered = new Set(credentialModels.value.map(model => model.id))
    return modelCards.value.filter(model => modelScope.value === 'all' || (modelScope.value === 'registered' ? registered.has(model.id) : !registered.has(model.id)))
  })
  let modelsRequest = 0
  function cancelModelsRequest() { modelsRequest++ }

  async function loadModels(item, refresh = false) {
    if (!item?.id || modelsLoading.value) return
    const generation = currentGeneration()
    const requestID = ++modelsRequest
    const current = () => requestID === modelsRequest && ownsDetails(item.id, generation)
    modelsLoading.value = true; modelsError.value = ''; modelStatesNotice.value = ''
    credentialModels.value = []; modelStates.value = null
    try {
      const [models, states] = await Promise.all([
        fetchAPI(credentialRoute('/models'), { query: { name: item.id }, refresh }),
        fetchAPI(`/credentials/${encodeURIComponent(item.id)}/model-states`).catch(async error => {
          if (error?.statusCode === 404) {
            try {
              const result = await fetchAPI('/credentials/model-states', { query: { credential_id: item.id } })
              return { ...result, credential: (result.credentials || []).find(entry => entry.credential_id === item.id) }
            } catch (fallbackError) {
              if (current()) modelStatesNotice.value = unavailable(fallbackError) ? t('cred.err.modelStatesUnavailable') : message(fallbackError)
              return null
            }
          }
          if (current()) modelStatesNotice.value = unavailable(error) ? t('cred.err.modelStatesUnavailable') : message(error)
          return null
        })
      ])
      if (!current()) return
      credentialModels.value = normalizeCredentialModels(models.models)
      modelStates.value = states
      if (states && !states.credential) modelStatesNotice.value = t('cred.err.noRuntimeState')
    } catch (error) { if (current()) modelsError.value = message(error) }
    finally { if (requestID === modelsRequest) modelsLoading.value = false }
  }

  return {
    modelsError, modelsLoading, credentialModels, modelStates, modelStatesNotice, modelScope, modelScopeOptions,
    scopedModelCards, cancelModelsRequest, loadModels
  }
}
