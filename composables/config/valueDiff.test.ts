import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import * as Vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { buildValueDiff, diffBlocks } from './valueDiff'
import * as helpers from './valueDiff'

const root = new URL('../../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')
const source = read('components/admin/config/ConfigValueDiff.vue')
const translator = (key: string) => ({ 'common.from': 'From', 'common.to': 'To', 'common.details': 'Details' })[key] || key

function component() {
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'config-value-diff', inlineTemplate: true })
  const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(compiled.content)
    .replace(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_, names, path) => `const { ${names.replace(/\s+as\s+/g, ': ')} } = modules[${JSON.stringify(path)}];`)
    .replace(/import\s+(\w+)\s+from\s+["']([^"']+)["'];?/g, (_, name, path) => `const ${name} = modules[${JSON.stringify(path)}];`)
    .replace('export default', 'return')
  return new Function('modules', js)({
    vue: Vue,
    '~/composables/config/valueDiff': helpers,
    '~/composables/useAdminI18n': { useAdminI18n: () => ({ t: translator }) },
    '~/components/AppButton.vue': Vue.defineComponent({ setup: (_, { attrs, slots }) => () => Vue.h('button', attrs, slots.default?.()) }),
  }) as Vue.Component
}

describe('bounded config value diff', () => {
  test('tracks old and new line numbers across insertions and deletions', () => {
    expect(buildValueDiff('first\nold\nlast', 'first\nnew\nextra\nlast').lines).toMatchObject([
      { kind: 'context', oldLine: 1, newLine: 1 },
      { kind: 'removed', oldLine: 2 },
      { kind: 'added', newLine: 2 },
      { kind: 'added', newLine: 3 },
      { kind: 'context', oldLine: 3, newLine: 4 },
    ])
  })
  test('highlights only changed words, retaining whitespace and Unicode', () => {
    const result = buildValueDiff('hello 世界 old  value', 'hello 世界 new  value')
    expect(result.lines[0]?.words?.filter(word => word.changed).map(word => word.value)).toEqual(['old'])
    expect(result.lines[1]?.words?.filter(word => word.changed).map(word => word.value)).toEqual(['new'])
    expect(result.lines[0]?.words?.map(word => word.value).join('')).toBe('hello 世界 old  value')
  })
  test('does not pair ambiguous multiline replacements', () => {
    expect(buildValueDiff('old a\nold b', 'new a\nnew b').lines.every(line => !line.words)).toBe(true)
  })
  test('canonicalizes JSON object keys but preserves array ordering', () => {
    expect(buildValueDiff('{"b":2,"a":1}', '{"a":1,"b":2}', 'json').lines.every(line => line.kind === 'context')).toBe(true)
    expect(buildValueDiff('[1,2]', '[2,1]', 'json').lines.some(line => line.kind === 'removed')).toBe(true)
    expect(buildValueDiff('{invalid', '{changed', 'json').fallback).toBe(false)
  })
  test('retains empty lines, final newlines, and explicit empty values', () => {
    const result = buildValueDiff('a\n', 'a')
    expect(result.lines).toContainEqual({ kind: 'removed', value: '', oldLine: 2 })
    expect(buildValueDiff('', 'value').lines[0]?.value).toBe('')
    expect(buildValueDiff('a\r\nb', 'a\nb').lines.every(line => line.kind === 'context')).toBe(true)
  })
  test('falls back for large input, excessive lines, or comparison cells', () => {
    expect(buildValueDiff('x'.repeat(200_001), 'y').fallback).toBe(true)
    expect(buildValueDiff('a\n'.repeat(801), 'b').fallback).toBe(true)
    expect(buildValueDiff(Array(399).fill('a').join('\n'), Array(399).fill('b').join('\n')).fallback).toBe(false)
    expect(buildValueDiff(Array(400).fill('a').join('\n'), Array(400).fill('b').join('\n')).fallback).toBe(true)
    expect(buildValueDiff('a '.repeat(3000), 'b '.repeat(3000)).lines.every(line => !line.words)).toBe(true)
  })
  test('collapses unchanged leading, middle and trailing context with three adjacent lines', () => {
    const context = Array.from({ length: 20 }, (_, i) => String(i)).join('\n')
    const blocks = diffBlocks(buildValueDiff(`${context}\nold\n${context}\nold\n${context}`, `${context}\nnew\n${context}\nnew\n${context}`).lines)
    const folded = blocks.filter(block => block.hidden.length)
    expect(folded.map(block => [block.lines.length, block.hidden.length, block.tail.length])).toEqual([[0, 17, 3], [3, 14, 3], [3, 17, 0]])
    expect(blocks.flatMap(block => [...block.lines, ...block.hidden, ...block.tail])).toEqual(buildValueDiff(`${context}\nold\n${context}\nold\n${context}`, `${context}\nnew\n${context}\nnew\n${context}`).lines)
  })
})

