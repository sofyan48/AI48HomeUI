<template>
  <AppCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="font-semibold">{{ title }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ summary }}</p>
        </div>
        <AppButton to="/admin/usage" color="neutral" variant="ghost" size="xs" trailing-icon="i-tabler-arrow-right" :aria-label="detailsLabel">
          {{ t('common.details') }}
        </AppButton>
      </div>
    </template>
    <ol v-if="items.length" class="space-y-3.5">
      <li v-for="(item, index) in items" :key="item.id || index" class="dashboard-rank" :class="`dashboard-tone--${tone}`">
        <span class="dashboard-rank-index" aria-hidden="true">{{ index + 1 }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-3">
            <p class="truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ labelOf(item) }}</p>
            <span class="shrink-0 text-xs font-semibold tabular-nums">
              {{ t('dashboard.tokensCount', { count: item.token_breakdown?.total_tokens == null ? '--' : formatCompact(item.token_breakdown.total_tokens) }) }}
            </span>
          </div>
          <div class="dashboard-share mt-1.5"><span :style="{ width: shareOf(item) }" /></div>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
            {{ t('dashboard.rankSummary', { requests: formatNumber(item.request_count), rate: formatPercent(item.success_rate) }) }}<span v-if="item.failed_count">{{ t('dashboard.rankFailed', { count: formatNumber(item.failed_count) }) }}</span>
          </p>
        </div>
      </li>
    </ol>
    <div v-else class="flex min-h-36 flex-col items-center justify-center gap-2 text-center text-[0.8125rem] text-[var(--ui-text-dimmed)]">
      <AppIcon :name="emptyIcon" class="size-6" aria-hidden="true" />
      <p>{{ emptyText }}</p>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { useDashboardFormat } from '~/composables/dashboard/format'

// Top-3 ranking card used for client keys and models.
const props = defineProps<{
  title: string
  summary: string
  detailsLabel: string
  items: any[]
  labelOf: (item: any) => string
  emptyIcon: string
  emptyText: string
  tone: 'violet' | 'blue'
}>()

const { t } = useAdminI18n()
const { formatNumber, formatCompact, formatPercent } = useDashboardFormat()

function shareOf(item: any) {
  const max = Math.max(1, ...props.items.map(entry => Number(entry.request_count) || 0))
  return `${Math.round(((Number(item.request_count) || 0) / max) * 100)}%`
}
</script>

<style scoped>
.dashboard-rank { display: flex; align-items: flex-start; gap: 0.75rem; }
.dashboard-rank-index {
  display: flex;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.4375rem;
  background: color-mix(in oklch, var(--dashboard-accent) 13%, transparent);
  color: var(--dashboard-accent);
  font-size: 0.75rem;
  font-weight: 700;
}
.dashboard-share { height: 0.3125rem; overflow: hidden; border-radius: 9999px; background: var(--ui-bg-muted); }
.dashboard-share > span { display: block; height: 100%; border-radius: inherit; background: var(--dashboard-accent); }
</style>
