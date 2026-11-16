import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { changedUsersKeyBindings, usersKeyOwnerOptions } from '../composables/usersKeyBindings'
import { billingCatalogSources, billingSettingsPayload, defaultBillingImportPreferences, normalizeBillingSettings, readBillingImportPreferences, writeBillingImportPreferences } from '../composables/billingPreferences'

describe('users key owner and changed-only bindings', () => {
  const users = [{ id: 1, username: 'active' }, { id: 2, username: 'old', deleted_at: '2026-01-01' }]
  test('keeps a deleted selected owner visible but excludes other deleted users', () => {
    expect(usersKeyOwnerOptions(users, 2)).toContainEqual({ label: 'old (deleted)', value: 2 })
    expect(usersKeyOwnerOptions(users, 1).map(option => option.value)).toEqual([0, 1])
  })
  test('keeps missing owners visible and offers explicit unassignment', () => {
    expect(usersKeyOwnerOptions(users, 99)).toContainEqual({ label: '#99 (unavailable)', value: 99 })
    expect(usersKeyOwnerOptions(users, 99)[0]).toEqual({ label: 'Unassigned', value: 0 })
  })
  const original = { user_id: 2, channels: [1, 2], model_groups: [3] }
  test('unchanged owner and reordered or duplicated scopes produce no PATCH fields', () => {
    expect(changedUsersKeyBindings(original, { user_id: '2', channels: [2, 1, 1], model_groups: [3] })).toEqual({})
  })
  test('scope-only changes never resend an unavailable owner or unchanged scopes', () => {
    expect(changedUsersKeyBindings(original, { ...original, channels: [4] })).toEqual({ channels: [4] })
    expect(changedUsersKeyBindings(original, { ...original, model_groups: [] })).toEqual({ model_groups: [] })
  })
  test('explicit reassignment and unassignment send the owner only', () => {
    expect(changedUsersKeyBindings(original, { ...original, user_id: 1 })).toEqual({ user_id: 1 })
    expect(changedUsersKeyBindings(original, { ...original, user_id: null })).toEqual({ user_id: 0 })
  })
})

describe('billing policy and catalog preferences', () => {
  test('defaults safely when older settings omit new fields', () => {
    expect(normalizeBillingSettings({ report_timezone: 'Asia/Shanghai' })).toEqual({ model_source: 'request', service_tier_source: 'request', report_timezone: 'Asia/Shanghai', public_model_pricing: false })
  })
  test('settings PATCH retains both matching sources, explicit false, and timezone', () => {
    expect(billingSettingsPayload({ model_source: 'response', service_tier_source: 'request', report_timezone: ' UTC ', public_model_pricing: false })).toEqual({ model_source: 'response', service_tier_source: 'request', report_timezone: 'UTC', public_model_pricing: false })
    expect(normalizeBillingSettings({ public_model_pricing: true }).public_model_pricing).toBe(true)
  })
  for (const source of billingCatalogSources) {
    test(`persists ${source.value} as the selected catalog`, () => {
      let raw = ''
      const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
      const preferences = { ...defaultBillingImportPreferences(), source: source.value, defaultMultiplier: 1.5, includeZeroCost: true,
        aliases: [{ target_model: 'alias', source_models: 'catalog-id' }],
        multiplierRules: [{ id: 'rule', label: 'Family', match_mode: 'prefix', pattern: 'model-', multiplier: 2 }] }
      expect(writeBillingImportPreferences(storage, 'scope', preferences)).toBe(true)
      expect(readBillingImportPreferences(storage, 'scope')).toEqual(preferences)
      expect(source.description.length).toBeGreaterThan(20)
    })
  }
  test('invalid and blocked preference storage falls back without blocking import', () => {
    for (const raw of ['{', 'null', JSON.stringify({ version: 1, source: 'unsupported' })]) {
      expect(readBillingImportPreferences({ getItem: () => raw }, 'scope')).toEqual(defaultBillingImportPreferences())
    }
    expect(readBillingImportPreferences({ getItem: () => { throw new Error('blocked') } }, 'scope')).toEqual(defaultBillingImportPreferences())
    expect(writeBillingImportPreferences({ setItem: () => { throw new Error('blocked') } }, 'scope', defaultBillingImportPreferences())).toBe(false)
  })
  test('preview-specific data and extra fields are never persisted', () => {
    let raw = ''
    writeBillingImportPreferences({ setItem: (_key, value) => { raw = value } }, 'scope', { ...defaultBillingImportPreferences(), rowMultipliers: { stale: 2 }, token: 'not-a-real-secret' } as any)
    expect(raw).not.toContain('rowMultipliers')
    expect(raw).not.toContain('token')
  })
})

for (const file of ['pages/admin/billing/index.vue', 'components/admin/billing/BillingPriceImport.vue', 'pages/admin/users/index.vue', 'components/admin/users/UsersKeyFormDialog.vue']) {
  test(`${file} compiles as a Vue SFC`, () => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    const { descriptor, errors } = parse(source, { filename: file })
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: file })
    const template = compileTemplate({ source: descriptor.template!.content, filename: file, id: file, compilerOptions: { bindingMetadata: script.bindings } })
    expect(template.errors).toEqual([])
    if (file.endsWith('UsersKeyFormDialog.vue')) {
      expect(source).toContain('changedUsersKeyBindings(editingKey.value, bindings)')
      expect(source).toContain('if (!Object.keys(changed).length)')
      expect(source).toContain('...changed')
    }
    if (file.endsWith('BillingPriceImport.vue')) {
      const logic = readFileSync(new URL('../composables/billing/useBillingPriceImport.ts', import.meta.url), 'utf8')
      expect(source).toContain('provideBillingPriceImport(props, emit)')
      expect(logic).toContain('source: source.value')
      expect(logic).toContain('watch([source, targets,')
    }
  })
}
