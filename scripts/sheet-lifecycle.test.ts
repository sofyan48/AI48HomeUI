import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, parse, registerTS } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as Vue from 'vue'
import * as Reka from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'

registerTS(() => ts)
const root = join(import.meta.dir, '..')
const transpiler = new Bun.Transpiler({ loader: 'ts' })
function loadSfc(file: string, modules: Record<string, any>): Vue.Component {
  const filename = join(root, file)
  const { descriptor, errors } = parse(readFileSync(filename, 'utf8'), { filename })
  expect(errors).toEqual([])
  const script = compileScript(descriptor, {
    id: file, inlineTemplate: true,
    fs: { fileExists: existsSync, readFile: path => readFileSync(path, 'utf8') },
  })
  const js = transpiler.transformSync(script.content)
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, source) =>
      `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(source)}];`)
    .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, source) =>
      `const ${name} = modules[${JSON.stringify(source)}];`)
    .replace('export default', 'return')
  return new Function('modules', js)({ vue: Vue, cn: { cn }, '@vueuse/core': { reactiveOmit }, ...modules })
}

// Keep Vue Transition, Reka's root/context and prop/event forwarding real. Only
// browser-facing content/portal boundaries are replaced for this DOM-free suite.
// The host implements the supported Element.getAnimations / Animation.finished API;
// completion is driven explicitly, with no synthetic lifecycle DOM events or sleeps.
type AnimationControl = { finished: Promise<void>; finish: () => void; cancel: () => void }
function animation(): AnimationControl {
  let finish!: () => void
  let cancel!: () => void
  const finished = new Promise<void>((resolve, reject) => {
    finish = resolve
    cancel = () => reject(new Error('Animation cancelled'))
  })
  return { finished, finish, cancel }
}
type HostNode = {
  tag: string
  props: Record<string, any>
  children: HostNode[]
  parent?: HostNode
  setAttribute: (key: string, value: string) => void
  getAnimations: () => AnimationControl[]
}
const contentEvents = ['escapeKeyDown', 'interactOutside', 'pointerDownOutside', 'focusOutside', 'openAutoFocus', 'closeAutoFocus']

