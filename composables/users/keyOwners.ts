import { normalizeUsers, type AccessKeyUser } from '../access-keys/normalize'
import { organizationEndpointMissing } from './organizations'

export function normalizeKeyOwners(users: unknown, organizations: unknown): AccessKeyUser[] {
  const payload = organizations as { organizations?: unknown } | null
  return [...normalizeUsers(users), ...normalizeUsers(payload?.organizations)]
}

export function organizationOwnerIds(organizations: unknown): Set<number> {
  const payload = organizations as { organizations?: unknown } | null
  return new Set(normalizeUsers(payload?.organizations).map(owner => owner.id))
}

export function withoutOrganizationKeys<T>(keys: T[], organizations: unknown, ownerId: (key: T) => number | null | undefined): T[] {
  const ids = organizationOwnerIds(organizations)
  return keys.filter(key => !ids.has(ownerId(key) ?? 0))
}

export function keyOwnerName(id: number | null | undefined, owners: AccessKeyUser[], unassigned: string): string {
  if (!id) return unassigned
  return owners.find(owner => owner.id === id)?.name || String(id)
}

/** Older deployments may not expose organizations at all. */
export async function loadKeyOwnerOrganizations(fetch: () => Promise<unknown>): Promise<unknown> {
  try {
    return await fetch()
  } catch (error) {
    if (organizationEndpointMissing(error)) return null
    throw error
  }
}
