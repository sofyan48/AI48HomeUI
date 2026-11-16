// Formatting and API-shape helpers used only by the admin logs page (/admin/logs).

export const rowValue = (row) => row?.original || row

export const apiErrorMessage = (error, fallback) => error?.data?.message || error?.data?.error || error?.message || fallback

export const validErrorLogName = name => /^error-[^/\\]+\.log$/.test(String(name || ''))

export const levelColor = (level) => {
  switch (String(level || '').toLowerCase()) {
    case 'error': return 'error'
    case 'warn':
    case 'warning': return 'warning'
    case 'info': return 'primary'
    default: return 'neutral'
  }
}

export function createLogFormatters({ t, intlLocale }) {
  const formatNumber = (value) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
  const formatDateTime = (value) => value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
  const formatMilliseconds = (value) => value === null || value === undefined ? '—' : `${formatNumber(value)} ms`
  const formatHost = (host, port) => host ? `${host}${port ? `:${port}` : ''}` : '—'
  const formatAmount = (amount, currency) => amount === null || amount === undefined ? '—' : `${new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 4 }).format(Number(amount))} ${currency || t('logs.credits')}`
  const formatBoolean = (value) => value === null || value === undefined ? '—' : value ? t('common.yes') : t('common.no')
  const formatBytes = (value) => {
    if (value === null || value === undefined) return t('logs.sizeUnavailable')
    const bytes = Number(value)
    if (!Number.isFinite(bytes) || bytes < 0) return t('logs.sizeUnavailable')
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return { formatNumber, formatDateTime, formatMilliseconds, formatHost, formatAmount, formatBoolean, formatBytes }
}
