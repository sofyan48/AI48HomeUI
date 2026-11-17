import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import * as Vue from 'vue'
import { createMemoryHistory, createRouter, type LocationQueryRaw } from 'vue-router'
import { createPinia } from 'pinia'
import { useWorkspaceStore } from '../stores/workspace'
import * as catalog from '../composables/models/catalog'
import * as userModelCatalog from '../composables/userModelCatalog'
import type { ModelsWorkspace } from '../composables/models/useModelsWorkspace'

const source = readFileSync(new URL('../composables/models/useModelsWorkspace.ts', import.meta.url), 'utf8')
// Resolve imports per instance, like the SFC runtime tests, without global mock.module pollution.
// Execute the complete composable: its watchers, computed filters and lifecycle hooks stay real.
const javascript = new Bun.Transpiler({ loader: 'ts' }).transformSync(source)
  .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, path) =>
    `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(path)}];`)
  .replace(/export (function|const) /g, '$1 ')
const evaluate = new Function('modules', `${javascript}; return { provideModelsWorkspace, useModelsWorkspace };`)

const publicModels = [
  { id: 'claude', providers: ['gateway', 'anthropic'] },
  { id: 'gpt', providers: ['gateway', 'openai'] },
  { id: 'gemini', providers: ['google'] },
]

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

// Drain Vue jobs and router promise chains without timer-dependent sleeps.
async function settle() {
  for (let index = 0; index < 30; index++) {
    await Promise.resolve()
    await Vue.nextTick()
  }
}

type HostNode = { parent?: HostNode; children: HostNode[] }
const node = (): HostNode => ({ children: [] })
const renderer = Vue.createRenderer<HostNode, HostNode>({
  createElement: node, createText: node, createComment: node,
  setText() {}, setElementText() {}, patchProp() {},
  parentNode: child => child.parent ?? null,
  nextSibling: () => null,
  insert(child, parent) { child.parent = parent; parent.children.push(child) },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1) },
})

async function mountWorkspace(query: LocationQueryRaw = {}, options: { pending?: boolean; authenticated?: boolean } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/models', component: { render: () => null } }],
  })
  await router.push({ path: '/app/models', query })
  const token = Vue.ref(options.authenticated ? 'test-session' : '')
  const calls: string[] = []
  const publicResponse = deferred<{ models: typeof publicModels }>()
  const api = {
    token, capabilities: Vue.ref({ model_catalog: true }),
    loadCapabilities: async () => { calls.push('capabilities') },
    fetchAPI: async (path: string) => {
      calls.push(path)
      if (path === '/models') return options.pending ? publicResponse.promise : { models: publicModels }
      if (path === '/models/accessible') return { models: [publicModels[1]], access: { restricted: true, api_key_count: 1, reason: '' } }
      throw new Error(`Unexpected API request: ${path}`)
    },
  }
  const replacements: LocationQueryRaw[] = []
  const store = useWorkspaceStore(createPinia())
  const modules = {
    vue: Vue,
    '#imports': {
      useRoute: () => Vue.reactive({ query: Vue.computed(() => router.currentRoute.value.query) }),
      useRouter: () => ({ replace: (location: { query: LocationQueryRaw }) => {
        replacements.push(location.query)
        return router.replace(location)
      } }),
    },
    '~/composables/useUserApi': { useUserApi: () => api },
    '~/composables/usePortalI18n': { usePortalI18n: () => ({ t: (key: string) => key }) },
    '~/composables/models/useModelFormat': { useModelFormat: () => ({ capabilityLabels: () => [] }) },
    '~/composables/useWorkspaceState': {
      useWorkspaceState: (key: string, factory: () => unknown) => {
        const generation = store.initialize(key, factory())
        return Vue.computed({
          get: () => store.isCurrent(key, generation) ? store.values[key] : factory(),
          set: value => store.write(key, generation, value),
        })
      },
    },
    '~/composables/userModelCatalog': userModelCatalog,
    '~/composables/models/catalog': catalog,
  }
  const workspaceModule = evaluate(modules)
  let workspace!: ModelsWorkspace
  let injected!: ModelsWorkspace
  let mounts = 0
  const Child = Vue.defineComponent({
    setup() { injected = workspaceModule.useModelsWorkspace(); return () => null },
  })
  const app = renderer.createApp({
    setup() {
      mounts++
      workspace = workspaceModule.provideModelsWorkspace()
      return () => Vue.h(Child)
    },
  })
  app.mount(node())
  await settle()
  return { workspace, injected, router, calls, replacements, publicResponse, app, mounts: () => mounts }
}

const ids = (workspace: ModelsWorkspace) => workspace.filteredModels.value.map(model => model.id)

