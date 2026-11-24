import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import * as Vue from 'vue'
import * as types from './types'
import { useOrganizationCredentialScopes } from './useOrganizationCredentialScopes'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const org = (id: number, channel_groups?: number[]) => ({ id, name: `org-${id}`, credits: 10, model_groups: [1], ...(channel_groups === undefined ? {} : { channel_groups }) })
const tick = async () => { await Vue.nextTick(); await Vue.nextTick(); await Vue.nextTick() }

function harness() {
  const calls: Array<{ path: string, method?: string, body?: Record<string, unknown> }> = []
  const details = new Map<number, ReturnType<typeof deferred<{ organization: ReturnType<typeof org> }>>>()
  let scopes = deferred<{ channel_groups: Array<{ id: number, channel_name: string, disabled?: boolean }> }>()
  const fetchAPI = async (path: string, options: { method?: string, body?: Record<string, unknown> } = {}) => {
    calls.push({ path, ...options })
    if (options.method) return {}
    if (path === '/channel-groups') return scopes.promise
    if (path === '/organizations') return { organizations: [] }
    if (path === '/model-groups') return { model_groups: [] }
    if (path === '/users') return { users: [] }
    const id = Number(path.split('/')[2])
    return details.get(id)?.promise
  }
  const modules: Record<string, unknown> = {
    vue: Vue,
    '#imports': { useApi: () => ({ fetchAPI }), useAdminI18n: () => ({ t: (key: string) => key }) },
    '~/composables/admin-feedback/useAdminToast': { useAdminToast: () => ({ add: () => {} }) },
    '~/composables/useWorkspaceState': { useWorkspaceState: (_key: string, initial: () => unknown) => Vue.ref(initial()) },
    '~/composables/useCapabilities': { useCapabilities: () => ({ capabilities: Vue.ref({}) }) },
    '~/composables/usage/useUsageFilters': { datesForRange: () => ({}) },
    './useOrganizationKeyForm': { useOrganizationKeyForm: () => ({}) },
    './useOrganizationCredentialScopes': { useOrganizationCredentialScopes },
    './types': types,
    './memberLimits': {}, './memberAccess': {},
  }
  const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(read('composables/organizations/useOrganizationsWorkspace.ts'))
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_: string, names: string, path: string) => `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(path)}];`)
    .replace(/export function/g, 'function')
  const create = new Function('modules', `${js}; return createOrganizationsWorkspace`)(modules) as () => ReturnType<typeof import('./useOrganizationsWorkspace').provideOrganizationsWorkspace>
  const owner = Vue.effectScope()
  const state = owner.run(create)!
  return { state, calls, details, owner, scopes, retryScopes: () => { scopes = deferred(); return scopes } }
}

