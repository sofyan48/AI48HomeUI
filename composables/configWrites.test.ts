import { describe, expect, test } from 'bun:test'
import { applyConfigWrites, planConfigWrites, reconcileConfigDraft } from './configWrites'
import { configParitySections, emptyConfigJson, validateConfigParityField, validateConfigPolicyJson } from './configParity'
import { parseDocument } from 'yaml'
import { readFileSync, readdirSync } from 'node:fs'
import { buildDraft, configWriteValue, v8YamlPaths } from './config/draft'
import { sharedConfigFields } from './config/schema'
import { useConfigValidation } from './config/useConfigValidation'
import { ref } from 'vue'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'

const fields = configParitySections.flatMap(section => section.fields)
const paths = Object.fromEntries(fields.map(field => [field.key, field.path]))

describe('config parity', () => {
  test('all audited families have unique canonical paths and round-trip explicit values', () => {
    expect(new Set(fields.map(field => field.key)).size).toBe(fields.length)
    expect(new Set(fields.map(field => field.path.join('/'))).size).toBe(fields.length)
    for (const field of fields) {
      const value = field.type === 'boolean' ? false : field.type === 'number' ? 0 : field.type === 'image-mode' ? 'passthrough' : ['string-list', 'ice-servers'].includes(field.type) ? '[]' : ''
      expect(validateConfigParityField(field, value)).toBeUndefined()
      const actual = ['string-list', 'ice-servers'].includes(field.type) ? JSON.parse(String(value)) : value
      const [write] = planConfigWrites([field.key], paths, () => actual)
      const isRelayPort = ['liveMediaRelayUdpPortMin', 'liveMediaRelayUdpPortMax'].includes(field.key)
      expect(write?.path).toBe(`/config/${(isRelayPort ? field.path.slice(0, -1) : field.path).join('/')}`)
      expect(JSON.parse(write!.body!)).toEqual(isRelayPort ? { [field.path.at(-1)!]: actual } : actual)
      expect(planConfigWrites([field.key], paths, () => null)[0]?.method).toBe('DELETE')
    }
  })

  test('image mode keeps booleans separate from literals and inheritance', () => {
    const field = fields.find(field => field.type === 'image-mode')!
    for (const value of [null, false, true, 'chat', 'passthrough']) expect(validateConfigParityField(field, value)).toBeUndefined()
    for (const value of ['false', 'true', '', 'off', 0]) expect(validateConfigParityField(field, value)).toBeDefined()
  })

  test('validates arrays, ICE entries, durations, ports and header injection', () => {
    const validate = (key: string, value: unknown) => validateConfigParityField(fields.find(field => field.key === key)!, value)
    expect(validate('serverAllowHostJson', '["127.0.0.1"]')).toBeUndefined()
    expect(validate('serverAllowHostJson', '[false]')).toBeDefined()
    expect(validate('serverAllowHostJson', '{}')).toBeDefined()
    expect(validate('liveMediaRelayIceServersJson', '[{"urls":["turn:relay"],"username":"user","credential":"secret","future":true}]')).toBeUndefined()
    expect(validate('liveMediaRelayIceServersJson', '[{"urls":"turn:relay"}]')).toBeDefined()
    expect(validate('liveMediaRelayIceServersJson', '[{"urls":["turn:relay"],"credential":42}]')).toBeDefined()
    expect(validate('liveMediaRelayUdpPortMin', 65536)).toBeDefined()
    expect(validate('liveMediaRelayMaxSessions', -1)).toBeDefined()
    expect(validate('antigravityConnPoolIdleTimeout', '1m30s')).toBeUndefined()
    expect(validate('antigravityConnPoolIdleTimeout', 'never')).toBeDefined()
    expect(validate('oauthCodexHeaderUserAgent', 'agent\r\nInjected: true')).toBeDefined()
  })

  test('validates replacement maps, pattern rules and OAuth model settings', () => {
    expect(validateConfigPolicyJson('string-map', '{"Claude Code":"Claude","drop":""}')).toBe(true)
    expect(validateConfigPolicyJson('string-map', '{"a":1}')).toBe(false)
    expect(validateConfigPolicyJson('string-map', '[]')).toBe(false)
    expect(validateConfigPolicyJson('pattern-rules', '[{"pattern":"(?m)^x","replacement":""},{"pattern":"y"}]')).toBe(true)
    expect(validateConfigPolicyJson('pattern-rules', '[{"pattern":""}]')).toBe(false)
    expect(validateConfigPolicyJson('pattern-rules', '[{"pattern":"(unclosed","replacement":""}]')).toBe(false)
    expect(validateConfigPolicyJson('pattern-rules', JSON.stringify([{ pattern: '(?s)<system[-_](conventions|directive)>.*?</system[-_](conventions|directive)>\\n?', replacement: '' }]))).toBe(true)
    expect(validateConfigPolicyJson('pattern-rules', JSON.stringify([{ pattern: '(?m)^RFC 2119[^\\n]*\\n?', replacement: '' }]))).toBe(true)
    expect(validateConfigPolicyJson('pattern-rules', '{"pattern":"x"}')).toBe(false)
    expect(validateConfigPolicyJson('oauth-settings', '{"codex":[{"name":"gpt","alias":"g","max-context-length":524288}]}')).toBe(true)
    expect(validateConfigPolicyJson('oauth-settings', '{"codex":[{"name":"gpt","max-context-length":0}]}')).toBe(false)
    expect(validateConfigPolicyJson('oauth-settings', '{"codex":{"name":"gpt"}}')).toBe(false)
    expect(emptyConfigJson('string-map')).toBe('{}')
    expect(emptyConfigJson('pattern-rules')).toBe('[]')
  })
})

