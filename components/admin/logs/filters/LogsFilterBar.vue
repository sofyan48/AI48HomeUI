<template>
  <form class="admin-toolbar log-filters" :aria-label="t('logs.filtersLabel')" @submit.prevent="applyFilters">
    <div class="flex flex-wrap items-center gap-2">
      <template v-if="activeView === 'error-logs'">
        <UInput v-model="errorLogSearch" icon="i-tabler-search" :placeholder="t('logs.filenamePlaceholder')" :aria-label="t('logs.filename')" class="w-full sm:w-80" />
      </template>
      <template v-else-if="activeView !== 'application'">
        <UInput v-model="requestFilters.search" icon="i-tabler-search" :placeholder="activeView === 'events' ? t('logs.searchEventsPlaceholder') : t('logs.searchRequestLogsPlaceholder')" :aria-label="t('common.search')" class="w-full sm:w-72" />
        <USelect :model-value="requestFilters.status || allOptionValue" :items="requestStatusOptions" value-key="value" label-key="label" icon="i-tabler-circle-dot" :aria-label="t('common.status')" class="w-36" @update:model-value="requestFilters.status = $event === allOptionValue ? '' : $event" />
        <div class="log-filters__range">
          <UInput v-model="requestFilters.from" type="date" :max="requestFilters.to || undefined" :aria-label="t('logs.fromDate')" variant="none" class="w-36" />
          <span aria-hidden="true">→</span>
          <UInput v-model="requestFilters.to" type="date" :min="requestFilters.from || undefined" :aria-label="t('logs.toDate')" variant="none" class="w-36" />
        </div>
      </template>
      <template v-else>
        <UInput v-model="applicationFilters.search" icon="i-tabler-search" :placeholder="t('logs.searchContentPlaceholder')" :aria-label="t('logs.searchContent')" class="w-full sm:w-72" />
        <USelect :model-value="applicationFilters.level || allOptionValue" :items="levelOptions" value-key="value" label-key="label" icon="i-tabler-stack-2" :aria-label="t('logs.level')" class="w-36" @update:model-value="applicationFilters.level = $event === allOptionValue ? '' : $event" />
        <div class="log-filters__range">
          <UInput v-model="applicationFilters.after" type="datetime-local" :max="applicationFilters.before || undefined" :aria-label="t('logs.after')" variant="none" class="w-48" />
          <span aria-hidden="true">→</span>
          <UInput v-model="applicationFilters.before" type="datetime-local" :min="applicationFilters.after || undefined" :aria-label="t('logs.before')" variant="none" class="w-48" />
        </div>
      </template>

      <UChip v-if="activeView !== 'error-logs'" :show="advancedLogFilterCount > 0 && !showAdvancedLogFilters" size="sm" inset>
        <AppButton
          type="button"
          color="neutral"
          :variant="showAdvancedLogFilters ? 'soft' : 'ghost'"
          icon="i-tabler-dots-vertical"
          :aria-label="showAdvancedLogFilters ? t('logs.hideAdvanced') : t('logs.showAdvanced')"
          :title="advancedLogFilterCount ? t('logs.advancedActive', { count: advancedLogFilterCount }) : t('logs.advancedFilters')"
          :aria-expanded="showAdvancedLogFilters"
          @click="showAdvancedLogFilters = !showAdvancedLogFilters"
        />
      </UChip>
      <AppButton type="button" color="neutral" variant="ghost" @click="resetFilters">{{ t('common.reset') }}</AppButton>
      <AppButton type="submit" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>

      <span class="mx-1 hidden h-5 w-px bg-[var(--ui-border)] lg:block" aria-hidden="true" />

      <div class="flex items-center gap-1.5 lg:ml-auto">
        <USelect v-model="pageSize" :items="pageSizeOptions" value-key="value" label-key="label" :aria-label="t('logs.pageSize')" class="w-28" @update:model-value="resetPages" />
        <AppButton :color="liveRefresh ? 'primary' : 'neutral'" :variant="liveRefresh ? 'soft' : 'ghost'" :icon="liveRefresh ? 'i-tabler-broadcast' : 'i-tabler-broadcast-off'" :aria-pressed="liveRefresh" :title="liveRefresh ? t('logs.liveOn') : t('logs.liveOff')" @click="liveRefresh = !liveRefresh">{{ t('logs.live') }}</AppButton>
        <AppButton color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="loading" :aria-label="t('common.refresh')" :title="t('common.refresh')" @click="refreshActive" />
        <AppButton
          v-if="activeView === 'application'"
          color="error"
          variant="ghost"
          icon="i-tabler-trash"
          :disabled="applicationTotal === 0"
          :aria-label="t('logs.clearApplicationLogs')"
          :title="t('logs.clearApplicationLogs')"
          @click="clearConfirmOpen = true"
        />
      </div>
    </div>

    <div v-if="showAdvancedLogFilters && activeView !== 'error-logs'" class="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--ui-border)] pt-2.5">
      <template v-if="activeView !== 'application'">
        <UInput v-model="requestFilters.provider" icon="i-tabler-cloud" :placeholder="t('logs.providerPlaceholder')" :aria-label="t('common.provider')" class="w-full sm:w-52" />
        <UInput v-model="requestFilters.model" icon="i-tabler-box" :placeholder="t('logs.modelPlaceholder')" :aria-label="t('common.model')" class="w-full sm:w-60" />
      </template>
      <template v-else>
        <UInput v-model="applicationFilters.home_ip" icon="i-tabler-server" :placeholder="t('logs.homeIp')" :aria-label="t('logs.homeIp')" class="w-full sm:w-44" />
        <UInput v-model="applicationFilters.client_ip" icon="i-tabler-device-desktop" :placeholder="t('logs.clientIp')" :aria-label="t('logs.clientIp')" class="w-full sm:w-44" />
        <UInput v-model="applicationFilters.request_id" icon="i-tabler-hash" :placeholder="t('logs.requestIdPlaceholder')" :aria-label="t('logs.requestId')" class="w-full sm:w-64" />
      </template>
    </div>
  </form>
