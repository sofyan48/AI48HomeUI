import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { compileScript, compileTemplate, parse, registerTS } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as Vue from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from 'cn'
import { cva } from 'class-variance-authority'
import { buttonFormLoadingResolverKey } from '../composables/ui/buttonForm'

registerTS(() => ts)
const root = join(import.meta.dir, '..')
const fs = { fileExists: existsSync, readFile: (path: string) => readFileSync(path, 'utf8') }
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const vueFiles = (folder: string): string[] => readdirSync(join(root, folder), { withFileTypes: true }).flatMap(entry => {
  const file = `${folder}/${entry.name}`
  return entry.isDirectory() ? vueFiles(file) : file.endsWith('.vue') ? [file] : []
})
const shadcnFiles = vueFiles('components/ui')

function scriptFor(file: string, inlineTemplate = false) {
  const { descriptor, errors } = parse(read(file), { filename: join(root, file) })
  expect(errors).toEqual([])
  return { descriptor, script: compileScript(descriptor, { id: file, fs, inlineTemplate }) }
}

describe('shadcn migration compilation', () => {
  test('discovers the complete installed button, card, and sheet families', () => {
    for (const family of ['button', 'card', 'sheet']) {
      expect(shadcnFiles.some(file => file.startsWith(`components/ui/${family}/`))).toBe(true)
    }
    expect(shadcnFiles).toContain('components/ui/button/Button.vue')
    expect(shadcnFiles).toContain('components/ui/sheet/SheetContent.vue')
  })

  for (const file of [...shadcnFiles, 'components/AppButton.vue', 'components/AppCard.vue', 'components/AppModal.vue']) {
    test(`${file} compiles script and template with real external types`, () => {
      const { descriptor, script } = scriptFor(file)
      expect(script.content.length).toBeGreaterThan(0)
      expect(descriptor.template).not.toBeNull()
      const template = compileTemplate({
        source: descriptor.template!.content, filename: join(root, file), id: file,
        compilerOptions: { bindingMetadata: script.bindings },
      })
      expect(template.errors).toEqual([])
      // Also exercise the inline compilation used by the runtime harness.
      expect(scriptFor(file, true).script.content).toContain('return')
    })
  }

  test('resolves inherited Reka primitive and dialog props rather than ignoring them', () => {
    expect(scriptFor('components/ui/button/Button.vue').script.content).toContain('asChild:')
    expect(scriptFor('components/ui/sheet/SheetContent.vue').script.content).toContain('disableOutsidePointerEvents:')
  })
})

