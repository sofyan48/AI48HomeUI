import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { memberCanReset, memberResetPolicy, type MemberResetRecord } from './memberResetAllowance'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const now = Date.parse('2026-11-22T10:00:00Z')

describe('organization member reset policy', () => {
  test('validates integer amounts including zero', () => {
    for (const amount of ['', ' ', '-1', '1.5', 'NaN', 'Infinity', '9007199254740992']) {
      expect(memberResetPolicy('one_time', amount, '', now)).toEqual({ ok: false, field: 'amount' })
    }
    expect(memberResetPolicy('one_time', '0', '', now)).toEqual({ ok: true, body: { mode: 'one_time', amount: 0 } })
  })
  test('converts one-time expiry to RFC3339 and never sends monthly expiry', () => {
    expect(memberResetPolicy('one_time', '2', '2026-12-01T12:00:00+07:00', now)).toEqual({
      ok: true, body: { mode: 'one_time', amount: 2, expires_at: '2026-12-01T05:00:00.000Z' },
    })
    for (const expiry of ['bad', '2026-11-22T10:00:00Z', '2026-01-01T00:00:00Z']) {
      expect(memberResetPolicy('one_time', '1', expiry, now)).toEqual({ ok: false, field: 'expiry' })
    }
    expect(memberResetPolicy('monthly', '3', 'bad', now)).toEqual({ ok: true, body: { mode: 'monthly', amount: 3 } })
  })
  test('reset requires available unexpired allowance and an enabled limit (including zero)', () => {
    const member: MemberResetRecord = { user_id: 2, limit_1d_credits: 0, reset_allowance: { mode: 'one_time', amount: 2, available: 1 } }
    expect(memberCanReset(member, now)).toBe(true)
    expect(memberCanReset({ ...member, reset_allowance: undefined }, now)).toBe(false)
    expect(memberCanReset({ ...member, reset_allowance: { ...member.reset_allowance!, available: 0 } }, now)).toBe(false)
    expect(memberCanReset({ ...member, reset_allowance: { ...member.reset_allowance!, expires_at: '2026-01-01T00:00:00Z' } }, now)).toBe(false)
    expect(memberCanReset({ ...member, spend_windows: [{ id: '1d', limit: null, used: 0, remaining: null }] }, now)).toBe(false)
  })
})

// Execute each real action function with isolated dependencies, not global module mocks.
function actionHarness(portal: boolean) {
  const path = portal ? 'composables/organizations-portal/usePortalOrganizations.ts' : 'composables/organizations/useOrganizationsWorkspace.ts'
  const source = read(path)
  const action = source.slice(source.indexOf('  async function updateMemberReset('), source.indexOf('\n  }', source.indexOf('  async function updateMemberReset(')) + 4)
  const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(action)
  const member = { user_id: 8, username: 'member', reset_allowance: { mode: 'one_time', amount: 2, available: 2 } }
  const returned = { user_id: 8, reset_allowance: { ...member.reset_allowance, available: 1 }, spend_windows: [{ id: '1d', limit: 5, used: 0, remaining: 5 }] }
  const calls: Array<{ path: string, options: Record<string, unknown> }> = []
  const state = {
    selected: { value: { id: 4, members: [member] } }, selectedId: { value: 4 },
    memberResetSupported: { value: true }, isOwner: { value: true },
    summary: { value: { member, spend_limits: [] } }, members: { value: [member] },
    fetchAPI: async (path: string, options: Record<string, unknown>) => { calls.push({ path, options }); return { member: returned } },
  }
  const invoke = new Function(...Object.keys(state), `${js}; return updateMemberReset`)(...Object.values(state)) as
    (id: number, signal: AbortSignal, policy?: { mode: string, amount: number }) => Promise<void>
  return { state, calls, invoke, returned, source }
}

