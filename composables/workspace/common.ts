import { usePortalI18n } from '~/composables/usePortalI18n'

export function errorMessage(error: any, fallback: string) { return error?.data?.message || error?.data?.error || error?.message || fallback }

export function useWorkspaceFormat() {
  const { intlLocale } = usePortalI18n()
  function formatCredits(value: unknown) {
    const number = Number(value)
    return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2, roundingMode: 'ceil' } as Intl.NumberFormatOptions).format(Number.isFinite(number) ? number : 0)
  }
  function formatCompactNumber(value: unknown) {
    const number = Number(value)
    return new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number.isFinite(number) ? number : 0)
  }
  function formatNumber(value: unknown) {
    const number = Number(value)
    return new Intl.NumberFormat(intlLocale.value).format(Number.isFinite(number) ? number : 0)
  }
  function formatDate(value?: string) {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—'
  }
  return { formatCredits, formatCompactNumber, formatNumber, formatDate }
}

export function useWorkspaceClipboard() {
  const toast = useToast()
  const { t } = usePortalI18n()
  return async function copyText(value: string, title: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.add({ title, color: 'success' })
    } catch {
      toast.add({ title: t('common.copyFailed'), color: 'error' })
    }
  }
}
