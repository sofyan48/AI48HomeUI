import { describe, expect, test } from 'bun:test'
import { catalogProviders, matchesPriceRange, priceBound } from '../composables/models/catalog'
import { mergeCatalogs } from '../composables/userModelCatalog'

describe('catalog provider summary', () => {
  test('price ranges include boundaries and zero, and exclude unpublished prices only while active', () => {
    const model = { id: 'priced', pricing: { status: 'published', providers: [{ provider: 'p', tiers: [{ service_tier: '*', rungs: [{ min_input_tokens: 0, input_price_per_million: 2 }] }] }] } }
    expect(matchesPriceRange(model, '2', '2')).toBe(true)
    expect(matchesPriceRange(model, '3', '')).toBe(false)
    expect(matchesPriceRange(model, '', '1')).toBe(false)
    expect(matchesPriceRange(model, '3', '1')).toBe(false)
    expect(matchesPriceRange({ id: 'unpriced' }, '', '')).toBe(true)
    expect(matchesPriceRange({ id: 'unpriced' }, '0', '')).toBe(false)
    for (const value of ['', ' ', '-1', 'Infinity', 'no']) expect(priceBound(value)).toBeNull()
    expect(priceBound('0')).toBe(0)
    expect(priceBound('0.25')).toBe(0.25)
  })
  test('counts each model once per serving provider and sorts providers', () => {
    expect(catalogProviders([
      { id: 'a', providers: ['z', 'a', 'a', ''], accessible: true },
      { id: 'b', providers: ['z'], accessible: false },
      { id: 'c' }
    ])).toEqual([
      { provider: 'a', modelCount: 1, accessibleCount: 1 },
      { provider: 'z', modelCount: 2, accessibleCount: 1 }
    ])
  })

  test('does not infer key access from catalog membership', () => {
    const models = [{ id: 'a', providers: ['provider'] }]
    expect(catalogProviders(mergeCatalogs(models, null))[0]?.accessibleCount).toBe(0)
    expect(catalogProviders(mergeCatalogs(models, []))[0]?.accessibleCount).toBe(0)
    expect(catalogProviders(mergeCatalogs(models, models))[0]?.accessibleCount).toBe(1)
  })

  test('empty or missing provider lists do not invent provider status', () => {
    expect(catalogProviders([])).toEqual([])
    expect(catalogProviders([{ id: 'a' }, { id: 'b', providers: ['  '] }])).toEqual([])
  })
})
