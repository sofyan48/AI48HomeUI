import { computed, ref } from 'vue'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import type { useUsageFormat } from '~/composables/usage/format'
import type { useUsageOverview } from '~/composables/usage/useUsageOverview'

export function rankingShare(item: any, items: any[]) {
  const max = Math.max(0, ...items.map(entry => Number(entry.total_amount) || 0))
  return max > 0 ? Math.max(3, Math.round(((Number(item.total_amount) || 0) / max) * 100)) : 0
}

export function useUsagePresentation(t: ReturnType<typeof useAdminI18n>['t'], format: ReturnType<typeof useUsageFormat>, overview: ReturnType<typeof useUsageOverview>) {
  const { totals, live, trend, tokenBreakdown: overviewTokenBreakdown, top } = overview
  const { formatCompactNumber, formatAmount, formatNumber, formatPercent, formatDecimal, formatMilliseconds } = format
  const chartOverlay = ref('requests')
  const chartOverlayOptions = computed(() => [{ label: t('common.requests'), value: 'requests' }, { label: t('usage.spend'), value: 'spend' }])
  const overviewTokenBuckets = computed(() => overviewTokenBreakdown.value ? [
    { label: t('usage.tok.inputUncached'), value: overviewTokenBreakdown.value.input?.uncached_tokens },
    { label: t('usage.tok.cacheRead'), value: overviewTokenBreakdown.value.input?.cache_read_tokens },
    { label: t('usage.tok.cacheWrite'), value: overviewTokenBreakdown.value.input?.cache_write_tokens },
    { label: t('usage.tok.outputNonReasoning'), value: overviewTokenBreakdown.value.output?.non_reasoning_tokens },
    { label: t('usage.tok.outputReasoning'), value: overviewTokenBreakdown.value.output?.reasoning_tokens },
    { label: t('usage.tok.unclassified'), value: overviewTokenBreakdown.value.unclassified_tokens }
  ] : [])
  const chartMetrics = computed(() => [
    { label: t('usage.totalTokens'), value: formatCompactNumber(totals.value.total_tokens), detail: t('usage.tokensInOut', { input: formatCompactNumber(totals.value.input_tokens), output: formatCompactNumber(totals.value.output_tokens) }), icon: 'i-tabler-database', tone: 'violet', points: trend.value.map(point => Number(point.total_tokens) || 0) },
    { label: t('usage.spend'), value: formatAmount(totals.value.total_amount, totals.value.currency), detail: t('usage.perMillion', { amount: formatAmount(totals.value.blended_cost_per_1m_tokens, totals.value.currency) }), icon: 'i-tabler-wallet', tone: 'emerald', points: trend.value.map(point => Number(point.total_amount) || 0) },
    { label: t('common.requests'), value: formatNumber(totals.value.request_count), detail: t('usage.requestsDetail', { ok: formatNumber(totals.value.success_count), failed: formatNumber(totals.value.failed_count), rate: formatPercent(totals.value.error_rate) }), icon: 'i-tabler-bolt', tone: 'blue', points: trend.value.map(point => Number(point.request_count) || 0) },
    { label: t('usage.liveThroughput'), value: t('usage.rpm', { value: formatDecimal(live.value.rpm) }), detail: t('usage.throughputDetail', { tpm: formatCompactNumber(live.value.tpm), latency: formatMilliseconds(live.value.p50_latency_ms) }), icon: 'i-tabler-activity-heartbeat', tone: 'amber' }
  ])
  // Ribbon of canonical token categories; colours follow the chart legend.
  const tokenRibbon = computed(() => {
    const colors = ['#8b5cf6', '#3b82f6', '#d946ef', '#10b981', '#f59e0b', '#a1a1aa']
    const labels = [t('usage.tok.uncachedInput'), t('usage.tok.cacheRead'), t('usage.tok.cacheWrite'), t('usage.tok.regularOutput'), t('usage.tok.reasoning'), t('usage.tok.unclassified')]
    const values = overviewTokenBuckets.value.map(bucket => Number(bucket.value) || 0)
    const total = values.reduce((sum, value) => sum + value, 0)
    if (!total) return []
    return values.map((value, index) => ({ label: labels[index], value, color: colors[index], percent: Math.round((value / total) * 100) })).filter(part => part.value > 0)
  })
  const tokenSeriesLegend = computed(() => [
    { label: t('usage.tok.uncachedInput'), color: '#8b5cf6' }, { label: t('usage.tok.cacheRead'), color: '#3b82f6' }, { label: t('usage.tok.cacheWrite'), color: '#d946ef' },
    { label: t('usage.tok.regularOutput'), color: '#10b981' }, { label: t('usage.tok.reasoning'), color: '#f59e0b' }, { label: t('usage.tok.unclassified'), color: '#a1a1aa' }
  ])
  const rankingCards = computed(() => [
    { key: 'user', label: t('usage.userRanking'), items: Array.isArray(top.value.users) ? top.value.users.slice(0, 3) : [] },
    { key: 'model', label: t('usage.modelRanking'), items: Array.isArray(top.value.models) ? top.value.models.slice(0, 3) : [] },
    { key: 'client_key', label: t('usage.clientKeyRanking'), items: Array.isArray(top.value.client_keys) ? top.value.client_keys.slice(0, 3) : [] }
  ])
  const chartOverlayValues = computed(() => chartOverlay.value === 'requests' ? trend.value.map(point => Number(point.request_count) || 0) : chartOverlay.value === 'spend' ? trend.value.map(point => Number(point.total_amount) || 0) : [])
  const rankingGroupOptions = computed(() => [{ label: t('common.user'), value: 'user' }, { label: t('common.model'), value: 'model' }, { label: t('usage.clientKey'), value: 'client_key' }, { label: t('usage.execCredential'), value: 'credential' }, { label: t('common.provider'), value: 'provider' }, { label: t('usage.endpoint'), value: 'endpoint' }, { label: t('usage.homeNode'), value: 'home_ip' }, { label: t('usage.executor'), value: 'executor_type' }])
  const rankingMetricOptions = computed(() => [{ label: t('usage.spend'), value: 'total_amount' }, { label: t('common.requests'), value: 'request_count' }, { label: t('usage.totalTokens'), value: 'total_tokens' }, { label: t('usage.failures'), value: 'failed_count' }, { label: t('usage.avgLatency'), value: 'avg_latency_ms' }, { label: t('usage.p95Latency'), value: 'p95_latency_ms' }])
  const rankingLimitOptions = computed(() => [{ label: t('usage.top', { count: 10 }), value: 10 }, { label: t('usage.top', { count: 50 }), value: 50 }])
  const rankingColumns = computed(() => [{ accessorKey: 'rank', header: t('usage.col.no'), meta: { class: { th: 'app-table-number-head', td: 'app-table-number-cell' } } }, { accessorKey: 'name', header: t('common.name') }, { accessorKey: 'amount', header: t('usage.spend') }, { accessorKey: 'requests', header: t('common.requests') }, { accessorKey: 'tokens', header: t('common.tokens') }, { accessorKey: 'success', header: t('common.success') }, { accessorKey: 'cache', header: t('usage.col.cacheRate') }, { accessorKey: 'latency', header: t('usage.col.avgLatency') }])
  const credentialColumns = computed(() => [{ accessorKey: 'credential', header: t('usage.credential') }, { accessorKey: 'provider', header: t('common.provider') }, { accessorKey: 'status', header: t('common.status') }, { accessorKey: 'requests', header: t('common.requests') }, { accessorKey: 'tokens', header: t('common.tokens') }, { accessorKey: 'cost', header: t('usage.col.cost') }, { accessorKey: 'lastUsed', header: t('usage.col.lastUsed') }])

  return { chartOverlay, chartOverlayOptions, chartMetrics, tokenRibbon, tokenSeriesLegend, rankingCards, chartOverlayValues, rankingGroupOptions, rankingMetricOptions, rankingLimitOptions, rankingColumns, credentialColumns }
}
