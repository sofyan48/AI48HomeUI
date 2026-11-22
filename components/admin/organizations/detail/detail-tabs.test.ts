import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { organizationDetailTabs } from '../../../../composables/organizations/types'

const root = join(import.meta.dir, '../../../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('admin organization detail tabs', () => {
  test('dedicated detail page renders one section per tab synced to ?tab=', () => {
    expect(organizationDetailTabs).toEqual(['overview', 'members', 'keys', 'charges'])
    const page = read('components/admin/organizations/OrganizationsDetailPage.vue')
    expect(page).toContain('<AppPanelTabs')
    for (const section of ['Overview', 'Members', 'Keys', 'Charges']) {
      expect(page).toContain(`<OrganizationsDetail${section}`)
    }
    expect(page).toContain("tab: value === 'overview' ? undefined : value")
    expect(page).toContain('askDeleteOrg(selected, backToList)')
    expect(read('pages/admin/organizations/[id]/index.vue')).toContain('<AdminOrganizationsDetailPage />')
    const list = read('components/admin/organizations/OrganizationsWorkspace.vue')
    expect(list).toContain('`/admin/organizations/${org.id}`')
    expect(list).not.toContain('OrganizationsDetailDialog')
  })

  test('charges and usage summary share the organization/member/range scope', () => {
    const workspace = read('composables/organizations/useOrganizationsWorkspace.ts')
    expect(workspace).toContain('query.actor_user_id = chargesFilter.value.member')
    expect(workspace).toContain('...chargesScopeQuery(org.id), limit: chargesPageSize')
    const charges = read('components/admin/organizations/detail/OrganizationsDetailCharges.vue')
    expect(charges).toContain('summary.load(chargesScopeQuery(org.id)')
    expect(charges).toContain('<OrganizationsUsageSummary')
    expect(charges).toContain(':date-range="chartDateRange"')
    expect(charges).toContain('datesForRange(chargesFilter.value.range)')
    const summary = read('components/admin/organizations/detail/OrganizationsUsageSummary.vue')
    expect(summary).toContain('props.overview?.daily_trend || [], props.dateRange.from, props.dateRange.to')
  })

  test('charges load lazily for the selected organization and ignore stale pages', () => {
    const workspace = read('composables/organizations/useOrganizationsWorkspace.ts')
    expect(workspace).toContain('const query: Record<string, string | number> = { user_id: orgId }')
    expect(workspace).toContain('version !== chargesVersion || selected.value?.id !== org.id')
    expect(workspace).toContain("tab === 'charges' && chargesLoadedFor.value !== selected.value?.id")
  })
})
