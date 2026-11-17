import type { CatalogModel } from '../userModelCatalog'

/** Keep each provider's price offers inside its own group without changing the source catalog. */
export function groupModelPrices(models: CatalogModel[]) {
  const groups = new Map<string, CatalogModel[]>()
  for (const model of models) {
    const providers = [...new Set([
      ...(model.providers || []),
      ...(model.pricing?.providers || []).map(offer => offer.provider)
    ].filter(Boolean))]
    for (const provider of providers.length ? providers : ['']) {
      const items = groups.get(provider) || []
      items.push({
        ...model,
        providers: provider ? [provider] : [],
        pricing: model.pricing ? {
          ...model.pricing,
          providers: model.pricing.providers?.filter(offer => offer.provider === provider)
        } : model.pricing
      })
      groups.set(provider, items)
    }
  }
  return [...groups].sort(([a], [b]) => a ? b ? a.localeCompare(b) : -1 : 1)
    .map(([provider, models]) => ({ provider, models: models.sort((a, b) => (a.display_name || a.id).localeCompare(b.display_name || b.id)) }))
}
