<template>
  <AppCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">{{ t('dashboard.modelServiceAccess') }}</h2>
        <AppButton to="/admin/providers" color="neutral" variant="ghost" size="xs" trailing-icon="i-tabler-arrow-right">{{ t('dashboard.manage') }}</AppButton>
      </div>
    </template>
    <div class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <div v-for="provider in providerRows" :key="provider.path" class="min-w-0">
        <div class="flex items-baseline justify-between gap-2">
          <p class="truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ providerLabel(provider) }}</p>
          <span v-if="provider.total" class="shrink-0 text-xs tabular-nums text-[var(--ui-text-muted)]">
            <strong class="text-[var(--ui-text-highlighted)]">{{ provider.active }}</strong> / {{ provider.total }}
          </span>
          <span v-else class="shrink-0 text-xs text-[var(--ui-text-dimmed)]">{{ t('dashboard.notConfigured') }}</span>
        </div>
        <div
          class="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"
          role="img"
          :aria-label="t('dashboard.providerBarAria', { label: providerLabel(provider), total: provider.total, active: provider.active, disabled: provider.disabled })"
        >
          <span v-if="provider.total" class="bg-emerald-500" :style="{ width: `${(provider.active / provider.total) * 100}%` }" />
          <span v-if="provider.total" class="bg-zinc-400" :style="{ width: `${(provider.disabled / provider.total) * 100}%` }" />
        </div>
        <p class="mt-1 truncate font-mono text-[11px] text-[var(--ui-text-dimmed)]">{{ provider.path }}</p>
      </div>
    </div>
    <AppButton
      v-if="providerRows.every(item => item.total === 0)"
      to="/admin/providers"
      color="primary"
      variant="soft"
      size="sm"
      icon="i-tabler-plus"
      class="mt-5 rounded-full"
    >
      {{ t('dashboard.configureModelService') }}
    </AppButton>
  </AppCard>
</template>

<script setup lang="ts">
import { useDashboard } from '~/composables/dashboard/useDashboard'

const { t } = useAdminI18n()
const { providerRows } = useDashboard()

const providerLabel = (provider: { label: string; path: string }) =>
  provider.path === '/config/api-keys/openai-compatibility' ? t('dashboard.provider.openaiCompat') : provider.label
</script>
