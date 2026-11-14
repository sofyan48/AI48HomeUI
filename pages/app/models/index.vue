<template>
  <div class="model-workspace min-w-0 space-y-5">

    <UAlert v-if="catalogUnsupported" color="warning" variant="subtle" :title="t('models.unsupportedTitle')" :description="t('models.unsupportedDescription')" />

    <template v-else>
      <UAlert v-if="capabilityError" color="warning" variant="subtle" :title="t('models.capabilityErrorTitle')" :description="t('models.capabilityErrorDescription', { error: capabilityError })" />
      <UAlert v-if="error" color="error" variant="subtle" :title="t('models.loadErrorTitle')" :description="error" />
      <UAlert v-if="accessibleWarning" color="warning" variant="subtle" :title="t('models.accessWarningTitle')" :description="t('models.accessWarningDescription', { warning: accessibleWarning })" />

      <UAlert v-if="token && accessLoaded && access?.reason === 'no_api_keys'" color="warning" variant="subtle" :title="t('models.noKeysTitle')" :description="t('models.noKeysDescription')" />
      <UAlert v-else-if="token && accessLoaded && access?.restricted" color="info" variant="subtle" :title="t('models.restrictedTitle')" :description="t('models.restrictedDescription', { count: access.api_key_count })" />

      <AppCard class="catalog-panel catalog-filters" :ui="{ body: 'space-y-4' }">

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <UFormField :label="t('models.filter.search')" class="sm:col-span-2 lg:col-span-1">
            <UInput v-model="search" :aria-label="t('models.filter.searchAria')" icon="i-tabler-search" :placeholder="t('models.filter.searchPlaceholder')" size="lg" class="w-full" />
          </UFormField>
          <UFormField :label="t('models.filter.provider')">
            <USelect :model-value="provider || noFilterValue" @update:model-value="provider = $event === noFilterValue ? '' : String($event)" :aria-label="t('models.filter.provider')" :items="providerOptions" value-key="value" label-key="label" size="lg" class="w-full" />
          </UFormField>
          <UFormField :label="t('models.filter.modality')">
            <USelect :model-value="inputModality || noFilterValue" @update:model-value="inputModality = $event === noFilterValue ? '' : String($event)" :aria-label="t('models.filter.modality')" :items="modalityOptions" value-key="value" label-key="label" size="lg" class="w-full" />
          </UFormField>
          <UFormField :label="t('models.filter.sortBy')"><USelect v-model="sortBy" :aria-label="t('models.filter.sortAria')" :items="sortOptions" value-key="value" label-key="label" size="lg" class="w-full" /></UFormField>
        </div>

      <fieldset class="catalog-capabilities flex flex-wrap items-center gap-2">
        <legend class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('models.filter.features') }}</legend>
        <AppButton v-for="option in capabilityOptions" :key="option.value" type="button" size="sm" class="rounded-full" :color="selectedCapabilities.includes(option.value) ? 'primary' : 'neutral'" :variant="selectedCapabilities.includes(option.value) ? 'soft' : 'ghost'" :icon="selectedCapabilities.includes(option.value) ? 'i-tabler-check' : undefined" :aria-pressed="selectedCapabilities.includes(option.value)" @click="setCapability(option.value, !selectedCapabilities.includes(option.value))">{{ option.label }}</AppButton>
      </fieldset>
      <UCheckbox v-if="token" v-model="mineOnly" :label="t('models.filter.mineOnly')" :disabled="!accessLoaded" />

      <p class="text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('models.filter.note') }}</p>
      </AppCard>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-sm font-semibold"><UIcon name="i-tabler-grid-dots" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('models.explore') }}</h2>
        <span class="rounded-full bg-[var(--ui-bg-muted)] px-3 py-1 text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('models.countSummary', { shown: filteredModels.length, total: models.length }) }}</span>
      </div>

      <div v-if="(loading || !catalogReady) && !models.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <USkeleton v-for="index in 12" :key="index" class="h-52 rounded-xl" />
      </div>
      <div v-else class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AppCard v-for="model in pagedModels" :key="model.id" class="catalog-panel catalog-model min-w-0" :ui="{ body: 'flex h-full flex-col p-5 sm:p-6' }">
          <div class="flex items-start justify-between gap-2">
            <div class="catalog-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
              <UIcon :name="modelLogoIcon(model)" class="size-6" aria-hidden="true" />
            </div>
            <UBadge v-if="model.accessible === true" color="success" variant="subtle" size="sm">{{ t('models.badge.included') }}</UBadge>
            <UBadge v-else-if="model.accessible === false" color="neutral" variant="subtle" size="sm">{{ t('models.badge.notIncluded') }}</UBadge>
          </div>
          <div class="mt-3 min-w-0">
            <AppButton color="neutral" variant="link" class="max-w-full justify-start whitespace-normal text-left" aria-haspopup="dialog" @click="openDetails(model, $event)">{{ model.display_name || model.id }}</AppButton>
            <p v-if="model.providers?.length" class="mt-1 break-words text-xs text-[var(--ui-text-muted)]">{{ t('models.servingProvidersLabel') }} <span class="font-mono">{{ model.providers.join(' · ') }}</span></p>
            <div class="mt-0.5 flex min-w-0 items-center gap-0.5">
              <code class="truncate text-xs text-[var(--ui-text-muted)]" :title="model.id">{{ model.id }}</code>
              <AppButton color="neutral" variant="ghost" size="xs" icon="i-tabler-copy" :aria-label="t('models.copyModelIdAria', { id: model.id })" @click.stop="copyModelId(model.id)" />
            </div>
          </div>
          <div v-if="capabilityLabels(model).length" class="mt-3 flex flex-wrap gap-1.5">
            <UBadge v-for="label in capabilityLabels(model)" :key="label" color="neutral" variant="soft" size="sm" class="rounded-full">{{ label }}</UBadge>
          </div>
          <div class="catalog-price mt-auto flex items-center justify-between gap-3 pt-4">
            <div class="min-w-0 space-y-1">
              <template v-if="pricingEntryPoint(model.pricing)">
                <p class="text-sm font-medium leading-6">{{ t('models.price.from', { input: price(pricingEntryPoint(model.pricing)?.input), output: price(pricingEntryPoint(model.pricing)?.output) }) }}</p>
                <UBadge v-if="(pricingEntryPoint(model.pricing)?.maxRungCount || 0) > 1" color="info" variant="subtle" size="sm">{{ t('models.price.tiered', { count: pricingEntryPoint(model.pricing)?.maxRungCount }) }}</UBadge>
                <p v-if="pricingEntryPoint(model.pricing)?.hasFormula" class="text-xs text-[var(--ui-text-muted)]">{{ t('models.price.formula') }}</p>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.price.openingNote') }}</p>
                <AppButton color="primary" variant="link" size="sm" icon="i-tabler-receipt" @click="openDetails(model, $event, 'pricing')">{{ t('models.price.complete') }}<span v-if="pricingEntryPoint(model.pricing)?.toolPrices.length"> · {{ t('models.price.toolRates', { count: pricingEntryPoint(model.pricing)?.toolPrices.length }) }}</span></AppButton>
              </template>
              <p v-else class="text-sm leading-6 text-[var(--ui-text-muted)]">{{ pricingText(model) }}</p>
            </div>
            <AppButton color="primary" variant="ghost" size="sm" class="shrink-0 rounded-full" trailing-icon="i-tabler-arrow-right" :aria-label="t('models.detailsAria', { name: model.display_name || model.id })" @click="openDetails(model, $event)">{{ t('models.details') }}</AppButton>
          </div>
        </AppCard>
      </div>
      <div v-if="filteredModels.length" class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.showing', { from: (catalogPage - 1) * catalogPageSize + 1, to: Math.min(catalogPage * catalogPageSize, filteredModels.length), total: filteredModels.length }) }}</p>
        <UPagination v-if="filteredModels.length > catalogPageSize" v-model:page="catalogPage" :total="filteredModels.length" :items-per-page="catalogPageSize" :sibling-count="1" size="sm" />
      </div>
      <div v-if="catalogReady && !loading && !error && !filteredModels.length" class="rounded-2xl border border-dashed border-[var(--ui-border)] py-16 text-center text-sm text-[var(--ui-text-muted)]">{{ models.length ? t('models.emptyFiltered') : t('models.emptyNone') }}</div>
    </template>

    <USlideover v-model:open="detailOpen" @after:enter="focusPricing" :title="selectedModel?.display_name || selectedModel?.id || t('models.detailTitle')" :description="selectedModel?.id" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div v-if="selectedModel" class="catalog-details space-y-5 text-sm">
          <div class="flex items-center gap-3">
            <div class="catalog-icon flex size-12 shrink-0 items-center justify-center rounded-xl">
              <UIcon :name="modelLogoIcon(selectedModel)" class="size-7" aria-hidden="true" />
            </div>
            <div class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2">
              <code class="min-w-0 flex-1 break-all text-xs">{{ selectedModel.id }}</code>
              <AppButton color="neutral" variant="outline" size="xs" icon="i-tabler-copy" @click="copyModelId(selectedModel.id)">{{ t('models.copyId') }}</AppButton>
            </div>
          </div>
          <div v-if="capabilityLabels(selectedModel).length" class="flex flex-wrap gap-2"><UBadge v-for="label in capabilityLabels(selectedModel)" :key="label" color="primary" variant="subtle" class="rounded-full">{{ label }}</UBadge></div>
          <p class="leading-relaxed text-[var(--ui-text-muted)]">{{ selectedModel.description || t('models.noDescription') }}</p>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div v-for="item in modelFacts(selectedModel)" :key="item.label" class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-3"><dt class="text-xs text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words font-medium">{{ item.value }}</dd></div>
          </dl>

          <section v-if="selectedModel.provider_limits?.length" class="space-y-3">
            <h3 class="font-semibold">{{ t('models.providerLimits') }}</h3>
            <div v-for="(limit, index) in selectedModel.provider_limits" :key="`${limit.provider}:${index}`" class="rounded-lg border border-[var(--ui-border)] p-3">
              <p class="break-words font-medium">{{ limit.provider }}</p>
              <dl class="mt-2 grid gap-3 sm:grid-cols-2">
                <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('models.contextTokens') }}</dt><dd class="font-mono tabular-nums">{{ providerLimit(limit.context_length) }}</dd></div>
                <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('models.maxOutputTokens') }}</dt><dd class="font-mono tabular-nums">{{ providerLimit(limit.max_output_tokens) }}</dd></div>
              </dl>
            </div>
          </section>

          <section><h3 class="font-semibold">{{ t('models.modalities') }}</h3><p class="mt-1">{{ t('models.modalityInput', { value: modalityText(selectedModel, 'input') }) }}</p><p>{{ t('models.modalityOutput', { value: modalityText(selectedModel, 'output') }) }}</p></section>
          <section class="space-y-1"><h3 class="font-semibold">{{ t('models.capabilities') }}</h3>
            <p>{{ t('models.cap.reasoning', { value: capabilityText(selectedModel.capabilities?.reasoning?.status) }) }}</p>
            <p v-if="selectedModel.capabilities?.reasoning?.levels?.length">{{ t('models.cap.levels', { value: selectedModel.capabilities.reasoning.levels.join(', ') }) }}</p>
            <p v-if="selectedModel.capabilities?.reasoning?.budget && Object.keys(selectedModel.capabilities.reasoning.budget).length">{{ t('models.cap.thinkingBudget', { value: budgetText(selectedModel.capabilities.reasoning.budget) }) }}</p>
            <p>{{ t('models.cap.toolCalling', { value: capabilityText(selectedModel.capabilities?.tool_calling?.status) }) }}</p>
            <p>{{ t('models.cap.structuredOutput', { value: capabilityText(selectedModel.capabilities?.structured_output?.status) }) }}</p>
            <p>{{ t('models.cap.parameters', { value: selectedModel.capabilities?.parameters?.length ? selectedModel.capabilities.parameters.join(', ') : t('models.status.notPublished') }) }}</p>
            <p>{{ t('models.cap.generationMethods', { value: selectedModel.capabilities?.generation_methods?.length ? selectedModel.capabilities.generation_methods.join(', ') : t('models.status.notPublished') }) }}</p>
          </section>
          <section v-if="selectedModel.availability" class="space-y-1"><h3 class="font-semibold">{{ t('models.availability.title') }}</h3>
            <p>{{ availabilityLabel(selectedModel) }} · {{ t('models.availability.samples', { count: selectedModel.availability.sample_count }) }}{{ selectedModel.availability.window ? ` ${t('models.availability.window', { min: selectedModel.availability.window.min_samples, hours: selectedModel.availability.window.hours })}` : '' }}</p>
            <template v-if="selectedModel.availability.status === 'observed'">
              <p>{{ t('models.availability.successesFailures', { successes: selectedModel.availability.success_count ?? t('models.status.notPublished'), failures: selectedModel.availability.failed_count ?? t('models.status.notPublished') }) }}</p>
              <p>{{ t('models.availability.latency', { latency: duration(selectedModel.availability.avg_latency_ms), ttft: duration(selectedModel.availability.avg_ttft_ms) }) }}</p>
              <p>{{ t('models.availability.throughput', { value: selectedModel.availability.output_tokens_per_second == null ? t('models.status.notPublished') : t('models.availability.tokensPerSecond', { value: selectedModel.availability.output_tokens_per_second }) }) }}</p>
            </template>
            <p v-if="selectedModel.availability.window">{{ t('models.availability.windowRange', { from: dateText(selectedModel.availability.window.from), to: dateText(selectedModel.availability.window.to) }) }}</p>
            <p>{{ t('models.availability.lastObserved', { value: dateText(selectedModel.availability.last_observed_at) }) }}</p>
          </section>
          <section class="space-y-3" aria-labelledby="model-pricing-heading">
            <h3 id="model-pricing-heading" ref="pricingHeading" tabindex="-1" class="font-semibold">{{ t('models.pricing.title') }}</h3>
            <template v-if="selectedModel.pricing?.status === 'published' && selectedModel.pricing.providers?.length">
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.pricing.noteRungs') }}</p>
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.pricing.noteFormula') }}</p>
              <div v-for="offer in selectedModel.pricing.providers" :key="offer.provider" class="min-w-0 space-y-3">
                <h4 class="break-all font-mono font-semibold">{{ offer.provider }}</h4>
                <div v-for="tier in offer.tiers" :key="tier.service_tier" class="min-w-0 space-y-2">
                  <p class="flex flex-wrap items-center gap-2">{{ t('models.pricing.serviceTier') }} <code>{{ tier.service_tier }}</code><UBadge v-if="tier.is_default" color="neutral" variant="subtle" size="sm">{{ t('models.pricing.default') }}</UBadge></p>
                  <p v-if="!tier.rungs.length" class="text-[var(--ui-text-muted)]">{{ t('models.pricing.noRungs') }}</p>
                  <div v-for="(rung, rungIndex) in tier.rungs" :key="`${rung.min_input_tokens}:${rungIndex}`" class="min-w-0 rounded-lg border border-[var(--ui-border)] p-3">
                    <p class="mb-3 text-xs font-medium">{{ rung.min_input_tokens > 0 ? t('models.pricing.fromInputTokens', { count: rung.min_input_tokens.toLocaleString(intlLocale) }) : t('models.pricing.baseRung') }}</p>
                    <dl class="grid grid-cols-2 gap-3">
                      <div v-for="component in rungPriceComponents(rung)" :key="component.label" class="min-w-0">
                        <dt class="text-xs text-[var(--ui-text-muted)]">{{ componentLabel(component.label) }}</dt>
                        <dd class="break-words tabular-nums">{{ price(component.value) }} <span class="text-xs text-[var(--ui-text-muted)]">{{ unitLabel(component.unit) }}</span></dd>
                      </div>
                    </dl>
                    <div v-if="rung.pricing_expr" class="mt-3 min-w-0 border-t border-[var(--ui-border)] pt-2">
                      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.pricing.formulaNote') }}</p>
                      <div role="region" :aria-label="t('models.pricing.formulaAria')" tabindex="0" class="mt-1 max-w-full overflow-x-auto"><code class="block w-max whitespace-pre text-xs">{{ rung.pricing_expr }}</code></div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <p v-else>{{ pricingText(selectedModel) }}</p>
          </section>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { mergeCatalogs, matchesCatalogFilter, normalizedModelId, pricingEntryPoint, pricingMessageKind, rungPriceComponents, formatCatalogPrice } from '~/composables/userModelCatalog'
