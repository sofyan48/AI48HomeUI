import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { compileScript, parse, registerTS } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as Vue from 'vue'
import * as Reka from 'reka-ui'
import * as VueUse from '@vueuse/core'
import * as Icons from '@tabler/icons-vue'
import { cva } from 'class-variance-authority'
import { cn } from 'cn'
import * as portalField from '../components/app/general/portalField'

registerTS(() => ts)
const root = resolve(import.meta.dir, '..')
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')
const transpiler = new Bun.Transpiler({ loader: 'ts' })
const cache = new Map<string, any>()
const external: Record<string, any> = {
  vue: Vue, 'reka-ui': Reka, '@vueuse/core': VueUse, '@tabler/icons-vue': Icons,
  'class-variance-authority': { cva }, cn: { cn },
  '~/components/AppIcon.vue': { default: Vue.defineComponent({ setup: () => () => Vue.h('svg') }) },
}
// Compile the installed SFCs and resolve their source barrels, without Nuxt or DOM globals.
function load(file: string): any {
  file = resolve(root, file)
  if (cache.has(file)) return cache.get(file)
  const dependency = (source: string): any => {
    if (source === '~/components/ui/checkbox') return { Checkbox: fragmentCheckbox }
    if (external[source]) return external[source]
    if (source === './portalField') return portalField
    let target = source.startsWith('~/') ? resolve(root, source.slice(2)) : resolve(dirname(file), source)
    if (!/\.(vue|ts)$/.test(target)) target = existsSync(`${target}.ts`) ? `${target}.ts` : join(target, 'index.ts')
    return load(target)
  }
  let source = readFileSync(file, 'utf8')
  if (file.endsWith('.vue')) {
    const { descriptor, errors } = parse(source, { filename: file })
    expect(errors).toEqual([])
    source = compileScript(descriptor, {
      id: file, inlineTemplate: true,
      fs: { fileExists: existsSync, readFile: path => readFileSync(path, 'utf8') },
    }).content
  }
  const code = transpiler.transformSync(source)
  const exports: string[] = []
  const reexports: Record<string, any> = {}
  if (file.endsWith('.ts')) cache.set(file, reexports)
  const js = code
    .replace(/export\s*\{\s*default as (\w+)\s*\}\s*from\s*["']([^"']+)["'];?/g, (_, name, path) => {
      Object.defineProperty(reexports, name, { enumerable: true, get: () => dependency(path) })
      return ''
    })
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, path) =>
      `const { ${names.replace(/\s+as\s+/g, ': ')} } = dependency(${JSON.stringify(path)});`)
    .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, path) =>
      `const ${name} = dependency(${JSON.stringify(path)});`)
    .replace(/export (const|function) (\w+)/g, (_, kind, name) => { exports.push(name); return `${kind} ${name}` })
    .replace('export default', 'return')
  const value = new Function('dependency', file.endsWith('.vue') ? js : `${js}; return { ${exports.join(', ')} };`)(dependency)
  const result = file.endsWith('.vue') ? value : Object.assign(reexports, value)
  cache.set(file, result)
  return result
}
// Reka's checkbox uses document/Element APIs. Keep this focus-only double fragment-rooted
// so binding the adapter ref to the primitive instead of its native wrapper still fails.
const fragmentCheckbox = Vue.defineComponent({
  inheritAttrs: false,
  setup: (_, { attrs }) => () => Vue.h(Vue.Fragment, [
    Vue.h('button', { ...attrs, 'data-slot': 'checkbox' }), Vue.h('input', { type: 'hidden' }),
  ]),
})
const adapter = (name: string) => load(`components/app/general/Portal${name}.vue`)

