import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import * as Vue from 'vue'
import { ComboboxRoot, ComboboxInput } from 'reka-ui'
import { cn } from 'cn'
import { positiveId } from './organizationScope'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const transpiler = new Bun.Transpiler({ loader: 'ts' })
function evaluate(source: string, modules: Record<string, unknown>, result: string) {
  const js = transpiler.transformSync(source)
    .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, path) => `const ${name} = modules[${JSON.stringify(path)}];`)
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, path) => `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(path)}];`)
    .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, path) => `const ${name} = modules[${JSON.stringify(path)}].default;`)
    .replace('export default', 'const component =').replace(/export (function|const)/g, '$1')
  return new Function('modules', `${js}; return ${result}`)({ vue: Vue, ...modules })
}
function component(path: string, modules: Record<string, unknown>) {
  const { descriptor } = parse(read(path), { filename: path })
  return evaluate(compileScript(descriptor, { id: path, inlineTemplate: true }).content, modules, 'component') as Vue.Component
}
const primitive = (tag: string) => Vue.defineComponent({
  setup: (_, { attrs, slots }) => () => Vue.h(tag, attrs, slots.default?.()),
})
const SearchSelect = component('components/admin/general/controls/AdminSearchSelect.vue', {
  cn: { cn }, 'reka-ui': { ComboboxInput },
  '~/components/AppIcon.vue': { default: primitive('svg') },
  '~/components/ui/combobox': {
    Combobox: ComboboxRoot,
    ...Object.fromEntries(['Anchor', 'Empty', 'Item', 'ItemIndicator', 'List', 'Trigger', 'Viewport'].map(name => [`Combobox${name}`, primitive(name)])),
  },
})
const ScopeFilter = component('components/admin/general/OrganizationScopeFilter.vue', {
  '~/components/admin/general/controls/AdminSearchSelect.vue': { default: SearchSelect },
  '~/composables/useAdminI18n': { useAdminI18n: () => ({ t: (key: string) => key }) },
})
type Node = { tag: string, props: Record<string, unknown>, children: Node[], parent?: Node, text?: string }
function mount(render: () => Vue.VNode) {
  const create = (tag = '', text?: string): Node => Object.assign({ tag, props: {}, children: [], text }, { closest: () => null, getAttribute: () => null })
  const renderer = Vue.createRenderer<Node, Node>({
    createElement: create, createText: text => create('', text), createComment: () => create(),
    setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
    parentNode: node => node.parent!, nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    insert: (node, parent, anchor) => {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      if (index < 0) parent.children.push(node)
      else parent.children.splice(index, 0, node)
    },
    remove: node => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) },
    patchProp: (node, key, _, value) => { node.props[key] = value },
  })
  const tree = create('root')
  const app = renderer.createApp({ setup: () => render })
  app.mount(tree)
  const all = (node = tree): Node[] => [node, ...node.children.flatMap(child => all(child))]
  function instances(vnode: Vue.VNode = app._instance!.subTree): Vue.ComponentInternalInstance[] {
    const own = vnode.component ? [vnode.component, ...instances(vnode.component.subTree)] : []
    return [...own, ...(Array.isArray(vnode.children) ? vnode.children.flatMap(child => typeof child === 'object' && child !== null ? instances(child as Vue.VNode) : []) : [])]
  }
  return { app, all, instances }
}

// Shapes from Home ListOrganizations/GetOrganization and GetCapabilities handlers.
const organizations = [{ id: 7, name: 'Engineering', member_count: 1, owners: ['alice'], credits: 100 }]
const members = [{ user_id: 3, username: 'alice', role: 'owner', spend_30d: 12.5, requests_30d: 4 }]
function scopeHarness() {
  const capabilities = Vue.ref<Record<string, boolean>>({})
  const loaded = Vue.ref(false)
  const calls: string[] = []
  const useScope = evaluate(read('composables/organizations/useOrganizationScope.ts'), {
    '~/composables/useApi': { useApi: () => ({ fetchAPI: async (path: string) => {
      calls.push(path)
      return path === '/organizations' ? { organizations } : { organization: { ...organizations[0], members } }
    } }) },
    '~/composables/useCapabilities': { useCapabilities: () => ({ loaded, supports: (name: string, fallback: boolean) => capabilities.value[name] ?? fallback }) },
    './organizationScope': { positiveId },
  }, 'useOrganizationScope') as () => import('./useOrganizationScope').OrganizationScope
  const owner = Vue.effectScope()
  const scope = owner.run(useScope)!
  return { scope, calls, owner, enable: async () => {
    capabilities.value = { organizations: true, organization_usage_filters: true }
    loaded.value = true
    await Vue.nextTick(); await Vue.nextTick()
  } }
}

