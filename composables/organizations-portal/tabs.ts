// Organization portal sections. Members only manage their own keys and usage;
// the member roster is owner-only.
export type OrganizationTab = 'overview' | 'keys' | 'members' | 'charges'

export function organizationTabs(isOwner: boolean): OrganizationTab[] {
  return isOwner ? ['overview', 'keys', 'members', 'charges'] : ['overview', 'keys', 'charges']
}
