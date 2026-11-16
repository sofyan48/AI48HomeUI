import { describe, expect, test } from 'bun:test'
import { ref } from 'vue'
import { readFileSync, readdirSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { normalizeResource, normalizeUsers, normalizeGroups, selectAPIKeyEntries, serializeEntry } from './normalize'
import { useAccessKeySheet } from './useAccessKeySheet'
import { useAccessKeyDeletion } from './useAccessKeyDeletion'
import { useAccessKeySummary } from './useAccessKeySummary'
import type { AccessKeysState } from './useAccessKeys'

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
function fixture() {
  const calls: any[] = []
  const errors: unknown[] = []
  const notices: any[] = []
  let syncs = 0
  const state = {
    t: (key: string) => key,
    fetchAPI: async (...args: any[]) => { calls.push(args) },
    toast: { add: (notice: unknown) => notices.push(notice) },
    users: ref([]), resources: ref([]), channelGroups: ref([]), modelGroups: ref([]),
    supportsDisplayNames: ref(true), submitting: ref(false), deleting: ref(false), bulkDeleting: ref(false),
    selectedResource: ref(null), selectedResources: ref([]), selectedIDs: ref(new Set()),
    sheetMode: ref('detail'), detailOpen: ref(false),
    syncData: async () => { syncs++ }, showErrorToast: (error: unknown) => errors.push(error),
    resourceSummary: (resource: ReturnType<typeof normalizeResource>) => resource.maskedValue,
  } as unknown as AccessKeysState
  return { state, calls, errors, notices, syncs: () => syncs }
}

describe('access key API compatibility', () => {
  test('normalizes modern aliases and legacy strings without exposing secrets in labels', () => {
    const key = normalizeResource({ 'api-key-id': 7, 'api-key': ' secret-long-value ', display_name: ' Production ', 'user-id': 0, channels: [1, '2', Infinity], 'model-groups': [3] }, 4)
    expect(key).toMatchObject({ id: '7', identifier: 'api-key-7', value: 'secret-long-value', displayName: 'Production', userId: null, channelGroupIds: [1], modelGroupIds: [3], maskedValue: 'secret...alue' })
    expect(normalizeResource(' short ', 2)).toMatchObject({ id: '2:short', numericId: null, identifier: null, maskedValue: 'sh***' })
    expect(selectAPIKeyEntries({ api_key_entries: [], 'api-keys': ['legacy', 42] })).toEqual(['legacy'])
    expect(selectAPIKeyEntries({ items: ['modern'], api_keys: ['legacy'] })).toEqual(['modern'])
    expect(selectAPIKeyEntries(null)).toEqual([])
    expect(serializeEntry(key, undefined)).not.toHaveProperty('display_name')
    expect(serializeEntry(key, ' ')).toMatchObject({ display_name: null, user_id: 0 })
    expect(normalizeUsers({ records: [{ userId: 3, userName: ' Name ', deleted_at: 'date' }, null] })).toEqual([{ id: 3, name: 'Name', deletedAt: 'date' }])
    expect(normalizeGroups({ channel_groups: [{ id: 2, channel_name: 'Disabled', disabled: true }, { id: 4, deleted_at: 'date' }] }, 'channel')).toEqual([{ id: 2, name: 'Disabled', disabled: true }])
  })
  test('create uses POST only, omits unsupported display names, and retains bindings', async () => {
    const f = fixture()
    const sheet = useAccessKeySheet(f.state)
    sheet.openCreate()
    Object.assign(sheet.form, { value: ' new-key ', displayName: ' Name ', userId: 3, channelGroupIds: [2], modelGroupIds: [4] })
    f.state.supportsDisplayNames.value = false
    await sheet.submitKey()
    expect(f.calls).toEqual([['/access/api-keys', { method: 'POST', body: { api_key: 'new-key', user_id: 3, channels: [2], model_groups: [4] } }]])
    expect(f.state.detailOpen.value).toBe(false)
    expect(f.syncs()).toBe(1)
    f.state.fetchAPI = async () => { throw new Error('unsupported') }
    const failingSheet = useAccessKeySheet(f.state)
    failingSheet.openCreate()
    failingSheet.form.value = 'key'
    await failingSheet.submitKey()
    expect(f.errors).toHaveLength(1)
    expect(f.state.submitting.value).toBe(false)
    expect(f.state.detailOpen.value).toBe(true)
  })
  test('updates omit unchanged bindings, preserve no-op, and retain legacy rotation selectors', async () => {
    for (const modern of [true, false]) {
      const f = fixture()
      const resource = normalizeResource({ ...(modern ? { id: 8 } : {}), api_key: 'old', display_name: 'Name', user_id: 9, channels: [2, 1], model_groups: [5] }, 3)
      f.state.resources.value = [resource]
      const sheet = useAccessKeySheet(f.state)
      sheet.openEdit(resource)
      sheet.form.channelGroupIds.reverse()
      await sheet.submitKey()
      expect(f.calls).toEqual([])
      expect(f.syncs()).toBe(0)
      sheet.openEdit(resource)
      sheet.form.displayName = ''
      await sheet.submitKey()
      expect(f.calls[0]).toEqual(['/access/api-keys', { method: 'PATCH', body: { ...(modern ? { id: 8 } : { api_key: 'old' }), display_name: null } }])
      sheet.openEdit(resource)
      sheet.form.value = ' rotated '
      sheet.form.userId = null
      sheet.form.modelGroupIds = []
      await sheet.submitKey()
      expect(f.calls[1]).toEqual(['/access/api-keys', { method: 'PATCH', body: { ...(modern ? { id: 8 } : { index: 3 }), value: { api_key: 'rotated', user_id: 0, model_groups: [] } } }])
    }
  })
  test('validation counts code points, blocks duplicate submission and resets visibility on close/open', async () => {
    const f = fixture()
    const sheet = useAccessKeySheet(f.state)
    sheet.openCreate()
    await sheet.submitKey()
    expect(sheet.keyValueError.value).toBe('keys.keyRequired')
    sheet.form.value = 'key'
    sheet.form.displayName = '😀'.repeat(129)
    await sheet.submitKey()
    expect(sheet.displayNameError.value).toBe('keys.displayNameTooLong')
    expect(f.calls).toEqual([])
    sheet.form.displayName = '😀'.repeat(128)
    f.state.submitting.value = true
    await sheet.submitKey()
    expect(f.calls).toEqual([])
    f.state.submitting.value = false
    await sheet.submitKey()
    expect(f.calls).toHaveLength(1)
    sheet.formSecretVisible.value = true
    sheet.detailSecretVisible.value = true
    sheet.handleDetailOpen(false)
    expect(sheet.formSecretVisible.value).toBe(false)
    expect(sheet.detailSecretVisible.value).toBe(false)
    const resource = normalizeResource('secret', 0)
    sheet.openEdit(resource)
    sheet.cancelForm()
    expect(f.state.sheetMode.value).toBe('detail')
    expect(f.state.detailOpen.value).toBe(true)
    sheet.openCreate()
    expect(sheet.form.value).toBe('')
    sheet.cancelForm()
    expect(f.state.detailOpen.value).toBe(false)
  })
  test('missing/deleted owners and disabled or missing scopes remain selectable', () => {
    const f = fixture()
    f.state.users.value = [{ id: 9, name: 'Deleted', deletedAt: 'date' }, { id: 10, name: 'Other', deletedAt: 'date' }]
    const sheet = useAccessKeySheet(f.state)
    sheet.openEdit(normalizeResource({ api_key: 'key', user_id: 9 }, 0))
    expect(sheet.ownerUnavailable.value).toBe(true)
    expect(sheet.ownerOptions.value.map(option => option.value)).toEqual(['unassigned', '9'])
    sheet.setFormOwner('99')
    expect(sheet.ownerOptions.value.at(-1)?.value).toBe('99')
    sheet.setFormOwner('-1')
    expect(sheet.form.userId).toBe(99)
    expect(sheet.scopeOptions([{ id: 1, name: 'Disabled', disabled: true }], [2])).toEqual([{ id: 1, label: 'keys.disabledSuffix' }, { id: 2, label: 'keys.unavailableId' }])
    sheet.toggleFormGroup('channelGroupIds', 2, true)
    sheet.toggleFormGroup('channelGroupIds', 2, true)
    expect(sheet.form.channelGroupIds).toEqual([2])
  })
  test('bulk deletion snapshots selection and deletes descending indices; failure keeps confirmation', async () => {
    const f = fixture()
    f.state.selectedResources.value = [normalizeResource('a', 0), normalizeResource({ id: 7, api_key: 'b' }, 2), normalizeResource('c', 1)]
    const deletion = useAccessKeyDeletion(f.state)
    deletion.openBulkDelete()
    f.state.selectedResources.value = []
    await deletion.confirmDestructiveAction()
    expect(f.calls.map(call => call[1])).toEqual([{ method: 'DELETE', query: { id: 7 } }, { method: 'DELETE', query: { index: 1 } }, { method: 'DELETE', query: { index: 0 } }])
    expect(f.state.selectedResource.value).toBeNull()
    expect(deletion.confirmationOpen.value).toBe(false)
    expect(f.syncs()).toBe(1)
    f.state.fetchAPI = async () => { throw new Error('failed') }
    const failed = useAccessKeyDeletion(f.state)
    failed.openDelete(normalizeResource('a', 0))
    await failed.confirmDestructiveAction()
    expect(failed.confirmationOpen.value).toBe(true)
    expect(f.state.deleting.value).toBe(false)
    expect(f.errors).toHaveLength(1)
  })
  test('summary remains reactive', () => {
    const f = fixture()
    const summary = useAccessKeySummary(f.state)
    expect(summary.value[0]?.value).toBe(0)
    f.state.resources.value = [normalizeResource('open', 0), normalizeResource({ api_key: 'bound', user_id: 2, channels: [1] }, 1)]
    expect(summary.value.map(item => item.value)).toEqual([2, 1, 1, 0])
    expect(summary.value[0]?.ratio).toBe(0.5)
  })
})

const components = readdirSync(new URL('../../components/admin/access-keys/', import.meta.url)).filter(name => name.endsWith('.vue')).map(name => `components/admin/access-keys/${name}`)
for (const path of ['pages/admin/access-keys.vue', ...components]) {
  test(`${path} compiles`, () => {
    const { descriptor, errors } = parse(source(path), { filename: path })
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: path })
    const template = compileTemplate({ source: descriptor.template!.content, filename: path, id: path, compilerOptions: { bindingMetadata: script.bindings } })
    expect(template.errors).toEqual([])
  })
}
test('single workspace owner, thin page, responsive disposal and unchanged sync lifecycle', () => {
  const page = source('pages/admin/access-keys.vue')
  expect(page.match(/= provideAccessKeys\(\)/g)).toHaveLength(1)
  expect(page).toContain("useDataSync('admin:access-keys:sync', syncData)")
  expect(page).toContain('await syncData()')
  expect(page).not.toContain('fetchAPI(')
  expect(page.split('\n').length).toBeLessThan(100)
  const table = source('composables/access-keys/useAccessKeyTable.ts')
  expect(table).toContain("window.matchMedia('(min-width: 640px)')")
  expect(table).toContain("mediaQuery?.removeEventListener?.('change', mediaQueryListener)")
  const workspace = source('composables/access-keys/useAccessKeys.ts')
  const keys = [...workspace.matchAll(/useWorkspaceState(?:<[^\n]+?>)?\('([^']+)'/g)].map(match => match[1])
  expect(keys).toHaveLength(12)
  expect(new Set(keys).size).toBe(12)
  expect(keys.every(key => key.startsWith('admin:access-keys:'))).toBe(true)
  for (const path of components) expect(source(path)).not.toContain('useWorkspaceState(')
  for (const folder of ['components/admin/access-keys/', 'composables/access-keys/']) {
    for (const name of readdirSync(new URL(`../../${folder}`, import.meta.url)))
      expect(source(folder + name).split('\n').length).toBeLessThan(500)
  }
})
