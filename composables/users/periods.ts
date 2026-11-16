// Period-limit windows and the user form model.
import type { AnyRecord } from './common'

export const periodWindowIds = ['5h', '1d', '7d', '30d'] as const
export type PeriodWindowId = typeof periodWindowIds[number]

export const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const fallbackTimezones = [
  'UTC', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura',
  'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles'
]

export const timezoneOptions: string[] = (() => {
  const sorted = (values: string[]) => [...new Set(values)].filter(Boolean).sort((left, right) => left.localeCompare(right))
  try {
    const supported = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
    return sorted(['UTC', deviceTimezone, ...supported, ...fallbackTimezones])
  } catch {
    return sorted([deviceTimezone, ...fallbackTimezones])
  }
})()

export type PeriodForm = { enabled: boolean; limit: string; mode: string }
export type UserForm = {
  username: string
  password: string
  credits: string
  credits_unlimited: boolean
  timezone: string
  week_reset_day: number
  week_reset_hour: number
  periods: Record<PeriodWindowId, PeriodForm>
}

export const newPeriods = () => Object.fromEntries(
  periodWindowIds.map(id => [id, { enabled: false, limit: '0', mode: 'first_use' }])
) as Record<PeriodWindowId, PeriodForm>

export const emptyUserForm = (): UserForm => ({
  username: '',
  password: '',
  credits: '0',
  credits_unlimited: false,
  timezone: deviceTimezone,
  week_reset_day: 1,
  week_reset_hour: 0,
  periods: newPeriods()
})

export function userToForm(user: AnyRecord): UserForm {
  const form = emptyUserForm()
  form.username = user.username || ''
  form.credits = String(user.credits ?? 0)
  form.credits_unlimited = !!user.credits_unlimited
  form.timezone = user.timezone || 'Asia/Shanghai'
  form.week_reset_day = Number(user.week_reset_day ?? 1)
  form.week_reset_hour = Number(user.week_reset_hour ?? 0)
  for (const id of periodWindowIds) {
    const limit = user[`limit_${id}_credits`]
    form.periods[id] = { enabled: limit != null, limit: String(limit ?? 0), mode: user[`window_mode_${id}`] || 'first_use' }
  }
  return form
}

export function periodWindowList(periods: AnyRecord | null | undefined): AnyRecord[] {
  return periods?.windows || periods?.limits?.windows || []
}

export function findPeriodWindow(periods: AnyRecord | null | undefined, id: string): AnyRecord | undefined {
  return periodWindowList(periods).find(window => (window.id || window.window) === id)
}
