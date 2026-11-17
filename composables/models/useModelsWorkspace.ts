import { computed, inject, nextTick, onMounted, onScopeDispose, provide, ref, watch, type InjectionKey } from 'vue'
import { useRoute, useRouter } from '#imports'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { mergeCatalogs, matchesCatalogFilter, normalizedModelId, type AccessSummary, type CatalogModel } from '~/composables/userModelCatalog'
import { useModelFormat } from '~/composables/models/useModelFormat'
import {
  capabilityOrder, catalogPageSize, errorMessage, isNotFound, noFilterValue, normalizedQueryValue, openingPrice,
  parseCapabilities, queryKeys, matchesPriceRange, supportsCapability, validQueryString, validSorts,
  type CapabilityFilter, type DetailsSection
} from '~/composables/models/catalog'

/**
 * Shared state for the user model catalog page (/app/models).
 *
 * The page calls `provideModelsWorkspace()` once; sections call `useModelsWorkspace()`.
 * Workspace refs must be created exactly once per page owner, so children never call
 * `useWorkspaceState` for these keys themselves.
 */
function createModelsWorkspace() {
  const route = useRoute()
  const router = useRouter()
  const { token, fetchAPI, loadCapabilities, capabilities } = useUserApi()
  const { t } = usePortalI18n()
  const { capabilityLabels } = useModelFormat()

  const publicCatalog = useWorkspaceState<CatalogModel[]>('user:models:public-catalog', () => [])
  const models = useWorkspaceState<CatalogModel[]>('user:models:models', () => [])
  const loading = useWorkspaceState('user:models:loading', () => false)
  const capabilityLoading = useWorkspaceState('user:models:capability-loading', () => true)
  const catalogReady = useWorkspaceState('user:models:catalog-ready', () => false)
  const catalogUnsupported = useWorkspaceState('user:models:catalog-unsupported', () => false)
  const error = useWorkspaceState('user:models:error', () => '')
  const capabilityError = useWorkspaceState('user:models:capability-error', () => '')
  const accessibleWarning = useWorkspaceState('user:models:accessible-warning', () => '')
  const access = useWorkspaceState<AccessSummary | null>('user:models:access', () => null)
  const accessLoaded = useWorkspaceState('user:models:access-loaded', () => false)
  const search = ref(validQueryString(route.query.q))
  const provider = ref(validQueryString(route.query.provider))
  const minPrice = ref(validQueryString(route.query.minPrice))
  const maxPrice = ref(validQueryString(route.query.maxPrice))
  const inputModality = ref(validQueryString(route.query.modality))
  const selectedCapabilities = ref<CapabilityFilter[]>(parseCapabilities(route.query.caps))
  const mineOnly = ref(Boolean(token.value) && route.query.mine !== 'false')
  const sortBy = ref(validSorts.has(validQueryString(route.query.sort)) ? validQueryString(route.query.sort) : 'name')
  const selectedModel = ref<CatalogModel | null>(null)
  const detailOpen = ref(false)
  const detailTrigger = ref<HTMLElement | null>(null)
  const detailsSection = ref<DetailsSection>(null)
  let loadGeneration = 0
  let disposed = false

  const providerOptions = computed(() => [{ label: t('models.filter.anyProvider'), value: noFilterValue }, ...Array.from(new Set(models.value.flatMap(model => model.providers || []))).sort().map(value => ({ label: value, value }))])
  const modalityOptions = computed(() => [{ label: t('models.filter.anyModality'), value: noFilterValue }, ...Array.from(new Set(models.value.flatMap(model => model.modalities?.input || []).filter(Boolean))).sort().map(value => ({ label: t('models.filter.accepts', { modality: value }), value }))])
  const filteredModels = computed(() => {
    const query = search.value.trim().toLowerCase()
    return models.value.filter(model =>
      matchesCatalogFilter(model, '', provider.value, mineOnly.value && accessLoaded.value) &&
      (!inputModality.value || model.modalities?.status === 'known' && model.modalities.input?.includes(inputModality.value)) &&
      matchesPriceRange(model, minPrice.value, maxPrice.value) &&
      selectedCapabilities.value.every(capability => supportsCapability(model, capability)) &&
      (!query || [model.id, model.display_name, model.description, ...(model.providers || []), ...capabilityLabels(model)].some(value => String(value || '').toLowerCase().includes(query)))
    ).sort((a, b) => {
      const name = (a.display_name || a.id).localeCompare(b.display_name || b.id)
      if (sortBy.value === 'name') return name
      const aPrice = openingPrice(a)
      const bPrice = openingPrice(b)
      if (aPrice == null && bPrice == null) return name
      if (aPrice == null) return 1
      if (bPrice == null) return -1
      return (sortBy.value === 'price-desc' ? bPrice - aPrice : aPrice - bPrice) || name
    })
  })

  const catalogPage = ref(1)
  const pagedModels = computed(() => filteredModels.value.slice((catalogPage.value - 1) * catalogPageSize, catalogPage.value * catalogPageSize))
  watch(filteredModels, () => { catalogPage.value = 1 }, { flush: 'sync' })

  watch(token, () => {
    loadGeneration++
    detailOpen.value = false
    selectedModel.value = null
    models.value = mergeCatalogs(publicCatalog.value, null)
    access.value = null
    accessLoaded.value = false
    accessibleWarning.value = ''
    mineOnly.value = Boolean(token.value) && route.query.mine !== 'false'
    void loadModels()
  })
  watch(() => route.query, applyRouteQuery)
  watch([search, provider, inputModality, selectedCapabilities, mineOnly, sortBy, minPrice, maxPrice], () => { void syncRouteQuery() }, { deep: true })
  watch(detailOpen, open => {
    if (!open && detailTrigger.value) {
      const trigger = detailTrigger.value
      detailTrigger.value = null
      void nextTick(() => trigger.focus())
    }
  })

  function applyRouteQuery() {
    const nextSearch = validQueryString(route.query.q)
    const nextModality = validQueryString(route.query.modality)
    const nextCapabilities = parseCapabilities(route.query.caps)
    const nextSort = validQueryString(route.query.sort)
    search.value = nextSearch
    provider.value = validQueryString(route.query.provider)
    minPrice.value = validQueryString(route.query.minPrice)
    maxPrice.value = validQueryString(route.query.maxPrice)
    inputModality.value = nextModality
    selectedCapabilities.value = nextCapabilities
    mineOnly.value = Boolean(token.value) && route.query.mine !== 'false'
    sortBy.value = validSorts.has(nextSort) ? nextSort : 'name'
  }
  async function syncRouteQuery() {
    const query = { ...route.query }
    for (const key of queryKeys) delete query[key]
    if (search.value) query.q = search.value
    if (provider.value) query.provider = provider.value
    if (minPrice.value) query.minPrice = minPrice.value
    if (maxPrice.value) query.maxPrice = maxPrice.value
    if (inputModality.value) query.modality = inputModality.value
    if (selectedCapabilities.value.length) query.caps = capabilityOrder.filter(item => selectedCapabilities.value.includes(item)).join(',')
    if (token.value && !mineOnly.value) query.mine = 'false'
    if (sortBy.value !== 'name') query.sort = sortBy.value
    const unchanged = queryKeys.every(key => normalizedQueryValue(route.query[key]) === normalizedQueryValue(query[key]))
    if (!unchanged) await router.replace({ query })
  }
  function validateCatalogFilters() {
    const modalities = new Set(models.value.flatMap(model => model.modalities?.input || []))
    if (inputModality.value && !modalities.has(inputModality.value)) inputModality.value = ''

  }
  function setCapability(capability: CapabilityFilter, enabled: boolean) {
    const selected = new Set(selectedCapabilities.value)
    if (enabled) selected.add(capability)
    else selected.delete(capability)
    selectedCapabilities.value = capabilityOrder.filter(item => selected.has(item))
  }
  async function refreshCatalog() {
    capabilityLoading.value = true
    capabilityError.value = ''
    const capabilityRequest = loadCapabilities().catch((cause: any) => {
      if (!isNotFound(cause)) capabilityError.value = cause?.message || t('models.error.capabilities')
    }).finally(() => { capabilityLoading.value = false })
    await capabilityRequest
    if (!disposed) await loadModels()
  }
  function clearCatalog() {
    catalogUnsupported.value = true
    publicCatalog.value = []
    models.value = []
    access.value = null
    accessLoaded.value = false
  }
  async function loadModels() {
    const generation = ++loadGeneration
    const tokenSnapshot = token.value
    loading.value = true
    catalogUnsupported.value = false
    error.value = ''
    accessibleWarning.value = ''
    if (capabilities.value && capabilities.value.model_catalog === false) {
      clearCatalog()
      loading.value = false
      catalogReady.value = true
      return
    }
    const publicRequest = fetchAPI<{ models?: CatalogModel[] }>('/models', { auth: false })
    const accessibleRequest = tokenSnapshot
      ? fetchAPI<{ models?: CatalogModel[]; access?: AccessSummary }>('/models/accessible', { auth: true })
      : Promise.resolve(null)
    const [publicResult, accessibleResult] = await Promise.allSettled([publicRequest, accessibleRequest])
    if (generation !== loadGeneration || tokenSnapshot !== token.value) return
    try {
      if (publicResult.status === 'rejected') {
        if (isNotFound(publicResult.reason)) clearCatalog()
        else error.value = errorMessage(publicResult.reason, t('models.error.loadModels'))
        return
      }
      const publicModels = Array.isArray(publicResult.value.models) ? publicResult.value.models : []
      publicCatalog.value = publicModels.map(model => ({ ...model }))
      if (!tokenSnapshot) {
        models.value = mergeCatalogs(publicCatalog.value, null)
        access.value = null
        accessLoaded.value = false
      } else if (accessibleResult.status === 'fulfilled' && accessibleResult.value) {
        const accessibleModels = Array.isArray(accessibleResult.value.models) ? accessibleResult.value.models : []
        models.value = mergeCatalogs(publicCatalog.value, accessibleModels)
        access.value = accessibleResult.value.access || null
        accessLoaded.value = true
      } else {
        models.value = mergeCatalogs(publicCatalog.value, null)
        access.value = null
        accessLoaded.value = false
        accessibleWarning.value = accessibleResult.status === 'rejected' ? errorMessage(accessibleResult.reason, t('models.error.keyAccess')) : t('models.error.keyAccess')
      }
      validateCatalogFilters()
      if (selectedModel.value) {
        selectedModel.value = models.value.find(model => normalizedModelId(model.id) === normalizedModelId(selectedModel.value?.id || '')) || null
        if (!selectedModel.value) detailOpen.value = false
      }
    } finally {
      if (generation === loadGeneration) {
        loading.value = false
        catalogReady.value = true
      }
    }
  }
  function openDetails(model: CatalogModel, event: MouseEvent, section: DetailsSection = null) {
    detailsSection.value = section
    detailTrigger.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
    selectedModel.value = model
    detailOpen.value = true
  }

  onScopeDispose(() => { disposed = true; loadGeneration++ })
  onMounted(() => {
    void syncRouteQuery()
    void refreshCatalog()
  })

  return {
    token, models, loading, catalogReady, catalogUnsupported, error, capabilityError, accessibleWarning, access, accessLoaded,
    search, provider, minPrice, maxPrice, inputModality, selectedCapabilities, mineOnly, sortBy, providerOptions, modalityOptions, setCapability,
    filteredModels, pagedModels, catalogPage, selectedModel, detailOpen, detailsSection, openDetails
  }
}

export type ModelsWorkspace = ReturnType<typeof createModelsWorkspace>

const modelsWorkspaceKey: InjectionKey<ModelsWorkspace> = Symbol('user-models-workspace')

export function provideModelsWorkspace(): ModelsWorkspace {
  const workspace = createModelsWorkspace()
  provide(modelsWorkspaceKey, workspace)
  return workspace
}

export function useModelsWorkspace(): ModelsWorkspace {
  const workspace = inject(modelsWorkspaceKey)
  if (!workspace) throw new Error('useModelsWorkspace() must be used inside the models page')
  return workspace
}
