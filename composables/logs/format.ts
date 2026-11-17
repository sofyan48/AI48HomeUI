// Formatting and API-shape helpers used only by the admin logs page (/admin/logs).

import type { Ref } from 'vue'
import type { LogApiError, LogTranslator } from './types'

export const rowValue = <T>(row: T | { original: T }): T => (row as { original?: T })?.original || row as T

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as LogApiError | null | undefined
  return apiError?.data?.message || apiError?.data?.error || apiError?.message || fallback
}

export const validErrorLogName = (name: unknown) => /^error-[^/\\]+\.log$/.test(String(name || ''))

export const levelColor = (level: unknown) => {
  switch (String(level || '').toLowerCase()) {
    case 'error': return 'error'
    case 'warn':
    case 'warning': return 'warning'
    case 'info': return 'primary'
    default: return 'neutral'
  }
}

export function createLogFormatters({ t, intlLocale }: { t: LogTranslator; intlLocale: Readonly<Ref<string>> }) {
  const formatNumber = (value: unknown) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
  const formatDateTime = (value: string | number | Date | null | undefined) => value ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
  const formatMilliseconds = (value: unknown) => value === null || value === undefined ? '—' : `${formatNumber(value)} ms`
  const formatHost = (host: string | null | undefined, port?: number | string | null) => host ? `${host}${port ? `:${port}` : ''}` : '—'
  const formatAmount = (amount: number | string | null | undefined, currency?: string | null) => amount === null || amount === undefined ? '—' : `${new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 4 }).format(Number(amount))} ${currency || t('logs.credits')}`
  const formatBoolean = (value: unknown) => value === null || value === undefined ? '—' : value ? t('common.yes') : t('common.no')
  const formatBytes = (value: unknown) => {
    if (value === null || value === undefined) return t('logs.sizeUnavailable')
    const bytes = Number(value)
    if (!Number.isFinite(bytes) || bytes < 0) return t('logs.sizeUnavailable')
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return { formatNumber, formatDateTime, formatMilliseconds, formatHost, formatAmount, formatBoolean, formatBytes }
}
