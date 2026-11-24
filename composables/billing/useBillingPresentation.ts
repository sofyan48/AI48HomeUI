import { computed } from 'vue'
import { normalizeBillingPriceSnapshot } from './priceEvidence'
import type { BillingPresentationOptions, BillingCharge } from './types'

export function useBillingPresentation({ overview, selectedBalance, selectedCharge, t, formatCredits, formatNumber, formatDateTime, balanceTypeLabel }: BillingPresentationOptions) {
const overviewData = computed(() => overview.value?.overview || {})
const overviewRange = computed(() => overviewData.value.range || {})
const dailyTrend = computed(() => (Array.isArray(overviewData.value.daily_trend) ? overviewData.value.daily_trend : [])
  .slice()
  .sort((left, right) => Date.parse(right.date) - Date.parse(left.date)))
const topUsers = computed(() => (Array.isArray(overviewData.value.top_users) ? overviewData.value.top_users : [])
  .slice()
  .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0)))
const topModels = computed(() => Array.isArray(overviewData.value.top_models) ? overviewData.value.top_models : [])
const topProviders = computed(() => Array.isArray(overviewData.value.top_providers) ? overviewData.value.top_providers : [])
const rankingGroups = computed(() => [
  { title: t('billing.overview.topModels'), items: topModels.value, empty: t('billing.overview.noModelCharges') },
  { title: t('billing.overview.topProviders'), items: topProviders.value, empty: t('billing.overview.noProviderCharges') }
])
const financeMetrics = computed(() => [
  { label: t('billing.metric.charged'), value: formatCredits(overviewData.value.total_charge_amount), detail: t('billing.metric.chargedDetail'), icon: 'i-tabler-receipt', tone: 'violet' },
  { label: t('billing.metric.recharged'), value: formatCredits(overviewData.value.total_recharge_amount), detail: t('billing.metric.rechargedDetail'), icon: 'i-tabler-circle-plus', tone: 'emerald' },
  { label: t('billing.metric.deducted'), value: formatCredits(overviewData.value.total_deduct_amount), detail: t('billing.metric.deductedDetail'), icon: 'i-tabler-circle-minus', tone: 'amber' },
  { label: t('billing.metric.totalBalance'), value: formatCredits(overviewData.value.total_balance), detail: t('billing.metric.totalBalanceDetail'), icon: 'i-tabler-wallet', tone: 'blue' }
])
const usageMetrics = computed(() => [
  { label: t('common.requests'), value: formatNumber(overviewData.value.request_count) },
  { label: t('billing.metric.inputTokens'), value: formatNumber(overviewData.value.input_tokens) },
  { label: t('billing.metric.outputTokens'), value: formatNumber(overviewData.value.output_tokens) },
  { label: t('billing.metric.cacheTokens'), value: formatNumber(overviewData.value.cache_tokens) },
  { label: t('billing.metric.activeUsers'), value: formatNumber(overviewData.value.active_user_count) }
])
const balanceDetailItems = computed(() => selectedBalance.value ? [
  { label: t('billing.detail.recordId'), value: selectedBalance.value.id || '—', mono: true },
  { label: t('common.created'), value: formatDateTime(selectedBalance.value.created_at) },
  { label: t('billing.detail.userId'), value: selectedBalance.value.user_id ?? '—' },
  { label: t('common.type'), value: balanceTypeLabel(selectedBalance.value.type) || '—' },
  { label: t('billing.col.amount'), value: formatCredits(selectedBalance.value.amount) },
  { label: t('billing.detail.balanceBefore'), value: formatCredits(selectedBalance.value.balance_before) },
  { label: t('billing.detail.balanceAfter'), value: formatCredits(selectedBalance.value.balance_after) },
  { label: t('billing.detail.operator'), value: selectedBalance.value.operator || '—' },
  { label: t('billing.col.note'), value: selectedBalance.value.note || '—' }
] : [])
const snapshotDetailItems = computed(() => {
  const record = normalizeBillingPriceSnapshot(selectedCharge.value?.price_snapshot)
  if (!record) return []
    const fields: [string, string][] = [
    ['provider', t('common.provider')], ['model', t('common.model')],
    ['matched_service_tier', t('billing.snapshot.matchedTier')], ['min_input_tokens', t('billing.snapshot.minInputTokens')],
    ['requested_service_tier', t('billing.snapshot.requestedTier')], ['response_service_tier', t('billing.snapshot.responseTier')],
    ['service_tier_source', t('billing.snapshot.tierSource')], ['effective_service_tier', t('billing.snapshot.effectiveTier')],
    ['response_tier_fallback', t('billing.snapshot.responseFallback')],
    ['context_input_tokens', t('billing.snapshot.contextInputTokens')],
    ['input_price_per_million', t('billing.snapshot.inputPerMillion')], ['output_price_per_million', t('billing.snapshot.outputPerMillion')],
    ['cache_read_price_per_million', t('billing.snapshot.cacheReadPerMillion')], ['cache_write_price_per_million', t('billing.snapshot.cacheWritePerMillion')],
    ['request_price', t('billing.snapshot.requestPrice')]
  ]
  return fields.filter(([key]) => record[key] != null && (key !== 'min_input_tokens' || Boolean(record.matched_service_tier))).map(([key, label]) => ({ label, value: typeof record[key] === 'boolean' ? (record[key] ? t('common.yes') : t('common.no')) : String(record[key]) }))
})
const chargeDetailItems = computed(() => selectedCharge.value ? [
  { label: t('billing.detail.chargeId'), value: selectedCharge.value.id || '—', mono: true },
  { label: t('billing.detail.requestId'), value: selectedCharge.value.request_id || '—', mono: true },
  { label: t('common.created'), value: formatDateTime(selectedCharge.value.created_at) },
  { label: t('billing.detail.endpoint'), value: selectedCharge.value.endpoint || '—', mono: true },
  { label: t('billing.detail.providerModel'), value: `${selectedCharge.value.provider || t('common.unknown')} / ${selectedCharge.value.model || t('common.unknown')}` },
  { label: t('billing.detail.actualModel'), value: selectedCharge.value.actual_model || selectedCharge.value.model || '—' },
  ...([['input_tokens', t('billing.metric.inputTokens')], ['output_tokens', t('billing.metric.outputTokens')], ['cache_tokens', t('billing.metric.cacheTokens')]] as [keyof BillingCharge, string][])
    .filter(([key]) => selectedCharge.value![key] != null)
    .map(([key, label]) => ({ label, value: formatNumber(selectedCharge.value![key]) })),
  { label: t('billing.detail.matchedRule'), value: selectedCharge.value.matched_price_rule || '—', mono: true },
  { label: t('billing.col.amount'), value: formatCredits(selectedCharge.value.amount) },
  { label: t('billing.detail.balanceTransition'), value: `${formatCredits(selectedCharge.value.balance_before)} → ${formatCredits(selectedCharge.value.balance_after)}` },
  { label: t('billing.detail.clientKey'), value: selectedCharge.value.api_key_label || selectedCharge.value.api_key_masked || '—' }
] : [])
return { overviewRange, dailyTrend, topUsers, topModels, topProviders, rankingGroups, financeMetrics, usageMetrics, balanceDetailItems, snapshotDetailItems, chargeDetailItems }
}
