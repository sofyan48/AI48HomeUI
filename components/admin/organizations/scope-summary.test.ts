import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import * as Vue from 'vue'
import { renderToString } from 'vue/server-renderer'

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8')
const { descriptor } = parse(read('OrganizationScopeBadges.vue'))
const script = compileScript(descriptor, { id: 'scope-badges', inlineTemplate: true }).content
const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(script)
  .replace(/import\s+\{([^}]+)\}\s+from\s+["']vue["'];?/g, (_, names: string) => `const { ${names.replace(/\s+as\s+/g, ': ')} } = Vue;`)
  .replace(/import Badge from [^;]+;/, '')
  .replace('export default', 'return')
const Badge = Vue.defineComponent({
  props: ['variant'],
  setup: (props, { slots }) => () => Vue.h('span', { 'data-variant': props.variant }, slots.default?.()),
})
const Summary = new Function('Vue', 'Badge', js)(Vue, Badge) as Vue.Component
const render = (ids?: number[]) => renderToString(Vue.createSSRApp({
  render: () => Vue.h(Summary, {
    ids, name: (id: number) => id === 1 ? 'Production Models' : `#${id}`,
    unrestricted: 'All models (unrestricted)', unsupported: 'Not reported by this Home version',
  }),
}))

describe('organization scope summaries', () => {
  test('renders every name and unknown ID visibly as wrapping badges', async () => {
    const html = await render([1, 99])
    expect(html).toContain('Production Models</span>')
    expect(html).toContain('#99</span>')
    expect(html).not.toContain('unrestricted')
    expect(html).not.toContain('title=')
    expect(html).toContain('flex-wrap')
    expect(html).toContain('whitespace-normal')
    expect(html).toContain('[overflow-wrap:anywhere]')
  })

  test('empty scope is explicitly unrestricted; omitted scope is unsupported, not unrestricted', async () => {
    expect(await render([])).toContain('All models (unrestricted)</span>')
    const missing = await render()
    expect(missing).toContain('Not reported by this Home version</span>')
    expect(missing).not.toContain('All models')
  })

  test('list slots use the actual arrays and catalog names with warnings and retry', () => {
    const list = read('OrganizationsWorkspace.vue')
    for (const key of ['model_groups', 'channel_groups']) {
      expect(list).toContain(`accessorKey: '${key}'`)
      expect(list).toContain(`#${key}-cell="{ row }"`)
      expect(list).toContain(`:ids="value(row).${key}"`)
    }
    expect(list).toContain(':name="modelGroupName"')
    expect(list).toContain(':name="credentialScopeName"')
    expect(list).toContain("t('organizations.allModels')")
    expect(list).toContain("t('organizations.allCredentials')")
    expect(list).toContain("t('organizations.credentialScopesUnsupported')")
    expect(list).toContain('v-if="modelGroupsError || scopesError"')
    expect(list).toContain('@click="loadScopeCatalogs"')
    expect(list).toContain("useDataSync('admin:organizations:sync', () => loadAll())")
    expect(list).toContain('onMounted(loadAll)')
    expect(list).not.toContain("priority: 'secondary'")
  })
})
