import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { scopeImportMatches } from './importMatches'

const matches = ['copilot', 'devin'].map(provider => ({ target_provider: provider, target_model: 'shared-model', source_provider: 'catalog', source_model: `${provider}-match` }))
test('batch scoping keeps stored matches available when switching back', () => {
  const original = structuredClone(matches)
  const preview = (providers: string[]) => scopeImportMatches(providers.map(provider => ({ provider, model: 'shared-model' })), matches).map(match => match.source_model)
  expect(preview(['copilot', 'devin'])).toEqual(['copilot-match', 'devin-match'])
  expect(preview(['devin'])).toEqual(['devin-match'])
  expect(preview([])).toEqual([])
  expect(preview(['copilot'])).toEqual(['copilot-match'])
  expect(matches).toEqual(original)
})
test('provider identity ignores whitespace/case but model IDs retain case', () => {
  expect(scopeImportMatches([{ provider: ' Copilot ', model: ' shared-model ' }], matches)).toEqual([matches[0]!])
  expect(scopeImportMatches([{ provider: 'copilot', model: 'Shared-Model' }], matches)).toEqual([])
})
test('preview integration scopes the payload without clearing stored choices or weakening validation', () => {
  const source = readFileSync(new URL('./useBillingPriceImport.ts', import.meta.url), 'utf8')
  expect(source).toContain('match_overrides: scopeImportMatches(targets, matchOverrides).map(')
  expect(source).not.toContain('overrideKeys.some(key => !targetKeys.includes(key))')
  expect(source).toContain('new Set(overrideKeys).size !== overrideKeys.length')
  expect(source).toContain('controller.signal.aborted || version !== inputVersion')
})
