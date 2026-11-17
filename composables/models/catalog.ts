import { pricingEntryPoint, type CatalogModel } from '~/composables/userModelCatalog'
import type { PortalMessageKey } from '~/locales/portal'

/** Pure helpers for the user model catalog page (/app/models). */
export type CapabilityFilter = 'tools' | 'structuredOutput' | 'reasoning'
export type DetailsSection = 'pricing' | null

export const capabilityOrder: CapabilityFilter[] = ['tools', 'structuredOutput', 'reasoning']
export const validSorts = new Set(['name', 'price-asc', 'price-desc'])
export const queryKeys = ['q', 'provider', 'modality', 'caps', 'mine', 'sort', 'minPrice', 'maxPrice'] as const
export const noFilterValue = '__no_filter__'
export const catalogPageSize = 24

export function validQueryString(value: unknown) { return typeof value === 'string' && value.length <= 200 ? value : '' }
export function parseProviders(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value]
  const seen = new Set<string>()
  return values.flatMap(item => {
    const provider = validQueryString(item).trim()
    const identity = provider.toLowerCase()
    if (!provider || seen.has(identity)) return []
    seen.add(identity)
    return [provider]
  })
}

export function parseCapabilities(value: unknown) {
  if (typeof value !== 'string') return []
  const requested = new Set(value.split(','))
  return capabilityOrder.filter(capability => requested.has(capability))
}
export function priceBound(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function matchesPriceRange(model: CatalogModel, min: string, max: string) {
  const lower = priceBound(min)
  const upper = priceBound(max)
  if (lower === null && upper === null) return true
  const price = openingPrice(model)
  return price !== null && (lower === null || price >= lower) && (upper === null || price <= upper)
}

export function normalizedQueryValue(value: unknown) { return typeof value === 'string' ? value : '' }

export function supportsCapability(model: CatalogModel, capability: CapabilityFilter) {
  if (capability === 'tools') return model.capabilities?.tool_calling?.status === 'supported'
  if (capability === 'structuredOutput') return model.capabilities?.structured_output?.status === 'supported'
  return model.capabilities?.reasoning?.status === 'supported'
}

export function modelLogoIcon(model: CatalogModel) {
  const identity = [model.id, model.display_name].join(' ').toLowerCase()
  if (/claude|anthropic/.test(identity)) return 'i-tabler-sparkles'
  if (/gemini|gemma|google|vertex|palm/.test(identity)) return 'i-tabler-brand-google'
  if (/gpt|openai|o1|o3|o4|codex/.test(identity)) return 'i-tabler-brand-openai'
  if (/grok|xai/.test(identity)) return 'i-tabler-brand-x'
  if (/llama|meta/.test(identity)) return 'i-tabler-brand-meta'
  if (/mistral|mixtral/.test(identity)) return 'i-tabler-wind'
  if (/deepseek/.test(identity)) return 'i-tabler-fish'
  if (/qwen|qwq|alibaba/.test(identity)) return 'i-tabler-cloud-computing'
  if (/kimi|moonshot/.test(identity)) return 'i-tabler-moon-stars'
  if (/cohere|command-r/.test(identity)) return 'i-tabler-affiliate'
  if (/amazon|nova|titan/.test(identity)) return 'i-tabler-brand-amazon'
  if (/microsoft|phi-/.test(identity)) return 'i-tabler-brand-windows'
  if (/perplexity|sonar/.test(identity)) return 'i-tabler-search'
  return 'i-tabler-robot'
}

export function catalogProviders(models: CatalogModel[]) {
  const providers = new Map<string, { provider: string; modelCount: number; accessibleCount: number }>()
  for (const model of models) {
    for (const provider of new Set(model.providers || [])) {
      if (!provider.trim()) continue
      const entry = providers.get(provider) || { provider, modelCount: 0, accessibleCount: 0 }
      entry.modelCount++
      if (model.accessible === true) entry.accessibleCount++
      providers.set(provider, entry)
    }
  }
  return [...providers.values()].sort((a, b) => a.provider.localeCompare(b.provider))
}

export function errorMessage(cause: any, fallback: string) { return cause?.message || fallback }
export function isNotFound(cause: any) { return cause?.statusCode === 404 || cause?.status === 404 }
export function openingPrice(model: CatalogModel) { return pricingEntryPoint(model.pricing)?.input ?? null }
export function budgetText(budget: Record<string, unknown>) { return Object.entries(budget).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ') }

// Composable labels/units are English identifiers; map them to translated display text.
export const componentLabelKeys: Record<string, PortalMessageKey> = {
  'Input': 'models.component.input', 'Output': 'models.component.output', 'Cache read': 'models.component.cacheRead',
  'Cache write': 'models.component.cacheWrite', 'Request': 'models.component.request', 'Cache write (30m)': 'models.component.cacheWrite30m',
  'Cache write (1h)': 'models.component.cacheWrite1h', 'Cache write (12h)': 'models.component.cacheWrite12h', 'Reasoning': 'models.component.reasoning',
  'Image input': 'models.component.imageInput', 'Image output': 'models.component.imageOutput', 'Audio input': 'models.component.audioInput',
  'Audio output': 'models.component.audioOutput', 'Image': 'models.component.image', 'Web search': 'models.tool.webSearch',
  'Web search query': 'models.tool.webSearchQuery', 'Web fetch': 'models.tool.webFetch', 'X search': 'models.tool.xSearch',
  'Code execution': 'models.tool.codeExecution', 'File search': 'models.tool.fileSearch', 'Document search': 'models.tool.documentSearch',
  'Sources used': 'models.tool.sourcesUsed', 'Server tools': 'models.tool.serverTools'
}
export const unitKeys: Record<string, PortalMessageKey> = { '/ 1M tokens': 'models.unit.perMillion', '/ request': 'models.unit.perRequest', '/ image': 'models.unit.perImage', '/ call': 'models.unit.perCall' }
