import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ref } from 'vue'
import { billingTierChoices, billingTierLabel, normalizeBillingPriceSnapshot } from './priceEvidence'
import { useBillingPresentation } from './useBillingPresentation'
import type { BillingCharge, BillingPresentationOptions } from './types'
import { adminMessages } from '../../locales/admin'

function presentation(snapshot: unknown) {
  return useBillingPresentation({
    overview: ref(null), selectedBalance: ref(null),
    selectedCharge: ref({ price_snapshot: snapshot } as BillingCharge),
    t: ((key: string) => key) as BillingPresentationOptions['t'],
    formatCredits: String, formatNumber: String, formatDateTime: String, balanceTypeLabel: String
  }).snapshotDetailItems.value
}

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('HMC c386db4 billing parity', () => {
  test('offers ultrafast and wildcard independently, preserving unknown tiers exactly once', () => {
    expect(billingTierChoices()).toEqual(['*', 'standard', 'flex', 'priority', 'ultrafast'])
    expect(billingTierChoices(['future-tier', 'ultrafast', undefined, '', 'future-tier'])).toEqual([
      '*', 'standard', 'flex', 'priority', 'ultrafast', 'future-tier'
    ])
    expect(billingTierLabel('ultrafast', key => key)).toBe('billing.tier.ultrafast')
    expect(billingTierLabel('future-tier', () => 'unexpected translation')).toBe('future-tier')
  })

  test('wires edit and filter choices without replacing the submitted tier', () => {
    const workspace = source('composables/billing/useBillingWorkspace.ts')
    expect(workspace).toContain('billingTierChoices([priceForm.value.service_tier])')
    expect(workspace).toContain('billingTierChoices(priceRules.value.map(rule => rule.service_tier))')
    expect(workspace).toContain("service_tier: rule.service_tier || '*'")
    expect(workspace).toContain("service_tier: priceForm.value.service_tier.trim() || '*'")
    expect(source('components/admin/billing/pricing/BillingPriceDialog.vue')).toContain(':items="serviceTierOptions"')
    expect(source('components/admin/billing/pricing/BillingPricesTab.vue')).toContain(':items="priceTierOptions"')
  })

  for (const tier of ['ultrafast', '*']) {
    test(`reads the actual matched ${tier} rule rather than the effective tier`, () => {
      const normalized = normalizeBillingPriceSnapshot({
        requested_service_tier: 'ultrafast', effective_service_tier: 'ultrafast',
        matched_service_tier: tier, service_tier: 'priority',
        response_tier_fallback: false, response_service_tier_fallback: true,
        context_input_tokens: 300000, input_tokens_for_band: 42, min_input_tokens: 272001
      })
      expect(normalized).toMatchObject({
        matched_service_tier: tier, requested_service_tier: 'ultrafast', effective_service_tier: 'ultrafast',
        response_tier_fallback: false, context_input_tokens: 300000, min_input_tokens: 272001
      })
    })
  }

  test('accepts camelCase and legacy snapshot aliases', () => {
    expect(normalizeBillingPriceSnapshot(JSON.stringify({
      matchedServiceTier: 'ultrafast', serviceTier: 'priority', minInputTokens: 0,
      contextInputTokens: 0, inputTokensForBand: 1, responseTierFallback: false,
      responseServiceTierFallback: true, requestedServiceTier: 'ultrafast', responseServiceTier: 'default'
    }))).toMatchObject({
      matched_service_tier: 'ultrafast', min_input_tokens: 0, context_input_tokens: 0,
      response_tier_fallback: false, requested_service_tier: 'ultrafast', response_service_tier: 'default'
    })
    for (const [tier, context, fallback] of [
      ['service_tier', 'input_tokens_for_band', 'response_service_tier_fallback'],
      ['serviceTier', 'inputTokensForBand', 'responseServiceTierFallback']
    ]) {
      expect(normalizeBillingPriceSnapshot({ [tier!]: '*', [context!]: 300000, [fallback!]: true })).toMatchObject({
        matched_service_tier: '*', context_input_tokens: 300000, response_tier_fallback: true, min_input_tokens: null
      })
    }
  })

  test('distinguishes missing context from an explicitly recorded zero without requiring schema version', () => {
    expect(normalizeBillingPriceSnapshot({})?.min_input_tokens).toBeNull()
    expect(presentation({ schema_version: 2, matched_service_tier: '*' })).not.toContainEqual({ label: 'billing.snapshot.minInputTokens', value: '0' })
    expect(presentation({ min_input_tokens: 0 })).not.toContainEqual({ label: 'billing.snapshot.minInputTokens', value: '0' })
    expect(presentation({ matched_service_tier: '*', min_input_tokens: 0, context_input_tokens: 0, response_tier_fallback: false })).toEqual([
      { label: 'billing.snapshot.matchedTier', value: '*' },
      { label: 'billing.snapshot.minInputTokens', value: '0' },
      { label: 'billing.snapshot.responseFallback', value: 'common.no' },
      { label: 'billing.snapshot.contextInputTokens', value: '0' }
    ])
    expect(presentation({ serviceTier: 'ultrafast', minInputTokens: null }).some(item => item.label === 'billing.snapshot.minInputTokens')).toBe(false)
  })

  test('invalid snapshots are safe and raw evidence is not mutated', () => {
    for (const value of [null, undefined, 'invalid JSON', '[]', [], 0]) expect(normalizeBillingPriceSnapshot(value)).toBeNull()
    const evidence = { matchedServiceTier: '*', minInputTokens: 0, responseTierFallback: false }
    normalizeBillingPriceSnapshot(evidence)
    expect(evidence).toEqual({ matchedServiceTier: '*', minInputTokens: 0, responseTierFallback: false })
    expect(normalizeBillingPriceSnapshot({ response_tier_fallback: 'false', responseServiceTierFallback: true })?.response_tier_fallback).toBe(true)
  })

  test('all supported locales provide ultrafast and context evidence labels', () => {
    for (const messages of Object.values(adminMessages)) {
      expect(messages['billing.tier.ultrafast']).toBeTruthy()
      expect(messages['billing.snapshot.contextInputTokens']).toBeTruthy()
    }
  })
})
