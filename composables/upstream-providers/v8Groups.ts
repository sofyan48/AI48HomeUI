import type { ProviderCategory, ProviderCredential, ProviderEntry, ProviderGroup } from './types'
import { cloneValue } from '~/composables/upstream-providers/categories'

// Converts between the v8 grouped API shape and the flattened per-key rows shown in the table.
export const v8GroupFields = ['name', 'base-url', 'priority', 'disabled', 'prefix', 'proxy-url', 'headers', 'models', 'excluded-models', 'disable-cooling', 'request-retry', 'request-scoped-errors', 'support-prompt-cache-key']
export const v8NativeKeyFields = ['id', 'uuid', 'api-key', 'weight', 'priority', 'prefix', 'proxy-url', 'headers', 'models', 'excluded-models', 'disable-cooling', 'request-retry', 'request-scoped-errors', 'websockets', 'alpha-search', 'disable-codex-cloaking', 'cloak', 'experimental-cch-signing', 'rebuild-mid-system-message', 'fingerprint-profile', 'native-tool-search']
// Key-only overrides edited explicitly. Flattened entries merge group values, so these are
// written from `__set:<field>` markers instead of copied, keeping inherited group policies intact.
export const v8KeyOverrideFields = ['connection-pool', 'interactions']

export function flattenV8Groups(groups: unknown, category: ProviderCategory): ProviderEntry[] {
  if (!Array.isArray(groups)) return []
  const compat = category.value === 'openai-compatibility'
  return groups.flatMap((sourceGroup, groupIndex) => {
    const group = cloneValue(sourceGroup as ProviderGroup | null) || {}
    const keys = Array.isArray(group.keys) ? group.keys : []
    delete group.keys
    const groupEntries = keys.length ? keys : [null]
    return groupEntries.map((sourceKey, keyIndex) => {
      const key = cloneValue(sourceKey) || {}
      const entry: ProviderEntry = compat
        ? { ...group, id: key.id || key.uuid || key.auth_index || key['auth-index'] || group.id, uuid: key.uuid || group.uuid, auth_index: key.auth_index || key['auth-index'] || group.auth_index, weight: key.weight ?? 1, 'api-key-entries': sourceKey ? [key] : [] }
        : { ...group, ...key, weight: key.weight ?? 1 }
      if (compat) delete entry['excluded-models']
      entry.__v8Group = group
      entry.__v8GroupIndex = groupIndex
      entry.__v8KeyIndex = sourceKey ? keyIndex : -1
      entry.__v8Key = sourceKey ? key : null
      return entry
    })
  })
}

export function entriesFromResponse(response: unknown, category: ProviderCategory) {
  return flattenV8Groups(response, category)
}

function copyFields(target: Record<string, unknown>, source: Record<string, unknown>, fields: readonly string[]) {
  for (const field of fields) {
    if (Object.hasOwn(source, field)) target[field] = cloneValue(source[field])
    else delete target[field]
  }
}

function v8GroupFieldsChanged(entry: ProviderEntry, compat: boolean) {
  const original = entry.__v8Group || {}
  return v8GroupFields.some(field => (compat || field !== 'disable-cooling') && JSON.stringify(entry[field]) !== JSON.stringify(original[field]))
}

export function v8GroupsFromEntries(entries: ProviderEntry[], category: ProviderCategory): ProviderGroup[] {
  const compat = category.value === 'openai-compatibility'
  const buckets = new Map<string, ProviderEntry[]>()
  entries.forEach((entry, index) => {
    const key = Number.isInteger(entry.__v8GroupIndex) ? `existing:${entry.__v8GroupIndex}` : `new:${index}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(entry)
  })
  return [...buckets.values()].map((groupEntries) => {
    const editedEntry = groupEntries.find(entry => v8GroupFieldsChanged(entry, compat)) || groupEntries[0]!
    const group = cloneValue(editedEntry.__v8Group) || {}
    // Native cooling is a key override; changing it must not replace the inherited group policy.
    copyFields(group, editedEntry, compat ? v8GroupFields : v8GroupFields.filter(field => field !== 'disable-cooling'))
    if (compat) delete group['excluded-models']
    if (!compat) {
      delete group.id
      delete group.uuid
      group.keys = groupEntries.map((entry) => {
        const key: ProviderCredential = cloneValue(entry.__v8Key) || {}
        copyFields(key, entry, v8NativeKeyFields)
        for (const field of v8KeyOverrideFields) {
          if (!Object.hasOwn(entry, `__set:${field}`)) continue
          const override = entry[`__set:${field}`]
          if (override == null) delete key[field]
          else key[field] = cloneValue(override)
          // A single-key group's value is this key's value, so the editor owns it; shared groups stay intact.
          if (groupEntries.length === 1) delete group[field]
        }
        return key
      })
      return group
    }
    group.keys = groupEntries.flatMap(entry => cloneValue(entry['api-key-entries']) || [])
    if (group.keys.length) {
      delete group.id
      delete group.uuid
    }
    return group
  })
}
