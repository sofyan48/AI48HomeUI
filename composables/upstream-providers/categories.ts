import type { ProviderCategory, ProxyResponse, Translate } from './types'

// Provider categories and small helpers shared by the upstream providers workspace.
export const providerCategories: ProviderCategory[] = [
  { value: 'gemini-api-key', path: '/config/api-keys/gemini', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, 'excluded-models': [] } },
  { value: 'interactions-api-key', path: '/config/api-keys/interactions', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, 'excluded-models': [] } },
  { value: 'claude-api-key', path: '/config/api-keys/claude', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, 'excluded-models': [] } },
  { value: 'codex-api-key', path: '/config/api-keys/codex', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, websockets: false } },
  { value: 'xai-api-key', path: '/config/api-keys/xai', template: { 'api-key': '', 'base-url': 'https://api.x.ai/v1', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, websockets: false } },
  { value: 'meta-api-key', path: '/config/api-keys/meta', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {} } },
  { value: 'vertex-api-key', path: '/config/api-keys/vertex', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {} } },
  { value: 'openai-compatibility', path: '/config/api-keys/openai-compatibility', template: { name: '', 'base-url': '', priority: 0, weight: 1, disabled: false, prefix: '', 'api-key-entries': [], models: [], headers: {} } }
]

const providerMarks = ['G', 'G', 'C', 'Cx', 'xAI', 'M', 'V', 'AI']
providerCategories.forEach((category, index) => { category.mark = providerMarks[index] })

export const unsetCloakMode = '__not-set__'
export const automaticTestModel = '__auto__'

export function categoryLabel(t: Translate, category?: { value: string } | null) {
  const labels: Record<string, string> = {
    'gemini-api-key': t('upstream.providers.category.gemini'),
    'interactions-api-key': t('upstream.providers.category.interactions'),
    'claude-api-key': t('upstream.providers.category.claude'),
    'codex-api-key': t('upstream.providers.category.codex'),
    'xai-api-key': t('upstream.providers.category.xai'),
    'meta-api-key': t('upstream.providers.category.meta'),
    'vertex-api-key': t('upstream.providers.category.vertex'),
    'openai-compatibility': t('upstream.providers.category.openaiCompat')
  }
  return labels[category?.value || ''] || category?.value || ''
}

export function cloneValue<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export function providerApiPath(category: ProviderCategory) {
  return category.path
}

export function splitModelList(value: unknown) { return String(value || '').split(/[,\n]/).map(item => item.trim()).filter(Boolean) }

export function upstreamStatusError(t: Translate, response?: Pick<ProxyResponse, 'status_code'> | null) {
  return response?.status_code ? t('upstream.providers.upstreamHttp', { status: response.status_code }) : t('upstream.providers.upstreamError')
}
