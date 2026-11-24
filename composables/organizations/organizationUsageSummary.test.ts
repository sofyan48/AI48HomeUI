import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fillOrganizationDailyTrend, normalizeOrganizationUsageOverview, useOrganizationUsageSummary } from './useOrganizationUsageSummary'
import { normalizePortalOrgUsage, portalOrganizationDailyTrend, usePortalOrganizationUsage } from '../organizations-portal/usePortalOrganizationUsage'

describe('organization usage summaries', () => {
  // The theme defines only --color-primary; shade classes such as bg-primary-500 render transparent bars.
  test('chart bars use theme colors that exist', () => {
    for (const file of ['components/AppOrganizationDailyCharge.vue', 'components/admin/organizations/detail/OrganizationsUsageRanking.vue', 'components/app/organizations/OrganizationUsageSummary.vue']) {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
      expect(source).not.toMatch(/bg-primary-\d/)
      expect(source).toContain('bg-primary')
    }
  })
  test('admin and portal share the daily charge chart and preserve their metric mappings', () => {
    const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    const admin = read('components/admin/organizations/detail/OrganizationsUsageSummary.vue')
    const portal = read('components/app/organizations/OrganizationUsageSummary.vue')
    for (const source of [admin, portal]) expect(source).toContain('<AppOrganizationDailyCharge')
    expect(admin).toContain('amount: point.charge_amount, requests: point.request_count')
    expect(portal).toContain('portalOrganizationDailyTrend(usage.value?.daily || [])')
    const chart = read('components/AppOrganizationDailyCharge.vue')
    expect(chart).toContain('h-32')
    expect(chart).toContain('formatCount(point.requests)')
    expect(chart).toContain('points[points.length - 1]?.date')
    expect(chart).toContain('loading ? loadingText : emptyText')
  })

  test('portal daily chart retains the complete range including empty days', () => {
    const usage = normalizePortalOrgUsage({ daily: [
      { date: '2026-11-20', requests: 0, billed_amount: 0 },
      { date: '2026-11-21', requests: 2, billed_amount: 0 },
      { date: '2026-11-22', requests: 1, billed_amount: 5 },
    ] })
    expect(portalOrganizationDailyTrend(usage.daily)).toEqual([
      { date: '2026-11-20', amount: 0, requests: 0 },
      { date: '2026-11-21', amount: 0, requests: 2 },
      { date: '2026-11-22', amount: 5, requests: 1 },
    ])
    expect(usage.daily).toHaveLength(3)
    expect(portalOrganizationDailyTrend([])).toEqual([])
    expect(portalOrganizationDailyTrend(normalizePortalOrgUsage({ daily: [
      { date: '2026-11-22', requests: 0, billed_amount: 0 },
    ] }).daily)).toEqual([{ date: '2026-11-22', amount: 0, requests: 0 }])
  })

  test('admin fills the selected daily range to match portal bars', async () => {
    const point = { date: '2026-11-22', charge_amount: 5, request_count: 1 }
    const summary = useOrganizationUsageSummary(async <T>() => ({ overview: {
      range: { from: '2026-11-22', to: '2026-11-22' }, daily_trend: [point],
    } }) as T)
    await summary.load({ from: '2026-10-24', to: '2026-11-22' }, 'failed')
    expect(summary.overview.value?.daily_trend).toHaveLength(30)
    expect(summary.overview.value?.daily_trend[0]).toEqual({ date: '2026-10-24', charge_amount: 0, request_count: 0 })
    expect(summary.overview.value?.daily_trend[29]).toEqual(point)
    expect(fillOrganizationDailyTrend([], '2026-11-20', '2026-11-22')).toHaveLength(3)
    expect(fillOrganizationDailyTrend([point], undefined, undefined)).toEqual([point])
    expect(fillOrganizationDailyTrend([point], '2026-11-23', '2026-11-22')).toEqual([point])
    expect(fillOrganizationDailyTrend([point], '2026-02-30', '2026-11-22')).toEqual([point])
  })

  test('admin overview normalizes Home billing overview including per-member ranking', () => {
    const overview = normalizeOrganizationUsageOverview({
      total_charge_amount: 12.5, request_count: 4, input_tokens: 100, output_tokens: 50, cache_tokens: 3,
      daily_trend: [{ date: '2026-11-21', charge_amount: 2.5, request_count: 1 }],
      top_members: [{ id: '8', label: 'alice', amount: 10, request_count: 3 }],
    })
    expect(overview.total_charge_amount).toBe(12.5)
    expect(overview.top_members).toEqual([{ id: '8', label: 'alice', amount: 10, request_count: 3 }])
    expect(overview.top_users).toEqual([])
    expect(normalizeOrganizationUsageOverview(null).daily_trend).toEqual([])
  })

  test('admin summary sends the scoped query and ignores stale responses', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    const calls: Array<{ path: string, options?: Record<string, unknown> }> = []
    const fetchAPI = <T>(path: string, options?: Record<string, unknown>) => {
      calls.push({ path, options })
      return new Promise<T>(resolve => resolvers.push(resolve as (value: unknown) => void))
    }
    const summary = useOrganizationUsageSummary(fetchAPI)
    const first = summary.load({ user_id: 4 }, 'failed')
    const second = summary.load({ user_id: 4, actor_user_id: '8' }, 'failed')
    expect(calls[1]).toEqual({ path: '/billing/overview', options: { query: { user_id: 4, actor_user_id: '8' } } })
    resolvers[1]!({ overview: { total_charge_amount: 2 } })
    await second
    resolvers[0]!({ overview: { total_charge_amount: 99 } })
    await first
    expect(summary.overview.value?.total_charge_amount).toBe(2)
  })

  test('portal summary reads organization analytics and hides on unsupported Home', async () => {
    expect(normalizePortalOrgUsage({ summary: { billed_amount: 3, requests: 2 }, per_model: [{ model: 'a', billed_amount: 1 }, { model: 'b', billed_amount: 2 }] }).per_model.map(row => row.model)).toEqual(['b', 'a'])
    const paths: string[] = []
    const ok = usePortalOrganizationUsage(async <T>(path: string) => { paths.push(path); return { summary: { billed_amount: 5 } } as T })
    await ok.load(7, 30)
    expect(paths).toEqual(['/organizations/7/analytics'])
    expect(ok.usage.value?.summary.billed_amount).toBe(5)
    const missing = usePortalOrganizationUsage(async () => { throw Object.assign(new Error('not found'), { statusCode: 404 }) })
    await missing.load(7, 30)
    expect(missing.unavailable.value).toBe(true)
  })
})
