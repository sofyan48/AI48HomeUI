import { describe, expect, test } from 'bun:test'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import shell from '../locales/portal/shell'
import workspace from '../locales/portal/workspace'
import models from '../locales/portal/models'
import account from '../locales/portal/account'
import auth from '../locales/portal/auth'
import playground from '../locales/portal/playground'
import analytics from '../locales/portal/analytics'
import organizations from '../locales/portal/organizations'
import { portalMessages } from '../locales/portal'

const root = new URL('..', import.meta.url).pathname
const areas = { shell, workspace, models, account, auth, playground, analytics, organizations }
const en: Record<string, string> = Object.assign({}, ...Object.values(areas).map(area => area.en))
const id: Record<string, string> = Object.assign({}, ...Object.values(areas).map(area => area.id))

function vueFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name)
    return statSync(join(root, rel)).isDirectory() ? vueFiles(rel) : name.endsWith('.vue') ? [rel] : []
  })
}

const portalFiles = ['layouts/app.vue', 'layouts/playground.vue', ...vueFiles('pages/app'), ...vueFiles('components/app')]

describe('user portal i18n', () => {
  test('recursive discovery covers the workspace index and every app feature route', () => {
    const routes = portalFiles.filter(file => file.startsWith('pages/app/'))
    expect(routes).toHaveLength(16)
    expect(routes).toContain('pages/app/index.vue')
    expect(routes).toContain('pages/app/models/index.vue')
        expect(routes).toContain('pages/app/models/price/index.vue')
    expect(routes.every(file => file.endsWith('/index.vue'))).toBe(true)
  })
  test('area keys do not collide', () => {
    const seen = new Map<string, string>()
    for (const [area, messages] of Object.entries(areas)) {
      for (const key of Object.keys(messages.en)) {
        expect(seen.get(key) ? `${key} in ${seen.get(key)} and ${area}` : '').toBe('')
        seen.set(key, area)
      }
    }
  })

  test('Indonesian covers exactly the English keys with non-empty text', () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries(id)) expect(value.trim() ? '' : key).toBe('')
  })

  for (const [locale, table] of Object.entries(portalMessages)) {
    test(`${locale} covers every key with matching placeholders`, () => {
      const messages = table as Record<string, string>
      const names = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort())
      for (const key of Object.keys(en)) {
        expect(messages[key]?.trim() ? '' : `${key} is empty`).toBe('')
        expect([key, ...names(messages[key] ?? '')]).toEqual([key, ...names(en[key]!)])
      }
    })
  }

  for (const file of portalFiles) {
    test(`${file} compiles and only uses known keys`, () => {
      const filename = join(root, file)
      const source = readFileSync(filename, 'utf8')
      const { descriptor, errors } = parse(source, { filename })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: file })
      if (descriptor.template) {
        const template = compileTemplate({ source: descriptor.template.content, filename, id: file, compilerOptions: { bindingMetadata: script.bindings } })
        expect(template.errors).toEqual([])
      }
      const used = [...source.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)].map(match => match[1]!)
      expect(used.filter(key => !(key in en))).toEqual([])
    })
  }
})