type Node = {
  tag: string; tagName: string; props: Record<string, any>; children: Node[]; parent?: Node; text?: string
  value?: unknown; focusCalls: unknown[]; blurCalls: number
  matches: (selector: string) => boolean; querySelector: (selector: string) => Node | null
  focus: (options?: unknown) => void; blur: () => void; addEventListener: (...args: any[]) => void
}
function mount(component: Vue.Component, initial: Record<string, any> = {}, slots: Record<string, any> = {}) {
  const all = (node: Node): Node[] => [node, ...node.children.flatMap(all)]
  const create = (tag = '', text?: string): Node => {
    const node: Node = {
      tag, tagName: tag.toUpperCase(), text, props: {}, children: [], focusCalls: [], blurCalls: 0,
      matches: selector => selector.split(',').map(value => value.trim()).includes(tag),
      querySelector: selector => all(node).slice(1).find(child => child.matches(selector)) ?? null,
      focus: options => { node.focusCalls.push(options) }, blur: () => { node.blurCalls++ },
      addEventListener: () => {},
    }
    return node
  }
  const renderer = Vue.createRenderer<Node, Node>({
    createElement: create, createText: text => create('', text), createComment: () => create(),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text; node.children = [] },
    parentNode: node => node.parent!,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
    insert: (node, parent, anchor) => {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
    },
    remove: node => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) },
    patchProp: (node, key, _, value) => { node.props[key] = value },
  })
  const state = Vue.reactive({ ...initial })
  const instance = Vue.ref<any>()
  const tree = create('root')
  const app = renderer.createApp({ setup: () => () => Vue.h(component, { ...state, ref: instance }, slots) })
  app.component('UIcon', { setup: (_, { attrs }) => () => Vue.h('i', attrs) })
  app.mount(tree)
  return { state, instance, app, all: () => all(tree), find: (slot: string) => all(tree).find(node => node.props['data-slot'] === slot)! }
}
const text = (node: Node): string => (node.text || '') + node.children.map(text).join('')
function click(node: Node) {
  expect(node).toBeDefined()
  expect(node.props.disabled).not.toBe(true)
  for (const handler of [node.props.onClick].flat()) handler?.(new Event('click', { cancelable: true }))
}

