export type BillingCatalogSource = 'auto' | 'openrouter' | 'litellm' | 'models.dev'
export const billingCatalogSources: { value: BillingCatalogSource; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto (models.dev + OpenRouter + LiteLLM)', description: 'Combine models.dev, OpenRouter, and LiteLLM catalogs. Review the pinned source and match for each preview row.' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Match against the OpenRouter catalog only. Provider coverage and model IDs may differ from other catalogs.' },
  { value: 'litellm', label: 'LiteLLM', description: 'Match against the LiteLLM catalog only. Review provider-specific model IDs and supported price fields.' },
  { value: 'models.dev', label: 'models.dev', description: 'Match against the models.dev catalog only. Review provider/model matches and any missing price fields.' }
]
export type BillingImportPreferences = {
  source: BillingCatalogSource
  overwriteMode: string
  targetSet: string
  defaultMultiplier: number
  includeZeroCost: boolean
  aliases: { target_model: string; source_models: string }[]
  multiplierRules: { id: string; label: string; match_mode: string; pattern: string; multiplier: number }[]
}
export function defaultBillingImportPreferences(): BillingImportPreferences {
  return { source: 'auto', overwriteMode: 'missing', targetSet: 'available', defaultMultiplier: 1, includeZeroCost: false, aliases: [], multiplierRules: [] }
}
export function readBillingImportPreferences(storage: Pick<Storage, 'getItem'>, key: string): BillingImportPreferences {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null')
    if (value?.version !== 1 || !billingCatalogSources.some(source => source.value === value.source) ||
      !['missing', 'sync', 'all'].includes(value.overwriteMode) || !['all', 'available', 'synced', 'manual'].includes(value.targetSet) ||
      !Number.isFinite(value.defaultMultiplier) || value.defaultMultiplier <= 0 || typeof value.includeZeroCost !== 'boolean' ||
      !Array.isArray(value.aliases) || !value.aliases.every((alias: any) => typeof alias?.target_model === 'string' && typeof alias.source_models === 'string') ||
      !Array.isArray(value.multiplierRules) || !value.multiplierRules.every((rule: any) => typeof rule?.id === 'string' && typeof rule.label === 'string' &&
        ['prefix', 'regex'].includes(rule.match_mode) && typeof rule.pattern === 'string' && Number.isFinite(rule.multiplier) && rule.multiplier > 0)) return defaultBillingImportPreferences()
    return { source: value.source, overwriteMode: value.overwriteMode, targetSet: value.targetSet, defaultMultiplier: value.defaultMultiplier,
      includeZeroCost: value.includeZeroCost, aliases: value.aliases, multiplierRules: value.multiplierRules }
  } catch { return defaultBillingImportPreferences() }
}
export function writeBillingImportPreferences(storage: Pick<Storage, 'setItem'>, key: string, value: BillingImportPreferences) {
  try {
    // Preview-specific row multipliers, match overrides, and targets are never defaults.
    storage.setItem(key, JSON.stringify({ version: 1, source: value.source, overwriteMode: value.overwriteMode, targetSet: value.targetSet,
      defaultMultiplier: value.defaultMultiplier, includeZeroCost: value.includeZeroCost, aliases: value.aliases, multiplierRules: value.multiplierRules }))
    return true
  } catch { return false }
}

export function normalizeBillingSettings(settings: any) {
  return {
    model_source: settings?.model_source === 'response' ? 'response' : 'request',
    service_tier_source: settings?.service_tier_source === 'response' ? 'response' : 'request',
    report_timezone: settings?.report_timezone || 'UTC',
    public_model_pricing: settings?.public_model_pricing === true
  }
}
export function billingSettingsPayload(settings: ReturnType<typeof normalizeBillingSettings>) {
  return { ...normalizeBillingSettings(settings), report_timezone: settings.report_timezone.trim() }
}