</template>

<script setup lang="ts">
import { allOptionValue } from '~/composables/logs/filters.js'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, activeView, errorLogSearch, requestFilters, applicationFilters, advancedLogFilterCount, showAdvancedLogFilters,
  loading, pageSize, liveRefresh, applicationTotal, clearConfirmOpen,
  applyFilters, resetFilters, resetPages, refreshActive,
} = useLogsPage()

const pageSizeOptions = computed(() => [25, 50, 100, 200].map(value => ({ label: t('logs.perPage', { count: value }), value })))

const requestStatusOptions = computed(() => [
  { label: t('logs.allStatuses'), value: allOptionValue },
  { label: t('common.success'), value: 'success' },
  { label: t('common.failed'), value: 'failed' },
])

const levelOptions = computed(() => [
  { label: t('logs.allLevels'), value: allOptionValue },
  { label: t('logs.levelDebug'), value: 'debug' },
  { label: t('logs.levelInfo'), value: 'info' },
  { label: t('logs.levelWarn'), value: 'warn' },
  { label: t('logs.levelError'), value: 'error' },
])
</script>

<style scoped>
/* Runtime logs filter bar: one label-free row like Billing; date range shares one control. */
.log-filters { padding: 0.625rem 0.75rem; }
.log-filters__range {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding-inline: 0.25rem;
  border: 1px solid var(--ui-border-accented);
  border-radius: var(--admin-control-radius);
  background: var(--admin-control-bg);
  color: var(--ui-text-dimmed);
  font-size: 0.75rem;
}
.log-filters__range:focus-within { border-color: var(--ui-primary); }
.log-filters__range :deep(input) { min-height: calc(var(--admin-control-height) - 2px) !important; }
</style>