describe('portal feedback with installed primitives', () => {
  test('alert forwards login focus, attributes and all content slots', () => {
    const view = mount(adapter('Alert'), {
      title: 'Fallback title', description: 'Fallback description', color: 'error', variant: 'soft',
      tabindex: -1, 'aria-live': 'assertive', id: 'login-error', class: 'consumer-alert',
    }, Object.fromEntries(['title', 'description', 'leading', 'trailing', 'actions', 'default'].map(name => [name, () => Vue.h('span', `${name} slot`)])))
    try {
      const alert = view.find('alert')
      expect(alert.props).toMatchObject({ role: 'alert', tabindex: -1, 'aria-live': 'assertive', id: 'login-error', 'data-color': 'error', 'data-variant': 'soft' })
      expect(alert.props.class).toContain('consumer-alert')
      expect(text(alert)).not.toContain('Fallback')
      for (const name of ['title', 'description', 'leading', 'trailing', 'actions', 'default']) expect(text(alert)).toContain(`${name} slot`)
      expect(view.find('alert-title').props.class).toContain('line-clamp-none')
      view.instance.value.focus({ preventScroll: true })
      expect(view.instance.value.el).toBe(alert)
      expect(alert.focusCalls).toEqual([{ preventScroll: true }])
    } finally { view.app.unmount() }
  })

  test('badge preserves semantic metadata, size, attributes and content', () => {
    const view = mount(adapter('Badge'), { color: 'warning', variant: 'outline', size: 'xs', id: 'quota', 'aria-label': 'Quota warning', class: 'consumer-badge' }, { default: () => 'Low quota' })
    try {
      const badge = view.find('badge')
      expect(badge.props).toMatchObject({ id: 'quota', 'aria-label': 'Quota warning', 'data-color': 'warning', 'data-variant': 'outline' })
      expect(badge.props.class).toContain('text-[10px]')
      expect(badge.props.class).toContain('consumer-badge')
      expect(text(badge)).toBe('Low quota')
    } finally { view.app.unmount() }
  })

  test('skeleton is decorative, respects reduced motion and forwards attributes', () => {
    const view = mount(adapter('Skeleton'), { id: 'loading-card', class: 'h-8 w-32' })
    try {
      const skeleton = view.find('skeleton')
      expect(skeleton.props).toMatchObject({ 'aria-hidden': 'true', id: 'loading-card' })
      expect(skeleton.props.class).toContain('motion-reduce:animate-none')
      expect(skeleton.props.class).toContain('w-32')
    } finally { view.app.unmount() }
  })

  for (const kind of ['Alert', 'Badge']) {
    test(`${kind} colors and variants use the theme-aware UI palette`, () => {
      const { descriptor } = parse(read(`components/app/general/Portal${kind}.vue`))
      const css = descriptor.styles.map(style => style.content).join('\n')
      const prefix = `portal-${kind.toLowerCase()}`
      expect(css).toContain(`--${prefix}-color: var(--ui-primary)`)
      for (const color of ['secondary', 'success', 'info', 'warning', 'error', 'neutral']) {
        expect(css).toMatch(new RegExp(`\\[data-color='${color}'\\]\\s*\\{\\s*--${prefix}-color: var\\(--ui-${color === 'neutral' ? 'text-highlighted' : color}\\)`))
      }
      expect(css).toContain('color: var(--ui-text-inverted)')
      for (const variant of ['soft', 'subtle', 'outline']) expect(css).toContain(`[data-variant='${variant}']`)
      expect(css).toContain(`color-mix(in oklch, var(--${prefix}-color) 10%, var(--ui-bg))`)
      expect(css).toContain(`border-color: color-mix(in oklch, var(--${prefix}-color) 25%, transparent)`)
      expect(css).not.toMatch(/#[\da-f]{3,8}\b|(?:background|color):\s*(?:rgb|hsl)\(/i)
    })
  }

  test('table scoped CSS uses raw UI color variables, not unwrapped shadcn HSL channels', () => {
    const { descriptor } = parse(read('components/app/general/PortalTable.vue'))
    const css = descriptor.styles.map(style => style.content).join('\n')
    for (const token of ['border', 'bg-muted', 'text-muted', 'text-highlighted']) expect(css).toContain(`var(--ui-${token})`)
    expect(css).not.toMatch(/var\(--(?:border|muted|muted-foreground|foreground)\)/)
  })
})

describe('portal runtime focus', () => {
  for (const grouped of [false, true]) {
    for (const [name, props, calls] of [
      ['requested', { autofocus: true }, 1], ['not requested', {}, 0],
      ['explicitly false', { autofocus: false }, 0], ['disabled', { autofocus: true, disabled: true }, 0],
    ] as const) {
      test(`${grouped ? 'grouped' : 'plain'} input focuses on mount only when ${name}`, async () => {
        const view = mount(adapter('Input'), { ...props, ...(grouped ? { icon: 'i-tabler-search' } : {}) })
        try {
          await Vue.nextTick()
          const input = view.all().find(node => node.tag === 'input')!
          expect(input.focusCalls).toHaveLength(calls)
          expect(input.props.autofocus).toBe(props.autofocus ?? false)
          view.instance.value.focus({ preventScroll: true })
          view.instance.value.blur()
          expect(view.instance.value.inputRef).toBe(input)
          expect(input.focusCalls.at(-1)).toEqual({ preventScroll: true })
          expect(input.blurCalls).toBe(1)
        } finally { view.app.unmount() }
      })
    }
  }

  test('checkbox resolves the button through its native wrapper rather than the primitive fragment', () => {
    const view = mount(adapter('Checkbox'), { label: 'Remember', id: 'remember', 'aria-describedby': 'external' })
    try {
      const button = view.find('checkbox')
      expect(button.tag).toBe('button')
      expect(button.props).toMatchObject({ id: 'remember', 'aria-describedby': 'external' })
      expect(view.all().find(node => node.tag === 'label')?.props.for).toBe('remember')
      view.instance.value.focus({ preventScroll: true })
      view.instance.value.blur()
      expect(view.instance.value.checkboxRef).toBe(button)
      expect(button.focusCalls).toEqual([{ preventScroll: true }])
      expect(button.blurCalls).toBe(1)
    } finally { view.app.unmount() }
  })

  test('standalone checkbox stays compact and layout classes do not resize its control', () => {
    const view = mount(adapter('Checkbox'), { class: 'mt-1', 'aria-label': 'Select model' })
    try {
      const field = view.find('field')
      expect(field.props.class).toContain('w-auto')
      expect(field.props.class).toContain('shrink-0')
      expect(field.props.class).toContain('mt-1')
      const button = view.find('checkbox')
      expect(button.props.class ?? '').not.toContain('mt-1')
      expect(button.props['aria-label']).toBe('Select model')
    } finally { view.app.unmount() }
  })

  test('actual focus helper safely ignores null and fragment/comment roots supplied through setup', async () => {
    let helper!: ReturnType<typeof portalField.usePortalFocus>
    const Harness = Vue.defineComponent({ setup() { helper = portalField.usePortalFocus(); return () => Vue.h('div') } })
    const view = mount(Harness)
    try {
      for (const node of [null, { nodeType: 8 }, { $el: { nodeType: 3 } }]) {
        helper.root.value = node as any
        await Vue.nextTick()
        expect(helper.element.value).toBeUndefined()
        expect(() => helper.focus({ preventScroll: true })).not.toThrow()
        expect(() => helper.blur()).not.toThrow()
      }
      const button = view.all().find(node => node.tag === 'div')!

      const control = { matches: () => true, focus: (options?: unknown) => button.focus(options), blur: () => button.blur() }
      helper.root.value = { $el: control } as any
      helper.focus({ preventScroll: true })
      helper.blur()
      expect(button.focusCalls).toEqual([{ preventScroll: true }])
      expect(button.blurCalls).toBe(1)
    } finally { view.app.unmount() }
  })
})

describe('portal pagination with installed shadcn and Reka primitives', () => {
  test('page and navigation buttons emit numbers and controlled updates change active/boundary state', async () => {
    const updates: unknown[] = []
    const view = mount(adapter('Pagination'), { page: 2, total: 95, itemsPerPage: 10, size: 'xs', id: 'pages', 'onUpdate:page': (value: unknown) => updates.push(value) })
    try {
      expect(view.find('pagination').props).toMatchObject({ 'aria-label': 'Pagination', id: 'pages' })
      const page = view.all().find(node => node.props['data-slot'] === 'pagination-item' && text(node).trim() === '3')!
      expect(page.props.class).toContain('size-6')
      click(page)
      click(view.find('pagination-next'))
      click(view.find('pagination-previous'))
      click(view.find('pagination-first'))
      click(view.find('pagination-last'))
      expect(updates).toEqual([3, 3, 1, 1, 10])
      expect(updates.every(value => typeof value === 'number')).toBe(true)
      view.state.page = 10
      await Vue.nextTick()
      expect(view.find('pagination-next').props.disabled).toBe(true)
      expect(view.find('pagination-last').props.disabled).toBe(true)
      expect(view.all().find(node => node.props['aria-current'] === 'page') && text(view.all().find(node => node.props['aria-current'] === 'page')!).trim()).toBe('10')
      view.state.disabled = true
      await Vue.nextTick()
      for (const node of view.all().filter(node => node.tag === 'button')) expect(node.props.disabled).toBe(true)
    } finally { view.app.unmount() }
  })

  test('uncontrolled defaultPage advances and first-page controls are disabled', async () => {
    const updates: unknown[] = []
    const view = mount(adapter('Pagination'), { defaultPage: 1, total: 30, itemsPerPage: 10, 'onUpdate:page': (value: unknown) => updates.push(value) })
    try {
      expect(view.find('pagination-first').props.disabled).toBe(true)
      expect(view.find('pagination-previous').props.disabled).toBe(true)
      click(view.find('pagination-next'))
      await Vue.nextTick()
      click(view.find('pagination-next'))
      await Vue.nextTick()
      expect(updates).toEqual([2, 3])
      expect(view.find('pagination-next').props.disabled).toBe(true)
    } finally { view.app.unmount() }
  })
})

test('portal and shared renderers contain no Nuxt UI components or imports', () => {
  function files(folder: string): string[] {
    return readdirSync(resolve(root, folder), { withFileTypes: true }).flatMap(entry => {
      const file = `${folder}/${entry.name}`
      return entry.isDirectory() ? files(file) : file.endsWith('.vue') ? [file] : []
    })
  }
  const violations: string[] = []
  for (const file of [...files('pages/app'), ...files('components/app'), 'layouts/app.vue', 'layouts/playground.vue', 'components/AppButton.vue', 'components/AppCard.vue', 'components/AppModal.vue']) {
      expect(read(file)).not.toMatch(/from\s+['"]@nuxt\/ui(?:\/[^'"]*)?['"]/)
    const { descriptor } = parse(read(file), { filename: file })
    const walk = (node: any) => {
      if (node.type === 1 && /^U[A-Z]|^u-/.test(node.tag)) violations.push(`${file}: ${node.tag}`)
      for (const child of node.children || []) walk(child)
    }
    if (descriptor.template?.ast) walk(descriptor.template.ast)
  }
  expect(violations).toEqual([])
})