describe('targeted config writes', () => {
  test('sends false, zero, JSON-looking strings and empty containers as raw JSON', async () => {
    const values = { enabled: false, count: 0, name: 'true', list: [], rules: {} }
    const localPaths = Object.fromEntries(Object.keys(values).map(key => [key, ['server', key]]))
    const writes = planConfigWrites(Object.keys(values), localPaths, key => values[key as keyof typeof values])
    const calls: unknown[] = []
    const result = await applyConfigWrites(writes, async (path, options) => { calls.push({ path, options }) })
    expect(result.completed).toHaveLength(5)
    expect(writes.map(write => JSON.parse(write.body!))).toEqual(Object.values(values))
    expect(calls.every((call: any) => call.options.headers['Content-Type'] === 'application/json')).toBe(true)
  })

  test('groups email edits without including stale siblings, revisions or unknown keys', () => {
    const localPaths = { host: ['user-email', 'sender', 'smtp', 'host'], enabled: ['user-email', 'enabled'], debug: ['observability', 'logs', 'debug'] }
    const values = { host: 'smtp.example.com', enabled: true, debug: false }
    const writes = planConfigWrites(Object.keys(values), localPaths, key => values[key as keyof typeof values])
    expect(writes).toHaveLength(2)
    expect(writes[1]).toMatchObject({ path: '/config/user-email', method: 'PATCH' })
    expect(JSON.parse(writes[1]!.body!)).toEqual({ sender: { smtp: { host: 'smtp.example.com' } }, enabled: true })
  })

  test('updates a moved UDP range in one merge, preserving relay siblings', () => {
    const writes = planConfigWrites(['liveMediaRelayUdpPortMin', 'liveMediaRelayUdpPortMax'], paths, key => key.endsWith('Min') ? 20000 : 21000)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ method: 'PATCH', path: '/config/oauth/providers/codex/live-media-relay' })
    expect(JSON.parse(writes[0]!.body!)).toEqual({ 'udp-port-min': 20000, 'udp-port-max': 21000 })
  })

  test('stops on first failure and reports exactly what was acknowledged', async () => {
    const writes = planConfigWrites(['a', 'b', 'c'], { a: ['server', 'host'], b: ['server', 'port'], c: ['server', 'commercial-mode'] }, () => false)
    const failure = new Error('reload_failed')
    const calls: string[] = []
    const result = await applyConfigWrites(writes, async path => {
      calls.push(path)
      if (calls.length === 2) throw failure
    })
    expect(calls).toHaveLength(2)
    expect(result.completed).toEqual([writes[0]!])
    expect(result.failed).toEqual(writes[1])
    expect(result.error).toBe(failure)
  })

  test('only missing leaves make DELETE idempotent; unsupported routes stop saves', async () => {
    const writes = planConfigWrites(['serverHost'], paths, () => null)
    expect((await applyConfigWrites(writes, async () => { throw { statusCode: 404, data: { error: 'not_found' } } })).failed).toBeUndefined()
    expect((await applyConfigWrites(writes, async () => { throw { statusCode: 404 } })).failed).toBeDefined()
  })

  test('connection-revoking changes run last', () => {
    const writes = planConfigWrites(['secret', 'remote', 'host'], { secret: ['management', 'secret-key'], remote: ['management', 'allow-remote'], host: ['server', 'host'] }, () => '')
    expect(writes.map(write => write.keys[0])).toEqual(['host', 'remote', 'secret'])
  })

  test('rejects unmapped keys rather than silently dropping edits', () => {
    expect(() => planConfigWrites(['unknown'], {}, () => 1)).toThrow('No targeted config path')
  })

  test('readback preserves unsaved edits but refreshes unrelated concurrent changes', () => {
    const previous = { host: 'old', port: 1000, enabled: false }
    const intended = { host: 'new', port: 2000, enabled: false }
    const fresh = { host: 'new', port: 1000, enabled: true }
    expect(reconcileConfigDraft(previous, intended, fresh)).toEqual({ host: 'new', port: 2000, enabled: true })
    expect(reconcileConfigDraft(previous, intended, { ...fresh, port: 2000 })).toEqual({ host: 'new', port: 2000, enabled: true })
  })

  test('whole-array replacement retains unknown ICE properties and TURN secrets from YAML', () => {
    const root = parseDocument('oauth:\n  providers:\n    codex:\n      live-media-relay:\n        ice-servers:\n          - urls: ["turn:relay"]\n            username: user\n            credential: secret\n            future: preserved\n').toJS()
    const servers = root.oauth.providers.codex['live-media-relay']['ice-servers']
    const writes = planConfigWrites(['liveMediaRelayIceServersJson'], paths, () => servers)
    expect(JSON.parse(writes[0]!.body!)[0]).toEqual({ urls: ['turn:relay'], username: 'user', credential: 'secret', future: 'preserved' })
  })
})

