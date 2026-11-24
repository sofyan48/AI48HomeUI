import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const views = [
  'components/admin/billing/FilterBar.vue',
  'components/admin/usage/overview/UsageFilters.vue',
  'components/admin/usage/RequestRecords.vue',
  'components/admin/usage/UsageLegacyRecords.vue',
]

describe('billing and usage searchable provider/model filters', () => {
  for (const file of views) {
    test(`${file} compiles and uses the source-owned search select`, () => {
      const source = read(file)
      const { descriptor, errors } = parse(source, { filename: file })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: file })
      const template = compileTemplate({ source: descriptor.template!.content, filename: file, id: file, compilerOptions: { bindingMetadata: script.bindings } })
      expect(template.errors).toEqual([])
      expect(source).toContain("import AdminSearchSelect from '~/components/admin/general/controls/AdminSearchSelect.vue'")
      expect(source).toContain(':empty-text="t(\'common.noResults\')"')
      expect(source).not.toMatch(/<AdminInputMenu[^>]+(?:filters\.provider|filters\.model)/)
      expect(source).not.toMatch(/<AdminSelect(?:Menu)?\s[^>]+(?:filters\.provider|filters\.model)/)
    })
  }

  test('billing keeps all and historical choices without accepting arbitrary filter values', () => {
    const source = read(views[0]!)
    expect(source).toContain('...(values || []), selected')
    expect(source).toContain("return [{ label, value: '' }")
    for (const field of ['provider', 'model']) {
      expect(source).toContain(`filters.${field} = String($event ?? '')`)
      expect(source).not.toContain(`@create="filters.${field}`)
    }
    expect(read('composables/billing/useBillingWorkspace.ts')).toContain('...modelCandidates.value.map(item => item.provider)')
  })

  test('usage preserves all, selected values, and clear-to-empty query semantics', () => {
    const overview = read(views[1]!)
    expect(overview).toContain('[...values, selected]')
    expect(overview).toContain('$event === allOptionValue ? \'\' : String($event ?? \'\')')
    const records = read(views[2]!)
    expect(records).toContain("setSelectFilter('provider', $event ?? '')")
    expect(records).toContain("setSelectFilter('model', $event ?? '')")
    expect(records).toContain('filterOptions.value[key] : []), selected]')
    const legacy = read(views[3]!)
    expect(legacy).toContain("field.key === 'provider' || field.key === 'model'")
    expect(legacy).toContain('filters[field.key] = String($event ?? \'\')')
    expect(legacy).toContain('providerSuggestions.value : modelSuggestions.value')
  })
})
