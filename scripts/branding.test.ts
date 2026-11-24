import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'

const wordmarks = [
  'components/admin/layout/LayoutSidebar.vue',
  'components/app/general/PortalNavigation.vue',
  'layouts/app.vue'
]

describe('workspace branding', () => {
  for (const file of wordmarks) {
    test(`${file} displays AI48Home, including split-markup wordmarks`, () => {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      const { descriptor, errors } = parse(source, { filename: file })
      expect(errors).toEqual([])
      const text = descriptor.template!.content.replace(/<[^>]*>/g, '')
      expect(text).toContain('AI48Home')
      expect(text).not.toMatch(/AI48\s*Hub/i)
    })
  }
})
