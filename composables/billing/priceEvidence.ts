export const billingServiceTiers = ['*', 'standard', 'flex', 'priority', 'ultrafast'] as const

export function billingTierChoices(extra: readonly (string | undefined)[] = []): string[] {
  return [...new Set<string>([...billingServiceTiers, ...extra.filter((tier): tier is string => Boolean(tier))])]
}

export function billingTierLabel(tier: string, t: (key: string) => string): string {
  if (tier === '*') return t('billing.tier.all')
  return billingServiceTiers.some(known => known === tier) ? t(`billing.tier.${tier}`) : tier
}

// Normalize audit evidence without supplying defaults that historical snapshots never recorded.
export function normalizeBillingPriceSnapshot(source: unknown): Record<string, unknown> | null {
  let value = source
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return null }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const normalized: Record<string, unknown> = { ...record }
  const aliases: Record<string, string[]> = {
    model: ['model', 'model_id', 'modelId'],
    matched_service_tier: ['matched_service_tier', 'matchedServiceTier', 'service_tier', 'serviceTier'],
    min_input_tokens: ['min_input_tokens', 'minInputTokens'],
    context_input_tokens: ['context_input_tokens', 'contextInputTokens', 'input_tokens_for_band', 'inputTokensForBand'],
    response_tier_fallback: ['response_tier_fallback', 'responseTierFallback', 'response_service_tier_fallback', 'responseServiceTierFallback']
  }
  for (const key of ['requested_service_tier', 'response_service_tier', 'service_tier_source', 'effective_service_tier', 'input_price_per_million', 'output_price_per_million', 'cache_read_price_per_million', 'cache_write_price_per_million', 'request_price']) {
    aliases[key] = [key, key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())]
  }
  for (const [key, names] of Object.entries(aliases)) {
    const isNumber = key.endsWith('_tokens') || key.endsWith('_per_million') || key === 'request_price'
    const found = names.map(name => record[name]).find(item => key === 'response_tier_fallback'
      ? typeof item === 'boolean'
      : isNumber ? typeof item === 'number' && Number.isFinite(item) : typeof item === 'string')
    delete normalized[key]
    if (found !== undefined) normalized[key] = found
  }
  normalized.min_input_tokens ??= null
  return normalized
}