// Evaluate compiled SFCs with explicit module boundaries, never regex-extracted setup logic.
const transpiler = new Bun.Transpiler({ loader: 'ts' })
function loadSfc(file: string, modules: Record<string, any>, globals: Record<string, any> = {}): Vue.Component {
  const { script } = scriptFor(file, true)
  const js = transpiler.transformSync(script.content)
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, source) =>
      `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(source)}];`)
    .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, source) =>
          `const ${name} = modules[${JSON.stringify(source)}];`)
        .replace('export default', 'return')
  return new Function('modules', ...Object.keys(globals), js)({ vue: Vue, cn: { cn }, ...modules }, ...Object.values(globals))
}
const variantSource = transpiler.transformSync(read('components/ui/button/index.ts'))
  .replace(/export \{[^}]+\} from ["'][^"']+["'];?/g, '')
  .replace(/import \{[^}]+\} from ["']class-variance-authority["'];?/, '')
  .replace('export const buttonVariants', 'const buttonVariants')
const buttonVariants = new Function('cva', `${variantSource}; return buttonVariants`)(cva)
const Button = loadSfc('components/ui/button/Button.vue', { 'reka-ui': { Primitive }, '.': { buttonVariants } })
const NuxtLink = Vue.defineComponent({
  inheritAttrs: false,
  setup: (_, { attrs, slots }) => () => Vue.h('a', { ...attrs, href: attrs.to }, slots.default?.()),
})
const formLoadingKey = Symbol('form-loading')
const AppButton = loadSfc('components/AppButton.vue', {
  '~/components/ui/button': { Button }, '#components': { NuxtLink },
  '~/components/AppIcon.vue': Vue.defineComponent({ setup: (_, { attrs }) => () => Vue.h('i', attrs) }),
  '~/composables/ui/buttonForm': { buttonFormLoadingResolverKey },
})
const cards = Object.fromEntries(shadcnFiles.filter(file => dirname(file) === 'components/ui/card').map(file => [
  file.split('/').pop()!.replace('.vue', ''), loadSfc(file, {}),
]))
const AppCard = loadSfc('components/AppCard.vue', { '~/components/ui/card': cards })

type Node = { tag?: string; text?: string; props: Record<string, any>; children: Node[]; parent?: Node }
function mount(component: Vue.Component, initial: Record<string, any> = {}, slots: Record<string, any> = {}, provide?: () => void, components: Record<string, Vue.Component> = {}) {
  const node = (tag?: string, text?: string): Node => ({ tag, text, props: {}, children: [] })
  const renderer = Vue.createRenderer<Node, Node>({
    createElement: tag => node(tag), createText: text => node(undefined, text), createComment: () => node(),
    setText: (target, text) => { target.text = text },
    setElementText: (target, text) => { target.text = text; target.children = [] },
    parentNode: target => target.parent!,
    nextSibling: target => target.parent?.children[target.parent.children.indexOf(target) + 1] || null,
    insert: (child, parent, anchor) => {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
      child.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
    },
    remove: child => { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1) },
    patchProp: (target, key, _, value) => { target.props[key] = value },
  })
  const state = Vue.reactive({ ...initial })
  const tree = node('root')
  const app = renderer.createApp({ setup() { provide?.(); return () => Vue.h(component, { ...state }, slots) } })
  app.component('UIcon', { setup: (_, { attrs }) => () => Vue.h('i', attrs) })
  app.component('AppButton', AppButton)
  for (const [name, component] of Object.entries(components)) app.component(name, component)
  app.mount(tree)
  const all = (target = tree): Node[] => [target, ...target.children.flatMap(child => all(child))]
  return { state, app, all, find: (predicate: (target: Node) => boolean) => all().find(predicate)! }
}
const text = (node: Node): string => (node.text || '') + node.children.map(text).join('')
function fire(handler: any, event: Event) {
  for (const fn of Array.isArray(handler) ? handler : [handler]) fn?.(event)
}

test('portal root keeps one provider and layout/page owner across portal navigation', async () => {
  const route = Vue.reactive({ path: '/app/login' })
  const token = Vue.ref('admin-token')
  let providerMounts = 0
  let pageMounts = 0
  const PortalProvider = Vue.defineComponent({
    setup(_, { slots }) { providerMounts++; return () => slots.default?.() },
  })
  const Root = loadSfc('app.vue', {
    pinia: { storeToRefs: (store: any) => store },
    '~/components/app/general/PortalProvider.vue': PortalProvider,
    '~/stores/managementSession': { useManagementSessionStore: () => ({ token }) },
    '~/composables/layout/useThemeColor': { useThemeColorHead: () => {} },
  }, { useRoute: () => route, useHead: () => {}, ref: Vue.ref, watch: Vue.watch })
  const Layout = Vue.defineComponent({ setup: (_, { slots }) => () => slots.default?.() })
  const Page = Vue.defineComponent({ setup() { pageMounts++; return () => Vue.h('main', route.path) } })
  const view = mount(Root, {}, {}, undefined, { NuxtLayout: Layout, NuxtPage: Page })
  try {
    for (const path of ['/app/register', '/app/models', '/app']) {
      route.path = path
      token.value += '-changed'
      await Vue.nextTick()
      expect(providerMounts).toBe(1)
      expect(pageMounts).toBe(1)
      expect(text(view.find(node => node.tag === 'main'))).toBe(path)
    }
    expect(read('app.vue')).toContain("route.path.startsWith('/admin') ? managementGeneration : undefined")
  } finally { view.app.unmount() }
})

