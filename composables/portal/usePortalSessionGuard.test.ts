import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./usePortalSessionGuard.ts', import.meta.url), 'utf8')
const javascript = new Bun.Transpiler({ loader: 'ts' }).transformSync(source.replace(/^import .*\n/gm, '').replace('export function', 'function'))

function guard(path: string, authenticated = true, failure?: unknown) {
  const redirects: unknown[] = []
  const calls: string[] = []
  let mounted!: () => Promise<void>
  let changed!: () => void
  const route = { path, fullPath: `${path}?from=test` }
  const token = { value: authenticated ? 'session' : '' }
  const dependencies = {
    useRoute: () => route,
    useRouter: () => ({ replace: async (target: unknown) => { redirects.push(target) } }),
    useUserApi: () => ({
      token,
      hydrateSession: () => { calls.push('hydrate') },
      loadCurrentUser: async () => { calls.push('user'); if (failure) throw failure },
      loadCapabilities: async () => { calls.push('capabilities') },
      clearSession: () => { calls.push('clear'); token.value = '' }
    }),
    onMounted: (callback: typeof mounted) => { mounted = callback },
    watch: (_getter: unknown, callback: typeof changed) => { changed = callback }
  }
  new Function(...Object.keys(dependencies), `${javascript}; usePortalSessionGuard()`)(...Object.values(dependencies))
  return { mount: () => mounted(), redirects, calls }
}

describe('shared portal session guard', () => {
  test('direct playground access without a session returns to login with its destination', async () => {
    const state = guard('/app/playground', false)
    await state.mount()
    expect(state.calls).toEqual(['hydrate'])
    expect(state.redirects).toEqual([{ path: '/app/login', query: { redirect: '/app/playground?from=test' } }])
  })

  test('authenticated playground loads the account and capabilities', async () => {
    const state = guard('/app/playground')
    await state.mount()
    expect(state.calls).toEqual(['hydrate', 'user', 'capabilities'])
    expect(state.redirects).toEqual([])
  })

  test('public model catalog remains accessible without a session', async () => {
    const state = guard('/app/models', false)
    await state.mount()
    expect(state.calls).toEqual(['hydrate'])
    expect(state.redirects).toEqual([])
  })

  test('expired sessions are cleared but transient failures preserve the session', async () => {
    for (const failure of [{ statusCode: 401 }, { code: 'approval_pending' }, { statusCode: 503 }]) {
      const state = guard('/app/playground', true, failure)
      await state.mount()
      const rejected = failure.statusCode === 401 || failure.code === 'approval_pending'
      expect(state.calls.includes('clear')).toBe(rejected)
      expect(state.redirects.length).toBe(rejected ? 1 : 0)
    }
  })
})
