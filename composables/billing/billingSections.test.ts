import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { adminMessages } from '../../locales/admin'
import consoleEn from '../../locales/en'

const root = new URL('../..', import.meta.url).pathname
const source = (file: string) => readFileSync(join(root, file), 'utf8')
const workspace = source('composables/billing/useBillingWorkspace.ts')
const importer = source('composables/billing/useBillingPriceImport.ts')

function functionSource(text: string, name: string) {
  const start = text.indexOf(`async function ${name}(`)
  expect(start).toBeGreaterThan(-1)
  const end = text.indexOf('\n', start)
  return text.slice(start, end)
}

describe('billing section extraction contracts', () => {
  for (const [name, filters, applied] of [
    ['applyOverviewFilters', 'overviewFilters', 'appliedOverviewFilters'],
    ['applyChargeFilters', 'chargeFilters', 'appliedChargeFilters'],
    ['applyBalanceFilters', 'balanceFilters', 'appliedBalanceFilters']
  ]) {
    test(`${name} rejects invalid ranges before committing filters or loading`, () => {
      const handler = functionSource(workspace, name!)
      expect(handler).toContain(`dateRangeError(${filters}.value.from, ${filters}.value.to)`)
      expect(handler).toContain('if (error) { pageError.value = dateErrorLabel(error); return }')
      expect(handler.indexOf('return }')).toBeLessThan(handler.indexOf(`${applied}.value =`))
      expect(handler.indexOf(`${applied}.value =`)).toBeLessThan(handler.indexOf('await safely('))
    })
  }

  test('source and target edits synchronously invalidate previews', () => {
    expect(importer).toContain("watch([source, targets, overwriteMode, defaultMultiplier, includeZeroCost, aliases, multiplierRules, rowMultipliers, matchOverrides], invalidatePreview, { deep: true, flush: 'sync' })")
    expect(importer).toContain('version !== inputVersion')
    expect(importer).toContain('session !== sessionVersion')
    expect(importer).toContain('previewController?.abort()')
  })

  test('import recovery reuses the saved payload and preserves session cleanup', () => {
    expect(importer).toContain("fetchAPI('/billing/model-prices/import/apply', { method: 'POST', body: pending.input, signal: controller.signal })")
    expect(importer).toContain('validateBillingImportResult(result, pending.input)')
    expect(importer).toContain("window.removeEventListener('beforeunload', preventUnload)")
    expect(importer).toContain('operationController?.abort()')
    expect(importer).toContain('applyController?.abort()')
    expect(importer).toContain("}, { immediate: true, flush: 'sync' })")
  })

  test('workspace still owns initial loading and shared synchronization', () => {
    expect(workspace).toContain("useDataSync('admin:billing:sync', () => loadBilling(true))")
    expect(workspace).toContain('onMounted(loadBilling)')
    expect(workspace).toContain('await loadSettings(preserveDraft)')
    expect(workspace).toContain('await Promise.all([loadOverview(), loadCharges(), loadBalances(), loadPrices(), loadUsers(), loadModelCandidates()])')
  })

  test('extracted composable translations use known keys', () => {
    for (const file of readdirSync(join(root, 'composables/billing')).filter(file => /\.(js|ts)$/.test(file) && !file.endsWith('.test.ts'))) {
      const keys = [...source(`composables/billing/${file}`).matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)].map(match => match[1]!)
      expect(keys.filter(key => !(key in adminMessages.en) && !(key in consoleEn))).toEqual([])
    }
  })
})
