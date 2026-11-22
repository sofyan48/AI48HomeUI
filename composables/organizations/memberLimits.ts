// Member spend-limit form helpers shared by the admin and portal organization screens.
// Mirrors Home's member limit fields: limit_<window>_credits and window_mode_<window>.

export const memberLimitWindows = ['5h', '1d', '7d', '30d'] as const
export type MemberLimitWindow = typeof memberLimitWindows[number]
export type MemberWindowMode = 'sliding' | 'first_use' | 'calendar'

export interface MemberLimitDraft {
  limit: string
  mode: MemberWindowMode
}

export type MemberLimitsForm = Record<MemberLimitWindow, MemberLimitDraft>

/** Limit fields as returned by Home for a member or an organization. */
export type MemberLimitRecord = Partial<Record<`limit_${MemberLimitWindow}_credits`, number | null>>
  & Partial<Record<`window_mode_${MemberLimitWindow}`, string>>

/** Home's default member mode; older members only supported rolling windows. */
export const defaultMemberWindowMode: MemberWindowMode = 'sliding'

/** Calendar windows do not exist for 5 hours. */
export function memberWindowModes(window: MemberLimitWindow): MemberWindowMode[] {
  return window === '5h' ? ['sliding', 'first_use'] : ['sliding', 'first_use', 'calendar']
}

function normalizeMode(window: MemberLimitWindow, value: unknown): MemberWindowMode {
  return memberWindowModes(window).includes(value as MemberWindowMode) ? value as MemberWindowMode : defaultMemberWindowMode
}

export function emptyMemberLimits(): MemberLimitsForm {
  return Object.fromEntries(memberLimitWindows.map(window => [window, { limit: '', mode: defaultMemberWindowMode }])) as MemberLimitsForm
}

export function memberLimitsFromRecord(record: MemberLimitRecord): MemberLimitsForm {
  return Object.fromEntries(memberLimitWindows.map((window) => {
    const limit = record[`limit_${window}_credits`]
    return [window, { limit: limit === null || limit === undefined ? '' : String(limit), mode: normalizeMode(window, record[`window_mode_${window}`]) }]
  })) as MemberLimitsForm
}

export type MemberLimitsBodyResult =
  | { ok: true, body: Record<string, number | string | null> }
  | { ok: false, reason: 'invalid', window: MemberLimitWindow }
  | { ok: false, reason: 'exceeds', window: MemberLimitWindow, cap: number }

/**
 * Builds the request body. Empty input means "no limit". A member limit above
 * the organization limit for the same window is rejected, matching Home.
 */
export function memberLimitsBody(form: MemberLimitsForm, organization?: MemberLimitRecord | null): MemberLimitsBodyResult {
  const body: Record<string, number | string | null> = {}
  for (const window of memberLimitWindows) {
    const raw = form[window].limit.trim()
    let value: number | null = null
    if (raw !== '') {
      value = Number(raw)
      if (!Number.isFinite(value) || value < 0) return { ok: false, reason: 'invalid', window }
      const cap = organization?.[`limit_${window}_credits`]
      if (typeof cap === 'number' && value > cap) return { ok: false, reason: 'exceeds', window, cap }
    }
    body[`limit_${window}_credits`] = value
    body[`window_mode_${window}`] = normalizeMode(window, form[window].mode)
  }
  return { ok: true, body }
}

/** Compact "5h 2 · 1d ∞ …" summary of the enabled member limits. */
export function memberLimitsSummary(record: MemberLimitRecord, noLimit: string): string {
  const parts = memberLimitWindows
    .map(window => ({ window, limit: record[`limit_${window}_credits`] }))
    .filter(item => item.limit !== null && item.limit !== undefined)
    .map(item => `${item.window} ${item.limit}`)
  return parts.length ? parts.join(' · ') : noLimit
}
