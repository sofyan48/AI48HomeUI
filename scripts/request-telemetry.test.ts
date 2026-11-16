import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import { clampRequestColumnWidth, estimateRequestColumnWidths, normalizeRequestColumnWidths, readTelemetryChoice, requestCacheRate, requestCostRows, requestRanges, requestSorts, saveTelemetryChoice, toolUsageEntries, usageRanges, requestPageSizes, normalizeRequestPageSize, normalizeRequestColumnVisibility, visibleRequestColumns, readRequestPreference, saveRequestPreference } from '../composables/requestTelemetry'

describe('request telemetry preferences', () => {
  test('restores only supported choices and never overwrites a preset with custom dates', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) } })
    try {
      for (const choices of [requestRanges, requestSorts, usageRanges]) {
        for (const choice of choices) { saveTelemetryChoice('test', choice, choices); expect(readTelemetryChoice('test', 'fallback', choices)).toBe(choice) }
        saveTelemetryChoice('test', 'custom', choices)
        expect(readTelemetryChoice('test', 'fallback', choices)).toBe(choices.at(-1)!)
        values.set('test', 'invalid')
        expect(readTelemetryChoice('test', 'fallback', choices)).toBe('fallback')
      }
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage blocked') } })
      expect(readTelemetryChoice('test', '24h', requestRanges)).toBe('24h')
      expect(() => saveTelemetryChoice('test', '24h', requestRanges)).not.toThrow()
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
  test('versioned storage validates shapes, migrates legacy values and tolerates unavailable storage', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) } })
    try {
      for (const invalid of ['', '{', 'null', '[]', 'true', '"100"', '0', '201', '50.5', '{"version":2,"value":100}', '{"version":"1","value":100}', '{"version":1}']) {
        values.set('size', invalid)
        expect(readRequestPreference('size', normalizeRequestPageSize)).toBe(50)
      }
      for (const size of requestPageSizes) {
        values.set('size', JSON.stringify(size))
        expect(readRequestPreference('size', normalizeRequestPageSize)).toBe(size)
        saveRequestPreference('size', size, normalizeRequestPageSize)
        expect(JSON.parse(values.get('size')!)).toEqual({ version: 1, value: size })
        expect(readRequestPreference('size', normalizeRequestPageSize)).toBe(size)
      }
      values.set('widths', '{"model":300}')
      const widths = readRequestPreference('widths', normalizeRequestColumnWidths)
      expect(widths).toEqual({ model: 300 })
      saveRequestPreference('widths', widths, normalizeRequestColumnWidths)
      expect(readRequestPreference('widths', normalizeRequestColumnWidths)).toEqual(widths)
      values.set('columns', '{"version":1,"value":{"model":false,"timestamp":false,"actions":false,"cost":"false","unknown":false}}')
      expect(readRequestPreference('columns', normalizeRequestColumnVisibility)).toEqual({ model: false })
      values.set('columns', '{"version":999,"value":{"model":false}}')
      expect(readRequestPreference('columns', normalizeRequestColumnVisibility)).toEqual({})
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage blocked') } })
      expect(readRequestPreference('size', normalizeRequestPageSize)).toBe(50)
      expect(readRequestPreference('columns', normalizeRequestColumnVisibility)).toEqual({})
      expect(() => saveRequestPreference('size', 100, normalizeRequestPageSize)).not.toThrow()
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: () => { throw new Error('Quota exceeded') } } })
      expect(() => saveRequestPreference('size', 100, normalizeRequestPageSize)).not.toThrow()
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
  test('visibility accepts only boolean overrides for known optional columns and keeps identity/actions', () => {
    for (const invalid of [null, false, [], 'model', 10]) expect(normalizeRequestColumnVisibility(invalid)).toEqual({})
    const overrides = normalizeRequestColumnVisibility(JSON.parse('{"timestamp":false,"actions":false,"model":false,"tokens":true,"cost":0,"constructor":false,"__proto__":false}'))
    expect(overrides).toEqual({ model: false, tokens: true })
    expect(visibleRequestColumns(overrides)).not.toContain('model')
    expect(visibleRequestColumns(overrides)).toContain('tokens')
    expect(visibleRequestColumns({ timestamp: false, actions: false })).toContain('timestamp')
    expect(visibleRequestColumns({ timestamp: false, actions: false })).toContain('actions')
    expect(normalizeRequestColumnWidths(JSON.parse('{"constructor":200,"__proto__":200,"model":220}'))).toEqual({ model: 220 })
  })
  test('sanitizes persisted widths, bounds dragging and auto-fits long visible values', () => {
    expect(normalizeRequestColumnWidths({ model: 9999, status: 1, event: NaN, cost: '200', actions: 300, invalid: 100 })).toEqual({ model: 640, status: 96 })
    expect(normalizeRequestColumnWidths([])).toEqual({})
    expect(clampRequestColumnWidth('model', 1)).toBe(120)
    expect(estimateRequestColumnWidths([{ model: 'x'.repeat(1000) }]).model).toBe(640)
    expect(estimateRequestColumnWidths([]).model).toBe(208)
  })
})

