import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { normalizeTopologyConfig } from '../composables/systemTopologyConfig'
import { pluginInstallTrust } from '../composables/pluginInstallTrust'

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

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
    const script = source('pages/admin/plugins.vue')
    const expression = script.slice(script.indexOf('const canConfirmAction ='), script.indexOf('const confirmationTitle ='))
    const canConfirm = (kind: string, text: string, confirmation = trust.confirmation) => new Function('computed', 'confirmation', 'installTrust', 'typedConfirmation', `${expression}; return canConfirmAction`)((fn: () => boolean) => fn(), { value: { kind, plugin } }, { value: { confirmation } }, { value: text })
    expect(canConfirm('install', '')).toBe(false)
    expect(canConfirm('install', 'router-for-me/plugin')).toBe(false)
    expect(canConfirm('install', 'wrong-id')).toBe(false)
    expect(canConfirm('install', 'spoofed-plugin')).toBe(true)
    expect(canConfirm('install', '', '')).toBe(false)
    expect(canConfirm('uninstall', '')).toBe(true)
    expect(canConfirm('auth', '')).toBe(true)
    expect(script).not.toContain('installTrust.official')
    expect(script).not.toContain('installTrust.value.official')
    expect(source('locales/admin/plugins.ts')).toContain('Registry and repository labels do not verify the provenance')
  })
  test('sends entered version or an empty latest-release body, retaining source selector', async () => {
    const script = source('pages/admin/plugins.vue')
    const calls: any[] = []
    const functions = script.slice(script.indexOf('async function performInstall('), script.indexOf('function assignAuth('))
    const { performInstall, performUninstall } = new Function('fetchAPI', 'busyPlugin', 'operation', 'toast', 'refreshAll', 'message', 't', `${functions}; return { performInstall, performUninstall }`)(async (...args: any[]) => { calls.push(args); return { status: 'installed' } }, { value: '' }, { value: null }, { add() {} }, async () => {}, String, (key: string) => key)
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

test('Meta discovery uses official default and never enables Meta WebSockets', () => {
  const script = source('components/admin/UpstreamProviders.vue')
  const expression = script.slice(script.indexOf('const defaultDiscoveryURL ='), script.indexOf('const editorError ='))
  for (const [base, expected] of [['', 'https://api.meta.ai/v1/models'], ['https://custom/v1/', 'https://custom/v1/models'], ['https://custom/v1/models', 'https://custom/v1/models']]) {
    const result = new Function('computed', 'providerForm', 'selectedProviderRoute', `${expression}; return defaultDiscoveryURL`)((fn: () => string) => fn(), { value: { 'base-url': base } }, { value: 'meta-api-key' })
    expect(result).toBe(expected)
  }
  expect(script).toContain("const supportsWebsockets = computed(() => ['codex-api-key', 'xai-api-key']")
  expect(source('locales/admin/upstream.ts')).toContain('Signing is automatic on supported direct upstreams')
})

for (const path of ['pages/admin/plugins.vue', 'components/admin/UpstreamProviders.vue', 'components/admin/SystemTopology.vue']) {
  test(`${path} compiles as a Vue SFC`, () => {
    const { descriptor, errors } = parse(source(path), { filename: path })
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: path })
    const template = compileTemplate({ source: descriptor.template!.content, filename: path, id: path, compilerOptions: { bindingMetadata: script.bindings } })
    expect(template.errors).toEqual([])
  })
}
