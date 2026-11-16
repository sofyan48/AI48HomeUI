import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import * as Vue from 'vue'
import { cn } from 'cn'

const root = resolve(import.meta.dir, '../../..')
const transpiler = new Bun.Transpiler({ loader: 'ts' })
const messages: Record<string, string> = {
  'shared.table.number': 'No.', 'common.loading': 'Loading…',
  'shared.table.search': 'Search rows…', 'shared.table.noMatch': 'No rows match “{query}”.',
  'shared.table.matchCount': '{shown} of {total}', 'shared.table.rowCount': '{count} rows',
}
const i18n = () => ({ t: (key: string, params: Record<string, unknown> = {}) =>
  (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(params[name])) })
const cache = new Map<string, Vue.Component>()
function load(path: string): Vue.Component {
  if (cache.has(path)) return cache.get(path)!
  const { descriptor, errors } = parse(readFileSync(path, 'utf8'), { filename: path })
  expect(errors).toEqual([])
  const script = compileScript(descriptor, { id: path, inlineTemplate: true })
  const modules: Record<string, unknown> = { vue: Vue, cn: { cn } }
  if (path.endsWith('PortalTable.vue')) {
    modules['~/components/ui/table'] = Object.fromEntries(
      ['Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow']
        .map(name => [name, load(resolve(root, `components/ui/table/${name}.vue`))]),
    )
  }
  const code = transpiler.transformSync(script.content)
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, source) =>
      `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(source)}];`)
    .replace('export default', 'return')
  const component = new Function('modules', 'useAdminI18n', code)(modules, i18n)
  cache.set(path, component)
  return component
}
const PortalTable = load(resolve(import.meta.dir, 'PortalTable.vue'))
type Node = { tag: string; props: Record<string, any>; children: Node[]; parent?: Node; text?: string }
function mount(initial: Record<string, any>, slots: Record<string, any> = {}) {
  const create = (tag = '', text?: string): Node => ({ tag, props: {}, children: [], text })
  const renderer = Vue.createRenderer<Node, Node>({
    createElement: create, createText: text => create('', text), createComment: () => create(),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.children = []; node.text = text },
    parentNode: node => node.parent!,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    insert: (node, parent, anchor) => {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
    },
    remove: node => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) },
    patchProp: (node, key, _, value) => { node.props[key] = value },
  })
  const state = Vue.reactive(initial)
  const tree = create('root')
  const app = renderer.createApp({ setup: () => () => Vue.h(PortalTable, state, slots) })
  app.mount(tree)
  const all = (node = tree): Node[] => [node, ...node.children.flatMap(child => all(child))]
  const find = (tag: string) => all().find(node => node.tag === tag)!
  const text = (node: Node): string => (node.text || '') + node.children.map(text).join('')
  return { state, app, all, find, text }
}
const columns = [{ accessorKey: 'name', header: 'Name' }, { id: 'amount', accessorKey: 'credits', header: 'Credits' }]

describe('PortalTable with installed shadcn primitives', () => {
  test('renders native semantics, default values, scoped cells and source row indices', () => {
    const seen: any[] = []
    const data = [{ name: 'Alice', credits: 0 }, { name: 'Bob', credits: 12 }]
    const view = mount({ columns, data, numberOffset: 20, class: 'min-w-[720px]', 'aria-label': 'Balances' }, {
      'name-cell': ({ row, getValue }: any) => {
        seen.push({ original: row.original, index: row.index, credits: row.getValue('amount'), value: getValue() })
        return Vue.h('strong', row.original.name)
      },
    })
    expect(seen).toEqual([
      { original: data[0], index: 0, credits: 0, value: 'Alice' },
      { original: data[1], index: 1, credits: 12, value: 'Bob' },
    ])
    expect(view.all().filter(node => node.tag === 'th').map(view.text)).toEqual(['No.', 'Name', 'Credits'])
    expect(view.all().filter(node => node.tag === 'td').map(view.text)).toEqual(['21', 'Alice', '0', '22', 'Bob', '12'])
    expect(view.find('thead')).toBeDefined()
    expect(view.find('tbody')).toBeDefined()
    expect(view.find('th').props.scope).toBe('col')
    expect(view.find('table').props.class).toContain('min-w-[720px]')
    const viewport = view.all().find(node => node.props['data-slot'] === 'table-container')!
    expect(viewport.props).toMatchObject({ 'data-bounded': true, 'aria-label': 'Balances' })
    view.app.unmount()
  })

  test('loading never flashes empty and announces background refresh', async () => {
    const view = mount({ columns, data: [], loading: true, empty: 'Nothing here' })
    expect(view.find('div').props['aria-busy']).toBe(true)
    expect(view.text(view.find('tbody'))).toBe('Loading…')
    expect(view.find('td').props.colspan).toBe(3)
    expect(view.all().find(node => node.props.role === 'status')?.props['aria-live']).toBe('polite')
    view.state.data = [{ name: 'Retained', credits: 5 }]
    await Vue.nextTick()
    expect(view.text(view.find('tbody'))).toContain('Retained')
    expect(view.all().find(node => node.props.role === 'status')?.text).toBe('Loading…')
    view.state.loading = false
    view.state.data = []
    await Vue.nextTick()
    expect(view.text(view.find('tbody'))).toBe('Nothing here')
    expect(view.find('div').props['aria-busy']).toBe(false)
    view.app.unmount()
  })

  test('empty slot wins over empty text and spans disabled numbering columns', () => {
    const view = mount({ columns, data: [], numbered: false, empty: 'Fallback' }, { empty: () => Vue.h('p', 'Custom empty') })
    expect(view.text(view.find('tbody'))).toBe('Custom empty')
    expect(view.find('td').props.colspan).toBe(2)
    view.app.unmount()
  })

  test('search retains numbering offsets, handles duplicate values, and announces no matches', async () => {
    const row = { name: 'Bob', credits: 2 }
    const view = mount({ columns, data: [{ name: 'Alice' }, row, row], searchable: true, numberOffset: 10 })
    view.find('input').props.onInput({ target: { value: 'Bob' } })
    await Vue.nextTick()
    expect(view.all().filter(node => node.tag === 'td').map(view.text)).toEqual(['12', 'Bob', '2', '13', 'Bob', '2'])
    view.find('input').props.onInput({ target: { value: 'missing' } })
    await Vue.nextTick()
    expect(view.text(view.find('tbody'))).toBe('No rows match “missing”.')
    view.app.unmount()
  })

  test('respects existing rank columns, column alignment and unbounded opt-out', () => {
    const view = mount({ data: [{ rank: 7 }], scroll: false, columns: [{ accessorKey: 'rank', header: '#', meta: { class: { th: 'text-right', td: 'text-right' } } }] })
    expect(view.all().filter(node => node.tag === 'th')).toHaveLength(1)
    expect(view.find('th').props.class).toContain('text-right')
    expect(view.find('td').props.class).toContain('text-right')
    expect(view.text(view.find('td'))).toBe('7')
    expect(view.all().find(node => node.props['data-slot'] === 'table-container')?.props['data-bounded']).toBe(false)
    view.app.unmount()
  })
})
