import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, compileStyle, compileTemplate, parse } from '@vue/compiler-sfc'

const movedComponents = {
  ApplicationLogTail: 'logs',
  BillingPriceImport: 'billing',
  CommandPalette: 'layout',
  ConnectionDialog: 'layout',
  CredentialConcurrencyPolicy: 'credentials',
  CredentialExcludedModels: 'credentials',
  CredentialQuota: 'credentials',
  CredentialQuotaPreview: 'credentials',
  DashboardRequestHealth: 'dashboard',
  DashboardTokenTrend: 'dashboard',
  DataPanel: 'general',
  DetailItem: 'general',
  DetailSection: 'general',
  ModalCard: 'general',
  ModalForm: 'general',
  PluginConfigEditor: 'plugins',
  RequestRecordDetail: 'usage',
  RequestRecords: 'usage',
  RowActions: 'general',
  StatGrid: 'general',
  SystemTopology: 'system-nodes',
  TableAction: 'general',
  TablePanel: 'general',
  UpstreamAccounts: 'upstream-accounts',
  UpstreamProviders: 'upstream-providers',
  UsageInsights: 'usage',
  UsageLegacyRecords: 'usage',
  UsageSessionTree: 'usage',
  UsageSparkline: 'general',
  UsageTokenChart: 'usage',
}
const migration = { moves: Object.entries(movedComponents).map(([name, folder]) => ({
  oldName: `Admin${name}`,
  oldPath: `components/admin/${name}.vue`,
  newPath: `components/admin/${folder}/${name}.vue`,
})) }

const root = join(import.meta.dir, '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const vueFiles = (folder: string): string[] => readdirSync(join(root, folder), { withFileTypes: true }).flatMap(entry => {
  const path = `${folder}/${entry.name}`
  return entry.isDirectory() ? vueFiles(path) : path.endsWith('.vue') ? [path] : []
})

const consumers = [...vueFiles('components'), ...vueFiles('layouts'), ...vueFiles('pages'), 'app.vue']

describe('admin component folder migration', () => {
  test('admin root has no loose Vue files or compatibility wrappers', () => {
    expect(readdirSync(join(root, 'components/admin')).filter(name => name.endsWith('.vue'))).toEqual([])
    expect(migration.moves).toHaveLength(30)
    expect(new Set(migration.moves.map(move => move.newPath)).size).toBe(30)
  })

  for (const move of migration.moves) {
    test(`${move.oldName} moved to ${move.newPath} and compiles`, () => {
      expect(existsSync(join(root, move.oldPath))).toBe(false)
      expect(existsSync(join(root, move.newPath))).toBe(true)
      const { descriptor, errors } = parse(read(move.newPath), { filename: move.newPath })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: move.newPath })
      const template = compileTemplate({ source: descriptor.template!.content, filename: move.newPath, id: move.newPath, compilerOptions: { bindingMetadata: script.bindings } })
      expect(template.errors).toEqual([])
      for (const style of descriptor.styles) {
        expect(compileStyle({ source: style.content, filename: move.newPath, id: move.newPath, scoped: style.scoped }).errors).toEqual([])
      }
    })
  }

  test('all consumers explicitly bind every legacy template alias', () => {
    for (const file of consumers) {
      const source = read(file)
      const { descriptor } = parse(source, { filename: file })
      const template = descriptor.template?.content || ''
      const script = descriptor.scriptSetup ? compileScript(descriptor, { id: file }) : undefined
      for (const move of migration.moves) {
        expect(source.includes(move.oldPath)).toBe(false)
        if (new RegExp(`<${move.oldName}(?=[\\s/>])`).test(template)) {
          expect(script?.bindings[move.oldName]).toBe('setup-const')
          expect(script?.imports?.[move.oldName]?.source).toBe(`~/${move.newPath}`)
          expect(script?.imports?.[move.oldName]?.imported).toBe('default')
          expect(script?.imports?.[move.oldName]?.isType).toBe(false)
        }
      }
    }
  })

  test('component, layout and page source imports point at existing files', () => {
    for (const file of consumers) {
      for (const match of read(file).matchAll(/from\s+['"](~\/components\/[^'"]+\.vue)['"]/g)) {
        expect(existsSync(join(root, match[1]!.slice(2)))).toBe(true)
      }
    }
  })
})
