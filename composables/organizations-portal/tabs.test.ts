import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { organizationTabs } from './tabs'

const root = join(import.meta.dir, '../..')

describe('organization portal tabs', () => {
  test('owners get a members tab; members do not', () => {
    expect(organizationTabs(true)).toEqual(['overview', 'keys', 'members', 'charges'])
    expect(organizationTabs(false)).toEqual(['overview', 'keys', 'charges'])
  })

  test('owner member directory offers direct reset options and inline allowance editing', () => {
    const source = readFileSync(join(root, 'components/app/organizations/OrganizationMembers.vue'), 'utf8')
    expect(source).toContain('<PortalTable :data="members"')
    expect(source).toContain('searchable')
    expect(source).not.toContain('v-for="member in members"')
    expect(source).toContain('@click="openMemberForm(row.original)"')
    expect(source).toContain(':member="row.original" can-configure')
    expect(source).toContain('can-configure inline-configure')
    expect(source).not.toContain('v-model:open="resetOpen"')
    const reset = readFileSync(join(root, 'components/AppOrganizationMemberReset.vue'), 'utf8')
    expect(reset).toContain('v-if="inlineConfigure && canConfigure"')
    expect(reset).toContain('<AppModal v-else v-model:open="configureOpen"')
    expect(source).toContain('v-if="memberResetSupported"')
  })

  test('portal panels use structured cards rather than a decorated outer wrapper', () => {
    const organization = readFileSync(join(root, 'components/app/organizations/OrganizationWorkspace.vue'), 'utf8')
    const keys = readFileSync(join(root, 'components/app/workspace/keys/WorkspaceKeys.vue'), 'utf8')
    expect(organization).toContain('<AppCard>\n        <header')
    expect(organization).toContain('</AppCard>\n        <AppPanelTabs')
    expect(organization).not.toContain('sectionDescription')
    expect(keys).toContain('<template #header>')
    expect(keys).toContain("body: 'p-0 sm:p-0'")
    expect(keys).toContain('sm:max-w-sm')
    for (const source of [organization, keys]) expect(source).not.toContain('background: var(--user-panel-bg')
  })

  test('workspace renders one section per tab and keeps the tab in the query string', () => {
    const source = readFileSync(join(root, 'components/app/organizations/OrganizationWorkspace.vue'), 'utf8')
    expect(source).toContain('<AppPanelTabs v-model="activeTab"')
    expect(source).toContain("activeTab === 'members' && isOwner")
    expect(source).toContain('route.query.tab')
    for (const tab of ['overview', 'keys', 'members', 'charges']) expect(source).toContain(`${tab}: 'i-tabler-`)
  })
})
