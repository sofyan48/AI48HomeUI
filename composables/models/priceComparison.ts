import { pricingEntryPoint, type CatalogModel } from '../userModelCatalog'

export type PriceSort = 'name' | 'input' | 'output' | 'cacheRead'

export function compareModelPrices(a: CatalogModel, b: CatalogModel, sort: PriceSort, descending: boolean) {
  const name = (a.display_name || a.id).localeCompare(b.display_name || b.id)
  if (sort === 'name') return descending ? -name : name
  const aPrice = pricingEntryPoint(a.pricing)?.[sort] ?? null
  const bPrice = pricingEntryPoint(b.pricing)?.[sort] ?? null
  if (aPrice === null && bPrice === null) return name
  if (aPrice === null) return 1
  if (bPrice === null) return -1
  return (descending ? bPrice - aPrice : aPrice - bPrice) || name
}
