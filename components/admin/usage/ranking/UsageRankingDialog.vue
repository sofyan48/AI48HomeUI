<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import { useUsagePage } from '~/composables/usage/useUsagePage'
import { rowValue } from '~/composables/usage/format'

const { t, ranking, overview, presentation, format } = useUsagePage()
const { rankingOpen, rankingGroup, rankingMetric, rankingLimit, rankingItems, rankingLoading, loadRanking } = ranking
const { rankingGroupOptions, rankingMetricOptions, rankingLimitOptions, rankingColumns } = presentation
const { totals } = overview
const { formatAmount, formatNumber, formatCompactNumber, formatPercent, formatMilliseconds } = format
</script>

<template>
  <AppModal v-model:open="rankingOpen" :title="t('usage.rankingTitle')" :description="t('usage.rankingDesc')" :ui="{ content: 'sm:max-w-6xl' }">
    <template #body>
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <AdminField :label="t('usage.groupBy')"><AdminSelect v-model="rankingGroup" :items="rankingGroupOptions" value-key="value" label-key="label" class="w-full" @update:model-value="loadRanking" /></AdminField>
          <AdminField :label="t('usage.metric')"><AdminSelect v-model="rankingMetric" :items="rankingMetricOptions" value-key="value" label-key="label" class="w-full" @update:model-value="loadRanking" /></AdminField>
          <AdminField :label="t('usage.rows')"><AdminSelect v-model="rankingLimit" :items="rankingLimitOptions" value-key="value" label-key="label" class="w-full" @update:model-value="loadRanking" /></AdminField>
        </div>
        <AppCard :ui="{ body: 'p-0' }">
          <AppTable :columns="rankingColumns" :data="rankingItems" :loading="rankingLoading" class="min-w-[980px]">
            <template #rank-cell="{ row }"><span class="app-table-number">{{ rankingItems.indexOf(rowValue(row)) + 1 }}</span></template>
            <template #name-cell="{ row }"><div class="min-w-48"><p class="truncate font-medium">{{ rowValue(row).label || rowValue(row).id || t('common.unknown') }}</p><p class="truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).id }}</p></div></template>
            <template #amount-cell="{ row }">{{ formatAmount(rowValue(row).total_amount, rowValue(row).currency || totals.currency) }}</template>
            <template #requests-cell="{ row }">{{ formatNumber(rowValue(row).request_count) }}</template>
            <template #tokens-cell="{ row }">{{ formatCompactNumber(rowValue(row).total_tokens) }}</template>
            <template #success-cell="{ row }">{{ formatPercent(rowValue(row).success_rate) }}</template>
            <template #cache-cell="{ row }">{{ formatPercent(rowValue(row).cache_rate) }}</template>
            <template #latency-cell="{ row }">{{ formatMilliseconds(rowValue(row).avg_latency_ms) }}</template>
          </AppTable>
        </AppCard>
      </div>
    </template>
  </AppModal>
</template>
