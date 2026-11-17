import { describe, expect, test } from 'bun:test'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { readFileSync } from 'node:fs'
import {
  mergeCatalogs, matchesCatalogFilter, pricingEntryPoint, extractRungToolPrices,
  rungPriceComponents, pricingMessage, formatCatalogPrice,
  type CatalogModel, type PriceRung
} from '../composables/userModelCatalog'

const rung = (input: number, output: number, threshold = 0): PriceRung => ({
  min_input_tokens: threshold, input_price_per_million: input, output_price_per_million: output,
  cache_read_price_per_million: 0, cache_write_price_per_million: 0.5, request_price: 0
})
const priced: CatalogModel = {
  id: 'Model-A', providers: ['serving-provider'], pricing: { status: 'published', providers: [
    { provider: 'serving-provider', tiers: [
      { service_tier: 'flex', rungs: [rung(0.1, 0.2)] },
      { service_tier: '*', is_default: true, rungs: [rung(0.01, 0.02, 128000), rung(2, 4)] }
    ] },
    { provider: 'second-provider', tiers: [{ service_tier: '*', is_default: true, rungs: [rung(1, 5)] }] }
  ] }
}

describe('user model catalog parity', () => {
  test('keeps the public backbone, marks exclusions, and appends access-only models', () => {
    const publicModels = [{ id: 'Model-A', description: 'Public metadata' }, { id: 'B' }]
    const result = mergeCatalogs(publicModels, [{ ...priced, id: 'model-a' }, { id: 'C' }])
    expect(result.map(model => [model.id, model.accessible])).toEqual([['Model-A', true], ['B', false], ['C', true]])
    expect(result[0].description).toBe('Public metadata')
    expect(result[0].pricing).toEqual(priced.pricing)
    expect(publicModels[0]).not.toHaveProperty('accessible')
  })

  test('signed out or failed access stays unknown and preserves public prices', () => {
    const result = mergeCatalogs([priced, { id: 'B' }], null)
    expect(result.map(model => model.accessible)).toEqual([null, null])
    expect(result[0].pricing).toEqual(priced.pricing)
    expect(mergeCatalogs([priced], [])[0].accessible).toBe(false)
    expect(mergeCatalogs([], [priced])[0].accessible).toBe(true)
  })

  test('missing accessible pricing preserves public pricing but an explicit unpublished result overrides it', () => {
    for (const accessible of [{ id: 'model-a' }, { id: 'model-a', pricing: undefined }, { id: 'model-a', pricing: null }]) {
      const [merged] = mergeCatalogs([priced], [accessible])
      expect(merged?.pricing).toEqual(priced.pricing)
      expect(merged?.accessible).toBe(true)
    }
    expect(mergeCatalogs([priced], [{ id: 'model-a', pricing: { status: 'unpublished' } }])[0]?.pricing)
      .toEqual({ status: 'unpublished' })
  })

  test('searches serving providers and intersects provider and accessible-only filters', () => {
    expect(matchesCatalogFilter({ ...priced, accessible: true }, 'SERVING', 'serving-provider', true)).toBe(true)
    expect(matchesCatalogFilter({ ...priced, accessible: false }, '', '', true)).toBe(false)
    expect(matchesCatalogFilter({ ...priced, accessible: null }, '', '', true)).toBe(false)
    expect(matchesCatalogFilter(priced, '', 'model-vendor', false)).toBe(false)
  })

  test('opening prices use each provider default tier and lowest input threshold, not cheapest tier or rung', () => {
    expect(pricingEntryPoint(priced.pricing)).toMatchObject({ input: 1, output: 4, maxRungCount: 2, providerCount: 2 })
    expect(pricingEntryPoint(priced.pricing)?.serviceTiers).toEqual(['flex', '*'])
    expect(pricingEntryPoint({ status: 'unpublished' })).toBeNull()
    expect(pricingEntryPoint({ status: 'published', providers: [] })).toBeNull()
    expect(pricingEntryPoint({ status: 'published', providers: [{ provider: 'p', tiers: [{ service_tier: 'only', rungs: [rung(0, 0)] }] }] })?.input).toBe(0)
  })

  test('extracts literal forward/reverse tool coefficients without evaluating formulas', () => {
    expect(extractRungToolPrices({ ...rung(1, 2), pricing_expr: 'p * 2 + ws * usd(0.02) + 0.003 * ce + usd(0.004) * fs + wsq * usd(0.01)', web_search_price_per_call: 0.9 })).toEqual([
      { label: 'Web search', value: 0.02, unit: '/ call' },
      { label: 'Web search query', value: 0.01, unit: '/ call' },
      { label: 'Code execution', value: 0.003 / 1_000_000, unit: '/ call' },
      { label: 'File search', value: 0.004, unit: '/ call' }
    ])
    expect(extractRungToolPrices({ min_input_tokens: 0, pricing_expr: 'news * usd(2) + ws * usd(dynamic) + fs * 1e3' })).toEqual([])
    expect(extractRungToolPrices({ min_input_tokens: 0, web_search_price_per_call: 0 })[0]?.value).toBe(0)
  })

  test('converts bare coefficients to USD per call in both multiplication orders', () => {
    for (const expression of ['ws * 0.02', '0.02 * ws']) {
      expect(extractRungToolPrices({ min_input_tokens: 0, pricing_expr: expression }))
        .toEqual([{ label: 'Web search', value: 0.02 / 1_000_000, unit: '/ call' }])
    }
    for (const expression of ['ws * usd(0.02)', 'usd(0.02) * ws', 'ws * 20000', '20000 * ws']) {
      expect(extractRungToolPrices({ min_input_tokens: 0, pricing_expr: expression }))
        .toEqual([{ label: 'Web search', value: 0.02, unit: '/ call' }])
    }
    for (const expression of ['ws * 0', '0 * ws', 'ws * usd(0)', 'usd(0) * ws']) {
      expect(extractRungToolPrices({ min_input_tokens: 0, pricing_expr: expression })[0]?.value).toBe(0)
    }
    expect(extractRungToolPrices({ min_input_tokens: 0, web_search_price_per_call: 0.02 }))
      .toEqual([{ label: 'Web search', value: 0.02, unit: '/ call' }])
  })

  test('preserves zero, missing, tiny and optional prices, and request/cache components', () => {
    const components = rungPriceComponents({ ...rung(1, 2), image_price_per_image: 0.01, reasoning_price_per_million: 0 })
    expect(components.find(item => item.label === 'Cache read')?.value).toBe(0)
    expect(components.find(item => item.label === 'Request')).toMatchObject({ value: 0, unit: '/ request' })
    expect(components.find(item => item.label === 'Image')).toMatchObject({ value: 0.01, unit: '/ image' })
    expect(components.find(item => item.label === 'Reasoning')?.value).toBe(0)
    expect(formatCatalogPrice(undefined)).toBe('Not published')
    expect(formatCatalogPrice(0)).toBe('0.00 credits')
    expect(formatCatalogPrice(0.0000001)).toBe('< 0.000001 credits')
  })

  test('formats portal prices as localized credits without converting stored prices', () => {
    expect(formatCatalogPrice(2.5)).toBe('2.50 credits')
    expect(formatCatalogPrice(2.5, { locale: 'id-ID', creditsUnit: 'kredit' })).toBe('2,50 kredit')
    expect(formatCatalogPrice(0.0000001, { locale: 'id-ID', creditsUnit: 'kredit' })).toBe('< 0,000001 kredit')
    expect(formatCatalogPrice(null, { notPublished: 'Unavailable' })).toBe('Unavailable')
    for (const value of [-1, NaN, Infinity]) expect(formatCatalogPrice(value)).toBe('Not published')
    const table = readFileSync(new URL('../components/app/models/PriceRatesTable.vue', import.meta.url), 'utf8')
    expect(table).not.toContain('USD')
    expect(table).toContain("t('balance.creditsUnit')")
    for (const path of ['models.ts', 'ru/models.ts', 'zh-CN/models.ts', 'zh-TW/models.ts']) {
      expect(readFileSync(new URL(`../locales/portal/${path}`, import.meta.url), 'utf8')).not.toContain('USD')
    }
  })

  test('explains signed-out, excluded, unknown and unpublished pricing distinctly', () => {
    expect(pricingMessage({ id: 'm' }, false)).toContain('Sign in')
    expect(pricingMessage({ id: 'm', accessible: false }, true)).toContain('outside your key access')
    expect(pricingMessage({ id: 'm', accessible: null }, true)).toContain('currently unavailable')
    expect(pricingMessage({ id: 'm', accessible: true }, true)).toContain('does not mean free')
  })

  const catalogSfcs = [
    '../pages/app/models/index.vue',
    '../components/app/models/ModelsAlerts.vue',
    '../components/app/models/ModelsFilters.vue',
    '../components/app/models/ModelsGrid.vue',
    '../components/app/models/ModelsCard.vue',
    '../components/app/models/ModelsDetailDrawer.vue'
  ]
  for (const path of catalogSfcs) {
    test(`${path.slice(3)} compiles with the Vue SFC compiler`, () => {
      const filename = new URL(path, import.meta.url).pathname
      const { descriptor, errors } = parse(readFileSync(filename, 'utf8'), { filename })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: 'user-model-catalog' })
      const template = compileTemplate({ source: descriptor.template!.content, filename, id: 'user-model-catalog', compilerOptions: { bindingMetadata: script.bindings } })
      expect(template.errors).toEqual([])
    })
  }
})
