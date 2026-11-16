// Normalizers for the shapes returned by the Management API (old and new field names).
import type { AnyRecord } from './common'

export function keyEntries(value: any): any[] {
  const entries = value?.api_key_entries ?? value?.items
  if (Array.isArray(entries) && entries.length) return entries
  const legacy = value?.['api-keys'] ?? value?.api_keys
  return Array.isArray(legacy) ? legacy.filter(entry => typeof entry === 'string') : []
}

export function normalizeKey(entry: any, index = 0): AnyRecord {
  const raw = typeof entry === 'string' ? { api_key: entry } : entry || {}
  const numericId = raw.id ?? raw.api_key_id ?? raw['api-key-id'] ?? null
  const apiKey = raw.api_key || raw['api-key'] || raw.key || raw.value || ''
  const modelGroups = raw.model_groups || raw['model-groups']
  return {
    ...raw,
    id: numericId != null ? String(numericId) : `${index}:${apiKey}`,
    numeric_id: numericId,
    index,
    api_key: apiKey,
    user_id: raw.user_id ?? raw['user-id'] ?? null,
    channels: Array.isArray(raw.channels) ? raw.channels.filter(Number.isFinite).map(Number) : [],
    model_groups: Array.isArray(modelGroups) ? modelGroups.filter(Number.isFinite).map(Number) : []
  }
}

export function keyPayload(key: AnyRecord) {
  return {
    api_key: key.api_key.trim(),
    user_id: key.user_id ?? 0,
    channels: key.channels || [],
    model_groups: key.model_groups || []
  }
}

export function credentialAuthId(item: AnyRecord | null | undefined): string {
  return String(item?.auth_id || item?.auth_index || item?.['auth-index'] || item?.id || item?.uuid || '').trim()
}

const channelBucketOf = (item: AnyRecord, fallback = '') =>
  item?.channel || item?.channel_bucket || item?.['channel-bucket'] || fallback

export function flattenModels(models: any): AnyRecord[] {
  if (Array.isArray(models)) return models.map(item => ({ ...item, channelBucket: channelBucketOf(item) }))
  if (models && typeof models === 'object') {
    return Object.entries(models).flatMap(([bucket, items]) =>
      Array.isArray(items) ? items.map(item => ({ ...item, channelBucket: channelBucketOf(item, bucket) })) : [])
  }
  return []
}

function firstText(item: AnyRecord, fields: string[]): string {
  for (const field of fields) {
    const value = item?.[field]
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim()
  }
  return ''
}

function normalizeProviders(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]
  return [...new Set(values
    .map(item => typeof item === 'string' || typeof item === 'number' ? String(item).trim() : firstText(item, ['id', 'name', 'provider']))
    .filter(Boolean))]
}

export type ModelCandidate = {
  id: string
  modelId: string
  label: string
  displayName: string
  ownedBy: string
  type: string
  providers: string[]
  channel: string
  scopes: string[]
}

function normalizeModelCandidate(item: AnyRecord, scope: string): ModelCandidate | null {
  const modelId = firstText(item, ['id', 'model_id', 'model-id', 'model', 'name'])
  if (!modelId) return null
  const displayName = firstText(item, ['displayName', 'display_name', 'display-name', 'label'])
  return {
    id: `model:${modelId}`,
    modelId,
    label: displayName || modelId,
    displayName,
    ownedBy: firstText(item, ['ownedBy', 'owned_by', 'owned-by']),
    type: firstText(item, ['type']),
    providers: normalizeProviders(item?.providers ?? item?.provider),
    channel: firstText(item, ['channelBucket', 'channel', 'channel_bucket', 'channel-bucket', 'source']),
    scopes: [scope]
  }
}

/** Merges runtime ("available") and static catalog models; available models sort first. */
export function mergeModelCandidates(runtime: AnyRecord[], staticModels: AnyRecord[]): ModelCandidate[] {
  const merged = new Map<string, ModelCandidate>()
  const add = (item: AnyRecord, scope: string) => {
    const candidate = normalizeModelCandidate(item, scope)
    if (!candidate) return
    const existing = merged.get(candidate.modelId)
    if (!existing) {
      merged.set(candidate.modelId, candidate)
      return
    }
    existing.scopes = [...new Set([...existing.scopes, ...candidate.scopes])]
    existing.displayName ||= candidate.displayName
    existing.label = existing.displayName || existing.modelId
    existing.ownedBy ||= candidate.ownedBy
    existing.type ||= candidate.type
    existing.channel ||= candidate.channel
    existing.providers = [...new Set([...existing.providers, ...candidate.providers])]
  }
  for (const item of runtime) add(item, 'available')
  for (const item of staticModels) add(item, 'static')
  return [...merged.values()].sort((left, right) =>
    Number(!left.scopes.includes('available')) - Number(!right.scopes.includes('available'))
    || left.modelId.localeCompare(right.modelId))
}
