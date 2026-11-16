<template>
  <div class="space-y-4">
    <PortalAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('models.loadFailed')"
      :description="pageError"
    />

    <section class="catalog" :aria-label="t('models.summaryLabel')">
      <div class="min-w-0">
        <p class="catalog__count">{{ filteredModels.length }}<span>{{ t('models.countOf', { total: modelsList.length }) }}</span></p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.providersChannels', { providers: providerCount, channels: channelCount }) }}</p>
      </div>
      <div v-if="providerSpectrum.length" class="min-w-0 flex-1">
        <div class="catalog__spectrum" role="img" :aria-label="providerSpectrum.map(item => `${item.name} ${item.count}`).join(', ')">
          <span v-for="item in providerSpectrum" :key="item.name" :style="{ flexGrow: item.count, background: item.color }" :title="t('models.spectrumTitle', { name: item.name, count: item.count })" />
        </div>
        <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--ui-text-muted)]">
          <span v-for="item in providerSpectrum" :key="item.name" class="inline-flex items-center gap-1"><span class="size-2 rounded-full" :style="{ background: item.color }" />{{ item.name }} {{ item.count }}</span>
        </div>
      </div>
    </section>

    <div class="app-surface flex flex-col gap-3 p-3 lg:flex-row lg:items-end">
      <AdminField :label="t('models.catalog')" class="w-full lg:w-48">
        <AdminSelect v-model="scope" :items="scopeOptions" value-key="value" label-key="label" class="w-full" />
      </AdminField>
      <AdminField v-if="scope === 'static'" :label="t('models.channel')" class="w-full lg:w-56">
        <AdminSelectMenu :model-value="channel || allChannelsValue" @update:model-value="channel = $event === allChannelsValue ? '' : $event" :items="channelOptions" value-key="value" label-key="label" class="w-full" :search-input="{ placeholder: t('models.searchChannels') }" />
      </AdminField>
      <AdminField :label="t('common.search')" class="w-full lg:flex-1">
        <AdminInput v-model="search" icon="i-tabler-search" :placeholder="t('models.searchPlaceholder')" class="w-full" />
      </AdminField>
    </div>

    <div v-if="pending && !modelsList.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <PortalSkeleton v-for="index in 8" :key="index" class="h-24 rounded-2xl" />
    </div>
    <div v-else-if="filteredModels.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <button
        v-for="model in filteredModels"
        :key="`${model.channel}:${model.id}`"
        type="button"
        class="model-tile app-surface group flex min-w-0 flex-col gap-3 p-3.5 text-left"
        :aria-label="t('models.viewDetails', { id: model.id })"
        @click="showDetails(model)"
      >
        <span class="flex min-w-0 items-start gap-3">
          <span class="model-tile__mark" aria-hidden="true">{{ String(model.providers[0] || model.owned_by || model.id || '?').slice(0, 2).toUpperCase() }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-[var(--ui-text-highlighted)]" :title="model.display_name || model.id">{{ model.display_name || model.id }}</span>
            <span class="block truncate font-mono text-[11px] text-[var(--ui-text-muted)]" :title="model.id">{{ model.id }}</span>
          </span>
          <AppIcon name="i-tabler-arrow-up-right" class="size-4 shrink-0 text-[var(--ui-text-dimmed)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
        </span>
        <span class="flex min-w-0 flex-wrap items-center gap-1">
          <PortalBadge v-if="model.channel" color="primary" variant="subtle" size="sm">{{ model.channel }}</PortalBadge>
          <PortalBadge v-for="provider in model.providers.slice(0, 3)" :key="provider" color="neutral" variant="subtle" size="sm">{{ provider }}</PortalBadge>
          <span v-if="model.providers.length > 3" class="text-[11px] text-[var(--ui-text-muted)]">+{{ model.providers.length - 3 }}</span>
          <span v-if="!model.providers.length && !model.channel" class="text-[11px] text-[var(--ui-text-muted)]">{{ t('models.noProviderInfo') }}</span>
          <span class="ml-auto truncate text-[11px] text-[var(--ui-text-muted)]">{{ model.type || model.owned_by || '' }}</span>
        </span>
      </button>
    </div>
    <div v-else-if="!pending" class="app-surface border-dashed px-6 py-8 text-center">
      <AppIcon name="i-tabler-box" class="mx-auto mb-3 size-8 text-[var(--ui-text-muted)]" />
      <p class="font-medium">{{ search ? t('models.noMatching') : t('models.noModels') }}</p>
      <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('models.emptyHint') }}</p>
    </div>

    <AppModal v-model:open="detailsOpen" side="right" :title="t('models.detailsTitle')" :description="t('models.detailsDescription')" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div v-if="selectedModel" class="space-y-5">
          <div class="rounded-xl bg-[var(--ui-bg-muted)] p-4">
            <p class="font-mono text-lg font-semibold">{{ selectedModel.id }}</p>
            <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ selectedModel.display_name || t('models.noDisplayName') }}</p>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem :label="t('models.channel')" :value="selectedModel.channel || t('models.runtimeRegistry')" />
            <DetailItem :label="t('models.object')" :value="selectedModel.object || '—'" />
            <DetailItem :label="t('common.type')" :value="selectedModel.type || '—'" />
            <DetailItem :label="t('models.ownedBy')" :value="selectedModel.owned_by || '—'" />
            <DetailItem :label="t('common.name')" :value="selectedModel.name || '—'" />
            <DetailItem :label="t('models.version')" :value="selectedModel.version || '—'" />
            <DetailItem :label="t('common.created')" :value="selectedModel.created ? formatCreated(selectedModel.created) : '—'" />
            <DetailItem :label="t('models.contextLength')" :value="formatLimit(selectedModel.context_length || selectedModel.inputTokenLimit)" />
            <DetailItem :label="t('models.inputTokenLimit')" :value="formatLimit(selectedModel.inputTokenLimit)" />
            <DetailItem :label="t('models.outputTokenLimit')" :value="formatLimit(selectedModel.outputTokenLimit || selectedModel.max_completion_tokens)" />
            <DetailItem :label="t('models.maxCompletionTokens')" :value="formatLimit(selectedModel.max_completion_tokens)" />
            <DetailItem :label="t('models.configurationUpdates')" :value="selectedModel.support_configuration_update ? t('models.supported') : t('models.notDeclared')" />
          </div>
          <div v-if="selectedModel.description">
            <p class="mb-2 text-sm font-medium">{{ t('models.description') }}</p>
            <p class="whitespace-pre-wrap text-sm text-[var(--ui-text-muted)]">{{ selectedModel.description }}</p>
          </div>
          <div>
            <p class="mb-2 text-sm font-medium">{{ t('models.authoritativeProviders') }}</p>
            <div class="flex flex-wrap gap-2">
              <PortalBadge v-for="provider in selectedModel.providers" :key="provider" color="primary" variant="subtle">{{ provider }}</PortalBadge>
              <span v-if="!selectedModel.providers.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('models.noBillingProvider') }}</span>
            </div>
          </div>
          <div v-for="group in modelMetadataGroups" :key="group.label">
            <p class="mb-2 text-sm font-medium">{{ group.label }}</p>
            <div class="flex flex-wrap gap-2">
              <PortalBadge v-for="value in group.values" :key="value" color="neutral" variant="subtle">{{ value }}</PortalBadge>
            </div>
          </div>
          <details v-if="hasCapabilityMetadata" class="rounded-xl border border-[var(--ui-border)] px-4 py-3 text-sm">
            <summary class="cursor-pointer font-medium">{{ t('models.capabilityMetadata') }}</summary>
            <pre class="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-[var(--ui-text-muted)]">{{ capabilityMetadata }}</pre>
          </details>
          <div class="flex justify-end border-t border-[var(--ui-border)] pt-4">
            <AppButton color="neutral" variant="ghost" @click="detailsOpen = false">{{ t('common.close') }}</AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import AppIcon from '~/components/AppIcon.vue'
