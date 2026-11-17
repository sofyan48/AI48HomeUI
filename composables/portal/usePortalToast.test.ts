import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { isVNode } from 'vue'
import { IconCircleCheck, IconClock } from '@tabler/icons-vue'
import { toast } from 'vue-sonner'
import { usePortalToast } from './usePortalToast'
import { useAdminToast } from '../admin-feedback/useAdminToast'

const root = resolve(import.meta.dir, '../..')
function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(folder, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.(vue|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

// Exercise the actual installed Sonner store, without replacing its module globally.
function notification(options: Parameters<ReturnType<typeof usePortalToast>['add']>[0], adapter = usePortalToast()) {
  const id = adapter.add(options)
  const entry = toast.getHistory().find(item => item.id === id)
  expect(entry).toBeDefined()
  const originalFrame = globalThis.requestAnimationFrame
  try {
    globalThis.requestAnimationFrame = callback => { callback(0); return 0 }
    toast.dismiss(id)
  } finally {
    if (originalFrame) globalThis.requestAnimationFrame = originalFrame
    else Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
  }
  if (!entry || !('title' in entry)) throw new Error('Expected a Sonner toast')
  return entry
}

describe('portal toast mapping', () => {
  for (const color of ['success', 'error', 'warning', 'info'] as const) {
    test(`${color} preserves title, description and duration using the typed Sonner API`, () => {
      const entry = notification({ title: 'Saved', description: 'Account updated', color, duration: 7200 })
      expect(entry).toMatchObject({ title: 'Saved', description: 'Account updated', type: color, duration: 7200 })
    })
  }

  test('unspecified color uses a message and leaves the provider duration default intact', () => {
    const entry = notification({ title: 'Notice' })
    expect(entry.title).toBe('Notice')
    expect(entry.type).not.toBe('success')
    expect(entry.duration).toBeUndefined()
    expect(entry.description).toBeUndefined()
    expect(entry.icon).toBeUndefined()
  })

  test('zero duration remains persistent', () => {
    expect(notification({ title: 'Persistent', duration: 0 }).duration).toBe(Infinity)
  })

  for (const [name, component] of [['i-tabler-clock', IconClock], ['i-tabler-circle-check', IconCircleCheck]] as const) {
    test(`${name} is rendered as the matching decorative Tabler icon`, () => {
      const entry = notification({ title: 'Recharge', icon: name })
      expect(isVNode(entry.icon)).toBe(true)
      expect(entry.icon).toMatchObject({ type: component, props: { class: 'size-4', 'aria-hidden': 'true' } })
    })
  }
})

for (const [workspace, createToast, provider] of [
  ['portal', usePortalToast, 'components/app/general/PortalProvider.vue'],
  ['admin', useAdminToast, 'components/admin/general/AdminUiProvider.vue'],
] as const) {
  test(`${workspace} notifications appear top-right with status colors and a close button`, () => {
    const source = readFileSync(resolve(root, provider), 'utf8')
    expect(source).toContain('position="top-right" rich-colors close-button close-button-position="top-right"')
    for (const color of ['success', 'warning', 'error'] as const) {
      expect(notification({ title: color, color }, createToast()).type).toBe(color)
    }
  })

  test(`${workspace} progress is yellow, auto-dismisses by default and uses a clock icon`, () => {
    const entry = notification({ title: 'Working', color: 'progress' }, createToast())
    expect(entry).toMatchObject({ type: 'warning', dismissible: true })
        expect(entry.duration).toBeUndefined()
    expect(entry.icon).toMatchObject({ type: IconClock })
    expect(notification({ title: 'Working', color: 'progress', duration: 5000 }, createToast()).duration).toBe(5000)
  })
}

test('all portal toast consumers explicitly import the portal adapter, not Nuxt useToast', () => {
  const files = ['pages/app', 'components/app', 'composables/workspace', 'composables/models'].flatMap(folder => sourceFiles(resolve(root, folder)))
  const consumers: string[] = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    expect(source, file).not.toMatch(/\buseToast\b/)
    if (!/\busePortalToast\(/.test(source)) continue
    consumers.push(file)
    expect(source, file).toContain("import { usePortalToast } from '~/composables/portal/usePortalToast'")
  }
  for (const file of [
    'composables/models/useModelFormat.ts',
    'composables/workspace/common.ts',
    'composables/workspace/useWorkspaceAccount.ts',
    'composables/workspace/useWorkspaceKeys.ts',
    'composables/workspace/useWorkspacePasskeys.ts',
    'composables/workspace/useWorkspaceTOTP.ts',
    'pages/app/balance/index.vue',
    'components/app/workspace/dashboard/LimitReset.vue',
  ]) expect(consumers).toContain(resolve(root, file))
})

test('adapter depends directly on Sonner and Tabler, not Nuxt toast or admin providers', () => {
  const source = readFileSync(resolve(import.meta.dir, 'usePortalToast.ts'), 'utf8')
  expect(source).toContain("import { toast } from 'vue-sonner'")
  expect(source).toContain("from '@tabler/icons-vue'")
  expect(source).not.toMatch(/#imports|@nuxt\/ui|useToast|useAdmin|useApi\b/)
})