describe('models workspace reactive provider and route synchronization', () => {
  test('key access is the signed-in default and an explicit opt-out survives route changes', async () => {
    const view = await mountWorkspace({}, { authenticated: true })
    try {
      expect(view.workspace.mineOnly.value).toBe(true)
      expect(ids(view.workspace)).toEqual(['gpt'])
      view.workspace.mineOnly.value = false
      await settle()
      expect(view.router.currentRoute.value.query.mine).toBe('false')
      expect(ids(view.workspace)).toEqual(['claude', 'gemini', 'gpt'])
      await view.router.push({ query: { mine: 'false', provider: 'google' } })
      await settle()
      expect(view.workspace.mineOnly.value).toBe(false)
      expect(ids(view.workspace)).toEqual(['gemini'])
      await view.router.push({ query: {} })
      await settle()
      expect(view.workspace.mineOnly.value).toBe(true)
      expect(ids(view.workspace)).toEqual(['gpt'])
    } finally { view.app.unmount() }
  })
  test('provider clicks filter the injected workspace, update query and never reload the catalog', async () => {
    const view = await mountWorkspace({ campaign: 'keep' })
    try {
      expect(view.injected).toBe(view.workspace)
      expect(view.calls).toEqual(['capabilities', '/models'])
      const catalogRef = view.workspace.models.value
      const loading: boolean[] = []
      const stop = Vue.watch(view.workspace.loading, value => loading.push(value), { flush: 'sync' })
      view.workspace.catalogPage.value = 2
      view.injected.provider.value = 'openai'
      expect(ids(view.workspace)).toEqual(['gpt'])
      expect(view.workspace.catalogPage.value).toBe(1)
      await settle()
      expect(view.router.currentRoute.value.query).toEqual({ campaign: 'keep', provider: 'openai' })
      expect(view.replacements).toEqual([{ campaign: 'keep', provider: 'openai' }])
      expect(view.workspace.provider.value).toBe('openai')
      expect(view.workspace.pagedModels.value.map(model => model.id)).toEqual(['gpt'])
      view.injected.provider.value = ''
      await settle()
      expect(ids(view.workspace)).toEqual(['claude', 'gemini', 'gpt'])
      expect(view.router.currentRoute.value.query).toEqual({ campaign: 'keep' })
      expect(view.calls).toEqual(['capabilities', '/models'])
      expect(loading).toEqual([])
      expect(view.workspace.models.value).toBe(catalogRef)
      expect(view.mounts()).toBe(1)
      stop()
    } finally { view.app.unmount() }
  })

  test('external query changes and browser back/forward restore provider without fetches or replace loops', async () => {
    const view = await mountWorkspace({ provider: 'anthropic' })
    try {
      expect(ids(view.workspace)).toEqual(['claude'])
      await view.router.push({ query: { provider: 'google', campaign: 'keep' } })
      await settle()
      expect(view.workspace.provider.value).toBe('google')
      expect(ids(view.workspace)).toEqual(['gemini'])
      view.router.back()
      await settle()
      expect(view.workspace.provider.value).toBe('anthropic')
      expect(ids(view.workspace)).toEqual(['claude'])
      view.router.forward()
      await settle()
      expect(view.workspace.provider.value).toBe('google')
      expect(ids(view.workspace)).toEqual(['gemini'])
      expect(view.replacements).toEqual([])
      expect(view.calls).toEqual(['capabilities', '/models'])
    } finally { view.app.unmount() }
  })

  test('rapid provider clicks keep the newest selection while a route replacement is pending', async () => {
    const view = await mountWorkspace()
    const navigation = deferred<void>()
    const entered = deferred<void>()
    const remove = view.router.beforeEach(async to => {
      if (to.query.provider === 'anthropic') { entered.resolve(); await navigation.promise }
    })
    try {
      view.workspace.provider.value = 'anthropic'
      await entered.promise
      view.workspace.provider.value = 'openai'
      await settle()
      navigation.resolve()
      await settle()
      expect(view.workspace.provider.value).toBe('openai')
      expect(view.router.currentRoute.value.query.provider).toBe('openai')
      expect(ids(view.workspace)).toEqual(['gpt'])
      expect(view.workspace.loading.value).toBe(false)
      expect(view.calls).toEqual(['capabilities', '/models'])
    } finally { navigation.resolve(); remove(); view.app.unmount() }
  })

  test('a valid deep-linked provider survives loading and query changes during the pending fetch', async () => {
    const view = await mountWorkspace({ provider: 'anthropic' }, { pending: true })
    try {
      expect(view.workspace.loading.value).toBe(true)
      expect(view.workspace.provider.value).toBe('anthropic')
      await view.router.push({ query: { provider: 'openai' } })
      await settle()
      view.publicResponse.resolve({ models: publicModels })
      await settle()
      expect(view.workspace.provider.value).toBe('openai')
      expect(ids(view.workspace)).toEqual(['gpt'])
      expect(view.replacements).toEqual([])
      expect(view.calls).toEqual(['capabilities', '/models'])
    } finally { view.app.unmount() }
  })

  test('provider identity is case-insensitive and loading never silently broadens the filter', async () => {
    const view = await mountWorkspace({ provider: 'OpenAI', campaign: 'keep' }, { pending: true })
    try {
      expect(view.workspace.provider.value).toBe('OpenAI')
      view.publicResponse.resolve({ models: publicModels })
      await settle()
      expect(view.workspace.provider.value).toBe('OpenAI')
      expect(ids(view.workspace)).toEqual(['gpt'])
      expect(view.router.currentRoute.value.query).toEqual({ provider: 'OpenAI', campaign: 'keep' })
      expect(view.replacements).toEqual([])
      view.workspace.provider.value = 'missing'
      expect(ids(view.workspace)).toEqual([])
      expect(view.calls).toEqual(['capabilities', '/models'])
    } finally { view.app.unmount() }
  })

  test('providers are serving-provider membership, not inferred model brands', async () => {
    const view = await mountWorkspace()
    try {
      view.workspace.provider.value = 'gateway'
      await settle()
      expect(ids(view.workspace)).toEqual(['claude', 'gpt'])
      expect(view.workspace.models.value.find(model => model.id === 'claude')?.providers).toContain('gateway')
      expect(view.router.currentRoute.value.query.provider).toBe('gateway')
      expect(view.calls).toEqual(['capabilities', '/models'])
    } finally { view.app.unmount() }
  })
})
