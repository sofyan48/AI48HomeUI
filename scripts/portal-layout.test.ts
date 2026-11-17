import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'

const root = resolve(import.meta.dir, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('portal wide-screen layout', () => {
  test('catalog and workspace header fill the available viewport space', () => {
    const layout = read('layouts/app.vue')
    const catalog = read('pages/app/models/index.vue')
    expect(layout).toContain('flex min-w-0 w-full items-center justify-between gap-3')
    expect(catalog).toContain('model-workspace flex min-w-0 w-full flex-col gap-5')
    expect(layout).toContain("sidebarHidden ? 'lg:pl-[5.75rem]' : 'lg:pl-[17.5rem]'")
    expect(layout).toContain('px-3 [scrollbar-gutter:stable] sm:px-6')
    expect(layout).toContain('px-3 pb-6 pt-1 [scrollbar-gutter:stable] sm:px-6')

    const { descriptor, errors } = parse(catalog)
    expect(errors).toEqual([])
    // Catalog must remain fluid rather than reintroducing a fixed width cap.
    for (const style of descriptor.styles) {
      expect(style.content).not.toMatch(/max-width\s*:/)
    }
  })
})
