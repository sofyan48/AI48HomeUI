import { describe, expect, test } from 'bun:test'
import { emptyMemberAccess, memberAccessBody, memberAccessFromRecord, memberKeyUsage, toggleMemberModelGroup } from './memberAccess'

describe('organization member access', () => {
  test('records hydrate model groups and key cap', () => {
    expect(memberAccessFromRecord({ model_groups: [3, 1], max_api_keys: 2 })).toEqual({ modelGroups: [3, 1], maxApiKeys: '2' })
    expect(memberAccessFromRecord({})).toEqual({ modelGroups: [], maxApiKeys: '' })
  })

  test('toggling keeps a sorted unique subset', () => {
    const form = emptyMemberAccess()
    toggleMemberModelGroup(form, 5, true)
    toggleMemberModelGroup(form, 2, true)
    toggleMemberModelGroup(form, 5, true)
    expect(form.modelGroups).toEqual([2, 5])
    toggleMemberModelGroup(form, 2, false)
    expect(form.modelGroups).toEqual([5])
  })

  test('max keys must be empty or a non-negative whole number', () => {
    expect(memberAccessBody({ modelGroups: [1], maxApiKeys: '' })).toEqual({ ok: true, body: { model_groups: [1], max_api_keys: null } })
    expect(memberAccessBody({ modelGroups: [], maxApiKeys: '0' })).toEqual({ ok: true, body: { model_groups: [], max_api_keys: 0 } })
    expect(memberAccessBody({ modelGroups: [], maxApiKeys: '1.5' })).toEqual({ ok: false, reason: 'maxKeys' })
    expect(memberAccessBody({ modelGroups: [], maxApiKeys: '-1' })).toEqual({ ok: false, reason: 'maxKeys' })
  })

  test('key usage shows the cap only when set', () => {
    expect(memberKeyUsage({ key_count: 2, max_api_keys: 5 })).toBe('2 / 5')
    expect(memberKeyUsage({ key_count: 2, max_api_keys: null })).toBe('2')
    expect(memberKeyUsage({})).toBe('0')
  })
})
