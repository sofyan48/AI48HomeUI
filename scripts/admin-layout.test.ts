import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

const source = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

describe('admin layout feature extraction', () => {
  for (const file of [
    'layouts/default.vue',
    'components/admin/layout/LayoutSidebar.vue',
    'components/admin/layout/LayoutNavigation.vue',
    'components/admin/layout/LayoutConnectionStatus.vue',
    'components/admin/layout/LayoutHeader.vue'
  ]) {
    test(`${file} compiles script, template and scoped styles`, () => {
      const { descriptor, errors } = parse(source(file), { filename: file })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: file })
      const template = compileTemplate({
        source: descriptor.template!.content,
        filename: file,
        id: file,
        compilerOptions: { bindingMetadata: script.bindings }
      })
      expect(template.errors).toEqual([])
      for (const style of descriptor.styles) {
        expect(compileStyle({ source: style.content, filename: file, id: file, scoped: style.scoped }).errors).toEqual([])
      }
    })
  }

  test('mobile focus handling receives the exposed sidebar element', () => {
    const layout = source('layouts/default.vue')
    expect(layout).toContain('sidebar.value?.element ?? null')
    expect(layout).toContain('useAdminSidebar(sidebarElement)')
    expect(layout).toContain('@keydown="handleSidebarKeydown"')
    expect(source('components/admin/layout/LayoutSidebar.vue')).toContain('defineExpose({ element })')
    const sidebar = source('composables/layout/useAdminSidebar.ts')
    expect(sidebar).toContain('nextTick(() => mobileTrigger?.focus())')
    expect(sidebar).toContain("desktopQuery.removeEventListener('change', updateViewport)")
  })

  test('global synchronization and disconnect retain their management boundary', () => {
    const connection = source('composables/layout/useAdminConnection.ts')
    expect(connection).toContain('managementConfig.invalidate()')
    expect(connection).toContain("Promise.allSettled([refreshCapabilities(true), workspace.sync('admin:')])")
    expect(connection).toContain('token.value = null')
    expect(connection).toContain('managementRemember.value = false')
    expect(connection).toContain('resetCapabilities()')
  })
})