describe('config review rendering', () => {
  test('SFCs compile without template errors', () => {
    for (const path of ['ConfigValueDiff.vue', 'ConfigReviewDialogs.vue']) {
      const { descriptor, errors } = parse(read(`components/admin/config/${path}`))
      expect(errors).toEqual([])
      expect(compileTemplate({ source: descriptor.template!.content, filename: path, id: path }).errors).toEqual([])
    }
  })
  test('renders semantic insertions/deletions and word highlights without interpreting HTML', async () => {
    const html = await renderToString(Vue.createSSRApp(component(), { before: 'hello <script>old</script>', after: 'hello <script>new</script>' }))
    expect(html).toContain('<del')
    expect(html).toContain('<ins')
    expect(html).toContain('<mark')
    expect(html).toContain('&lt;')
    expect(html).not.toContain('<script>')
  })
  test('renders only masked text for equal sensitive display strings', async () => {
    const html = await renderToString(Vue.createSSRApp(component(), { before: '[sensitive value]', after: '[sensitive value]' }))
    expect(html).toContain('[sensitive value]')
    expect(html).not.toContain('<ins')
    expect(html).not.toContain('<del')
    const workspace = read('composables/config/useConfigWorkspace.ts')
    for (const key of ['remoteManagementSecretKey', 'liveMediaRelayIceServersJson', 'serverGithubToken']) expect(workspace).toContain(`key === "${key}"`)
    const review = read('components/admin/config/ConfigReviewDialogs.vue')
    expect(review).toContain(':before="change.before" :after="change.after"')
    expect(review).not.toContain('draft[')
    expect(review).not.toContain('baseline[')
  })
  test('offers a separate navigation button and waits until the overlay has closed', () => {
    const review = read('components/admin/config/ConfigReviewDialogs.vue')
    expect(review).toContain('@click="requestNavigation(change.section)"')
    expect(review).toContain('@after:leave="navigateAfterClose"')
    expect(review).toContain('scrollToSection(pendingSection.value)')
    expect(review).not.toContain('<button')
  })
  test('shows collapsed context with an accessible expansion button', async () => {
    const before = `${Array.from({ length: 20 }, (_, i) => `line-${i}`).join('\n')}\nold`
    const html = await renderToString(Vue.createSSRApp(component(), { before, after: before.replace(/old$/, 'new') }))
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Details (17)')
    expect(html).not.toContain('line-0<')
    expect(html).toContain('line-19')
  })
  test('expands/collapses context and resets expansion when values change', async () => {
    type Node = { tag: string; text: string; props: Record<string, unknown>; children: Node[]; parent: Node | null }
    const node = (tag: string, text = ''): Node => ({ tag, text, props: {}, children: [], parent: null })
    const renderer = Vue.createRenderer<Node, Node>({
      createElement: tag => node(tag), createText: text => node('#text', text), createComment: text => node('#comment', text),
      setText: (target, text) => { target.text = text }, setElementText: (target, text) => { target.text = text; target.children = [] },
      parentNode: target => target.parent, nextSibling: target => target.parent?.children[target.parent.children.indexOf(target) + 1] || null,
      patchProp: (target, key, _old, value) => { target.props[key] = value },
      insert(child, parent, anchor) {
        if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
        child.parent = parent
        const index = anchor ? parent.children.indexOf(anchor) : -1
        if (index < 0) parent.children.push(child)
        else parent.children.splice(index, 0, child)
      },
      remove(target) { if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1) },
    })
    const before = `${Array.from({ length: 20 }, (_, i) => `line-${i}`).join('\n')}\nold`
    const values = Vue.reactive({ before, after: before.replace(/old$/, 'new') })
    const Diff = component()
    const container = node('root')
    const app = renderer.createApp({ setup: () => () => Vue.h(Diff, values) })
    app.mount(container)
    const flatten = (target: Node): Node[] => [target, ...target.children.flatMap(flatten)]
    const button = () => flatten(container).find(target => target.tag === 'button')!
    const text = () => flatten(container).map(target => target.text).join('')
    expect(button().props['aria-expanded']).toBe(false)
    expect(text()).not.toContain('line-0')
    ;(button().props.onClick as () => void)()
    await Vue.nextTick()
    expect(button().props['aria-expanded']).toBe(true)
    expect(text()).toContain('line-0')
    ;(button().props.onClick as () => void)()
    await Vue.nextTick()
    expect(button().props['aria-expanded']).toBe(false)
    expect(text()).not.toContain('line-0')
    ;(button().props.onClick as () => void)()
    await Vue.nextTick()
    values.after = before.replace(/old$/, 'another')
    await Vue.nextTick()
    expect(button().props['aria-expanded']).toBe(false)
    app.unmount()
  })
  test('large comparisons retain complete escaped before/after values', async () => {
    const before = '<unsafe>' + 'a'.repeat(200_001)
    const html = await renderToString(Vue.createSSRApp(component(), { before, after: 'new value' }))
    expect(html).toContain('&lt;unsafe&gt;' + 'a'.repeat(200_001))
    expect(html).toContain('new value')
    expect(html).toContain('From')
    expect(html).toContain('To')
  })
})
