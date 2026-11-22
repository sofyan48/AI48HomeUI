// Member access helpers shared by the admin and portal organization screens:
// a model-group subset of the organization scope and a cap on organization keys.

export interface MemberAccessRecord {
  model_groups?: number[]
  max_api_keys?: number | null
  key_count?: number
}

export interface MemberAccessForm {
  /** Empty inherits the organization model groups. */
  modelGroups: number[]
  /** Empty means unlimited. */
  maxApiKeys: string
}

export const emptyMemberAccess = (): MemberAccessForm => ({ modelGroups: [], maxApiKeys: '' })

export function memberAccessFromRecord(record: MemberAccessRecord): MemberAccessForm {
  const max = record.max_api_keys
  return {
    modelGroups: Array.isArray(record.model_groups) ? [...record.model_groups] : [],
    maxApiKeys: max === null || max === undefined ? '' : String(max),
  }
}

export function toggleMemberModelGroup(form: MemberAccessForm, id: number, checked: boolean) {
  const rest = form.modelGroups.filter(item => item !== id)
  form.modelGroups = checked ? [...rest, id].sort((a, b) => a - b) : rest
}

export type MemberAccessBodyResult =
  | { ok: true, body: { model_groups: number[], max_api_keys: number | null } }
  | { ok: false, reason: 'maxKeys' }

/** max_api_keys must be a non-negative whole number or empty for unlimited. */
export function memberAccessBody(form: MemberAccessForm): MemberAccessBodyResult {
  const raw = form.maxApiKeys.trim()
  let maxApiKeys: number | null = null
  if (raw !== '') {
    maxApiKeys = Number(raw)
    if (!Number.isInteger(maxApiKeys) || maxApiKeys < 0) return { ok: false, reason: 'maxKeys' }
  }
  return { ok: true, body: { model_groups: [...form.modelGroups], max_api_keys: maxApiKeys } }
}

/** "2 / 5" style key usage; the cap is omitted when unlimited. */
export function memberKeyUsage(record: MemberAccessRecord): string {
  const used = record.key_count ?? 0
  return record.max_api_keys === null || record.max_api_keys === undefined ? String(used) : `${used} / ${record.max_api_keys}`
}
