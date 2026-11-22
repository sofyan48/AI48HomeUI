<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import { computed } from 'vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import AppIcon from '~/components/AppIcon.vue'
import { useUsagePage } from '~/composables/usage/useUsagePage'

const { t, rangePreset, rangeOptions, selectRange, filters, showAdvancedFilters, allOptionValue, credentialTypeOptions, overviewScopeLabel, applyFilters, resetFilters, autoRefresh, refreshStatusText, refreshAll, overview: overviewState } = useUsagePage()
const { loading, providerSuggestions, modelSuggestions } = overviewState

// Keep the selected value available when a filtered refresh narrows suggestions.
function filterOptions(values: string[], selected: string, label: string) {
  const options = [...new Set([...values, selected].filter(Boolean))].sort()
  return [{ label, value: allOptionValue }, ...options.map(value => ({ label: value, value }))]
}
const providerOptions = computed(() => filterOptions(providerSuggestions.value, filters.value.provider, t('usage.allProviders')))
const modelOptions = computed(() => filterOptions(modelSuggestions.value, filters.value.model, t('usage.allModels')))
</script>

<template>
  <form class="admin-toolbar" :aria-label="t('usage.filtersLabel')" @submit.prevent="applyFilters">
    <div class="flex flex-wrap items-end gap-2">
      <AdminField :label="t('usage.timeRange')" class="w-full sm:w-44">
        <AdminSelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-full" @update:model-value="selectRange" />
      </AdminField>
      <template v-if="rangePreset === 'custom'">
        <AdminField :label="t('usage.startDate')" class="w-full sm:w-40"><AppDateInput v-model="filters.from" type="date" :max="filters.to" class="w-full" /></AdminField>
        <AdminField :label="t('usage.endDate')" class="w-full sm:w-40"><AppDateInput v-model="filters.to" type="date" :min="filters.from" class="w-full" /></AdminField>
      </template>
      <AdminField :label="t('common.provider')" class="w-full sm:w-48">
        <AdminSelect :model-value="filters.provider || allOptionValue" :items="providerOptions" value-key="value" label-key="label" :aria-label="t('common.provider')" class="w-full" @update:model-value="filters.provider = $event === allOptionValue ? '' : String($event ?? '')" />
      </AdminField>
      <AdminField :label="t('common.model')" class="w-full sm:w-56">
        <AdminSelect :model-value="filters.model || allOptionValue" :items="modelOptions" value-key="value" label-key="label" :aria-label="t('common.model')" class="w-full" @update:model-value="filters.model = $event === allOptionValue ? '' : String($event ?? '')" />
      </AdminField>
      <AppButton type="button" color="neutral" :variant="showAdvancedFilters ? 'soft' : 'ghost'" icon="i-tabler-dots-vertical" :aria-label="showAdvancedFilters ? t('usage.hideAdvanced') : t('usage.showAdvanced')" :title="showAdvancedFilters ? t('usage.hideAdvanced') : t('usage.advancedFilters')" :aria-expanded="showAdvancedFilters" @click="showAdvancedFilters = !showAdvancedFilters" />
      <AppButton type="submit" color="primary" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>
      <AppButton type="button" color="neutral" variant="ghost" @click="resetFilters">{{ t('common.reset') }}</AppButton>
      <div class="ml-auto flex items-center gap-2 self-center">
        <label class="inline-flex items-center gap-2 text-xs text-[var(--ui-text-muted)]"><AdminSwitch v-model="autoRefresh" size="sm" :aria-label="t('usage.autoRefreshLabel')" /><span role="status" :title="t('usage.attributionPauses')">{{ refreshStatusText }}</span></label>
        <AppButton color="neutral" variant="outline" icon="i-tabler-refresh" :loading="loading" :aria-label="t('usage.refreshOverview')" @click="refreshAll()" />
      </div>
    </div>
    <div v-if="showAdvancedFilters" class="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--ui-border)] pt-3">
      <AdminField :label="t('usage.credentialType')" class="w-full sm:w-44"><AdminSelect :model-value="filters.credentialType || allOptionValue" @update:model-value="filters.credentialType = $event === allOptionValue ? '' : $event" :items="credentialTypeOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
      <AdminField :label="t('usage.homeNode')" class="w-full sm:w-44"><AdminInput v-model="filters.homeIp" :placeholder="t('usage.homeIp')" class="w-full" /></AdminField>
      <AdminField :label="t('usage.endpoint')" class="w-full sm:w-56"><AdminInput v-model="filters.endpoint" :placeholder="t('usage.endpoint')" class="w-full" /></AdminField>
    </div>
    <p class="mt-2 truncate text-xs text-[var(--ui-text-muted)]" :title="overviewScopeLabel"><AppIcon name="i-tabler-filter" class="mr-1 inline size-3.5 align-[-2px]" />{{ overviewScopeLabel }}</p>
  </form>
</template>