describe('AppButton migrated behavior', () => {
  test('admin bridge resolves the nearest descendant form and only auto-loads submit buttons', async () => {
    const Bridge = loadSfc('components/admin/general/AdminButtonFormBridge.vue', {
      '@nuxt/ui/composables/useFormField': { formLoadingInjectionKey: formLoadingKey },
      '~/composables/ui/buttonForm': { buttonFormLoadingResolverKey },
    })
    const outerLoading = Vue.ref(false)
    const innerLoading = Vue.ref(true)
    const Form = Vue.defineComponent({
      setup() {
        Vue.provide(formLoadingKey, innerLoading)
        return () => Vue.h(AppButton, { label: 'Save', type: 'submit', loadingAuto: true })
      },
    })
    const Harness = Vue.defineComponent({
      setup: () => () => Vue.h(Bridge, {}, { default: () => Vue.h(Form) }),
    })
    const view = mount(Harness, {}, {}, () => Vue.provide(formLoadingKey, outerLoading))
    try {
      const button = view.find(node => node.tag === 'button')
      expect(button.props.disabled).toBe(true)
      innerLoading.value = false
      outerLoading.value = true
      await Vue.nextTick()
      expect(button.props.disabled).toBeUndefined()
    } finally { view.app.unmount() }
    for (const props of [{ type: 'button', loadingAuto: true }, { type: 'submit', loadingAuto: false }]) {
      const view = mount(AppButton, props, {}, () => Vue.provide(buttonFormLoadingResolverKey, () => innerLoading))
      try {
        innerLoading.value = true
        await Vue.nextTick()
        expect(view.find(node => node.tag === 'button').props.disabled).toBeUndefined()
      } finally { view.app.unmount() }
    }
  })
  test('loading disables native buttons and exposes a spinner and busy semantics', async () => {
    const view = mount(AppButton, { label: 'Save', loading: true })
    try {
      const button = view.find(node => node.tag === 'button')
      expect(button.props.disabled).toBe(true)
      expect(button.props['aria-busy']).toBe(true)
      expect(text(button)).toBe('Save')
      expect(view.find(node => node.tag === 'i').props.class).toContain('animate-spin')
      view.state.loading = false
      await Vue.nextTick()
      expect(button.props.disabled).toBeUndefined()
      expect(button.props['aria-busy']).toBeUndefined()
    } finally { view.app.unmount() }
  })

  test('loadingAuto locks for the actual async handler lifetime and unlocks afterward', async () => {
    let finish!: () => void
    let calls = 0
    const pending = new Promise<void>(resolve => { finish = resolve })
    const view = mount(AppButton, { label: 'Save', loadingAuto: true, onClick: () => { calls++; return pending } })
    try {
      const button = view.find(node => node.tag === 'button')
      fire(button.props.onClick, new Event('click', { cancelable: true }))
      await Vue.nextTick()
      expect(button.props.disabled).toBe(true)
      fire(button.props.onClick, new Event('click', { cancelable: true }))
      expect(calls).toBe(1)
      finish()
      await pending
      await Vue.nextTick()
      await Vue.nextTick()
      expect(button.props.disabled).toBeUndefined()
    } finally { finish(); view.app.unmount() }
  })

  test('disabled and loading links remove navigation and suppress capture and click handlers', async () => {
    for (const lock of ['disabled', 'loading']) {
      let calls = 0
      const view = mount(AppButton, {
        label: 'Visit', to: '/app/models', [lock]: true, download: 'models',
        onClick: () => calls++, onClickCapture: () => calls++,
      })
      try {
        const link = view.find(node => node.tag === 'a')
        expect(link.props.href).toBeUndefined()
        expect(link.props.to).toBeUndefined()
        expect(link.props.download).toBeUndefined()
        expect(link.props.role).toBe('link')
        expect(link.props.tabindex).toBe(-1)
        expect(link.props['aria-disabled']).toBe('true')
        for (const handler of [link.props.onClickCapture, link.props.onClick]) {
          const event = new Event('click', { cancelable: true })
          fire(handler, event)
          expect(event.defaultPrevented).toBe(true)
        }
        expect(calls).toBe(0)
        view.state[lock] = false
        await Vue.nextTick()
        expect(view.find(node => node.tag === 'a').props.href).toBe('/app/models')
      } finally { view.app.unmount() }
    }
  })

  test('external links receive safe rel defaults', () => {
    const view = mount(AppButton, { label: 'Docs', href: 'https://example.com', target: '_blank' })
    try {
      const link = view.find(node => node.tag === 'a')
      expect(link.props.href).toBe('https://example.com')
      expect(link.props.rel).toBe('noopener noreferrer')
    } finally { view.app.unmount() }
  })

  test('maps legacy semantic variants to shadcn without dropping color or size', () => {
    for (const [color, variant, expected] of [
      ['error', 'solid', 'destructive'], ['neutral', 'solid', 'secondary'], ['success', 'solid', 'default'],
      ['warning', 'soft', 'secondary'], ['info', 'subtle', 'secondary'], ['primary', 'outline', 'outline'],
      ['secondary', 'ghost', 'ghost'], ['primary', 'link', 'link'],
    ]) {
      const view = mount(AppButton, { label: 'Action', color, variant, size: 'md' })
      try {
        const button = view.find(node => node.tag === 'button')
        expect(button.props['data-variant']).toBe(expected)
        expect(button.props['data-color']).toBe(color)
        expect(button.props['data-compat-variant']).toBe(variant)
        expect(button.props['data-size']).toBe('default')
      } finally { view.app.unmount() }
    }
  })
})

