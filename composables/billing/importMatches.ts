type ImportTarget = { provider: string; model: string }
type ImportMatch = { target_provider: string; target_model: string; source_provider: string; source_model: string }
const identity = (provider: string, model: string) => `${provider.trim().toLowerCase()}::${model.trim()}`

// Keep stored catalog choices, but send only overrides belonging to this batch.
export function scopeImportMatches(targets: ImportTarget[], matches: ImportMatch[]): ImportMatch[] {
  const requested = new Set(targets.map(target => identity(target.provider, target.model)))
  return matches.filter(match => requested.has(identity(match.target_provider, match.target_model)))
}
