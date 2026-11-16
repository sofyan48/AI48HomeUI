import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, compileTemplate, parse, registerTS } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as Vue from 'vue'
import { cn } from 'cn'
import * as context from './portalField'

registerTS(() => ts)
const folder = import.meta.dir
const fs = { fileExists: existsSync, readFile: (path: string) => readFileSync(path, 'utf8') }
function compile(name: string, inlineTemplate = false) {
  const filename = join(folder, name)
  const { descriptor, errors } = parse(readFileSync(filename, 'utf8'), { filename })
  expect(errors).toEqual([])
  return { descriptor, script: compileScript(descriptor, { id: name, inlineTemplate, fs }) }
}
const transpiler = new Bun.Transpiler({ loader: 'ts' })
function load(name: string, modules: Record<string, unknown>) {
  const { script } = compile(name, true)
  const js = transpiler.transformSync(script.content)
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, source) =>
      `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(source)}];`)
    .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, source) => `const ${name} = modules[${JSON.stringify(source)}].default;`)
    .replace('export default', 'return')
  return new Function('modules', js)({ vue: Vue, cn: { cn }, './portalField': context, '~/components/AppIcon.vue': { default: primitive('svg') }, ...modules })
}
const primitive = (tag: string) => Vue.defineComponent({
  inheritAttrs: false,
  setup: (_, { attrs, slots }) => () => Vue.h(tag, attrs, slots.default?.()),
})
const fields = { Field: primitive('fieldset'), FieldLabel: primitive('label'), FieldDescription: primitive('p'), FieldError: primitive('aside') }
const Input = load('PortalInput.vue', {
  '~/components/ui/input': { Input: primitive('input') },
  '~/components/ui/input-group': { InputGroup: primitive('section'), InputGroupInput: primitive('input'), InputGroupAddon: primitive('span') },
})
const Select = load('PortalSelect.vue', { '~/components/ui/native-select': { NativeSelect: primitive('select'), NativeSelectOption: primitive('option') } })
const Checkbox = load('PortalCheckbox.vue', { '~/components/ui/checkbox': { Checkbox: primitive('button') }, '~/components/ui/field': fields })
const Field = load('PortalField.vue', { '~/components/ui/field': fields })
type Node = { tag: string; props: Record<string, any>; children: Node[]; parent?: Node; text?: string }
function mount(component: Vue.Component, initial: Record<string, any>, slots: Record<string, any> = {}) {
  const create = (tag = '', text?: string): Node => ({ tag, props: {}, children: [], text })
  const renderer = Vue.createRenderer<Node, Node>({
    createElement: create, createText: text => create('', text), createComment: () => create(),
    setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
    parentNode: node => node.parent!, nextSibling: () => null,
    insert: (node, parent) => { node.parent = parent; parent.children.push(node) },
    remove: node => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) },
    patchProp: (node, key, _, value) => { node.props[key] = value },
  })
  const state = Vue.reactive(initial)
  const tree = create('root')
  const app = renderer.createApp({ setup: () => () => Vue.h(component, state, slots) })

  app.mount(tree)
  const all = (node = tree): Node[] => [node, ...node.children.flatMap(child => all(child))]
  return { state, app, find: (tag: string) => all().find(node => node.tag === tag)!, all }
}