describe('extracted config workspace', () => {
  test('every draft field retains a targeted write path and shared YAML values', () => {
    const draft = buildDraft({}, {})
    expect(Object.keys(draft).sort()).toEqual(Object.keys(v8YamlPaths).sort())
    for (const field of sharedConfigFields) {
      expect(draft[field.key]).toBeNull()
      expect(v8YamlPaths[field.key]).toEqual(field.path)
    }
    const explicit = buildDraft({}, { routing: { 'session-affinity': false, 'session-affinity-ttl': '' }, requests: { streaming: { 'keepalive-seconds': 0 } } })
    expect(explicit.sessionAffinity).toBe(false)
    expect(explicit.sessionAffinityTtl).toBe('')
    expect(explicit.streamingKeepaliveSeconds).toBe(0)
  })

  test('write conversion preserves JSON, null, numeric, trimmed and line-list semantics', () => {
    const draft = buildDraft({}, {})
    Object.assign(draft, { serverHost: null, port: '8327', proxyUrl: ' http://proxy ', pluginStoreSourcesJson: ' a\n b\n a ', payloadJson: '{"future":true}', liveMediaRelayIceServersJson: '[{"urls":["turn:relay"],"credential":"secret","future":true}]' })
    expect(configWriteValue(draft, 'serverHost')).toBeNull()
    expect(configWriteValue(draft, 'port')).toBe(8327)
    expect(configWriteValue(draft, 'proxyUrl')).toBe('http://proxy')
    expect(configWriteValue(draft, 'pluginStoreSourcesJson')).toEqual(['a', 'b'])
    expect(configWriteValue(draft, 'payloadJson')).toEqual({ future: true })
    expect(configWriteValue(draft, 'liveMediaRelayIceServersJson')).toEqual([{ urls: ['turn:relay'], credential: 'secret', future: true }])
  })

  test('validation remains reactive across draft replacement and shared settings', () => {
    const draft = ref(buildDraft({}, {}))
    const { validationErrors, validationCount } = useConfigValidation(draft, key => key)
    expect(validationCount.value).toBe(0)
    draft.value.port = 0
    expect(validationErrors.value.port).toBe('config.validation.port')
    draft.value = buildDraft({}, {})
    draft.value.oauthExcludedModelsJson = '{"claude":[false]}'
    draft.value.liveMediaRelayUdpPortMin = 20000
    draft.value.liveMediaRelayUdpPortMax = 10000
    expect(validationErrors.value.oauthExcludedModelsJson).toBe('config.validation.exclusions')
    expect(validationErrors.value.liveMediaRelayUdpPortMax).toBe('config.validation.udpRange')
    expect(validationErrors.value.port).toBeUndefined()
  })

  test('workspace keeps save readback, sync ownership and editor preservation guards', () => {
    const workspace = readFileSync(new URL('./config/useConfigWorkspace.ts', import.meta.url), 'utf8')
    const editors = readFileSync(new URL('./config/useConfigEditors.ts', import.meta.url), 'utf8')
    expect(workspace).toContain('await applyConfigWrites(writes, fetchAPI)')
    expect(workspace).toContain('await loadWorkspace(true)')
    expect(workspace).toContain('reconcileConfigDraft(previous, intended, baseline.value)')
    expect(workspace).toContain('for (const key of write.keys) draft.value[key] = baseline.value[key]')
    expect(workspace).toContain('saveNeedsReload.value = Boolean(pageError.value)')
    expect(workspace).toContain("useDataSync('admin:config:sync'")
    expect(workspace).toContain('onMounted(loadWorkspace)')
    expect(workspace).toContain('if (saving.value) return;')
    expect(editors).toContain('if (version !== modelRequestVersion) return;')
    expect(editors).toContain('if (version === modelRequestVersion) modelsLoading.value = false;')
    expect(editors).toContain('watch(aliasRows, syncSpecialDrafts, { deep: true })')
    expect(editors).toContain('...row.original')
    expect(editors).toContain('...parseJSON(payloadEditorSource, {})')
    expect(editors).toContain('draft.value.oauthModelAliasJson = aliasEditorSource')
    expect(editors).toContain('JSON.stringify(payloadDraft) === payloadEditorBaseline')
    const keys = [...(workspace + editors).matchAll(/useWorkspaceState(?:<[^\n]+?>)?\('([^']+)'/g)].map(match => match[1])
    expect(keys.sort()).toEqual([
      'admin:config:loading', 'admin:config:loaded', 'admin:config:saving',
      'admin:config:pageError', 'admin:config:updatedAt', 'admin:config:runtimeMode',
      'admin:config:baseline', 'admin:config:yamlText', 'admin:config:configSnapshot',
      'admin:config:channelModels', 'admin:config:modelsLoading',
    ].sort())
  })

  test('page owns one workspace and all extracted files stay below 500 lines', () => {
    const page = readFileSync(new URL('../pages/admin/config/index.vue', import.meta.url), 'utf8')
    expect(page.match(/= provideConfigWorkspace\(\)/g)).toHaveLength(1)
    expect(page).not.toContain('fetchAPI(')
    expect(page.split('\n').length).toBeLessThan(100)
    for (const folder of ['./config/', '../components/admin/config/']) {
      for (const name of readdirSync(new URL(folder, import.meta.url))) {
        const source = readFileSync(new URL(folder + name, import.meta.url), 'utf8')
        expect(source.split('\n').length).toBeLessThan(500)
      }
    }
  })
})

describe('config Vue compilation', () => {
  for (const relative of ['../pages/admin/config/index.vue', ...readdirSync(new URL('../components/admin/config/', import.meta.url)).filter(name => name.endsWith('.vue')).map(name => `../components/admin/config/${name}`)]) {
    test(relative, () => {
      const source = readFileSync(new URL(relative, import.meta.url), 'utf8')
      const { descriptor, errors } = parse(source)
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: relative })
      const template = compileTemplate({ source: descriptor.template!.content, filename: relative, id: relative, compilerOptions: { bindingMetadata: script.bindings } })
      expect(template.errors).toEqual([])
    })
  }
})
