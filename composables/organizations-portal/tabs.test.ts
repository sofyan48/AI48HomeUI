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

  test('workspace renders one section per tab and keeps the tab in the query string', () => {
    const source = readFileSync(join(root, 'components/app/organizations/OrganizationWorkspace.vue'), 'utf8')
    expect(source).toContain('<AppPanelTabs v-model="activeTab"')
    expect(source).toContain("activeTab === 'members' && isOwner")
    expect(source).toContain('route.query.tab')
    for (const tab of ['overview', 'keys', 'members', 'charges']) expect(source).toContain(`${tab}: 'i-tabler-`)
  })
})
