import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { compareModelPrices, type PriceSort } from '~/composables/models/priceComparison'
import { groupModelPrices } from '~/composables/models/priceGroups'
import { isNotFound } from '~/composables/models/catalog'
import { matchesCatalogFilter, type CatalogModel } from '~/composables/userModelCatalog'

export function useModelPrices() {
  const { token, fetchAPI } = useUserApi()
  const { t } = usePortalI18n()
  const models = ref<CatalogModel[]>([])
  const search = ref('')
  const loading = ref(false)
  const error = ref('')
  const unsupported = ref(false)
  let generation = 0

  const provider = ref('')
  const providerGroups = computed(() => groupModelPrices(models.value))
  const providerOptions = computed(() => providerGroups.value.map(group => ({
    label: group.provider || t('models.status.unknown'), value: group.provider || '__unknown_provider__'
  })))
  const providerModels = computed(() => providerGroups.value
    .find(group => (group.provider || '__unknown_provider__') === provider.value)?.models || [])
  const sortBy = ref<PriceSort>('name')
  const descending = ref(false)
  function toggleSort(column: PriceSort) {
    descending.value = sortBy.value === column ? !descending.value : false
    sortBy.value = column
  }
  const visibleModels = computed(() => providerModels.value.filter(model => matchesCatalogFilter(model, search.value, '', true))
    .sort((a, b) => compareModelPrices(a, b, sortBy.value, descending.value)))
  watch([providerOptions, loading], ([options, pending]) => {
    if (!pending && !options.some(option => option.value === provider.value)) provider.value = options[0]?.value || ''
  })

  async function refresh() {
    const request = ++generation
    const session = token.value
    models.value = []
    error.value = ''
    unsupported.value = false
    loading.value = Boolean(session)
    if (!session) return
    try {
      const response = await fetchAPI<{ models?: CatalogModel[] }>('/models/accessible', { auth: true })
      if (request !== generation || session !== token.value) return
      models.value = Array.isArray(response.models) ? response.models.map(model => ({ ...model, accessible: true })) : []
    } catch (cause: any) {
      if (request !== generation || session !== token.value) return
      unsupported.value = isNotFound(cause)
      if (!unsupported.value) error.value = cause?.message || t('models.error.keyAccess')
    } finally {
      if (request === generation) loading.value = false
    }
  }

  watch(token, () => { void refresh() })
  onMounted(() => { void refresh() })
  onScopeDispose(() => { generation++ })
  return { models, provider, providerOptions, providerModels, visibleModels, sortBy, descending, toggleSort, search, loading, error, unsupported, refresh }
}
