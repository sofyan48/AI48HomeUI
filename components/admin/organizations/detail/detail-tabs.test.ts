import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { organizationDetailTabs } from '../../../../composables/organizations/types'

const root = join(import.meta.dir, '../../../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('admin organization detail tabs', () => {
  test('detail dialog renders one section per tab', () => {
    expect(organizationDetailTabs).toEqual(['overview', 'members', 'keys', 'charges'])
    const dialog = read('components/admin/organizations/OrganizationsDetailDialog.vue')
    expect(dialog).toContain('<AppPanelTabs')
    for (const section of ['Overview', 'Members', 'Keys', 'Charges']) {
      expect(dialog).toContain(`<OrganizationsDetail${section}`)
    }
  })

  test('charges load lazily for the selected organization and ignore stale pages', () => {
    const workspace = read('composables/organizations/useOrganizationsWorkspace.ts')
    expect(workspace).toContain("query: { user_id: org.id")
    expect(workspace).toContain('version !== chargesVersion || selected.value?.id !== org.id')
    expect(workspace).toContain("tab === 'charges' && chargesLoadedFor.value !== selected.value?.id")
  })
})
