// Number formatters shared by the dashboard sections.
import { useAdminI18n } from '~/composables/useAdminI18n'

export function useDashboardFormat() {
  const { intlLocale } = useAdminI18n()

  const formatNumber = (value: unknown) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
  const formatCompact = (value: unknown) =>
    new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
  const formatPercent = (value: unknown) => {
    if (value == null) return '--'
    const num = Number(value)
    return Number.isFinite(num) ? `${(num * 100).toFixed(1)}%` : '--'
  }

  return { formatNumber, formatCompact, formatPercent }
}