describe('AppCard migrated composition', () => {
  test('renders header, body and footer slots with effective ui overrides and slot helpers', () => {
    const ui = { root: 'rounded-none', header: 'px-0', body: 'p-0', footer: 'py-0' }
    const slots = Object.fromEntries(['header', 'default', 'footer'].map(name => [name, ({ ui: helpers }: any) => {
      expect(helpers.body({ class: 'font-bold' })).toContain('p-0')
      expect(helpers.body({ class: 'font-bold' })).toContain('font-bold')
      return Vue.h('span', name)
    }]))
    const view = mount(AppCard, { ui, id: 'card' }, slots)
    try {
      for (const [slot, override] of Object.entries(ui)) {
        const element = view.find(node => node.props['data-slot'] === slot)
        expect(element).toBeDefined()
        expect(element.props.class.split(' ')).toContain(override)
      }
      expect(view.find(node => node.props['data-slot'] === 'body').props.class.split(' ')).not.toContain('p-4')
      expect(view.find(node => node.props.id === 'card').props.class).toContain('admin-card')
      for (const name of ['header', 'default', 'footer']) expect(text(view.find(node => node.tag === 'root'))).toContain(name)
    } finally { view.app.unmount() }
  })

  test('omits absent optional sections and retains injected portal card styling', () => {
    const view = mount(AppCard, { tinted: true, accent: 'emerald' }, { default: () => 'Body' }, () => {
      Vue.provide(Symbol.for('cliproxy-user-card'), true)
    })
    try {
      expect(view.all().some(node => ['header', 'footer'].includes(node.props['data-slot']))).toBe(false)
      const card = view.find(node => node.props['data-slot'] === 'root')
      expect(card.props.class).toContain('user-card--tinted')
      expect(card.props.class).toContain('user-card--emerald')
    } finally { view.app.unmount() }
  })
})

