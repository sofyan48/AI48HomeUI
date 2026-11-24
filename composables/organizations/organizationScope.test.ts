import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { applyOrganizationScope, organizationScopeFromQuery } from './organizationScope'

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

describe('organization billing/usage scope', () => {
  test('deep links accept only positive IDs and require an organization for a member', () => {
    expect(organizationScopeFromQuery({ organization: '7', member: '3' })).toEqual({ organization: '7', member: '3' })
    expect(organizationScopeFromQuery({ organization: ['9'] })).toEqual({ organization: '9', member: '' })
    expect(organizationScopeFromQuery({ member: '3' })).toEqual({ organization: '', member: '' })
    expect(organizationScopeFromQuery({ organization: '0', member: '3' })).toEqual({ organization: '', member: '' })
    expect(organizationScopeFromQuery({ organization: '1;drop', member: 'x' })).toEqual({ organization: '', member: '' })
  })

  test('maps the scope to Home user_id and actor_user_id parameters', () => {
    expect(applyOrganizationScope({ from: '2026-01-01' }, { organization: '7', member: '3' })).toEqual({ from: '2026-01-01', user_id: '7', actor_user_id: '3' })
    expect(applyOrganizationScope({}, { organization: '7' })).toEqual({ user_id: '7' })
    expect(applyOrganizationScope({}, { organization: '', member: '3' })).toEqual({})
  })

  test('the filter stays hidden on Home builds that would ignore it', () => {
    const source = read('composables/organizations/useOrganizationScope.ts')
    expect(source).toContain("supports('organization_usage_filters', false)")
  })

  test('billing and usage views render the shared organization filter', () => {
    for (const file of [
      'components/admin/billing/FilterBar.vue',
      'components/admin/usage/overview/UsageFilters.vue',
      'components/admin/usage/RequestRecords.vue',
      'components/admin/usage/UsageLegacyRecords.vue',
    ]) {
      const source = read(file)
      expect(source).toContain("import OrganizationScopeFilter from '~/components/admin/general/OrganizationScopeFilter.vue'")
      expect(source).toContain('<OrganizationScopeFilter')
    }
    const usageFilters = read('composables/usage/useUsageFilters.ts')
    expect(usageFilters).toContain("params.set('user_id', source.organization)")
    expect(usageFilters).toContain("params.set('actor_user_id', source.member)")
    expect(read('composables/billing/useBillingWorkspace.ts')).toContain('if (source.organization) applyOrganizationScope(query, source)')
  })
})
