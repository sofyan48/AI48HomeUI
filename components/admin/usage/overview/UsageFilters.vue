<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInputMenu from '~/components/admin/general/controls/AdminInputMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import AppIcon from '~/components/AppIcon.vue'
import { useUsagePage } from '~/composables/usage/useUsagePage'

const { t, rangePreset, rangeOptions, selectRange, filters, showAdvancedFilters, allOptionValue, credentialTypeOptions, overviewScopeLabel, applyFilters, resetFilters, autoRefresh, refreshStatusText, refreshAll, overview: overviewState } = useUsagePage()
const { loading, providerSuggestions, modelSuggestions } = overviewState
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
        <AdminInputMenu v-model="filters.provider" :items="providerSuggestions" create-item @create="filters.provider = $event.trim()" :placeholder="t('usage.allProviders')" class="w-full" />
      </AdminField>
      <AdminField :label="t('common.model')" class="w-full sm:w-56">
        <AdminInputMenu v-model="filters.model" :items="modelSuggestions" create-item @create="filters.model = $event.trim()" :placeholder="t('usage.allModels')" class="w-full" />
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