for (const portal of [false, true]) describe(`${portal ? 'portal' : 'admin'} organization member reset actions`, () => {
  test('PUT sends policy; POST has no body or query; returned member updates immediately', async () => {
    const { state, calls, invoke, returned } = actionHarness(portal)
    const signal = new AbortController().signal
    const policy = { mode: 'monthly', amount: 2 }
    await invoke(8, signal, policy)
    expect(calls[0]).toEqual({ path: '/organizations/4/members/8/reset-allowance', options: { method: 'PUT', body: policy, signal } })
    await invoke(8, signal)
    expect(calls[1]).toEqual({ path: '/organizations/4/members/8/period-limits/reset', options: { method: 'POST', signal } })
    const member = portal ? state.members.value[0] : state.selected.value.members[0]
    expect(member).toMatchObject({ ...returned, username: 'member' })
    if (portal) expect(state.summary.value.spend_limits).toEqual(returned.spend_windows)
  })
  test('missing capability blocks both mutations on old deployments', async () => {
    const { state, invoke, calls, source } = actionHarness(portal)
    expect(source).toContain('capabilities.value.organization_member_reset_allowance === true')
    state.memberResetSupported.value = false
    await invoke(8, new AbortController().signal)
    await invoke(8, new AbortController().signal, { mode: 'monthly', amount: 2 })
    expect(calls).toEqual([])
  })
  test('aborted responses cannot update member state', async () => {
    const { state, invoke } = actionHarness(portal)
    const controller = new AbortController()
    controller.abort()
    await invoke(8, controller.signal)
    const member = portal ? state.members.value[0] : state.selected.value.members[0]
    expect(member.reset_allowance.available).toBe(2)
  })
  if (portal) test('non-owner can consume only self and cannot configure', async () => {
    const { state, invoke, calls } = actionHarness(true)
    state.isOwner.value = false
    await invoke(9, new AbortController().signal)
    await invoke(8, new AbortController().signal, { mode: 'monthly', amount: 2 })
    expect(calls).toEqual([])
    await invoke(8, new AbortController().signal)
    expect(calls).toHaveLength(1)
  })
})

test('shared allowance UI compiles and portal overview exposes self membership', () => {
  const source = read('components/AppOrganizationMemberReset.vue')
  const { descriptor, errors } = parse(source)
  expect(errors).toEqual([])
  const script = compileScript(descriptor, { id: 'member-reset' })
  expect(compileTemplate({ source: descriptor.template!.content, filename: 'AppOrganizationMemberReset.vue', id: 'member-reset', compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
  expect(source).toContain('v-if="canConfigure"')
  expect(source).toContain(':disabled="pending || !canReset"')
  expect(read('components/app/organizations/OrganizationSummary.vue')).toContain('v-if="memberResetSupported && summary?.member"')
})

test('portal charge pages cannot overwrite a different organization after switching', async () => {
  const source = read('composables/organizations-portal/usePortalOrganizations.ts')
  const start = source.indexOf('  async function loadChargesPage(')
  const action = source.slice(start, source.indexOf('\n  }', start) + 4)
  const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(action)
  let resolve!: (response: { items: unknown[] }) => void
  const pending = new Promise<{ items: unknown[] }>(done => { resolve = done })
  const selectedId = { value: 4 }
  const applied: unknown[] = []
  const invoke = new Function('selectedId', 'chargesPage', 'chargesLoading', 'fetchCharges', 'applyCharges',
    `let chargesVersion = 0; ${js}; return loadChargesPage`)(
    selectedId, { value: 1 }, { value: false }, () => pending, (response: unknown) => applied.push(response),
  ) as (page: number) => Promise<void>
  const request = invoke(2)
  selectedId.value = 5
  resolve({ items: [{ id: 'old-organization-charge' }] })
  await request
  expect(applied).toEqual([])
})

test('charges use organization billing scope in both workspaces', () => {
  expect(read('composables/organizations/useOrganizationsWorkspace.ts')).toContain('{ user_id: orgId }')
  const portal = read('composables/organizations-portal/usePortalOrganizations.ts')
  expect(portal).toContain('`${base.value}/billing/charges`')
  expect(portal).toContain('version === chargesVersion && selectedId.value === orgId')
  expect(portal).toContain('version !== selectionVersion || selectedId.value !== orgId')
})
