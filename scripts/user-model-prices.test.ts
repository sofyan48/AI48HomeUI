import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compareModelPrices } from '../composables/models/priceComparison'
import { groupModelPrices } from '../composables/models/priceGroups'
import { matchesCatalogFilter } from '../composables/userModelCatalog'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('portal model prices', () => {
  test('navigation groups Catalog and Price under Model and keeps pricing protected', () => {
    const layout = read('layouts/app.vue')
    expect(layout).toContain("key: 'model', label: t('shell.group.model')")
    expect(layout).toContain("['/app/models', '/app/models/price'].includes(item.to)")
    expect(read('composables/portal/usePortalSessionGuard.ts')).not.toContain("'/app/models/price'")
  })

  test('loads only authenticated accessible models without a public fallback', () => {
    const source = read('composables/models/useModelPrices.ts')
    expect(source.match(/fetchAPI</g)).toHaveLength(1)
    expect(source).toContain("('/models/accessible', { auth: true })")
    expect(source).toContain('if (!session) return')
    expect(source).toContain('models.value = []')
    expect(source).toContain('request !== generation || session !== token.value')
    expect(source).toContain('onScopeDispose(() => { generation++ })')
    expect(source).toContain("matchesCatalogFilter(model, search.value, '', true)")
    expect(matchesCatalogFilter({ id: 'active', accessible: true }, '', '', true)).toBe(true)
    expect(matchesCatalogFilter({ id: 'excluded', accessible: false }, '', '', true)).toBe(false)
    expect(matchesCatalogFilter({ id: 'unknown' }, '', '', true)).toBe(false)
  })

  test('groups models alphabetically and isolates provider prices without mutating the catalog', () => {
    const model = { id: 'shared', providers: ['z', 'a', 'a'], pricing: { status: 'published', providers: [
      { provider: 'z', tiers: [] }, { provider: 'a', tiers: [] }
    ] } }
    const groups = groupModelPrices([model, { id: 'unpriced', providers: ['a'] }, { id: 'unknown' }])
    expect(groups.map(group => group.provider)).toEqual(['a', 'z', ''])
    expect(groups[0].models.map(model => model.id)).toEqual(['shared', 'unpriced'])
    expect(groups[0].models[0].pricing?.providers?.map(offer => offer.provider)).toEqual(['a'])
    expect(groups[1].models[0].pricing?.providers?.map(offer => offer.provider)).toEqual(['z'])
    expect(model.pricing.providers).toHaveLength(2)
    expect(groupModelPrices([{ id: 'offer-only', pricing: model.pricing }])).toHaveLength(2)
    expect(groupModelPrices([])).toEqual([])
    const page = read('pages/app/models/price/index.vue')
    expect(page).toContain('<PortalSelect v-model="provider" :items="providerOptions"')
    expect(page).toContain(':models="visibleModels"')
    expect(page).not.toContain('group in providerGroups')
    const source = read('composables/models/useModelPrices.ts')
    expect(source).toContain("groupModelPrices(models.value)")
    expect(source).toContain("=== provider.value)?.models || []")
    expect(source).toContain("providerModels.value.filter")
    expect(source).toContain("provider.value = options[0]?.value || ''")
  })

  test('comparison sorts rates numerically, preserves zero, and puts unpublished rates last', () => {
    const model = (id: string, input?: number) => ({ id, pricing: { status: 'published', providers: [{ provider: 'p', tiers: [{ service_tier: '*', rungs: [{ min_input_tokens: 0, input_price_per_million: input, cache_read_price_per_million: input }] }] }] } })
    const models = [model('missing'), model('expensive', 15), model('free', 0), model('cheap', 3)]
    expect([...models].sort((a, b) => compareModelPrices(a, b, 'input', false)).map(model => model.id)).toEqual(['free', 'cheap', 'expensive', 'missing'])
    expect([...models].sort((a, b) => compareModelPrices(a, b, 'cacheRead', true)).map(model => model.id)).toEqual(['expensive', 'cheap', 'free', 'missing'])
    const page = read('pages/app/models/price/index.vue')
    const table = read('components/app/models/PriceRatesTable.vue')
    expect(table).toContain('tier.rungs.map')
    expect(table).toContain('rungPriceComponents(rung)')
    expect(table).toContain('row.original.formula')
    expect(table).toContain('row.original.threshold')
    expect(page).toContain('<PriceRatesTable')
    expect(page).toContain('<AppCard v-else')
    expect(page).toContain("t('models.prices.tableTitle')")
    expect(page).toContain("t('models.prices.title')")
    expect(page).not.toContain('<Card')
    expect(table).toContain('toggleSort(column.label)')
    expect(table).toContain('<PortalTable :data="sortedRows" :columns="tableColumns"')
        expect(table).not.toContain('<TableRow')
        expect(table).toContain(':aria-label="`${componentLabel(column.label)}')
  })

  test('Catalog shows only opening rates while complete pricing belongs to the Price modal', () => {
    expect(read('components/app/models/ModelsDetailDrawer.vue')).not.toContain('ModelPricing')
    const card = read('components/app/models/ModelsCard.vue')
    expect(card).toContain("t('models.price.from'")
    expect(card).toContain("modelLimit(model, 'context_length')")
    expect(card).toContain("modelLimit(model, 'max_output_tokens')")
    const catalog = read('pages/app/models/index.vue')
    expect(catalog).not.toContain("t('models.catalog.title')")
    expect(catalog).not.toContain("t('models.catalog.description')")
    expect(catalog).not.toContain('<AppCard')
    expect(card).not.toContain('models.price.complete')
    expect(card).not.toContain('models.price.tiered')
    expect(card).not.toContain('models.price.openingNote')
    expect(read('pages/app/models/price/index.vue')).toContain('<ModelPricing :model="selectedModel" />')
    const page = read('pages/app/models/price/index.vue')
    expect(page).not.toContain('pricingEntryPoint')
    expect(page).toContain('<AppModal v-model:open="priceDetailOpen"')
    expect(page).toContain('@details="openPriceDetails"')
    const renderer = read('components/app/models/ModelPricing.vue')
    expect(renderer).toContain('rungPriceComponents(rung).slice(0, 2)')
    expect(renderer).toContain('rungPriceComponents(rung).slice(2)')
    expect(renderer).toContain('v-if="!hideProvider"')
    for (const content of ['model.pricing.providers', 'offer.tiers', 'tier.rungs', 'rungPriceComponents(rung)', 'rung.pricing_expr', 'pricingText(model)']) {
      expect(renderer).toContain(content)
    }
  })
})
