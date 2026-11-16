<script setup lang="ts">
import { useUsagePage } from '~/composables/usage/useUsagePage'
import { rankingShare } from '~/composables/usage/useUsagePresentation'

const { t, overview, ranking, presentation, format } = useUsagePage()
const { totals } = overview
const { openRanking } = ranking
const { rankingCards } = presentation
const { formatNumber, formatAmount } = format
</script>

<template>
  <div class="grid gap-3 lg:grid-cols-3">
    <AppCard v-for="ranking in rankingCards" :key="ranking.key" :ui="{ body: 'p-0' }">
      <template #header><div class="flex items-center justify-between"><h2 class="text-sm font-semibold">{{ ranking.label }}</h2><AppButton size="xs" color="neutral" variant="ghost" @click="openRanking(ranking.key)">{{ t('usage.viewAll') }}</AppButton></div></template>
      <ol v-if="ranking.items.length" class="divide-y divide-[var(--ui-border-muted)]">
        <li v-for="(item, index) in ranking.items" :key="item.id || item.label" class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-4 py-3">
          <span class="text-xs font-semibold text-[var(--ui-text-muted)]">{{ index + 1 }}</span>
          <div class="min-w-0"><p class="truncate text-sm font-medium">{{ item.label || item.id || t('common.unknown') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.requestCount', { count: formatNumber(item.request_count) }) }}</p></div>
          <span class="whitespace-nowrap text-sm font-semibold">{{ formatAmount(item.total_amount, item.currency || totals.currency) }}</span>
          <div class="col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]" aria-hidden="true"><div class="h-full rounded-full bg-[var(--ui-primary)]" :style="{ width: `${rankingShare(item, ranking.items)}%` }" /></div>
        </li>
      </ol>
      <p v-else class="px-4 py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('usage.noRanking') }}</p>
    </AppCard>
  </div>
</template>
