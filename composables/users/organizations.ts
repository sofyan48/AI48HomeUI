export interface Organization {
  id: number
  name: string
  channel_groups?: number[]
  model_groups?: number[]
  member_count?: number
  owners?: string[]
  credits?: number
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}

function scopeIds(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.every(id => Number.isSafeInteger(id) && id > 0)) return undefined
  return [...new Set(value as number[])].sort((a, b) => a - b)
}

export function readOrganization(value: unknown): Organization {
  const item = record(value)
  if (!Number.isSafeInteger(item.id) || Number(item.id) <= 0 || typeof item.name !== 'string') {
    throw new Error('Invalid organization response')
  }
  return {
    id: Number(item.id), name: item.name,
    channel_groups: scopeIds(item.channel_groups), model_groups: scopeIds(item.model_groups),
    member_count: typeof item.member_count === 'number' ? item.member_count : undefined,
    owners: Array.isArray(item.owners) ? item.owners.filter((owner): owner is string => typeof owner === 'string') : undefined,
    credits: typeof item.credits === 'number' ? item.credits : undefined
  }
}

export function readOrganizations(value: unknown): Organization[] {
  const items = record(value).organizations
  if (!Array.isArray(items)) throw new Error('Invalid organizations response')
  return items.map(readOrganization)
}

export function readOrganizationDetail(value: unknown): Organization {
  return readOrganization(record(value).organization)
}

export function organizationEndpointMissing(error: unknown): boolean {
  const item = record(error)
  return [404, 405, 501].includes(Number(item.statusCode ?? item.status ?? record(item.response).status))
}

export function organizationScopeBody(ids: number[], supported: boolean): { channel_groups: number[] } {
  if (!supported) throw new Error('Organization credential scopes are not supported')
  const channel_groups = scopeIds(ids)
  if (!channel_groups) throw new Error('Invalid credential scope IDs')
  return { channel_groups }
}

/** Keep unknown/disabled bindings visible rather than silently dropping restrictive IDs. */
export function organizationScopeOptions(options: Array<{ value: number; label: string }>, selected: number[]) {
  return [...options, ...selected.filter(id => !options.some(option => option.value === id))
    .map(id => ({ value: id, label: `#${id}` }))]
}
