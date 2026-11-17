import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { normalizeTopologyConfig } from '../composables/systemTopologyConfig'
import { pluginInstallTrust } from '../composables/pluginInstallTrust'

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const transpile = (source: string) => new Bun.Transpiler({ loader: 'ts' }).transformSync(source)

describe('system topology v8 config', () => {
  test('reads nested signals, not obsolete flat fields', () => {
    expect(normalizeTopologyConfig({ observability: { logs: { debug: true, 'request-log': true, 'logging-to-file': true }, usage: { 'usage-statistics-enabled': true } }, requests: { 'proxy-url': 'http://proxy' }, routing: { strategy: 'WRR' } })).toEqual({ debug: true, requestLog: true, loggingToFile: true, usageStatistics: true, proxyConfigured: true, routingStrategy: 'weighted-round-robin' })
    expect(normalizeTopologyConfig({ debug: true, 'request-log': true, 'logging-to-file': true, 'usage-statistics-enabled': true, 'proxy-url': 'http://obsolete' })).toEqual({ debug: false, requestLog: false, loggingToFile: false, usageStatistics: false, proxyConfigured: false, routingStrategy: 'round-robin' })
  })
  test('preserves absent defaults and rejects malformed flags and strategies', () => {
    expect(normalizeTopologyConfig(null).routingStrategy).toBe('round-robin')
    expect(normalizeTopologyConfig({ observability: { logs: { debug: 'false' } }, requests: { 'proxy-url': '  ' }, routing: null })).toMatchObject({ debug: false, proxyConfigured: false, routingStrategy: 'unknown' })
    expect(normalizeTopologyConfig({ routing: { strategy: 'ff' } }).routingStrategy).toBe('fill-first')
  })
})

