import { describe, expect, test } from 'bun:test'
import { effectScope, ref } from 'vue'
import { parseExclusionRules, readExclusionMap, useOAuthExclusions } from './useOAuthExclusions'

function setup(fetchAPI: (path: string) => Promise<unknown> = async () => ({ models: [] })) {
  const scope = effectScope()
  const draft = ref({ oauthExcludedModelsJson: JSON.stringify({ claude: ['old', 'claude-*'], custom: ['custom-*'], aistudio: ['manual'] }) })
  const models = ref<{ id: string; [key: string]: unknown }[]>([])
  const loading = ref(false)
  const editor = scope.run(() => useOAuthExclusions(draft, fetchAPI, key => key, models, loading))!
  return { scope, draft, models, loading, ...editor }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

describe('OAuth exclusions', () => {
  test('trims, deduplicates and preserves wildcard patterns', () => {
    expect(parseExclusionRules(' model-* \r\n\nmodel-id\nmodel-*\n')).toEqual(['model-*', 'model-id'])
    expect(readExclusionMap('{"channel": [1]}')).toBeNull()
    expect(readExclusionMap('broken')).toBeNull()
  })

  test('includes custom and manual-only channels and edits only the selected channel', () => {
    const e = setup()
    try {
      expect(e.channelOptions.value.map(option => option.value)).toContain('custom')
      expect(e.channelOptions.value.map(option => option.value)).toContain('copilot')
      e.updateExclusionRules('new\nclaude-*\n')
      expect(e.exclusionRulesText.value).toBe('new\nclaude-*\n')
      e.toggleExcluded('catalog-model', true)
      expect(e.excludedForChannel.value).toEqual(['new', 'claude-*', 'catalog-model'])
      expect(readExclusionMap(e.draft.value.oauthExcludedModelsJson)?.custom).toEqual(['custom-*'])
      e.exclusionChannel.value = 'custom'
      expect(e.exclusionRulesText.value).toBe('custom-*')
      e.clearExcludedChannel()
      expect(readExclusionMap(e.draft.value.oauthExcludedModelsJson)).toEqual({ claude: ['new', 'claude-*', 'catalog-model'], aistudio: ['manual'] })
      expect(e.channelOptions.value.map(option => option.value)).toContain('custom')
    } finally { e.scope.stop() }
  })

  test('does not overwrite invalid JSON or read inherited channel properties', () => {
    const e = setup()
    try {
      e.draft.value.oauthExcludedModelsJson = 'invalid'
      e.toggleExcluded('new', true)
      e.clearExcludedChannel()
      expect(e.draft.value.oauthExcludedModelsJson).toBe('invalid')
      e.draft.value.oauthExcludedModelsJson = '{}'
      e.exclusionChannel.value = '__proto__'
      expect(e.excludedForChannel.value).toEqual([])
      e.updateExclusionRules('custom-*')
      expect(Object.hasOwn(JSON.parse(e.draft.value.oauthExcludedModelsJson), '__proto__')).toBe(true)
    } finally { e.scope.stop() }
  })

  test('skips catalog requests for AI Studio, Copilot and custom channels', async () => {
    const paths: string[] = []
    const e = setup(async path => { paths.push(path); return { models: [] } })
    try {
      for (const channel of ['aistudio', 'copilot', 'custom']) {
        e.exclusionChannel.value = channel
        await e.loadChannelModels()
        expect(e.hasModelCatalog.value).toBe(false)
        expect(e.loading.value).toBe(false)
        e.updateExclusionRules('manual-*')
        expect(e.excludedForChannel.value).toEqual(['manual-*'])
      }
      expect(paths).toEqual([])
    } finally { e.scope.stop() }
  })

  test.each([400, 404])('treats HTTP %s as unavailable, keeps manual editing and permits retry', async statusCode => {
    let unavailable = true
    const e = setup(async () => {
      if (unavailable) throw Object.assign(new Error('unavailable'), { statusCode })
      return { models: [{ id: 'available' }] }
    })
    try {
      await e.loadChannelModels()
      expect(e.hasModelCatalog.value).toBe(false)
      expect(e.modelsError.value).toBe('')
      e.updateExclusionRules('manual-*')
      expect(e.excludedForChannel.value).toEqual(['manual-*'])
      unavailable = false
      await e.loadChannelModels()
      expect(e.hasModelCatalog.value).toBe(true)
      expect(e.models.value).toEqual([{ id: 'available' }])
    } finally { e.scope.stop() }
  })

  test.each([401, 403, 500])('retains actionable errors for HTTP %s', async statusCode => {
    const e = setup(async () => { throw Object.assign(new Error('request failed'), { statusCode }) })
    try {
      await e.loadChannelModels()
      expect(e.modelsError.value).toBe('request failed')
      expect(e.hasModelCatalog.value).toBe(true)
    } finally { e.scope.stop() }
  })

  test('uses the verified routing endpoint for Home catalog tiers and aliases', async () => {
    const paths: string[] = []
    const e = setup(async path => { paths.push(path); return { models: [] } })
    try {
      for (const channel of ['codex-free', 'kimi-ai', 'devin', 'x-ai', 'grok', 'muse']) {
        e.exclusionChannel.value = channel
        await settle()
        expect(paths.at(-1)).toBe(`/routing/model-definitions/${channel}`)
        expect(e.hasModelCatalog.value).toBe(true)
      }
    } finally { e.scope.stop() }
  })

  test('ignores stale catalog results and unavailable errors after channel changes or disposal', async () => {
    let resolve: (value: unknown) => void = () => {}
    const e = setup(() => new Promise(done => { resolve = done }))
    const pending = e.loadChannelModels()
    e.exclusionChannel.value = 'custom'
    resolve({ models: [{ id: 'stale' }] })
    await pending
    expect(e.models.value).toEqual([])
    expect(e.hasModelCatalog.value).toBe(false)
    expect(e.loading.value).toBe(false)
    e.exclusionChannel.value = 'claude'
    e.scope.stop()
    resolve({ models: [{ id: 'disposed' }] })
    await settle()
    expect(e.models.value).toEqual([])
  })

  test('rejects malformed catalog data without disabling manual edits', async () => {
    const e = setup(async () => ({ models: [{}] }))
    try {
      await e.loadChannelModels()
      expect(e.modelsError.value).toBe('config.models.invalidResponse')
      e.updateExclusionRules('manual-*')
      expect(e.excludedForChannel.value).toEqual(['manual-*'])
    } finally { e.scope.stop() }
  })
})