function mount(options: { initialOpen?: boolean; animated?: boolean; modal?: boolean; appModal?: boolean; attrs?: Record<string, any> } = {}) {
  const entered: AnimationControl[] = []
  const left: AnimationControl[] = []
  const events: string[] = []
  const boundaries: { content?: any; portal?: any } = {}
  const open = Vue.ref(options.initialOpen ?? false)
  const attrs = Vue.reactive({ ...options.attrs })
  const node = (tag: string): HostNode => ({
    tag, props: {}, children: [],
    setAttribute(key, value) { this.props[key] = value },
    getAnimations() {
      if (!options.animated) return []
      const current = animation()
      ;(this.props['data-state'] === 'closed' ? left : entered).push(current)
      return [current]
    },
  })
  const renderer = Vue.createRenderer<HostNode, HostNode>({
    createElement: node, createText: () => node('#text'), createComment: () => node('#comment'),
    setText() {}, setElementText() {},
    parentNode: target => target.parent!,
    nextSibling: target => target.parent?.children[target.parent.children.indexOf(target) + 1] || null,
    insert(child, parent, anchor) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
      child.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
    },
    remove(child) {
      if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
      child.parent = undefined
    },
    patchProp(target, key, _, value) { target.props[key] = value },
  })
  const Content = Vue.defineComponent({
    inheritAttrs: false,
    props: { forceMount: Boolean, disableOutsidePointerEvents: { type: Boolean, default: undefined } },
    emits: contentEvents,
    setup(props, { attrs, slots, emit }) {
      const context = Reka.injectDialogRootContext()
      boundaries.content = { props, attrs, emit, context }
      Vue.onMounted(() => emit('openAutoFocus', new Event('open-auto-focus', { cancelable: true })))
      Vue.onUnmounted(() => emit('closeAutoFocus', new Event('close-auto-focus', { cancelable: true })))
      return () => (props.forceMount || context.open.value)
        ? Vue.h('section', { ...attrs, 'data-state': context.open.value ? 'open' : 'closed' }, slots.default?.())
        : null
    },
  })
  const Portal = Vue.defineComponent({
    props: ['disabled', 'to'],
    setup(props, { slots }) {
      boundaries.portal = props
      return () => Vue.h('portal', null, slots.default?.())
    },
  })
  const Overlay = Vue.defineComponent({ setup: (_, { attrs }) => () => Vue.h('overlay', attrs) })
  const Close = Vue.defineComponent({
    setup(_, { slots }) {
      const context = Reka.injectDialogRootContext()
      return () => Vue.h('button', { onClick: () => context.onOpenChange(false) }, slots.default?.())
    },
  })
  const SheetContent = loadSfc('components/ui/sheet/SheetContent.vue', {
    'reka-ui': { ...Reka, DialogContent: Content, DialogPortal: Portal, DialogClose: Close },
    './SheetOverlay.vue': Overlay,
    '@tabler/icons-vue': { IconX: () => Vue.h('svg') },
  })
  const AppModal = options.appModal ? loadSfc('components/AppModal.vue', {
    '~/components/ui/sheet': {
      Sheet: Reka.DialogRoot, SheetContent, SheetClose: Close, SheetTrigger: () => null,
      SheetHeader: (_, { slots }: any) => Vue.h('header', null, slots.default?.()),
            SheetFooter: (_, { slots }: any) => Vue.h('footer', null, slots.default?.()),
            SheetTitle: (_, { slots }: any) => Vue.h('h2', null, slots.default?.()),
      SheetDescription: (_, { slots }: any) => Vue.h('p', null, slots.default?.()),
    },
    '~/composables/useAdminI18n': { useAdminI18n: () => ({ t: (key: string) => key }) },
  }) : undefined
  const lifecycle = options.appModal
    ? { 'onAfter:enter': () => events.push('enter'), 'onAfter:leave': () => events.push('leave') }
    : { onAfterEnter: () => events.push('enter'), onAfterLeave: () => events.push('leave') }
  const update = (value: boolean) => { open.value = value }
  const app = renderer.createApp({
    setup: () => () => AppModal
      ? Vue.h(AppModal, { ...attrs, ...lifecycle, open: open.value, 'onUpdate:open': update })
      : Vue.h(Reka.DialogRoot, { open: open.value, modal: options.modal ?? true, 'onUpdate:open': update }, {
          default: () => Vue.h(SheetContent, { ...attrs, ...lifecycle }, { default: () => Vue.h('span', 'Body') }),
        }),
  })
  app.component('AppButton', (_, { attrs }: any) => Vue.h('button', attrs))
  const tree = node('root')
  app.mount(tree)
  const all = (target = tree): HostNode[] => [target, ...target.children.flatMap(child => all(child))]
  return { app, open, attrs, entered, left, events, boundaries, all, content: () => all().find(n => n.props['data-slot'] === 'sheet-content') }
}

async function flush() {
  await Vue.nextTick()
  await Promise.resolve()
  await Vue.nextTick()
}