describe('plugin install trust and payloads', () => {
  test('requires acknowledgement for every install regardless of claimed repository or source', () => {
    for (const repository of ['', 'router-for-me/plugin.git', 'https://github.com/router-for-me/plugin', 'other/plugin', 'https://github.com.evil/router-for-me/plugin']) {
      const plugin = { id: 'p', repository }
      expect(pluginInstallTrust(plugin)).toEqual({ confirmation: 'p' })
    }
  })
  test('custom direct plan spoofing an official repository cannot bypass the actual modal guard', () => {
    const plugin = { id: 'spoofed-plugin', repository: 'https://github.com/router-for-me/plugin', source_id: 'custom', source_url: 'https://untrusted.example/registry.json', install_type: 'direct' }
    const trust = pluginInstallTrust(plugin)
    expect(trust).toEqual({ confirmation: 'spoofed-plugin' })
    const script = source('composables/plugins/usePluginActions.ts')
    const expression = script.slice(script.indexOf('const canConfirmAction ='), script.indexOf('const confirmationTitle ='))
    const canConfirm = (kind: string, text: string, confirmation = trust.confirmation) => new Function('computed', 'confirmation', 'installTrust', 'typedConfirmation', transpile(`${expression}; return canConfirmAction`))((fn: () => boolean) => fn(), { value: { kind, plugin } }, { value: { confirmation } }, { value: text })
    expect(canConfirm('install', '')).toBe(false)
    expect(canConfirm('install', 'router-for-me/plugin')).toBe(false)
    expect(canConfirm('install', 'wrong-id')).toBe(false)
    expect(canConfirm('install', 'spoofed-plugin')).toBe(true)
    expect(canConfirm('install', '', '')).toBe(false)
    expect(canConfirm('uninstall', '')).toBe(true)
    expect(canConfirm('auth', '')).toBe(true)
    expect(script).not.toContain('installTrust.official')
    expect(script).not.toContain('installTrust.value.official')
    const dialog = source('components/admin/plugins/PluginsConfirmation.vue')
    expect(dialog).toContain('@submit.prevent="performConfirmedAction"')
    expect(dialog).toContain(':disabled="!canConfirmAction"')
    expect(dialog).toContain('v-model="typedConfirmation"')
    expect(script).toContain('if (confirmationBusy.value || !canConfirmAction.value) return;')
    expect(script).toContain("installVersion.value.trim()")
    expect(source('locales/admin/plugins.ts')).toContain('Registry and repository labels do not verify the provenance')
  })
  test('sends entered version or an empty latest-release body, retaining source selector', async () => {
    const script = source('composables/plugins/usePluginActions.ts')
    const calls: any[] = []
    const functions = script.slice(script.indexOf('async function performInstall('), script.indexOf('return { configOpen'))
    const { performInstall, performUninstall } = new Function('fetchAPI', 'busyPlugin', 'operation', 'toast', 'refreshAll', 'message', 't', transpile(`${functions}; return { performInstall, performUninstall }`))(async (...args: any[]) => { calls.push(args); return { status: 'installed' } }, { value: '' }, { value: null }, { add() {} }, async () => {}, String, (key: string) => key)
    const plugin = { id: 'a/b', version: 'registry-version', source_id: 'third-party' }
    await performInstall(plugin, 'v1.2.3')
    await performInstall(plugin, '')
    await performUninstall(plugin.id)
    expect(calls[0]).toEqual(['/plugins/store/a%2Fb/install', { method: 'POST', query: { source: 'third-party' }, body: { version: 'v1.2.3' } }])
    expect(calls[1][1].body).toEqual({})
    expect(calls[2]).toEqual(['/plugins/store/a%2Fb/uninstall', { method: 'POST' }])
    expect(script).not.toMatch(/\bconfirm\(/)
  })
})

test('plugins feature state retains a single page-scoped owner and polling lifecycle', () => {
  const workspace = source('composables/plugins/usePluginsWorkspace.ts')
  const page = source('pages/admin/plugins/index.vue')
  expect(page.match(/providePluginsWorkspace\(\)/g)).toHaveLength(1)
  for (const feature of ['usePluginsData', 'usePluginReports', 'usePluginAuth', 'usePluginActions', 'usePluginCatalog']) {
    expect(workspace.match(new RegExp(`${feature}\\(`, 'g'))).toHaveLength(1)
  }
  const files = readdirSync(new URL('../composables/plugins/', import.meta.url)).map(path => source(`composables/plugins/${path}`)).join('\n')
  const keys = [...files.matchAll(/useWorkspaceState(?:<[^>]+>)?\('(admin:plugins:[^']+)'/g)].map(match => match[1])
  expect(keys.sort()).toEqual(['pageError', 'operation', 'busyPlugin', 'savingAuth', 'nodesResponse', 'nodesError', 'nodesLoading', 'pollExpired'].map(key => `admin:plugins:${key}`).sort())
  expect(files).toContain("useStoreData('admin:plugins:management-plugins', loadAll)")
  const reports = source('composables/plugins/usePluginReports.ts')
  expect(reports).toContain("useDataSync('admin:plugins:sync', () => loadNodes(pollGeneration))")
  expect(reports).toContain('const pollDuration = 60000;')
  expect(reports).toContain('const pollInterval = 5000;')
  expect(reports).toContain('if (generation !== pollGeneration || document.hidden) return;')
  expect(reports).toContain('onUnmounted(() => {\n    pollGeneration++;\n    clearTimeout(pollTimer);\n    document.removeEventListener("visibilitychange", onVisibilityChange);')
  for (const path of pluginComponents.filter(path => !path.endsWith('/PluginConfigEditor.vue'))) {
    const component = source(path)
    expect(component).toContain('usePluginsWorkspace()')
    expect(component).not.toContain('useWorkspaceState(')
    expect(component).not.toContain('providePluginsWorkspace(')
  }
  for (const path of ['pages/admin/plugins/index.vue', ...pluginComponents, ...readdirSync(new URL('../composables/plugins/', import.meta.url)).map(path => `composables/plugins/${path}`)]) {
    expect(source(path).split('\n').length).toBeLessThan(500)
  }
})

test('Meta discovery uses official default and never enables Meta WebSockets', () => {
  const script = source('composables/upstream-providers/useModelDiscovery.ts')
  const expression = script.slice(script.indexOf('const defaultDiscoveryURL ='), script.indexOf('async function discoverModels('))
  for (const [base, expected] of [['', 'https://api.meta.ai/v1/models'], ['https://custom/v1/', 'https://custom/v1/models'], ['https://custom/v1/models', 'https://custom/v1/models']]) {
    const result = new Function('computed', 'providerForm', 'selectedProviderRoute', `${expression}; return defaultDiscoveryURL`)((fn: () => string) => fn(), { value: { 'base-url': base } }, { value: 'meta-api-key' })
    expect(result).toBe(expected)
  }
  expect(source('composables/upstream-providers/useProviderEditorState.ts')).toContain("const supportsWebsockets = computed(() => ['codex-api-key', 'xai-api-key']")
  expect(source('locales/admin/upstream.ts')).toContain('Signing is automatic on supported direct upstreams')
})

test('provider editor uses the modal body scroll area and a persistent form-linked footer', () => {
  const editor = source('components/admin/upstream-providers/ProvidersEditorDialog.vue')
  const details = source('components/admin/upstream-providers/editor/ProvidersDetailView.vue')
  const modal = source('components/admin/general/ModalForm.vue')
  for (const component of [editor, details]) {
    expect(component).not.toContain('max-h-[75vh]')
    expect(component).not.toContain('overflow-y-auto')
  }
  expect(editor).toContain(':id="providerFormId"')
  expect(editor).toContain('const providerFormId = useId()')
  expect(editor).toContain('v-if="providerEditorMode !== \'detail\'" #footer')
  expect(editor).toContain('type="submit" :form="providerFormId" :loading="savingProvider"')
  expect(editor).toContain('@submit.prevent="saveProviderEntry"')
  expect(modal).toContain('<template v-if="$slots.footer" #footer>')
  expect(modal).toContain('<slot name="footer" />')
})

const pluginComponents = readdirSync(new URL('../components/admin/plugins/', import.meta.url)).filter(path => path.endsWith('.vue')).map(path => `components/admin/plugins/${path}`)
const upstreamProviderComponents = readdirSync(new URL('../components/admin/upstream-providers/', import.meta.url), { recursive: true, encoding: 'utf8' }).filter(path => path.endsWith('.vue')).map(path => `components/admin/upstream-providers/${path}`).sort()

for (const path of ['pages/admin/plugins/index.vue', ...pluginComponents, ...upstreamProviderComponents, 'components/admin/system-nodes/SystemTopology.vue']) {
  test(`${path} compiles as a Vue SFC`, () => {
    const { descriptor, errors } = parse(source(path), { filename: path })
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: path })
    const template = compileTemplate({ source: descriptor.template!.content, filename: path, id: path, compilerOptions: { bindingMetadata: script.bindings } })
    expect(template.errors).toEqual([])
  })
}
