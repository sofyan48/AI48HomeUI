// Formatting, labels and error helpers used only by the upstream accounts panel.
import type { AccountBase, AccountCredential, QuotaWindow } from './types'
import { accountError } from './types'

export const ALL_FILTER = '__all__'

export function createAccountFormat({ t, intlLocale }: Pick<AccountBase, 't' | 'intlLocale'>) {
  function value(row: AccountCredential | { original: AccountCredential }): AccountCredential
    function value(row: null | undefined): null | undefined
    function value(row: AccountCredential | { original: AccountCredential } | null | undefined) {
      return row && 'original' in row ? row.original ?? row : row
    }
  const credentialIdentifier = (item: AccountCredential | null | undefined) => String(item?.name || item?.auth_index || item?.id || '')
  function compactIdentifier(value: unknown, maxLength = 42) {
    const text = String(value || '')
    if (text.length <= maxLength) return text
    const suffixLength = 18
    return `${text.slice(0, maxLength - suffixLength - 1)}…${text.slice(-suffixLength)}`
  }
  const credentialRoute = (suffix: string) => `/credentials${suffix}`
  const unavailable = (error: unknown) => [404, 405, 501].includes(accountError(error)?.statusCode ?? 0)
  function message(cause: unknown) { const error = accountError(cause); return error?.data?.message || error?.data?.error || error?.message || t('cred.err.unexpected') }

  function wsStateLabel(state: string) {
    const labels: Record<string, string> = { on: t('common.on'), off: t('common.off'), unknown: t('common.unknown'), unsupported: t('cred.na') }
    return labels[state] || state
  }
  function quotaStatusLabel(status: string) {
    const labels: Record<string, string> = { healthy: t('quota.status.healthy'), low: t('quota.status.low'), exhausted: t('quota.status.exhausted'), unknown: t('quota.status.unknown'), error: t('quota.status.error'), unsupported: t('quota.status.unsupported'), available: t('quota.status.available') }
    return labels[status] || status
  }
  function collectionLabel(status: string) {
    const labels: Record<string, string> = { success: t('quota.collection.success'), partial: t('quota.collection.partial'), failed: t('quota.collection.failed'), collecting: t('quota.collection.collecting'), never: t('quota.collection.never') }
    return labels[status] || status
  }
  function freshnessLabel(value: string) {
    const labels: Record<string, string> = { fresh: t('quota.freshness.fresh'), stale: t('quota.freshness.stale'), never: t('quota.freshness.never'), expired: t('quota.freshness.expired') }
    return labels[value] || value
  }
  function onDemandLabel(value: string) { return value === 'enabled' ? t('common.enabled') : value === 'disabled' ? t('common.disabled') : t('common.unknown') }
  function formatDateTime(value: string | number | Date) { return new Date(value).toLocaleString(intlLocale.value) }
  function quotaColor(status: string) { return status === 'healthy' || status === 'available' ? 'success' : status === 'low' ? 'warning' : status === 'exhausted' || status === 'error' ? 'error' : 'neutral' }
  function quotaWindowRatio(window: QuotaWindow) {
    const ratio = Number(window.remaining_ratio)
    return window.remaining_ratio == null || !Number.isFinite(ratio) ? null : Math.max(0, Math.min(1, ratio))
  }
  function credentialStatus(item: AccountCredential) { return item.disabled ? 'disabled' : item.unavailable ? 'unavailable' : item.status || 'active' }
  function credentialStatusLabel(status: string) {
    const labels: Record<string, string> = { active: t('cred.status.active'), disabled: t('cred.status.disabled'), unavailable: t('cred.status.unavailable'), error: t('cred.status.error') }
    return labels[status] || status
  }
  function credentialColor(item: AccountCredential) { return item.disabled ? 'neutral' : item.unavailable ? 'warning' : item.status === 'error' ? 'error' : 'success' }
  function formatFileSize(size: number) { return size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB` }

  return {
    value, credentialIdentifier, compactIdentifier, credentialRoute, unavailable, message, wsStateLabel,
    quotaStatusLabel, collectionLabel, freshnessLabel, onDemandLabel, formatDateTime, quotaColor, quotaWindowRatio,
    credentialStatus, credentialStatusLabel, credentialColor, formatFileSize
  }
}
