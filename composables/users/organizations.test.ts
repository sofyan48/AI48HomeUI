import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import * as Vue from 'vue'
import * as helpers from './organizations'
import type { ApiRequestOptions } from '../useApi'
import type { useOrganizations } from './useOrganizations'

type State = ReturnType<typeof useOrganizations>
type Request = (path: string, options?: ApiRequestOptions) => Promise<unknown>
const source = readFileSync(new URL('./useOrganizations.ts', import.meta.url), 'utf8')
const javascript = new Bun.Transpiler({ loader: 'ts' }).transformSync(source)
  .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, path) =>
    `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(path)}];`)
  .replace(/export function /g, 'function ')
const evaluate = new Function('modules', `${javascript}; return useOrganizations;`)
const org = { id: 4, name: 'Team', channel_groups: [7, 99], model_groups: [2], owners: ['alice'], member_count: 1 }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function setup(request: Request) {
  const calls: Array<{ path: string; options?: ApiRequestOptions }> = []
  const notifications: unknown[] = []
  const access = Vue.ref(true)
  const keys: string[] = []
  const workspace = {
    fetchAPI: (path: string, options?: ApiRequestOptions) => { calls.push({ path, options }); return request(path, options) },
    t: (key: string) => key,
    toast: { add: (value: unknown) => notifications.push(value) },
    errorMessage: (error: unknown) => error instanceof Error ? error.message : 'Request failed',
    accessGroupsSupported: access, channelOptions: Vue.ref([{ value: 7, label: 'Primary' }]),
    users: Vue.ref([{ id: 1, username: 'alice' }, { id: 2, username: 'deleted', deleted_at: 'now' }]),
    loading: Vue.ref(false)
  }
  const factory = evaluate({
    vue: Vue,
    '~/composables/useWorkspaceState': { useWorkspaceState: (key: string, initial: () => unknown) => { keys.push(key); return Vue.ref(initial()) } },
    '~/composables/users/useUsersWorkspace': { useUsersWorkspace: () => workspace },
    '~/composables/users/organizations': helpers
  }) as () => State
  const scope = Vue.effectScope()
  const state = scope.run(factory)!
  return { state, calls, notifications, access, keys, stop: () => scope.stop() }
}