import type { CatalogModel, AccessSummary } from '~/composables/userModelCatalog'
import type { PortalMessageKey } from '~/locales/portal'
definePageMeta({ layout: 'app' })
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { token, fetchAPI, loadCapabilities, capabilities } = useUserApi()
const { t, intlLocale } = usePortalI18n()
type CapabilityFilter = 'tools' | 'structuredOutput' | 'reasoning'

const capabilityOrder: CapabilityFilter[] = ['tools', 'structuredOutput', 'reasoning']
const validSorts = new Set(['name', 'price-asc', 'price-desc'])
const queryKeys = ['q', 'provider', 'modality', 'caps', 'mine', 'sort'] as const
const noFilterValue = '__no_filter__'
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

const inputModality = ref(validQueryString(route.query.modality))
const selectedCapabilities = ref<CapabilityFilter[]>(parseCapabilities(route.query.caps))
const mineOnly = ref(route.query.mine === 'true')
const sortBy = ref(validSorts.has(validQueryString(route.query.sort)) ? validQueryString(route.query.sort) : 'name')
const selectedModel = ref<CatalogModel | null>(null)
const detailOpen = ref(false)
const detailTrigger = ref<HTMLElement | null>(null)
const pricingHeading = ref<HTMLElement | null>(null)
const detailsSection = ref<'pricing' | null>(null)
let loadGeneration = 0
let disposed = false
const capabilityOptions = computed<{ label: string; value: CapabilityFilter }[]>(() => [{ label: t('models.capability.tools'), value: 'tools' }, { label: t('models.capability.structuredOutput'), value: 'structuredOutput' }, { label: t('models.capability.reasoning'), value: 'reasoning' }])
const sortOptions = computed(() => [{ label: t('models.sort.name'), value: 'name' }, { label: t('models.sort.priceAsc'), value: 'price-asc' }, { label: t('models.sort.priceDesc'), value: 'price-desc' }])

