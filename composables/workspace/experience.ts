type MonthActivity = { request_count?: number | null; total_charge_amount?: number | null; month_spend?: number | null }
export type DashboardExperience = 'pending' | 'new' | 'active'

/**
 * Active users have sent requests or spent credits this month; they see usage before the guide.
 * Without month data (still loading) the layout stays 'pending'; a failed load falls back to 'new'
 * so the connection guide stays prominent rather than hidden.
 */
export function dashboardExperience(month: MonthActivity | null | undefined, loading: boolean): DashboardExperience {
  if (month) return Number(month.request_count) > 0 || Number(month.total_charge_amount ?? month.month_spend) > 0 ? 'active' : 'new'
  return loading ? 'pending' : 'new'
}
