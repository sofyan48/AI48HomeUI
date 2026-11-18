import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, compileStyle, compileTemplate, parse } from '@vue/compiler-sfc'
import { portalMessages } from '../../locales/portal'
import { keyEntries, maskKey, normalizeKey } from './keys'
import { dashboardExperience } from './experience'

const root = new URL('../..', import.meta.url).pathname
const featureRoot = join(root, 'components/app/workspace')
const logicRoot = join(root, 'composables/workspace')
const componentFiles = readdirSync(featureRoot, { recursive: true }).filter(name => String(name).endsWith('.vue')).map(name => join(featureRoot, String(name)))
const logicFiles = readdirSync(logicRoot).filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts')).map(name => join(logicRoot, name))
const entry = join(featureRoot, 'UserWorkspace.vue')

describe('user workspace extraction', () => {
  test('portal components live in feature folders and entry consumers bind their imports', () => {
    expect(readdirSync(join(root, 'components/app')).filter(name => name.endsWith('.vue'))).toEqual([])
    for (const page of ['index.vue', 'api-keys/index.vue', 'balance/index.vue', 'settings/index.vue']) {
      expect(readFileSync(join(root, 'pages/app', page), 'utf8'))
        .toContain("import AppUserWorkspace from '~/components/app/workspace/UserWorkspace.vue'")
    }
    expect(readFileSync(join(featureRoot, 'dashboard/WorkspaceDashboard.vue'), 'utf8'))
      .toContain("import AppLimitReset from './LimitReset.vue'")
  })
  test('entry stays small and extracted sources stay under 500 lines', () => {
    expect(readFileSync(entry, 'utf8').split('\n').length).toBeLessThan(150)
    for (const file of [...componentFiles, ...logicFiles]) {
      expect([file, readFileSync(file, 'utf8').split('\n').length < 500]).toEqual([file, true])
    }
  })

  test('all extracted SFC scripts, templates, and scoped styles compile', () => {
    for (const filename of componentFiles) {
      const { descriptor, errors } = parse(readFileSync(filename, 'utf8'), { filename })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: filename })
      expect(compileTemplate({ source: descriptor.template!.content, filename, id: filename, compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
      for (const style of descriptor.styles) {
        expect(compileStyle({ source: style.content, filename, id: 'data-v-workspace', scoped: style.scoped }).errors).toEqual([])
      }
    }
  })

  test('feature logic uses known portal translation keys', () => {
    for (const filename of logicFiles) {
      const source = readFileSync(filename, 'utf8')
      const keys = [...source.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)].map(match => match[1]!)
      for (const messages of Object.values(portalMessages)) {
        expect(keys.filter(key => !(key in messages))).toEqual([])
      }
    }
  })

  test('workspace state keys retain a single owner and the user namespace', () => {
    const sources = [entry, ...logicFiles].map(file => readFileSync(file, 'utf8')).join('\n')
    const keys = [...sources.matchAll(/useWorkspaceState(?:<[^\n]*?>)?\('([^']+)'/g)].map(match => match[1]!)
    expect(keys.length).toBe(26)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.every(key => key.startsWith('user:workspace:'))).toBe(true)
    expect(readFileSync(entry, 'utf8')).toContain('<template #balance-history><slot name="balance-history" /></template>')
  })

  test('dashboard ancestor selectors keep their scoped descendants', () => {
    const scopedStyle = (name: string) => {
      const { descriptor } = parse(readFileSync(join(featureRoot, 'dashboard', name), 'utf8'))
      return compileStyle({ source: descriptor.styles[0]!.content, id: 'data-v-workspace', scoped: true }).code
    }
    expect(scopedStyle('ConnectionGuide.vue')).toContain('.user-dashboard .dashboard-primary-action[data-v-workspace]')
    expect(scopedStyle('WorkspaceDashboard.vue')).toContain('.user-dashboard .dashboard-panel[data-v-workspace] [data-slot="header"]')
  })

  test('dashboard leads with the guide only for users without activity this month', () => {
    expect(dashboardExperience(null, true)).toBe('pending')
    expect(dashboardExperience(null, false)).toBe('new')
    expect(dashboardExperience({ request_count: 0, total_charge_amount: 0 }, false)).toBe('new')
    expect(dashboardExperience({ request_count: 3 }, false)).toBe('active')
    expect(dashboardExperience({ request_count: 0, month_spend: 1.5 }, false)).toBe('active')
    // Refreshes keep the last known layout instead of flashing back to pending.
    expect(dashboardExperience({ request_count: 3 }, true)).toBe('active')
  })

  test('both dashboard layouts keep the connection guide', () => {
    const source = readFileSync(join(featureRoot, 'dashboard/WorkspaceDashboard.vue'), 'utf8')
    expect(source).toContain('<ConnectionGuide v-if="isNewUser" />')
    expect(source).toContain('<ConnectionGuide v-if="!isNewUser" v-model:open="guideOpen" collapsible')
  })
})

describe('workspace API key compatibility', () => {
  test('accepts legacy nested collections and bare keys', () => {
    expect(keyEntries({ data: { 'api-keys': ['legacy-key'] } })).toEqual(['legacy-key'])
    expect(normalizeKey(' legacy-key ', 2)).toMatchObject({ id: null, index: 2, api_key: 'legacy-key', channels: [], model_groups: [] })
    expect(normalizeKey({}, 0)).toBeNull()
  })
  test('preserves identifiers, display names and binding normalization', () => {
    expect(normalizeKey({ 'api-key-id': '12', key: ' secret ', display_name: ' Work ', channels: ['1', -1, 2.5], 'model-groups': ['3'], created_at: 'date' }, 0)).toEqual({
      id: 12, index: 0, api_key: 'secret', display_name: 'Work', channels: [1], model_groups: [3], created_at: 'date', updated_at: undefined
    })
    expect(maskKey('short')).toBe('sho***')
    expect(maskKey('1234567890123456')).toBe('12345678...3456')
  })
})