import AppModal from '~/components/AppModal.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
const { fetchAPI } = useApi()
const { t, intlLocale } = useAdminI18n()

const scope = ref('available')
const channel = ref('')
const search = ref('')
const pageError = useWorkspaceState('admin:routing:models:pageError', () => (''))
const detailsOpen = ref(false)
const selectedModel = ref(null)

const allChannelsValue = '__all_channels__'
const scopeOptions = computed(() => [
  { label: t('models.scopeAvailable'), value: 'available' },
  { label: t('models.scopeStatic'), value: 'static' }
])

async function loadModels() {
  pageError.value = ''
  try {
    return await fetchAPI(`/models?scope=${scope.value}`)
  } catch (error) {
    pageError.value = errorMessage(error)
    return { models: scope.value === 'static' ? {} : [] }
  }
}

const { data, pending, refresh } = useStoreData('admin:routing:models:routing-models', loadModels, { watch: [scope] })

const rawModels = computed(() => data.value?.models)
const modelsList = computed(() => {
  if (Array.isArray(rawModels.value)) {
    return rawModels.value
      .filter(model => model?.id)
      .map(model => ({ ...model, providers: Array.isArray(model.providers) ? model.providers : [], channel: model.channel || '' }))
  }
  if (!rawModels.value || typeof rawModels.value !== 'object') return []
  return Object.entries(rawModels.value).flatMap(([catalogChannel, entries]) => (Array.isArray(entries) ? entries : [])
    .filter(model => model?.id)
    .map(model => ({ ...model, providers: Array.isArray(model.providers) ? model.providers : [], channel: catalogChannel })))
})
const channelOptions = computed(() => [
  { label: t('models.allStaticChannels'), value: allChannelsValue },
  ...[...new Set(modelsList.value.map(model => model.channel).filter(Boolean))].sort().map(value => ({ label: value, value }))
])
const filteredModels = computed(() => {
  const query = search.value.trim().toLowerCase()
  return modelsList.value.filter(model => {
    if (scope.value === 'static' && channel.value && model.channel !== channel.value) return false
    if (!query) return true
    return [model.id, model.display_name, model.owned_by, model.type, model.channel, ...(model.providers || [])]
      .some(value => String(value || '').toLowerCase().includes(query))
  })
})
// Provider share across the full catalog; top six plus "other".
const providerSpectrum = computed(() => {
  const palette = ['#8b5cf6', '#3b82f6', '#d946ef', '#10b981', '#f59e0b', '#06b6d4']
  const counts = new Map()
  for (const model of modelsList.value) for (const provider of (model.providers?.length ? model.providers : [t('common.unknown')])) counts.set(provider, (counts.get(provider) || 0) + 1)
  const sorted = [...counts].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 6).map(([name, count], index) => ({ name, count, color: palette[index] }))
  const rest = sorted.slice(6).reduce((sum, [, count]) => sum + count, 0)
  return rest ? [...top, { name: t('models.otherProviders'), count: rest, color: '#a1a1aa' }] : top
})
const providerCount = computed(() => new Set(modelsList.value.flatMap(model => model.providers || [])).size)
const channelCount = computed(() => new Set(modelsList.value.map(model => model.channel).filter(Boolean)).size)
const modelMetadataGroups = computed(() => {
  if (!selectedModel.value) return []
  return [
    { label: t('models.generationMethods'), values: selectedModel.value.supportedGenerationMethods },
    { label: t('models.supportedParameters'), values: selectedModel.value.supported_parameters },
    { label: t('models.inputModalities'), values: selectedModel.value.supportedInputModalities },
    { label: t('models.outputModalities'), values: selectedModel.value.supportedOutputModalities }
  ].filter(group => Array.isArray(group.values) && group.values.length)
})
const capabilityMetadata = computed(() => JSON.stringify({
  thinking: selectedModel.value?.thinking,
  native_capabilities: selectedModel.value?.native_capabilities
}, null, 2))
const hasCapabilityMetadata = computed(() => Boolean(selectedModel.value?.thinking || selectedModel.value?.native_capabilities))