function mountModal(initial: Record<string, any>, slots: Record<string, any> = {}) {
  const boundaries: Record<string, any> = {}
  const sheet = Object.fromEntries(['Sheet', 'SheetClose', 'SheetContent', 'SheetDescription', 'SheetFooter', 'SheetHeader', 'SheetTitle', 'SheetTrigger'].map(name => [name, Vue.defineComponent({
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => {
      boundaries[name] = attrs
      return Vue.h(name, attrs, slots.default?.({ open: true, close: () => {} }))
    },
  })]))
  const AppModal = loadSfc('components/AppModal.vue', {
    '~/components/ui/sheet': sheet, '~/composables/useAdminI18n': { useAdminI18n: () => ({ t: (key: string) => key }) },
  })
  return { ...mount(AppModal, initial, slots), boundaries }
}

describe('AppModal migrated sheet contract', () => {
  test('locked dismissal survives consumer handlers and unlocks reactively', async () => {
    let prevented = 0, consumerCalls = 0
    const consumer = () => { consumerCalls++ }
    const view = mountModal({ open: true, dismissible: false, 'onClose:prevent': () => prevented++,
      onEscapeKeyDown: consumer, content: { onInteractOutside: consumer, onPointerDownOutside: consumer },
    })
    try {
      for (const key of ['onEscapeKeyDown', 'onInteractOutside', 'onPointerDownOutside']) {
        const event = new Event('dismiss', { cancelable: true })
        Object.assign(event, { detail: { originalEvent: { target: { isConnected: true } } } })
        fire(view.boundaries.SheetContent[key], event)
        expect(event.defaultPrevented).toBe(true)
      }
      expect(consumerCalls).toBe(3)
      expect(prevented).toBe(2)
      view.state.dismissible = true
      await Vue.nextTick()
      const escape = new Event('escape', { cancelable: true })
      fire(view.boundaries.SheetContent.onEscapeKeyDown, escape)
      expect(escape.defaultPrevented).toBe(false)
      const detached = new Event('pointer', { cancelable: true })
      Object.assign(detached, { detail: { originalEvent: { target: { isConnected: false } } } })
      fire(view.boundaries.SheetContent.onPointerDownOutside, detached)
      expect(detached.defaultPrevented).toBe(true)
    } finally { view.app.unmount() }
  })

  test('provides accessible titles for normal, custom-header and custom-content rendering', () => {
    for (const slots of [{}, { header: () => 'Custom header' }, { content: () => 'Custom content' }]) {
      const view = mountModal({ title: 'Edit account' }, slots)
      try {
        const title = view.find(node => node.tag === 'SheetTitle')
        expect(text(title)).toBe('Edit account')
        if ('header' in slots || 'content' in slots) expect(title.props.class).toBe('sr-only')
      } finally { view.app.unmount() }
    }
    const view = mountModal({ close: false })
    try {
      const title = view.find(node => node.tag === 'SheetTitle')
      expect(text(title)).toBe('common.details')
      expect(title.props.class).toBe('sr-only')
    } finally { view.app.unmount() }
  })

  test('keeps right-sheet width overrides, fullscreen, portal and controlled open events', async () => {
    const updates: boolean[] = []
    const view = mountModal({ open: true, portal: false, overlay: false, ui: { content: 'sm:max-w-3xl' },
      'onUpdate:open': (open: boolean) => updates.push(open),
    })
    try {
      expect(view.boundaries.Sheet.open).toBe(true)
      fire(view.boundaries.Sheet['onUpdate:open'], false as any)
      expect(updates).toEqual([false])
      const content = view.boundaries.SheetContent
      expect(content.side).toBe('right')
      expect(content.portal).toBe(false)
      expect(content.overlay).toBe(false)
      expect(content['show-close']).toBe(false)
      expect(content.class).toContain('sm:max-w-3xl')
      expect(content.class).not.toContain('sm:max-w-lg')
      view.state.fullscreen = true
      await Vue.nextTick()
      expect(view.boundaries.SheetContent.class).toContain('sm:max-w-none')
      expect(view.boundaries.SheetContent.class).not.toContain('sm:max-w-3xl')
    } finally { view.app.unmount() }
  })
})