const providerOptions = computed(() => [{ label: t('models.filter.anyProvider'), value: noFilterValue }, ...Array.from(new Set(models.value.flatMap(model => model.providers || []))).sort().map(value => ({ label: value, value }))])
const modalityOptions = computed(() => [{ label: t('models.filter.anyModality'), value: noFilterValue }, ...Array.from(new Set(models.value.flatMap(model => model.modalities?.input || []).filter(Boolean))).sort().map(value => ({ label: t('models.filter.accepts', { modality: value }), value }))])
const filteredModels = computed(() => {
  const query = search.value.trim().toLowerCase()
  return models.value.filter(model =>
    matchesCatalogFilter(model, '', provider.value, mineOnly.value && accessLoaded.value) &&
    (!inputModality.value || model.modalities?.status === 'known' && model.modalities.input?.includes(inputModality.value)) &&
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

const catalogPageSize = 24
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
  if (!token.value) mineOnly.value = false
  void loadModels()
})
watch(() => route.query, applyRouteQuery)
watch([search, provider, inputModality, selectedCapabilities, mineOnly, sortBy], () => { void syncRouteQuery() }, { deep: true })
watch(detailOpen, open => {
  if (!open && detailTrigger.value) {
    const trigger = detailTrigger.value
    detailTrigger.value = null
    void nextTick(() => trigger.focus())
  }
})

function validQueryString(value: unknown) { return typeof value === 'string' && value.length <= 200 ? value : '' }
function parseCapabilities(value: unknown) {
  if (typeof value !== 'string') return []
  const requested = new Set(value.split(','))
  return capabilityOrder.filter(capability => requested.has(capability))
}
function applyRouteQuery() {
  const nextSearch = validQueryString(route.query.q)

  const nextModality = validQueryString(route.query.modality)
  const nextCapabilities = parseCapabilities(route.query.caps)
  const nextSort = validQueryString(route.query.sort)
  search.value = nextSearch
  provider.value = validQueryString(route.query.provider)

  inputModality.value = nextModality
  selectedCapabilities.value = nextCapabilities
  mineOnly.value = Boolean(token.value) && route.query.mine === 'true'
  sortBy.value = validSorts.has(nextSort) ? nextSort : 'name'
}
async function syncRouteQuery() {
  const query = { ...route.query }
  for (const key of queryKeys) delete query[key]
  if (search.value) query.q = search.value
  if (provider.value) query.provider = provider.value

  if (inputModality.value) query.modality = inputModality.value
  if (selectedCapabilities.value.length) query.caps = capabilityOrder.filter(item => selectedCapabilities.value.includes(item)).join(',')
  if (token.value && mineOnly.value) query.mine = 'true'
  if (sortBy.value !== 'name') query.sort = sortBy.value
  const unchanged = queryKeys.every(key => normalizedQueryValue(route.query[key]) === normalizedQueryValue(query[key]))
  if (!unchanged) await router.replace({ query })
}
function normalizedQueryValue(value: unknown) { return typeof value === 'string' ? value : '' }
function validateCatalogFilters() {
  const modalities = new Set(models.value.flatMap(model => model.modalities?.input || []))
  if (inputModality.value && !modalities.has(inputModality.value)) inputModality.value = ''
  if (provider.value && !models.value.some(model => model.providers?.includes(provider.value))) provider.value = ''
}
function setCapability(capability: CapabilityFilter, enabled: boolean) {
  const selected = new Set(selectedCapabilities.value)
  if (enabled) selected.add(capability)
  else selected.delete(capability)
  selectedCapabilities.value = capabilityOrder.filter(item => selected.has(item))
}
function supportsCapability(model: CatalogModel, capability: CapabilityFilter) {
  if (capability === 'tools') return model.capabilities?.tool_calling?.status === 'supported'
  if (capability === 'structuredOutput') return model.capabilities?.structured_output?.status === 'supported'
  return model.capabilities?.reasoning?.status === 'supported'
}
function modelLogoIcon(model: CatalogModel) {
  const identity = [model.id, model.display_name].join(' ').toLowerCase()
  if (/claude|anthropic/.test(identity)) return 'i-tabler-sparkles'
  if (/gemini|gemma|google|vertex|palm/.test(identity)) return 'i-tabler-brand-google'
  if (/gpt|openai|o1|o3|o4|codex/.test(identity)) return 'i-tabler-brand-openai'
  if (/grok|xai/.test(identity)) return 'i-tabler-brand-x'
  if (/llama|meta/.test(identity)) return 'i-tabler-brand-meta'
  if (/mistral|mixtral/.test(identity)) return 'i-tabler-wind'
  if (/deepseek/.test(identity)) return 'i-tabler-fish'
  if (/qwen|qwq|alibaba/.test(identity)) return 'i-tabler-cloud-computing'
  if (/kimi|moonshot/.test(identity)) return 'i-tabler-moon-stars'
  if (/cohere|command-r/.test(identity)) return 'i-tabler-affiliate'
  if (/amazon|nova|titan/.test(identity)) return 'i-tabler-brand-amazon'
  if (/microsoft|phi-/.test(identity)) return 'i-tabler-brand-windows'
  if (/perplexity|sonar/.test(identity)) return 'i-tabler-search'
  return 'i-tabler-robot'
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
async function loadModels() {
  const generation = ++loadGeneration
  const tokenSnapshot = token.value
  loading.value = true
  catalogUnsupported.value = false
  error.value = ''
  accessibleWarning.value = ''
  if (capabilities.value && capabilities.value.model_catalog === false) {
    catalogUnsupported.value = true
    publicCatalog.value = []
    models.value = []
    access.value = null
    accessLoaded.value = false
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
      if (isNotFound(publicResult.reason)) {
        catalogUnsupported.value = true
        publicCatalog.value = []
        models.value = []
        access.value = null
        accessLoaded.value = false
      } else {
        error.value = errorMessage(publicResult.reason, t('models.error.loadModels'))
      }
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
function errorMessage(cause: any, fallback: string) { return cause?.message || fallback }
function isNotFound(cause: any) { return cause?.statusCode === 404 || cause?.status === 404 }

async function copyModelId(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    toast.add({ title: t('models.toast.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('models.toast.copyFailed'), color: 'error' })
  }
}
function openDetails(model: CatalogModel, event: MouseEvent, section: 'pricing' | null = null) {
  detailsSection.value = section
  detailTrigger.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  selectedModel.value = model
  detailOpen.value = true
}
function capabilityLabels(model: CatalogModel) {
  const labels: string[] = []
  if (model.capabilities?.reasoning?.status === 'supported') labels.push(t('models.capability.reasoning'))
  if (model.capabilities?.tool_calling?.status === 'supported') labels.push(t('models.capability.tools'))
  if (model.capabilities?.structured_output?.status === 'supported') labels.push(t('models.capability.structuredOutput'))
  for (const modality of model.modalities?.input || []) if (modality !== 'text') labels.push(modality)
  return labels
}
function formatTokens(value?: number) { if (!value) return t('models.status.notPublished'); return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value) }

function availabilityLabel(model: CatalogModel) { const rate = model.availability?.availability_rate; return model.availability?.status === 'observed' && typeof rate === 'number' ? t('models.availability.observed', { rate: (rate * 100).toFixed(1) }) : t('models.availability.insufficient') }
function openingPrice(model: CatalogModel) { return pricingEntryPoint(model.pricing)?.input ?? null }
function focusPricing() {
  if (detailsSection.value !== 'pricing') return
  pricingHeading.value?.focus({ preventScroll: true })
  pricingHeading.value?.scrollIntoView({ block: 'start' })
}
watch(pricingHeading, () => { void nextTick(focusPricing) })
function modalityText(model: CatalogModel, direction: 'input' | 'output') { return model.modalities?.status === 'known' && model.modalities[direction]?.length ? model.modalities[direction].join(', ') : t('models.status.notPublished') }
function capabilityText(status?: string) { return status === 'supported' ? t('models.status.supported') : status === 'unsupported' ? t('models.status.unsupported') : t('models.status.notPublished') }
function budgetText(budget: Record<string, unknown>) { return Object.entries(budget).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ') }
function duration(ms?: number) { return ms == null ? t('models.status.notPublished') : `${ms.toLocaleString(intlLocale.value)} ms` }
function dateText(value?: string) { return value ? new Date(value).toLocaleString(intlLocale.value) : t('models.status.notPublished') }
function providerLimit(value?: number) { return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(intlLocale.value) : t('models.status.notPublished') }
function modelLimit(model: CatalogModel, field: 'context_length' | 'max_output_tokens') {
  if (model[field]) return formatTokens(model[field])
  const published = (model.provider_limits || []).map(limit => limit[field]).filter((value): value is number => Boolean(value))
  return published.length ? t('models.status.variesByProvider') : t('models.status.notPublished')
}
function modelFacts(model: CatalogModel) {
  const notPublished = t('models.status.notPublished')
  return [
    { label: t('models.fact.servingProviders'), value: model.providers?.join(', ') || notPublished },
    { label: t('models.fact.keyAccess'), value: model.accessible === true ? t('models.badge.included') : model.accessible === false ? t('models.badge.notIncluded') : t('models.status.unknown') },
    { label: t('models.fact.modelId'), value: model.id }, { label: t('models.fact.context'), value: modelLimit(model, 'context_length') },
    { label: t('models.fact.maxOutput'), value: modelLimit(model, 'max_output_tokens') }, { label: t('models.fact.version'), value: model.version || notPublished },
    { label: t('models.fact.owner'), value: model.owned_by || notPublished }, { label: t('models.fact.type'), value: model.type || notPublished }
  ]
}
function price(value: number | null | undefined) { return formatCatalogPrice(value, { locale: intlLocale.value, notPublished: t('models.status.notPublished') }) }
function pricingText(model: CatalogModel) {
  const kind = pricingMessageKind(model, Boolean(token.value))
  if (kind === 'signIn') return t('models.message.signIn')
  if (kind === 'outsideAccess') return t('models.message.outsideAccess')
  if (kind === 'unavailable') return t('models.message.unavailable')
  return t('models.message.notPublished')
}
// Composable labels/units are English identifiers; map them to translated display text.
const componentLabelKeys: Record<string, PortalMessageKey> = {
  'Input': 'models.component.input', 'Output': 'models.component.output', 'Cache read': 'models.component.cacheRead',
  'Cache write': 'models.component.cacheWrite', 'Request': 'models.component.request', 'Cache write (30m)': 'models.component.cacheWrite30m',
  'Cache write (1h)': 'models.component.cacheWrite1h', 'Cache write (12h)': 'models.component.cacheWrite12h', 'Reasoning': 'models.component.reasoning',
  'Image input': 'models.component.imageInput', 'Image output': 'models.component.imageOutput', 'Audio input': 'models.component.audioInput',
  'Audio output': 'models.component.audioOutput', 'Image': 'models.component.image', 'Web search': 'models.tool.webSearch',
  'Web search query': 'models.tool.webSearchQuery', 'Web fetch': 'models.tool.webFetch', 'X search': 'models.tool.xSearch',
  'Code execution': 'models.tool.codeExecution', 'File search': 'models.tool.fileSearch', 'Document search': 'models.tool.documentSearch',
  'Sources used': 'models.tool.sourcesUsed', 'Server tools': 'models.tool.serverTools'
}
const unitKeys: Record<string, PortalMessageKey> = { '/ 1M tokens': 'models.unit.perMillion', '/ request': 'models.unit.perRequest', '/ image': 'models.unit.perImage', '/ call': 'models.unit.perCall' }
function componentLabel(label: string) { const key = componentLabelKeys[label]; return key ? t(key) : label }
function unitLabel(unit: string) { const key = unitKeys[unit]; return key ? t(key) : unit }


onScopeDispose(() => { disposed = true; loadGeneration++ })

onMounted(() => {
  void syncRouteQuery()
  void refreshCatalog()
})
</script>

<style scoped>
.model-workspace {
  max-width: 80rem;
  padding-block: 0.75rem;
  margin-inline: auto;
}

.catalog-capabilities button { padding-inline: 1rem; }
.catalog-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
.catalog-model {
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.catalog-model:is(:hover, :focus-within) {
  border-color: color-mix(in oklch, var(--ui-primary) 35%, var(--ui-border)) !important;
  box-shadow: 0 12px 28px -14px color-mix(in oklch, var(--ui-primary) 40%, transparent) !important;
}
.catalog-model .catalog-icon { border-radius: 0.625rem; }
.catalog-price { padding-top: 1rem; border-top: 1px solid var(--ui-border); }
.catalog-model :deep([data-slot="body"]) { gap: 0.25rem; }
.catalog-price { margin-top: 1.25rem; }
@media (prefers-reduced-motion: reduce) {
  .catalog-model { transition: none; }
}
.catalog-details section {
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
  overflow-wrap: anywhere;
}
.catalog-details section h3 {
  margin-bottom: 0.75rem;
  color: var(--ui-text-highlighted);
}
.catalog-details section p {
  line-height: 1.75;
}
</style>
