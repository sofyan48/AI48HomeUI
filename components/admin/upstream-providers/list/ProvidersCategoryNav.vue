<template>
  <aside class="self-start max-xl:hidden" :aria-label="t('upstream.providers.categories')">
    <AppCard :ui="{ header: 'px-4 py-3', body: 'p-2' }">
      <template #header><h2 class="font-semibold">{{ t('upstream.providers.categories') }}</h2></template>
      <nav class="grid gap-1" :aria-label="t('upstream.providers.categories')">
      <button
        v-for="category in providerCategories"
        :key="category.value"
        type="button"
        :disabled="providerEditorOpen || deleteOpen"
        :aria-current="selectedProviderRoute === category.value ? 'page' : undefined"
        class="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="selectedProviderRoute === category.value ? 'border-[color-mix(in_oklch,var(--ui-primary)_30%,transparent)] bg-[var(--admin-selected)] text-[var(--ui-primary)]' : 'border-transparent hover:bg-[var(--ui-hover)]'"
        @click="selectedProviderRoute = category.value"
      >
        <span class="flex min-w-0 items-center gap-2.5">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-muted)] text-[10px] font-semibold" aria-hidden="true">{{ category.mark }}</span>
          <span class="min-w-0">
          <span class="block truncate text-sm font-medium">{{ categoryLabel(category) }}</span>
          <span class="mt-0.5 block text-xs text-[var(--ui-text-muted)]">
            {{ categoryStats[category.value] ? t('upstream.providers.categoryCounts', { active: categoryStats[category.value].active, total: categoryStats[category.value].total }) : t('upstream.providers.countsUnavailable') }}
          </span>
          </span>
        </span>
        <UIcon v-if="categoryStats[category.value]?.disabled" name="i-tabler-alert-triangle" class="size-4 shrink-0 text-[var(--ui-warning)]" :aria-label="t('upstream.providers.disabledEntries', { count: categoryStats[category.value].disabled })" />
        <span v-else class="shrink-0 rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5 text-xs tabular-nums" :aria-label="categoryStats[category.value] ? t('upstream.providers.entriesCount', { count: categoryStats[category.value].total }) : t('upstream.providers.countsUnavailable')">{{ categoryStats[category.value]?.total ?? '—' }}</span>
      </button>
      </nav>
    </AppCard>
  </aside>
</template>

<script setup>
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const { t, providerCategories, categoryLabel, categoryStats, selectedProviderRoute, providerEditorOpen, deleteOpen } = useUpstreamProvidersWorkspace()
</script>