describe('dedicated organization credential scopes', () => {
  test('create posts selected scope IDs and preserves unknown/disabled choices', async () => {
    const h = harness()
    h.state.openCreateOrg()
    h.state.orgForm.value.name = 'new'
    expect(h.state.orgSubmitDisabled.value).toBe(true)
    await h.state.saveOrg()
    expect(h.calls.some(call => call.method)).toBe(false)
    h.scopes.resolve({ channel_groups: [{ id: 2, channel_name: 'team' }, { id: 3, channel_name: 'disabled', disabled: true }] })
    await tick()
    h.state.toggleCredentialScope(2, true)
    h.state.toggleCredentialScope(99, true)
    h.state.toggleCredentialScope(3, true)
    expect(h.state.credentialScopeOptions.value.map(scope => scope.id)).toEqual([2, 3, 99])
    await h.state.saveOrg()
    expect(h.calls.find(call => call.method === 'POST')).toMatchObject({ path: '/organizations', body: { channel_groups: [2, 3, 99] } })
    h.owner.stop()
  })

  test('edit uses fresh detail, retains absent option IDs, and can explicitly clear scope', async () => {
    const h = harness()
    const fresh = deferred<{ organization: ReturnType<typeof org> }>()
    h.details.set(7, fresh)
    h.state.openEditOrg(org(7, []) as types.Organization)
    h.scopes.resolve({ channel_groups: [{ id: 2, channel_name: 'team' }] })
    await tick()
    await h.state.saveOrg()
    expect(h.calls.some(call => call.method)).toBe(false)
    fresh.resolve({ organization: org(7, [2, 99]) })
    await tick()
    expect(h.state.orgForm.value.channelGroups).toEqual([2, 99])
    expect(h.state.credentialScopeOptions.value.map(scope => scope.id)).toEqual([2, 99])
    await h.state.saveOrg()
    expect(h.calls.find(call => call.method === 'PATCH')?.body?.channel_groups).toEqual([2, 99])
    h.state.openEditOrg(org(7, [2, 99]) as types.Organization)
    await tick()
    h.state.orgForm.value.channelGroups = []
    await h.state.saveOrg()
    expect(h.calls.filter(call => call.method === 'PATCH').at(-1)?.body?.channel_groups).toEqual([])
    h.owner.stop()
  })

  test('older detail omitting channel_groups does not send an empty replacement', async () => {
    const h = harness()
    const fresh = deferred<{ organization: ReturnType<typeof org> }>()
    h.details.set(7, fresh)
    h.state.openEditOrg(org(7, [99]) as types.Organization)
    fresh.resolve({ organization: org(7) })
    h.scopes.resolve({ channel_groups: [] })
    await tick()
    await h.state.saveOrg()
    expect(h.calls.find(call => call.method === 'PATCH')?.body).not.toHaveProperty('channel_groups')
    h.state.openCreateOrg()
    h.state.orgForm.value.name = 'unrestricted'
    await tick()
    await h.state.saveOrg()
    expect(h.calls.find(call => call.method === 'POST')?.body).not.toHaveProperty('channel_groups')
    h.owner.stop()
  })

  test('scope errors block save until retry succeeds', async () => {
    const h = harness()
    h.state.openCreateOrg()
    h.state.orgForm.value.name = 'new'
    h.scopes.reject(new Error('offline'))
    await tick()
    expect(h.state.scopesError.value).toBeTruthy()
    await h.state.saveOrg()
    expect(h.calls.some(call => call.method)).toBe(false)
    const retry = h.retryScopes()
    const loaded = h.state.loadCredentialScopes()
    retry.resolve({ channel_groups: [] })
    await loaded
    expect(h.state.orgSubmitDisabled.value).toBe(false)
    h.owner.stop()
  })

  test('edit error supports retry; obsolete requests cannot overwrite a new form or disposed owner', async () => {
    const h = harness()
    const first = deferred<{ organization: ReturnType<typeof org> }>()
    const second = deferred<{ organization: ReturnType<typeof org> }>()
    h.details.set(1, first); h.details.set(2, second)
    h.state.openEditOrg(org(1) as types.Organization)
    h.scopes.resolve({ channel_groups: [] })
    first.reject(new Error('detail offline'))
    await tick()
    expect(h.state.orgFormLoadError.value).toBe('detail offline')
    await h.state.saveOrg()
    expect(h.calls.some(call => call.method)).toBe(false)
    const retry = deferred<{ organization: ReturnType<typeof org> }>()
    h.details.set(1, retry)
    void h.state.reloadOrgForm()
    h.state.openEditOrg(org(2) as types.Organization)
    second.resolve({ organization: org(2, [8]) })
    await tick()
    retry.resolve({ organization: org(1, [99]) })
    await tick()
    expect(h.state.orgForm.value.channelGroups).toEqual([8])
    const late = deferred<{ organization: ReturnType<typeof org> }>()
    h.details.set(1, late)
    h.state.openEditOrg(org(1) as types.Organization)
    h.state.orgFormOpen.value = false
    h.state.openCreateOrg()
    late.resolve({ organization: org(1, [99]) })
    await tick()
    expect(h.state.orgForm.value.channelGroups).toEqual([])
    const pending = h.retryScopes()
    void h.state.loadCredentialScopes()
    h.owner.stop()
    pending.resolve({ channel_groups: [{ id: 77, channel_name: 'late' }] })
    await tick()
    expect(h.state.credentialScopeOptions.value).toEqual([])
  })

  test('actual Organizations modal and overview wire scopes through existing admin controls', () => {
    const form = read('components/admin/organizations/OrganizationsFormDialog.vue')
    expect(form).toContain(':submit-disabled="orgSubmitDisabled"')
    expect(form).toContain('v-for="scope in credentialScopeOptions"')
    expect(form).toContain(':model-value="orgForm.channelGroups.includes(scope.id)"')
    expect(form).toContain('toggleCredentialScope(scope.id, $event === true)')
    expect(form).toContain('@click="orgForm.channelGroups = []"')
    expect(form).toContain('@click="loadCredentialScopes"')
    expect(form).toContain('@click="reloadOrgForm"')
    expect(form).toContain('@submit="saveOrg"')
    expect(read('components/admin/organizations/OrganizationsWorkspace.vue')).toContain('<OrganizationsFormDialog />')
    expect(read('components/admin/organizations/detail/OrganizationsDetailOverview.vue')).toContain('selected.channel_groups.map(credentialScopeName)')
  })
})