function showDetails(row) {
  selectedModel.value = row
  detailsOpen.value = true
}
function formatCreated(value) {
  const date = new Date(Number(value) * 1000)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(intlLocale.value)
}
function formatLimit(value) {
  const limit = Number(value)
  return Number.isFinite(limit) && limit > 0 ? limit.toLocaleString(intlLocale.value) : '—'
}
function errorMessage(error) {
  return error?.data?.message || error?.data?.error || error?.response?._data?.message || error?.response?._data?.error || error?.message || t('routing.unexpectedError')
}
</script>

<style scoped>
/* Models signature: provider spectrum across the catalog. */
.catalog { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 2rem; padding: 1rem 1.25rem; border: 1px solid var(--admin-panel-border); border-radius: 0.875rem; background: radial-gradient(ellipse 50% 140% at 0% 50%, color-mix(in oklch, var(--page-accent) 12%, transparent), transparent 70%), var(--admin-panel-bg); box-shadow: 0 1px 2px rgb(24 24 27 / 4%); }
.catalog__count { font-family: var(--admin-display-font); font-size: 1.5rem; line-height: 2rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ui-text-highlighted); }
.catalog__count span { font-size: 0.875rem; font-weight: 500; letter-spacing: normal; color: var(--ui-text-muted); }
.catalog__spectrum { display: flex; height: 0.625rem; gap: 2px; overflow: hidden; border-radius: 9999px; }
.catalog__spectrum > span { flex-basis: 0; min-width: 3px; }
.model-tile { transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease; }
.model-tile:hover { transform: translateY(-1px); border-color: color-mix(in oklch, var(--ui-primary) 35%, var(--admin-panel-border)) !important; }
.model-tile:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
.model-tile__mark {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: var(--admin-selected);
  color: var(--ui-primary);
  font-size: 0.6875rem;
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) { .model-tile { transition: none; } .model-tile:hover { transform: none; } }
</style>