describe('organization credential scope UI', () => {
  test('users route exposes the organization tab and accessible create/edit/retry controls', () => {
    const page = readFileSync(new URL('../../pages/admin/users/index.vue', import.meta.url), 'utf8')
    const tab = readFileSync(new URL('../../components/admin/users/UsersOrganizationsTab.vue', import.meta.url), 'utf8')
    expect(page).toContain("activeTab === 'organizations'")
    expect(page).toContain("{ label: t('users.organizations'), value: 'organizations' }")
    expect(page).toContain('import UsersOrganizationsTab')
    expect(tab).toContain('@click="openCreate"')
    expect(tab).toContain('@click="openEdit(row.original)"')
    expect(tab).toContain('@click="reload"')
    expect(tab).toContain('@click="loadDetail"')
    expect(tab).toContain(':locked="saving"')
    expect(tab).toContain(':submit-disabled="!canSubmit"')
    expect(tab).toContain('<UsersScopePicker')
    expect(tab).toContain("useDataSync('admin:users:organizations:sync', reload)")
  })
  test('response parsing distinguishes missing fields from unrestricted and preserves restrictive IDs', () => {
    expect(helpers.readOrganizations({ organizations: [org] })[0]?.channel_groups).toEqual([7, 99])
    expect(helpers.readOrganization({ id: 1, name: 'old' }).channel_groups).toBeUndefined()
    expect(helpers.readOrganization({ id: 1, name: 'new', channel_groups: [] }).channel_groups).toEqual([])
    expect(helpers.organizationScopeBody([], true)).toEqual({ channel_groups: [] })
    expect(() => helpers.organizationScopeBody([7], false)).toThrow()
    expect(() => helpers.readOrganizations({})).toThrow()
    expect(helpers.organizationScopeOptions([{ value: 7, label: 'Main' }], [7, 99])).toEqual([
      { value: 7, label: 'Main' }, { value: 99, label: '#99' }
    ])
  })

  test('fresh detail drives editing and PATCH only replaces credential scopes, including clearing', async () => {
    const host = setup(async (path, options) => path === '/organizations'
      ? { organizations: [org] }
      : { organization: { ...org, channel_groups: options?.method === 'PATCH' ? [] : [99] } })
    try {
      await host.state.reload()
      await host.state.openEdit(org)
      expect(host.state.selected.value).toEqual([99])
      expect(host.state.scopeOptions.value).toContainEqual({ value: 99, label: '#99' })
      host.state.toggleScope(99)
      await host.state.submit()
      expect(host.calls.find(call => call.options?.method === 'PATCH')).toMatchObject({
        path: '/organizations/4', options: { body: { channel_groups: [] } }
      })
      expect(host.state.open.value).toBe(false)
      expect(host.notifications).toHaveLength(1)
      expect(host.keys).toEqual(['admin:users:organizations'])
    } finally { host.stop() }
  })

  test('create sends trimmed name, optional owner and supported scopes without unrelated fields', async () => {
    const host = setup(async (_path, options) => options?.method === 'POST' ? { organization: org } : { organizations: [org] })
    try {
      await host.state.reload()
      host.state.openCreate()
      await host.state.submit()
      expect(host.state.formError.value).toBe('users.organizationNameRequired')
      expect(host.calls.filter(call => call.options?.method === 'POST')).toHaveLength(0)
      host.state.name.value = '  Team  '
      host.state.ownerId.value = 1
      host.state.toggleScope(7)
      await host.state.submit()
      expect(host.calls.find(call => call.options?.method === 'POST')?.options?.body)
        .toEqual({ name: 'Team', owner_user_id: 1, channel_groups: [7] })
      expect(host.state.ownerOptions.value).toEqual([{ value: 0, label: 'users.organizationNoOwner' }, { value: 1, label: 'alice' }])
    } finally { host.stop() }
  })

  test('empty list bootstraps safely without unverified scope field then opens the supported editor', async () => {
    const host = setup(async (path, options) => path === '/organizations' && !options?.method
      ? { organizations: [] } : { organization: { ...org, channel_groups: [] } })
    try {
      await host.state.reload()
      host.state.openCreate()
      expect(host.state.scopeSupported.value).toBe(false)
      host.state.name.value = 'First'
      await host.state.submit()
      expect(host.calls.find(call => call.options?.method === 'POST')?.options?.body).toEqual({ name: 'First' })
      expect(host.state.editing.value?.id).toBe(4)
      expect(host.state.scopeSupported.value).toBe(true)
      expect(host.state.open.value).toBe(true)
    } finally { host.stop() }
  })

  test('old detail and capability false never permit scope writes', async () => {
    const old = { id: 4, name: 'Legacy' }
    const host = setup(async path => path === '/organizations' ? { organizations: [old] } : { organization: old })
    try {
      await host.state.reload()
      await host.state.openEdit(org)
      expect(host.state.canSubmit.value).toBe(false)
      await host.state.submit()
      host.state.openCreate()
      host.state.name.value = 'Legacy create'
      await host.state.submit()
      expect(host.calls.find(call => call.options?.method === 'POST')?.options?.body).toEqual({ name: 'Legacy create' })
      host.access.value = false
      await Vue.nextTick()
      await host.state.openEdit(org)
      expect(host.state.open.value).toBe(false)
      expect(host.calls.some(call => call.options?.method === 'PATCH')).toBe(false)
    } finally { host.stop() }
  })

  test('endpoint absence and ordinary errors are distinct and retry recovers', async () => {
    let failure: unknown = { statusCode: 404 }
    const host = setup(async () => { if (failure) throw failure; return { organizations: [] } })
    try {
      await host.state.reload()
      expect(host.state.unavailable.value).toBe(true)
      expect(host.state.loadError.value).toBe('')
      failure = new Error('Offline')
      await host.state.reload()
      expect(host.state.unavailable.value).toBe(false)
      expect(host.state.loadError.value).toBe('Offline')
      failure = null
      await host.state.reload()
      expect(host.state.loaded.value).toBe(true)
      expect(host.state.loadError.value).toBe('')
    } finally { host.stop() }
  })

  test('detail retry recovers and mutation errors retain form; duplicate saves are blocked', async () => {
    const pending = deferred<unknown>()
    let failDetail = true
    const host = setup(async (path, options) => {
      if (options?.method === 'PATCH') return pending.promise
      if (path === '/organizations') return { organizations: [org] }
      if (failDetail) throw new Error('Detail failed')
      return { organization: org }
    })
    try {
      await host.state.reload()
      await host.state.openEdit(org)
      expect(host.state.canSubmit.value).toBe(false)
      expect(host.state.formError.value).toBe('Detail failed')
      failDetail = false
      await host.state.loadDetail()
      expect(host.state.canSubmit.value).toBe(true)
      const first = host.state.submit()
      await host.state.submit()
      expect(host.calls.filter(call => call.options?.method === 'PATCH')).toHaveLength(1)
      pending.resolve({ organization: { ...org, channel_groups: [7] } })
      await first
      expect(host.state.saving.value).toBe(false)
    } finally { host.stop() }
  })

  test('stale list/detail responses cannot overwrite newer requests, and disposal aborts work', async () => {
    const first = deferred<unknown>()
    const detail = deferred<unknown>()
    let lists = 0
    const host = setup(async path => path === '/organizations'
      ? (++lists === 1 ? first.promise : { organizations: [org] }) : detail.promise)
    const oldList = host.state.reload()
    await host.state.reload()
    first.resolve({ organizations: [] })
    await oldList
    expect(host.state.organizations.value).toHaveLength(1)
    expect(host.calls[0]?.options?.signal?.aborted).toBe(true)
    const oldDetail = host.state.openEdit(org)
    host.state.openCreate()
    detail.resolve({ organization: org })
    await oldDetail
    expect(host.state.editing.value).toBeNull()
    expect(host.state.selected.value).toEqual([])
    const disposedDetail = host.state.openEdit(org)
    host.stop()
    await disposedDetail
    expect(host.calls.at(-1)?.options?.signal?.aborted).toBe(true)
    expect(host.notifications).toHaveLength(0)
  })

  test('mutation failure retains selections and gives actionable error feedback', async () => {
    const host = setup(async (path, options) => {
      if (options?.method === 'PATCH') throw new Error('Scope rejected')
      return path === '/organizations' ? { organizations: [org] } : { organization: org }
    })
    try {
      await host.state.reload()
      await host.state.openEdit(org)
      await host.state.submit()
      expect(host.state.formError.value).toBe('Scope rejected')
      expect(host.state.selected.value).toEqual([7, 99])
      expect(host.state.open.value).toBe(true)
      expect(host.state.saving.value).toBe(false)
      expect(host.notifications).toHaveLength(0)
    } finally { host.stop() }
  })
})