describe('executable organization scope integration', () => {
  test('Home payloads populate options after capabilities arrive', async () => {
    const state = scopeHarness()
    expect(state.scope.supported.value).toBe(false)
    expect(state.calls).toEqual([])
    await state.enable()
    expect(state.scope.organizationItems.value.map(item => [item.value, item.label])).toEqual([['7', 'Engineering']])
    await state.scope.loadMembers('7')
    expect(state.scope.memberItems('7').map(item => [item.value, item.label])).toEqual([['3', 'alice']])
    state.owner.stop()
  })

  test('the real Reka input must not filter organization choices by its selected display label', async () => {
    const state = scopeHarness()
    await state.enable()
    const items = [{ value: '', label: 'All organizations' }, ...state.scope.organizationItems.value]
    const mounted = mount(() => Vue.h(SearchSelect, { modelValue: '', items }))
    await Vue.nextTick(); await Vue.nextTick()
    expect(mounted.all().filter(node => node.tag === 'Item').map(node => (node.props.value as { label: string }).label)).toEqual(['All organizations', 'Engineering'])
    const input = mounted.instances().find(instance => instance.type === ComboboxInput)!
    ;(input.vnode.props!.onInput as (event: unknown) => void)({ target: { value: 'engine' } })
    await Vue.nextTick()
    expect(mounted.all().filter(node => node.tag === 'Item').map(node => (node.props.value as { label: string }).label)).toEqual(['Engineering'])
    mounted.instances().find(instance => instance.type === ComboboxRoot)!.emit('update:open', false)
    await Vue.nextTick()
    expect(mounted.all().filter(node => node.tag === 'Item')).toHaveLength(2)
    mounted.app.unmount()
    state.owner.stop()
  })

  test('applied overview scope reaches the overview request and renders Home totals', async () => {
    const owner = Vue.effectScope()
    const calls: string[] = []
    const filters = evaluate(read('composables/usage/useUsageFilters.ts'), {
      '~/composables/requestTelemetry': { readTelemetryChoice: () => '7d', saveTelemetryChoice: () => {}, usageRanges: [] },
    }, 'useUsageFilters') as typeof import('../usage/useUsageFilters').useUsageFilters
    const useOverview = evaluate(read('composables/usage/useUsageOverview.ts'), {
      '~/composables/useWorkspaceState': { useWorkspaceState: (_key: string, initial: () => unknown) => Vue.ref(initial()) },
    }, 'useUsageOverview') as typeof import('../usage/useUsageOverview').useUsageOverview
    const state = owner.run(() => {
      const state = filters(key => key)
      const overview = useOverview({
        fetchAPI: async <T>(path: string) => {
          calls.push(path)
          return (path.startsWith('/usage/overview') ? { totals: { request_count: 4, total_amount: 12.5 }, trend: [], top: {} } : { providers: ['codex'], models: ['gpt-5'] }) as T
        },
        supports: () => true, scope: { disposed: false, controller: new AbortController() },
        appliedFilters: state.appliedFilters, buildCommonParams: state.buildCommonParams,
      })
      return { ...state, overview }
    })!
    state.filters.value.organization = '7'
    state.filters.value.member = '3'
    expect(state.insightQuery.value).not.toContain('user_id')
    state.appliedFilters.value = { ...state.filters.value }
    await state.overview.loadOverview()
    const query = new URL(calls[0]!, 'http://home.test').searchParams
    expect(query.get('user_id')).toBe('7')
    expect(query.get('actor_user_id')).toBe('3')
    expect(state.overview.totals.value).toEqual({ request_count: 4, total_amount: 12.5 })
    owner.stop()
  })

  test('request records query preserves organization/member IDs for requests and exports', () => {
    // Execute the production component query builder with the same reactive inputs.
    const source = read('components/admin/usage/RequestRecords.vue')
    const builder = source.slice(source.indexOf('function buildQuery('), source.indexOf('\nasync function loadEvents'))
    const appliedFilters = Vue.ref({ user_id: '7', actor_user_id: '3', provider: '', from: '2026-11-22T00:00' })
    const buildQuery = new Function('appliedFilters', 'appliedSearchField', 'sort', 'pageSize', 'page', 'timezone', `${builder}; return buildQuery`)(
      appliedFilters, Vue.ref('all'), Vue.ref('timestamp_desc'), Vue.ref(25), Vue.ref(1), 'UTC',
    ) as (source?: typeof appliedFilters.value, pagination?: boolean) => Record<string, unknown>
    expect(buildQuery()).toMatchObject({ user_id: '7', actor_user_id: '3', limit: 25, offset: 0 })
    expect(buildQuery(appliedFilters.value, false)).toMatchObject({ user_id: '7', actor_user_id: '3' })
    expect(buildQuery(appliedFilters.value, false)).not.toHaveProperty('limit')
    appliedFilters.value = { ...appliedFilters.value, user_id: '', actor_user_id: '' }
    expect(buildQuery()).not.toHaveProperty('user_id')
    expect(buildQuery()).not.toHaveProperty('actor_user_id')
  })

  test('shared usage selector emits IDs, loads members, and clears member when organization is cleared', async () => {
    const state = scopeHarness()
    await state.enable()
    const selected = Vue.reactive({ organization: '', member: '' })
    const mounted = mount(() => Vue.h(ScopeFilter, {
      scope: state.scope, ...selected,
      'onUpdate:organization': (value: string) => { selected.organization = value },
      'onUpdate:member': (value: string) => { selected.member = value },
    }))
    await Vue.nextTick()
    const item = mounted.all().find(node => node.tag === 'Item' && (node.props.value as { value: string }).value === '7')!
    // Invoke the real ComboboxRoot selection event, not a mocked select adapter.
    mounted.instances().find(instance => instance.type === ComboboxRoot)!.emit('update:modelValue', item.props.value)
    await Vue.nextTick(); await Vue.nextTick(); await Vue.nextTick()
    expect(selected.organization).toBe('7')
    expect(state.calls).toContain('/organizations/7')
    expect(mounted.all().some(node => node.tag === 'Item' && (node.props.value as { value: string }).value === '3')).toBe(true)
    const memberItem = mounted.all().find(node => node.tag === 'Item' && (node.props.value as { value: string }).value === '3')!
    mounted.instances().filter(instance => instance.type === ComboboxRoot)[1]!.emit('update:modelValue', memberItem.props.value)
    await Vue.nextTick()
    expect(selected.member).toBe('3')
    const clear = mounted.all().find(node => node.tag === 'button' && node.props['aria-label'] === 'common.reset')!
    ;(clear.props.onClick as (event: unknown) => void)({ stopPropagation() {} })
    await Vue.nextTick()
    expect(selected).toEqual({ organization: '', member: '' })
    mounted.app.unmount()
    state.owner.stop()
  })
})