describe('request telemetry display', () => {
  test('sources are not tool calls and malformed counters cannot inflate the total', () => {
    expect(toolUsageEntries({ web_search_calls: 2, web_search_queries: 8, num_sources_used: 12, numSourcesUsed: 12, invalid: Infinity, negative: -1 })).toEqual([['web_search_calls', 2]])
    expect(toolUsageEntries({ web_search_queries: 8 })).toEqual([['web_search_queries', 8]])
    expect(toolUsageEntries(null as any)).toEqual([])
  })
  test('uses cache reads with legacy fallback and bounds inconsistent cache rates', () => {
    expect(requestCacheRate({ tokens: { input_tokens: 100, cache_read_tokens: 25, cached_tokens: 80 } })).toBe('25%')
    expect(requestCacheRate({ tokens: { input_tokens: 100, cached_tokens: 50 } })).toBe('50%')
    expect(requestCacheRate({ tokens: { input_tokens: 10, cached_tokens: 50 } })).toBe('100%')
    expect(requestCacheRate({ tokens: { cached_tokens: 50 } })).toBe('')
  })
  test('cost rows merge reasoning, omit duplicate expression totals and expose fees/multipliers at charge precision', () => {
    const rows = requestCostRows({ amount: 0.00001234, currency: 'USD', cost_breakdown: { request: 0.00000001, reasoning_effort: 'high', reasoning_effort_multiplier: 2, billing_multiplier: 0.5, items: { output: { tokens: 10, cost: 0.00000001 }, reasoning: { tokens: 5, cost: 0.00000002 }, expression: { cost: 10 }, 'expr:ws': { tokens: 2, cost: 1 }, 'expr:wsq': { tokens: 4, cost: 0 }, 'expr:src': { tokens: 12, cost: 0 } } } })
    expect(rows[0]).toEqual({ label: 'Total', value: '0.00001234 USD' })
    expect(rows).toContainEqual({ label: 'Output (15)', value: '0.00000003 USD' })
    expect(rows).toContainEqual({ label: 'Request fee', value: '0.00000001 USD' })
    expect(rows).toContainEqual({ label: 'Effort multiplier (high)', value: '×2' })
    expect(rows).toContainEqual({ label: 'Billing multiplier', value: '×0.5' })
    expect(rows.some(row => /expression|Sources|query/i.test(row.label))).toBe(false)
    expect(requestCostRows(null)).toEqual([])
    expect(requestCostRows({ amount: 0 })).toEqual([{ label: 'Total', value: '0 credits' }])
  })
})

describe('Nuxt telemetry integration', () => {
  test('updated components compile with their real templates', () => {
    for (const file of ['components/admin/RequestRecords.vue', 'components/admin/RequestRecordDetail.vue', 'pages/admin/usage.vue']) {
      const { descriptor, errors } = parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
      expect(errors).toEqual([])
      expect(() => compileScript(descriptor, { id: file, inlineTemplate: true })).not.toThrow()
    }
  })
  test('page-size changes reset pagination and pending live records, persist only supported sizes and refresh once', async () => {
    const source = readFileSync(new URL('../components/admin/RequestRecords.vue', import.meta.url), 'utf8')
    const body = source.split('async function changePageSize(value) {')[1]!.split('\nasync function changePage(delta)')[0]!
    const pageSize = { value: 50 }, page = { value: 4 }, pendingNewEvents = { value: 12 }
    let refreshes = 0
    const saved: unknown[] = []
    const change = new Function('requestPageSizes', 'pageSize', 'page', 'pendingNewEvents', 'saveRequestPreference', 'pageSizeKey', 'normalizeRequestPageSize', 'refreshEvents', `return async function(value) {${body}`)(requestPageSizes, pageSize, page, pendingNewEvents, (...args: unknown[]) => saved.push(args), 'size', normalizeRequestPageSize, async () => { refreshes++ })
    for (const invalid of [0, 201, '100', null, NaN, 50]) await change(invalid)
    expect(page.value).toBe(4)
    expect(refreshes).toBe(0)
    await change(100)
    expect(pageSize.value).toBe(100)
    expect(page.value).toBe(1)
    expect(pendingNewEvents.value).toBe(0)
    expect(refreshes).toBe(1)
    expect(saved).toHaveLength(1)
    expect(source).toContain('query.limit = pageSize.value; query.offset = (page.value - 1) * pageSize.value')
    expect(source).toContain('visibleColumnKeys.value.reduce(')
    expect(source).toContain('columnDefinitions.filter(column => visibleColumnKeys.value.includes(column.accessorKey))')
    expect(source).toContain('onUpdateChecked: checked => setColumnVisible')
  })
  test('keeps resize cleanup, keyboard auto-fit and saved usage initialization wired', () => {
    const requests = readFileSync(new URL('../components/admin/RequestRecords.vue', import.meta.url), 'utf8')
    expect(requests).toContain('stopColumnResize(); disposed = true')
    expect(requests).toContain('@dblclick.stop.prevent="autoFitColumn')
    expect(requests).toContain('@keydown="resizeColumnWithKeyboard')
    expect(requests).toContain('requestCostRows(rowValue(row).billing)')
    const usage = readFileSync(new URL('../pages/admin/usage.vue', import.meta.url), 'utf8')
    expect(usage).toContain('...datesForRange(rangePreset.value)')
    expect(usage).toContain('const appliedPreset = ref(rangePreset.value)')
  })
})
