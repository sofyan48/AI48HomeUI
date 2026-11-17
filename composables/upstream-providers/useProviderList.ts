import { computed, ref, watch } from 'vue'
import { errorMessage, type FetchAPI, type ProviderEntry, type ProviderRoute, type Translate } from './types'

type CategoryStats = Partial<Record<ProviderRoute, { total: number; active: number; disabled: number } | null>>
type StaticModel = { id?: string; name?: string }
type StaticModelsResponse = { models?: StaticModel[] | Record<string, StaticModel[]> }
type WorkspaceResponse = { providerResponse: unknown; providerRoute: ProviderRoute }
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
import { categoryLabel as labelFor, providerApiPath, providerCategories } from '~/composables/upstream-providers/categories'
import { entriesFromResponse } from '~/composables/upstream-providers/v8Groups'

// Category selection, provider list loading, category stats and model suggestions.
export function useProviderList({ t, fetchAPI, props }: { t: Translate; fetchAPI: FetchAPI; props: { syncRequest: number } }) {
  const rowValue = (row: ProviderEntry | { original: ProviderEntry }): ProviderEntry => (row?.original || row) as ProviderEntry
  const categoryLabel = (category?: { value: string } | null) => labelFor(t, category)

  const selectedProviderRoute = ref<ProviderRoute>(providerCategories[0]!.value)
  const providerSearch = ref('')
  const pageError = useWorkspaceState('admin:upstream-providers:pageError', () => (''))

  const providerColumns = computed(() => [
    { accessorKey: 'identity', header: t('upstream.providers.columnKey') },
    { accessorKey: 'endpoint', header: t('upstream.providers.baseUrl') },
    { accessorKey: 'prefix', header: t('upstream.providers.prefix') },
    { accessorKey: 'models', header: t('common.models') },
    { accessorKey: 'status', header: t('common.status') },
    { accessorKey: 'actions', header: t('common.actions'), meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
  ])

  const selectedProvider = computed(() => providerCategories.find(item => item.value === selectedProviderRoute.value) || providerCategories[0]!)
  const selectedProviderLabel = computed(() => categoryLabel(selectedProvider.value))
  const providerOptions = computed(() => providerCategories.map(item => ({ label: categoryLabel(item), value: item.value })))

  async function loadWorkspace(): Promise<WorkspaceResponse> {
    const providerRoute = selectedProviderRoute.value
    pageError.value = ''
    try {
      const providerResponse = await fetchAPI(providerApiPath(providerCategories.find(category => category.value === providerRoute)!))
      return { providerResponse, providerRoute }
    } catch (error) {
      pageError.value = errorMessage(error, t('upstream.providers.loadFailed'))
      return { providerResponse: null, providerRoute }
    }
  }

  const { data, pending, refresh: refreshWorkspace } = useStoreData('admin:upstream-providers:management-provider-credentials', loadWorkspace, { lazy: true, default: () => ({ providerResponse: null, providerRoute: selectedProviderRoute.value }), watch: [selectedProviderRoute] })
  async function loadCategoryStats(): Promise<CategoryStats> {
    const results = await Promise.all(providerCategories.map(async category => {
      try {
        const response = await fetchAPI(providerApiPath(category))
        const entries = entriesFromResponse(response, category)
        return [category.value, { total: entries.length, active: entries.filter(entry => !entry.disabled).length, disabled: entries.filter(entry => entry.disabled).length }]
      } catch { return [category.value, null] }
    }))
    return Object.fromEntries(results)
  }
  const { data: statsData, refresh: refreshCategoryStats } = useStoreData('admin:upstream-providers:management-provider-stats', loadCategoryStats, { lazy: true, default: () => ({}) })
  const { data: modelData } = useStoreData('admin:upstream-providers:management-provider-models', () => fetchAPI<StaticModelsResponse>('/models?scope=static').catch(() => ({ models: {} })), { lazy: true, default: () => ({ models: {} }) })
  watch(() => props.syncRequest, () => { void refreshWorkspace(); void refreshCategoryStats() })

  const modelSuggestions = computed(() => {
    const source = modelData.value?.models
    const models = Array.isArray(source) ? source : source && typeof source === 'object' ? Object.values(source).flat() : []
    return [...new Set(models.flatMap(model => [model?.id, model?.name]).filter((value): value is string => Boolean(value)))].sort()
  })

  const categoryStats = computed(() => statsData.value || {})
  const providerEntries = computed(() => data.value?.providerRoute === selectedProviderRoute.value
    ? entriesFromResponse(data.value.providerResponse, selectedProvider.value)
    : [])

  const filteredProviderEntries = computed(() => {
    const query = providerSearch.value.trim().toLowerCase()
    if (!query) return providerEntries.value
    return providerEntries.value.filter(entry => [entry.name, entry.prefix, entry.id, entry.uuid, entry.auth_index, entry['base-url'], ...(Array.isArray(entry.models) ? entry.models.flatMap(model => [model.name, model.alias]) : [])]
      .some(value => String(value || '').toLowerCase().includes(query)))
  })

  function providerEntryLabel(entry?: ProviderEntry | null) {
    return entry?.name || entry?.identifier || entry?.auth_index || entry?.id || t('upstream.providers.entryLabel', { provider: selectedProviderLabel.value })
  }

  function safeEndpoint(value?: string) {
    if (!value) return t('upstream.providers.defaultEndpoint')
    try {
      const url = new URL(value)
      return `${url.origin}${url.pathname.replace(/\/$/, '')}`
    } catch {
      return t('upstream.providers.customEndpoint')
    }
  }

  return {
    providerCategories, rowValue, categoryLabel, selectedProviderRoute, providerSearch, pageError, providerColumns,
    selectedProvider, selectedProviderLabel, providerOptions, pending, refreshWorkspace, refreshCategoryStats,
    modelSuggestions, categoryStats, providerEntries, filteredProviderEntries, providerEntryLabel, safeEndpoint
  }
}
