<template>
  <AppCard>
    <template #header><h2 class="font-semibold">{{ t('dashboard.keySwitches') }}</h2></template>
    <div class="grid gap-2 sm:grid-cols-2">
      <div v-for="item in checks" :key="item.label" class="dashboard-switch" :class="`dashboard-switch--${item.color}`">
        <span class="dashboard-switch__dot" aria-hidden="true" />
        <span class="min-w-0 flex-1 leading-tight">
          <span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ item.label }}</span>
          <span class="block truncate text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ item.value }}</span>
        </span>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDashboard } from '~/composables/dashboard/useDashboard'

const { t } = useAdminI18n()
const { config, routing } = useDashboard()

const onOff = (value: boolean) => value ? t('common.enabled') : t('common.disabled')

const checks = computed(() => {
  const logs = config.value.observability?.logs || config.value
  const usageConfig = config.value.observability?.usage || config.value
  const requestLog = logs['request-log'] === true
  const usageStats = usageConfig['usage-statistics-enabled'] === true
  const debug = logs.debug === true
  const unknownRouting = routing.value === 'Unknown'
  return [
    { label: t('dashboard.switch.requestLog'), value: onOff(requestLog), color: requestLog ? 'success' : 'warning' },
    { label: t('dashboard.switch.usageStatistics'), value: onOff(usageStats), color: usageStats ? 'success' : 'warning' },
    { label: t('dashboard.switch.fileLogging'), value: onOff(logs['logging-to-file'] === true), color: 'neutral' },
    { label: t('dashboard.switch.debugMode'), value: onOff(debug), color: debug ? 'warning' : 'success' },
    { label: t('dashboard.switch.routingStrategy'), value: unknownRouting ? t('common.unknown') : routing.value, color: unknownRouting ? 'warning' : 'success' }
  ]
})
</script>

<style scoped>
.dashboard-switch {
  --switch-accent: var(--ui-text-dimmed);
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-elevated);
}
.dashboard-switch--success { --switch-accent: var(--ui-success); }
.dashboard-switch--warning { --switch-accent: var(--ui-warning); }
.dashboard-switch__dot {
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: var(--switch-accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--switch-accent) 20%, transparent);
}
</style>
