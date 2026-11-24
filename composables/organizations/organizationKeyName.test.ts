import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

describe('organization API key names', () => {
  test('admin create sends display_name and rename uses PATCH with null to clear', () => {
    const form = read('composables/organizations/useOrganizationKeyForm.ts')
    expect(form).toContain("method: 'PATCH', body: { display_name: normalized.name }")
    expect(form).toContain('if (normalized.name) body.display_name = normalized.name')
    expect(form).toContain("supports('organization_api_key_rename', false)")
    expect(form).toContain("return { ok: true, name: name || null }")
  })

  test('admin key tab offers rename only when Home supports it, members open the named create dialog', () => {
    expect(read('components/admin/organizations/detail/OrganizationsDetailKeys.vue')).toContain('v-if="canRenameKeys"')
    expect(read('components/admin/organizations/detail/OrganizationsDetailMembers.vue')).toContain('@click="openCreateKey(member(row))"')
    expect(read('components/admin/organizations/OrganizationsDetailPage.vue')).toContain('<OrganizationsKeyDialog />')
  })

  test('portal renames inline and names member keys before issuing', () => {
    const portal = read('composables/organizations-portal/usePortalOrganizations.ts')
    expect(portal).toContain("{ method: 'PATCH', body: { display_name: name || null } }")
    expect(portal).toContain('if (displayName) body.display_name = displayName')
    expect(read('components/app/organizations/OrganizationKeys.vue')).toContain('@submit.prevent="saveRenameKey(key)"')
    expect(read('components/app/organizations/OrganizationMembers.vue')).toContain('@click="openIssueKey(row.original)"')
  })
})
