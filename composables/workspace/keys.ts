import type { UserApiKey } from '~/stores/userSession'

export type WorkspaceKey = Omit<UserApiKey, 'id'> & { id: number | null; index: number }
function isObject(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
export function keyEntries(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isObject(payload)) return []
  for (const name of ['api_keys', 'api-keys', 'items', 'data']) {
    const value = payload[name]
    if (Array.isArray(value)) return value
    if (isObject(value)) {
      const nested = keyEntries(value)
      if (nested.length) return nested
    }
  }
  return []
}
function numericArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(Number).filter(item => Number.isInteger(item) && item > 0)
}
export function normalizeKey(entry: unknown, index: number): WorkspaceKey | null {
  const source = isObject(entry) ? entry : {}
  const value = String(typeof entry === 'string' ? entry : source.api_key ?? source['api-key'] ?? source.key ?? source.value ?? '').trim()
  if (!value) return null
  const numericID = Number(source.id ?? source.api_key_id ?? source['api-key-id'])
  return {
    id: Number.isInteger(numericID) && numericID > 0 ? numericID : null,
    index,
    api_key: value,
    display_name: typeof source.display_name === 'string' ? source.display_name.trim() || null : null,
    channels: numericArray(source.channels),
    model_groups: numericArray(source.model_groups ?? source['model-groups']),
    created_at: typeof source.created_at === 'string' ? source.created_at : undefined,
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : undefined
  }
}
export function maskKey(value: string) {
  const text = String(value || '')
  return text.length <= 12 ? `${text.slice(0, 3)}***` : `${text.slice(0, 8)}...${text.slice(-4)}`
}
