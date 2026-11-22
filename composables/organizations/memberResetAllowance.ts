import type { MemberLimitRecord, MemberLimitWindow } from './memberLimits'

export interface MemberResetAllowance {
  mode: 'one_time' | 'monthly' | 'none'
  amount: number
  available: number
  expires_at?: string | null
  renews_at?: string | null
}

export interface MemberSpendWindow {
  id: MemberLimitWindow
  limit: number | null
  used: number
  remaining: number | null
  mode?: string
  active?: boolean
  reset_at?: string | null
}

export interface MemberResetRecord extends MemberLimitRecord {
  user_id: number
  reset_allowance?: MemberResetAllowance
  spend_windows?: MemberSpendWindow[]
}

export interface MemberResetPolicy {
  mode: 'one_time' | 'monthly'
  amount: number
  expires_at?: string
}

export function memberResetPolicy(mode: string, amount: string, expiry: string, now = Date.now()):
  { ok: true, body: MemberResetPolicy } | { ok: false, field: 'amount' | 'expiry' } {
  const count = Number(amount)
  if (!amount.trim() || !Number.isSafeInteger(count) || count < 0 || (mode !== 'one_time' && mode !== 'monthly')) {
    return { ok: false, field: 'amount' }
  }
  const body: MemberResetPolicy = { mode, amount: count }
  if (mode === 'one_time' && expiry) {
    const date = new Date(expiry)
    if (!Number.isFinite(date.getTime()) || date.getTime() <= now) return { ok: false, field: 'expiry' }
    body.expires_at = date.toISOString()
  }
  return { ok: true, body }
}

export function memberHasResetWindows(member: MemberResetRecord): boolean {
  if (member.spend_windows) return member.spend_windows.some(window => window.limit !== null)
  return [member.limit_5h_credits, member.limit_1d_credits, member.limit_7d_credits, member.limit_30d_credits]
    .some(limit => typeof limit === 'number')
}

export function memberCanReset(member: MemberResetRecord, now = Date.now()): boolean {
  const allowance = member.reset_allowance
  if (!allowance || allowance.available <= 0 || !memberHasResetWindows(member)) return false
  return !allowance.expires_at || new Date(allowance.expires_at).getTime() > now
}

export function localResetExpiry(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
