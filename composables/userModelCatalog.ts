import type { UserModel } from '../stores/userSession'

export type PriceRung = {
  min_input_tokens: number
  input_price_per_million?: number | null
  output_price_per_million?: number | null
  cache_read_price_per_million?: number | null
  cache_write_price_per_million?: number | null
  request_price?: number | null
  pricing_expr?: string
  web_search_price_per_call?: number | null
  image_price_per_image?: number | null
  cache_write_30m_price_per_million?: number | null
  cache_write_1h_price_per_million?: number | null
  cache_write_12h_price_per_million?: number | null
  reasoning_price_per_million?: number | null
  image_input_price_per_million?: number | null
  image_output_price_per_million?: number | null
  audio_input_price_per_million?: number | null
  audio_output_price_per_million?: number | null
}
export type PriceTier = { service_tier: string; is_default?: boolean; rungs: PriceRung[] }
export type ModelPricing = { status: string; providers?: Array<{ provider: string; tiers: PriceTier[] }> }
export type CatalogModel = Omit<UserModel, 'availability' | 'pricing'> & {
  accessible?: boolean | null
  pricing?: ModelPricing | null
  availability?: NonNullable<UserModel['availability']> & {
    window?: { from: string; to: string; hours: number; min_samples: number }
    success_count?: number
    failed_count?: number
    output_tokens_per_second?: number
    first_observed_at?: string
  }
}
export type AccessSummary = { restricted: boolean; api_key_count: number; reason: string }
export const normalizedModelId = (id: string) => id.trim().toLowerCase()

export function mergeCatalogs(publicModels: CatalogModel[], accessibleModels: CatalogModel[] | null): CatalogModel[] {
  if (accessibleModels === null) return publicModels.map(model => ({ ...model, accessible: null }))
  const granted = new Map(accessibleModels.map(model => [normalizedModelId(model.id), model]))
  const merged = publicModels.map(model => {
    const key = normalizedModelId(model.id)
    const accessible = granted.get(key)
    granted.delete(key)
    return accessible ? { ...model, ...accessible, pricing: accessible.pricing ?? model.pricing, id: model.id, accessible: true } : { ...model, accessible: false }
  })
  return [...merged, ...Array.from(granted.values(), model => ({ ...model, accessible: true }))]
}

export function matchesCatalogFilter(model: CatalogModel, query: string, provider: string, mineOnly: boolean) {
  const text = query.trim().toLowerCase()
  return (!mineOnly || model.accessible === true) &&
    (!provider || model.providers?.includes(provider)) &&
    (!text || [model.id, model.display_name, model.description, ...(model.providers || [])]
      .some(value => value?.toLowerCase().includes(text)))
}

const toolVariables = [
  ['ws', 'Web search'], ['wsq', 'Web search query'], ['wf', 'Web fetch'], ['xs', 'X search'],
  ['ce', 'Code execution'], ['fs', 'File search'], ['ds', 'Document search'], ['mcp', 'MCP'],
  ['maps', 'Google Maps'], ['src', 'Sources used'], ['st', 'Server tools']
] as const

export function extractRungToolPrices(rung: PriceRung) {
  const prices = new Map<string, number>()
  const expression = rung.pricing_expr?.trim() || ''
  for (const [variable, label] of toolVariables) {
    const literal = '(?:usd\\(\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\)|([0-9]+(?:\\.[0-9]+)?))'
    const forward = new RegExp(`(?:^|[^a-zA-Z0-9_])${variable}\\s*\\*\\s*${literal}(?![\\w.])`)
    const reverse = new RegExp(`${literal}\\s*\\*\\s*${variable}(?:$|[^a-zA-Z0-9_])`)
    const match = expression.match(forward) ?? expression.match(reverse)
    const raw = match?.[1] ?? match?.[2]
    if (raw !== undefined && Number.isFinite(Number(raw))) {
      // Backend evaluation divides by a million; usd() alone cancels that scale.
      prices.set(label, Number(raw) / (match?.[1] !== undefined ? 1 : 1_000_000))
    }
  }
  if (!prices.has('Web search') && finitePrice(rung.web_search_price_per_call) !== null) {
    prices.set('Web search', rung.web_search_price_per_call!)
  }
  return Array.from(prices, ([label, value]) => ({ label, value, unit: '/ call' }))
}

function finitePrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}
function lowest(values: Array<number | null | undefined>) {
  const reported = values.map(finitePrice).filter((value): value is number => value !== null)
  return reported.length ? Math.min(...reported) : null
}
export function pricingEntryPoint(pricing: ModelPricing | null | undefined) {
  if (pricing?.status !== 'published' || !pricing.providers?.length) return null
  const tiers = pricing.providers.flatMap(provider => provider.tiers)
  const rungs = pricing.providers.flatMap(provider => {
    const tier = provider.tiers.find(tier => tier.is_default) ?? provider.tiers[0]
    const rung = tier?.rungs.reduce<PriceRung | undefined>((base, next) => !base || next.min_input_tokens < base.min_input_tokens ? next : base, undefined)
    return rung ? [rung] : []
  })
  if (!tiers.some(tier => tier.rungs.length)) return null
  const tools = new Map<string, number>()
  for (const rung of rungs) for (const tool of extractRungToolPrices(rung)) {
    tools.set(tool.label, Math.min(tools.get(tool.label) ?? Infinity, tool.value))
  }
  return {
    input: lowest(rungs.map(rung => rung.input_price_per_million)),
    output: lowest(rungs.map(rung => rung.output_price_per_million)),
    maxRungCount: Math.max(0, ...tiers.map(tier => tier.rungs.length)),
    providerCount: pricing.providers.length,
    serviceTiers: [...new Set(tiers.map(tier => tier.service_tier))],
    hasFormula: rungs.some(rung => Boolean(rung.pricing_expr?.trim())),
    toolPrices: Array.from(tools, ([label, value]) => ({ label, value, unit: '/ call' }))
  }
}

export function rungPriceComponents(rung: PriceRung) {
  const components = [
    { label: 'Input', value: rung.input_price_per_million, unit: '/ 1M tokens' },
    { label: 'Output', value: rung.output_price_per_million, unit: '/ 1M tokens' },
    { label: 'Cache read', value: rung.cache_read_price_per_million, unit: '/ 1M tokens' },
    { label: 'Cache write', value: rung.cache_write_price_per_million, unit: '/ 1M tokens' },
    { label: 'Request', value: rung.request_price, unit: '/ request' }
  ]
  const optional = [
    ['cache_write_30m_price_per_million', 'Cache write (30m)'],
    ['cache_write_1h_price_per_million', 'Cache write (1h)'],
    ['cache_write_12h_price_per_million', 'Cache write (12h)'],
    ['reasoning_price_per_million', 'Reasoning'], ['image_input_price_per_million', 'Image input'],
    ['image_output_price_per_million', 'Image output'], ['audio_input_price_per_million', 'Audio input'],
    ['audio_output_price_per_million', 'Audio output'], ['image_price_per_image', 'Image']
  ] as const
  for (const [key, label] of optional) {
    if (rung[key] != null) components.push({ label, value: rung[key], unit: key === 'image_price_per_image' ? '/ image' : '/ 1M tokens' })
  }
  return [...components, ...extractRungToolPrices(rung)]
}

export type PricingMessageKind = 'signIn' | 'outsideAccess' | 'unavailable' | 'notPublished'

export function pricingMessageKind(model: CatalogModel, authenticated: boolean): PricingMessageKind {
  if (!model.pricing) {
    if (!authenticated) return 'signIn'
    if (model.accessible === false) return 'outsideAccess'
    if (model.accessible == null) return 'unavailable'
  }
  return 'notPublished'
}

const pricingMessages: Record<PricingMessageKind, string> = {
  signIn: 'Sign in to see pricing for models covered by your keys.',
  outsideAccess: 'Pricing is not available for models outside your key access.',
  unavailable: 'Your key pricing is currently unavailable.',
  notPublished: 'No price published. This does not mean free.'
}

export function pricingMessage(model: CatalogModel, authenticated: boolean) {
  return pricingMessages[pricingMessageKind(model, authenticated)]
}

export function formatCatalogPrice(value: number | null | undefined, options: { locale?: string; notPublished?: string } = {}) {
  if (finitePrice(value) === null) return options.notPublished ?? 'Not published'
  if (value! > 0 && value! < 0.000001) return '< $0.000001'
  return new Intl.NumberFormat(options.locale ?? 'en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value!)
}