describe('portal adapters', () => {
  for (const file of ['PortalInput.vue', 'PortalField.vue', 'PortalCheckbox.vue', 'PortalSelect.vue']) {
    test(`${file} compiles script and template`, () => {
      const { descriptor, script } = compile(file)
      const template = compileTemplate({ source: descriptor.template!.content, filename: join(folder, file), id: file, compilerOptions: { bindingMetadata: script.bindings } })
      expect(template.errors).toEqual([])
      expect(compile(file, true).script.content).toContain('return')
    })
  }
  test('number input emits strings, forwards native constraints and keeps trailing controls', () => {
    const updates: unknown[] = []
    const view = mount(Input, { modelValue: 12, type: 'number', min: '0', step: 'any', autocomplete: 'off', readonly: true, disabled: true, icon: 'i-tabler-lock', 'onUpdate:modelValue': (value: unknown) => updates.push(value) }, { trailing: () => Vue.h('button', { type: 'button', 'aria-label': 'Show password' }) })
    const input = view.find('input')
    expect(input.props).toMatchObject({ modelValue: 12, min: '0', step: 'any', autocomplete: 'off', readonly: true, disabled: true })
    input.props.onInput({ target: { value: '12.5' } })
    input.props.onInput({ target: { value: '' } })
    expect(updates).toEqual(['12.5', ''])
    expect(view.find('button').props['aria-label']).toBe('Show password')
    view.app.unmount()
  })
  test('field context links labels, hint, help, required and reactive errors', async () => {
    const view = mount(Field, { label: 'Email', hint: 'Optional hint', help: 'Help', required: true }, { default: () => Vue.h(Input, { id: 'custom-email', 'aria-describedby': 'external' }) })
    await Vue.nextTick()
    const input = view.find('input')
    expect(view.find('label').props.for).toBe('custom-email')
    expect(input.props.required).toBe(true)
    expect(input.props['aria-describedby']).toContain('external')
    expect(input.props['aria-describedby']).toContain('-hint')
    expect(input.props['aria-describedby']).toContain('-help')
    view.state.error = 'Invalid email'
    await Vue.nextTick()
    expect(input.props['aria-invalid']).toBe(true)
    expect(input.props['aria-describedby']).toContain('-error')
    expect(input.props['aria-describedby']).not.toContain('-help')
    expect(view.find('aside').props.id).toBe(input.props['aria-describedby'].split(' ').at(-1))
    view.app.unmount()
  })
  test('select preserves numeric, string, empty and undefined option values', async () => {
    const updates: unknown[] = []
    const view = mount(Select, { modelValue: 10, items: [10, '10', '', undefined, { label: 'Missing', value: undefined }, { label: 'Disabled', value: 20, disabled: true }], 'onUpdate:modelValue': (value: unknown) => updates.push(value) })
    const select = view.find('select')
    expect(select.props['model-value']).toBe('option-0')
    for (const key of ['option-0', 'option-1', 'option-2', 'option-3', 'option-4', 'option-5', 'missing']) select.props['onUpdate:modelValue'](key)
    expect(updates).toEqual([10, '10', '', undefined, undefined])
    view.state.modelValue = undefined
    await Vue.nextTick()
    expect(select.props['model-value']).toBe('option-3')
    view.state.readonly = true
    await Vue.nextTick()
    select.props['onUpdate:modelValue']('option-0')
    expect(updates).toHaveLength(5)
    view.app.unmount()
  })
  test('select supports custom object keys without coercing numeric values', () => {
    const updates: unknown[] = []
    const view = mount(Select, { modelValue: 50, items: [{ id: 50, title: 'Fifty' }], valueKey: 'id', labelKey: 'title', 'onUpdate:modelValue': (value: unknown) => updates.push(value) })
    view.find('select').props['onUpdate:modelValue']('option-0')
    expect(updates).toEqual([50])
    view.app.unmount()
  })
  test('checkbox maps checked updates and refuses readonly or disabled changes', async () => {
    const updates: unknown[] = []
    const view = mount(Checkbox, { modelValue: false, label: 'Remember', 'onUpdate:modelValue': (value: unknown) => updates.push(value) })
    const checkbox = view.find('button')
    expect(view.find('label').props.for).toBe(checkbox.props.id)
    checkbox.props['onUpdate:modelValue'](true)
    view.state.readonly = true
    await Vue.nextTick()
    checkbox.props['onUpdate:modelValue'](false)
    view.state.readonly = false
    view.state.disabled = true
    await Vue.nextTick()
    checkbox.props['onUpdate:modelValue'](false)
    expect(updates).toEqual([true])
    view.app.unmount()
  })
})
