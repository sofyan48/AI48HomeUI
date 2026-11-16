// Pure helpers shared by the admin users workspace. No Vue state lives here.

export type AnyRecord = Record<string, any>

/** Parses "1.234,5" and "1,234.5" style input; returns NaN for empty input. */
export function parseLocalizedNumber(value: unknown): number {
  const input = String(value ?? '').trim().replace(/\s/g, '')
  if (!input) return Number.NaN
  const lastComma = input.lastIndexOf(',')
  const lastDot = input.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const groupingSeparator = decimalSeparator === ',' ? '.' : ','
    return Number(input.split(groupingSeparator).join('').replace(decimalSeparator, '.'))
  }
  return Number(input.replace(',', '.'))
}

export function maskKey(value: unknown): string {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length <= 10 ? `${text.slice(0, 2)}***` : `${text.slice(0, 6)}...${text.slice(-4)}`
}

export function generateSecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `sk-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`
}

/** Adds or removes a numeric id in place (used by checkbox pickers bound to arrays). */
export function toggleId(target: number[], id: unknown) {
  const value = Number(id)
  const index = target.indexOf(value)
  if (index >= 0) target.splice(index, 1)
  else target.push(value)
}

export function uniquePositiveIds(values: unknown[] = []): number[] {
  return [...new Set(values.map(Number).filter(id => Number.isInteger(id) && id > 0))]
}

export function isOperableUser(user: AnyRecord | null | undefined): boolean {
  return Boolean(user && !user.deleted_at && Number.isFinite(Number(user.id)))
}

export function apiErrorMessage(error: any, fallback: string): string {
  return error?.data?.message
    || error?.data?.error
    || error?.response?._data?.message
    || error?.response?._data?.error
    || error?.message
    || fallback
}

export function apiFieldErrors(error: any): Array<{ field: string; message: string }> {
  return error?.data?.field_errors
    || error?.data?.fieldErrors
    || error?.response?._data?.field_errors
    || error?.response?._data?.fieldErrors
    || []
}

/** Returns the first truthy value found under the given keys, falling back to an empty list. */
export function listFrom(value: any, keys: string[]): any[] {
  for (const key of keys) if (value?.[key]) return value[key]
  return []
}

export function periodWindows(user: AnyRecord): string[] {
  return user.period_limits_summary?.enabled_windows || user.periodLimitsSummary?.enabledWindows || []
}

export function zeroPeriodWindows(user: AnyRecord): string[] {
  return user.period_limits_summary?.zero_limit_windows || user.periodLimitsSummary?.zeroLimitWindows || []
}
