import { useAdminI18n } from '~/composables/useAdminI18n'

// Usage API responses are loosely shaped JSON, so helpers read fields defensively.
export const rowValue = (row: any) => row?.original || row
export const apiErrorMessage = (error: any, fallback: string) => error?.data?.message || error?.data?.error || error?.message || fallback
export const tokenQualityColor = (quality: any) => quality === 'complete' ? 'success' : quality === 'partial' ? 'warning' : 'neutral'
export const formatHost = (host: any, port: any) => host ? `${host}${port ? `:${port}` : ''}` : '—'

/** Locale-aware formatters shared by the usage overview sections and dialogs. */
export function useUsageFormat() {
  const { t, intlLocale } = useAdminI18n()

  const formatNumber = (value: any) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
  const formatCompactNumber = (value: any) => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
  const formatDecimal = (value: any) => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2 }).format(Number(value) || 0)
  const formatPercent = (value: any) => `${new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 1 }).format((Number(value) || 0) * 100)}%`
  const formatMilliseconds = (value: any) => value === null || value === undefined ? '—' : `${formatNumber(value)} ms`
  const formatTPS = (value: any) => value === null || value === undefined ? '—' : `${formatDecimal(value)} tok/s`
  const qualityLabel = (quality: any) => quality === 'complete' ? t('usage.quality.complete') : quality === 'partial' ? t('usage.quality.partial') : quality ? quality : t('usage.quality.unknown')
  const formatAmount = (amount: any, currency?: any) => amount === null || amount === undefined ? '—' : `${formatDecimal(amount)} ${currency || t('usage.credits')}`
  const credentialDetail = (credential: any) => credential ? [credential.credential_type, credential.provider, credential.source, credential.status, credential.api_key_preview].filter(Boolean).join(' · ') : t('common.unknown')
  const balanceChange = (billing: any) => billing?.balance_before == null && billing?.balance_after == null ? '—' : `${formatAmount(billing.balance_before, billing.currency)} → ${formatAmount(billing.balance_after, billing.currency)}`
  const formatDateTime = (value: any) => value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
  const formatBoolean = (value: any) => value === null || value === undefined ? '—' : value ? t('common.yes') : t('common.no')

  // dateRangeError returns English; map its known messages for display.
  const dateErrorText = (message: string) => message.startsWith('Enter a valid date and time') ? t('usage.dateTimeInvalid') : message.startsWith('Enter a valid date') ? t('usage.dateInvalid') : message.startsWith('Start must be') ? t('usage.rangeInverted') : message

  return {
    formatNumber,
    formatCompactNumber,
    formatDecimal,
    formatPercent,
    formatMilliseconds,
    formatTPS,
    qualityLabel,
    formatAmount,
    credentialDetail,
    balanceChange,
    formatDateTime,
    formatBoolean,
    dateErrorText
  }
}
