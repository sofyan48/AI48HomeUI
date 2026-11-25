import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { keyOwnerName, loadKeyOwnerOrganizations, normalizeKeyOwners, withoutOrganizationKeys } from './keyOwners'
import { usersKeyOwnerOptions } from '../usersKeyBindings'
import { ref } from 'vue'
import { useAccessKeySheet } from '../access-keys/useAccessKeySheet'
import { normalizeResource } from '../access-keys/normalize'
import type { AccessKeysState } from '../access-keys/useAccessKeys'
import { credentialAccountName } from './normalize'

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('key owner names', () => {
  test('organization-owned keys resolve the organization rather than the creating member', () => {
    const owners = normalizeKeyOwners({ users: [{ id: 1, username: 'Member' }] }, {
      organizations: [{ id: 8, name: 'Acme Team' }]
    })
    expect(keyOwnerName(8, owners, 'Unassigned')).toBe('Acme Team')
    expect(keyOwnerName(1, owners, 'Unassigned')).toBe('Member')
    expect(keyOwnerName(99, owners, 'Unassigned')).toBe('99')
    expect(keyOwnerName(0, owners, 'Unassigned')).toBe('Unassigned')
    expect(keyOwnerName(null, owners, 'Unassigned')).toBe('Unassigned')
  })

  test('owner form helpers resolve supplied owner metadata', () => {
    const owners = normalizeKeyOwners({ users: [{ id: 1, username: 'Member' }] }, {
      organizations: [{ id: 8, name: 'Acme Team' }]
    })
    const options = usersKeyOwnerOptions(owners.map(owner => ({ id: owner.id, username: owner.name })), 8)
    expect(options.find(option => option.value === 8)?.label).toBe('Acme Team')
    const state = { users: ref(owners), t: (key: string) => key,
      selectedResource: ref(null), sheetMode: ref('create'), detailOpen: ref(false) } as unknown as AccessKeysState
    const sheet = useAccessKeySheet(state)
    sheet.openEdit(normalizeResource({ api_key: 'key', user_id: 8 }, 0))
    expect(sheet.ownerUnavailable.value).toBe(false)
    expect(sheet.ownerOptions.value.find(option => option.value === '8')?.label).toBe('Acme Team')
    const form = source('components/admin/users/UsersKeyFormDialog.vue')
    expect(form).toContain('usersKeyOwnerOptions(keyOwners.value.map')
    expect(form).toContain('!keyOwners.value.some')
  })

  test('both general lists exclude organization keys while keeping member personal and unassigned keys', () => {
    const organizations = { organizations: [{ id: 8, name: 'Acme Team' }] }
    const keys = [{ userId: 8 }, { userId: 1 }, { userId: null }, { userId: 99 }]
    expect(withoutOrganizationKeys(keys, organizations, key => key.userId)).toEqual(keys.slice(1))
    expect(withoutOrganizationKeys(keys, null, key => key.userId)).toEqual(keys)
    expect(withoutOrganizationKeys([], organizations, key => key)).toEqual([])
    expect(source('composables/access-keys/useAccessKeys.ts')).toContain('withoutOrganizationKeys(resources.value, results[organizationsIndex], resource => resource.userId)')
    expect(source('composables/users/useUsersWorkspace.ts')).toContain('withoutOrganizationKeys(keysData.value, keyOwnerOrganizations.value, key => Number(key.user_id) || null)')
  })

  test('missing organization endpoints are compatible but actual failures are not hidden', async () => {
    expect(await loadKeyOwnerOrganizations(async () => { throw { statusCode: 404 } })).toBeNull()
    expect(await loadKeyOwnerOrganizations(async () => { throw { status: 501 } })).toBeNull()
    await expect(loadKeyOwnerOrganizations(async () => { throw new Error('offline') })).rejects.toThrow('offline')
  })

  test('both owner tables and searches use the resolved name', () => {
    expect(source('composables/access-keys/useAccessKeys.ts')).toContain('normalizeKeyOwners(results[usersIndex], null)')
    expect(source('composables/users/useUsersWorkspace.ts')).toContain('normalizeKeyOwners(users.value, null)')
    const table = source('components/admin/users/UsersKeysTab.vue')
    expect(table).toContain('ownerName(row.original.user_id)')
    expect(table).toContain('ownerName(key.user_id)')
  })
})

describe('credential scope account names', () => {
  test('uses account metadata and falls back to the credential ID', () => {
    expect(credentialAccountName({ auth_id: 'id', label: ' Work account ', email: 'work@example.com' })).toBe('Work account')
    expect(credentialAccountName({ auth_id: 'id', email: 'work@example.com', name: 'file.json' })).toBe('work@example.com')
    expect(credentialAccountName({ auth_id: 'missing' })).toBe('missing')
  })

  test('scope table resolves names and keeps IDs for search and binding identity', () => {
    const table = source('components/admin/users/UsersCredentialScopesTab.vue')
    expect(table).toContain('credentialName(row.original.auth_id)')
    expect(table).toContain('[item.auth_id, credentialName(item.auth_id)]')
    expect(source('components/admin/users/UsersBindingDialog.vue')).toContain('workspace.bindingCandidates')
    expect(source('composables/users/useUsersWorkspace.ts')).toContain('bindingCandidates.loadCredentials()')
  })
})