describe('SheetContent transition completion', () => {
  test('waits for real animation completion and retains closed content until leave finishes', async () => {
    const view = mount({ animated: true })
    try {
      expect(view.content()).toBeUndefined()
      view.open.value = true
      await flush()
      expect(view.boundaries.content.props.forceMount).toBe(true)
      expect(view.entered).toHaveLength(1)
      expect(view.events).toEqual([])
      view.entered[0]!.finish()
      await flush()
      expect(view.events).toEqual(['enter'])
      view.open.value = false
      await flush()
      expect(view.content()?.props['data-state']).toBe('closed')
      expect(view.left).toHaveLength(1)
      expect(view.events).toEqual(['enter'])
      view.left[0]!.finish()
      await flush()
      expect(view.content()).toBeUndefined()
      expect(view.events).toEqual(['enter', 'leave'])
    } finally { view.app.unmount() }
  })

  test('initial open appears, and animation-free cycles finish without timers', async () => {
    const view = mount({ initialOpen: true })
    try {
      await flush()
      expect(view.events).toEqual(['enter'])
      view.open.value = false
      await flush()
      expect(view.content()).toBeUndefined()
      expect(view.events).toEqual(['enter', 'leave'])
      view.open.value = true
      await flush()
      expect(view.events).toEqual(['enter', 'leave', 'enter'])
    } finally { view.app.unmount() }
  })

  test('cancelled animations settle, but interrupted enter does not emit after-enter', async () => {
    const view = mount({ initialOpen: true, animated: true })
    try {
      await flush()
      view.open.value = false
      await flush()
      view.entered[0]!.cancel()
      await flush()
      expect(view.events).toEqual([])
      view.left[0]!.cancel()
      await flush()
      expect(view.content()).toBeUndefined()
      expect(view.events).toEqual(['leave'])
    } finally { view.app.unmount() }
  })

  test('rapid reopen completes the outgoing leave once and ignores stale animation completion', async () => {
    const view = mount({ initialOpen: true, animated: true, modal: false })
    try {
      await flush()
      view.entered[0]!.finish()
      await flush()
      view.open.value = false
      await flush()
      view.open.value = true
      await flush()
      // Vue finishes the old leave before inserting the new instance.
      expect(view.events).toEqual(['enter', 'leave'])
      expect(view.content()?.props['data-state']).toBe('open')
      expect(view.boundaries.content.context.modal.value).toBe(false)
      view.left[0]!.finish()
      await flush()
      expect(view.events).toEqual(['enter', 'leave'])
      view.entered[1]!.finish()
      await flush()
      expect(view.events).toEqual(['enter', 'leave', 'enter'])
      expect(view.all().filter(n => n.props['data-slot'] === 'sheet-content')).toHaveLength(1)
    } finally { view.app.unmount() }
  })

  test('forwards attrs, portal, overlay, close controls and Reka events without lifecycle DOM listeners', async () => {
    const focus: string[] = []
    const escape = (event: Event) => event.preventDefault()
    const view = mount({ attrs: {
      portal: '#drawer-target', overlayClass: 'overlay-test', side: 'left', closeLabel: 'Dismiss sheet',
      id: 'sheet-test', 'aria-label': 'Settings', disableOutsidePointerEvents: false,
      onEscapeKeyDown: escape, onOpenAutoFocus: () => focus.push('open'), onCloseAutoFocus: () => focus.push('close'),
    } })
    try {
      view.open.value = true
      await flush()
      expect(view.boundaries.portal).toMatchObject({ disabled: false, to: '#drawer-target' })
      expect(view.content()?.props).toMatchObject({ id: 'sheet-test', 'aria-label': 'Settings' })
      expect(view.content()?.props.class).toContain('slide-in-from-left')
      expect(view.all().find(n => n.tag === 'overlay')?.props.class).toBe('overlay-test')
      expect(view.boundaries.content.props.disableOutsidePointerEvents).toBe(false)
      expect(view.boundaries.content.attrs.onAfterEnter).toBeUndefined()
      expect(view.boundaries.content.attrs.onAfterLeave).toBeUndefined()
      const event = new Event('escape', { cancelable: true })
      view.boundaries.content.emit('escapeKeyDown', event)
      expect(event.defaultPrevented).toBe(true)
      expect(focus).toEqual(['open'])
      view.attrs.portal = false
      view.attrs.overlay = false
      view.attrs.showClose = false
      await flush()
      expect(view.boundaries.portal.disabled).toBe(true)
      expect(view.all().some(n => n.tag === 'overlay' || n.tag === 'button')).toBe(false)
      view.open.value = false
      await flush()
      expect(focus).toEqual(['open', 'close'])
    } finally { view.app.unmount() }
  })

  test('AppModal receives after:enter/leave and locked dismissal still prevents forwarded events', async () => {
    let prevented = 0
    let consumerCalls = 0
    const view = mount({ appModal: true, animated: true, attrs: {
      dismissible: false, 'onClose:prevent': () => prevented++,
      content: { onEscapeKeyDown: () => consumerCalls++, onInteractOutside: () => consumerCalls++ },
    } })
    try {
      view.open.value = true
      await flush()
      expect(view.events).toEqual([])
      view.entered[0]!.finish()
      await flush()
      expect(view.events).toEqual(['enter'])
      for (const name of ['escapeKeyDown', 'interactOutside']) {
        const event = new Event(name, { cancelable: true })
        view.boundaries.content.emit(name, event)
        expect(event.defaultPrevented).toBe(true)
      }
      expect(consumerCalls).toBe(2)
      expect(prevented).toBe(2)
      expect(view.open.value).toBe(true)
      view.attrs.dismissible = true
      await flush()
      const unlocked = new Event('escape', { cancelable: true })
      view.boundaries.content.emit('escapeKeyDown', unlocked)
      expect(unlocked.defaultPrevented).toBe(false)
      view.open.value = false
      await flush()
      expect(view.events).toEqual(['enter'])
      view.left[0]!.finish()
      await flush()
      expect(view.events).toEqual(['enter', 'leave'])
    } finally { view.app.unmount() }
  })
})
