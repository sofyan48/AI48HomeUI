import { describe, expect, test } from 'bun:test'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { adminAreas, adminMessages } from '../locales/admin'
import consoleEn from '../locales/en'

const root = new URL('..', import.meta.url).pathname
const en = adminMessages.en as Record<string, string>
const names = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()

function vueFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name)
    return statSync(join(root, rel)).isDirectory() ? vueFiles(rel) : name.endsWith('.vue') ? [rel] : []
  })
}

const adminFiles = [
  'layouts/default.vue',
  ...vueFiles('pages/admin'),
  ...vueFiles('components/admin'),
  ...readdirSync(join(root, 'components')).filter(name => name.endsWith('.vue')).map(name => `components/${name}`)
]

describe('admin console i18n', () => {
  test('recursive discovery covers every admin route, including nested routing features', () => {
    const routes = adminFiles.filter(file => file.startsWith('pages/admin/'))
    expect(routes).toHaveLength(22)
    expect(routes).toContain('pages/admin/index.vue')
    expect(routes).toContain('pages/admin/dashboard/index.vue')
    expect(routes).toContain('pages/admin/routing/channels/index.vue')
    expect(routes).toContain('pages/admin/routing/model-groups/index.vue')
    expect(routes).toContain('pages/admin/routing/models/index.vue')
  })
  test('area keys do not collide', () => {
    const seen = new Map<string, string>()
    for (const [area, messages] of Object.entries(adminAreas)) {
      for (const key of Object.keys(messages.en)) {
        expect(seen.get(key) ? `${key} in ${seen.get(key)} and ${area}` : '').toBe('')
        seen.set(key, area)
      }
    }
  })

  for (const [locale, table] of Object.entries(adminMessages)) {
    test(`${locale} uses Worker terminology in Alerting and System Info`, () => {
      const messages = table as Record<string, string>
      const visibleText = Object.entries(messages)
        .filter(([key]) => key.startsWith('system.') || key.startsWith('alerting.'))
        .map(([, text]) => text.replace(/\{\w+\}/g, ''))
      expect(visibleText.filter(text => /\bCPAs?\b/i.test(text))).toEqual([])

      for (const key of [
        'alerting.rule.nodeOffline', 'alerting.rule.nodeOfflineHelp',
        'system.topology.title', 'system.topology.cpaCount', 'system.topology.unmatched',
        'system.topology.noCpa', 'system.topology.nodeName', 'system.topology.nodeIp',
        'system.topology.nodeId', 'system.topology.descCluster', 'system.topology.descInferred',
        'system.fact.nodesWithHome', 'system.rename.title', 'system.rename.description'
      ]) {
        expect(messages[key]).toContain('Worker')
      }
      for (const key of ['system.topology.descCluster', 'system.topology.descInferred', 'system.fact.nodesWithHome']) {
        expect(names(messages[key]!)).toEqual(['cpa', 'home'])
      }
    })
  }

  test('System Info uses Worker labels without renaming CPA data fields', () => {
    const source = readFileSync(join(root, 'components/admin/system-nodes/SystemTopology.vue'), 'utf8')
    expect(source).not.toMatch(/\bCPA\b/)
    expect(source).toContain('{{ nodes.length }} Worker')
    expect(source).toContain("t('system.runtime.homeRuntime') : 'Worker'")
    expect(source).toContain("{ key: 'cpa', label: 'Worker', value: String(cpaCount.value)")
    expect(source).toContain('topology.value.cpas')
    expect(source).toContain('summary.value.cpa_count')
    expect(source).toContain('summary.value.healthy_cpa_count')
  })

  for (const [locale, table] of Object.entries(adminMessages)) {
    if (locale === 'en') continue
    test(`${locale} covers every key with matching placeholders`, () => {
      const messages = table as Record<string, string>
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort())
      for (const key of Object.keys(en)) {
        expect(messages[key]?.trim() ? '' : `${key} is empty`).toBe('')
        expect([key, ...names(messages[key] ?? '')]).toEqual([key, ...names(en[key]!)])
      }
    })
  }

  for (const file of adminFiles) {
    test(`${file} compiles and only uses known keys`, () => {
      const filename = join(root, file)
      const source = readFileSync(filename, 'utf8')
      const { descriptor, errors } = parse(source, { filename })
      expect(errors).toEqual([])
      const script = descriptor.script || descriptor.scriptSetup ? compileScript(descriptor, { id: file }) : undefined
      if (descriptor.template) {
        const template = compileTemplate({ source: descriptor.template.content, filename, id: file, compilerOptions: { bindingMetadata: script?.bindings } })
        expect(template.errors).toEqual([])
      }
      const used = [...source.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)].map(match => match[1]!)
      expect(used.filter(key => !(key in en) && !(key in consoleEn))).toEqual([])
    })
  }
})
