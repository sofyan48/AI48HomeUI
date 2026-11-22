// Pure helpers for organization-scoped billing/usage filters (no Nuxt runtime imports).

/** Option shape consumed by AdminSearchSelect. */
export interface OrganizationScopeItem {
  value: string
  label: string
  description?: string
  keywords?: string
}

/** Applied organization scope: organization ID plus optional member user ID, both as strings ('' = none). */
export interface OrganizationScopeValue {
  organization: string
  member: string
}

export const positiveId = (value: unknown) => {
  const text = String(Array.isArray(value) ? value[0] ?? '' : value ?? '').trim()
  return /^\d+$/.test(text) && Number(text) > 0 ? text : ''
}

/** Reads `?organization=<id>&member=<id>` deep links produced by the organization workspace. */
export function organizationScopeFromQuery(query: Record<string, unknown>): OrganizationScopeValue {
  const organization = positiveId(query.organization)
  return { organization, member: organization ? positiveId(query.member) : '' }
}

/** Adds the billed-owner and organization-member query parameters understood by Home billing/usage routes. */
export function applyOrganizationScope<T extends Record<string, unknown>>(query: T, scope: Partial<OrganizationScopeValue>): T {
  const organization = positiveId(scope.organization)
  if (!organization) return query
  const target = query as Record<string, unknown>
  target.user_id = organization
  const member = positiveId(scope.member)
  if (member) target.actor_user_id = member
  return query
}
