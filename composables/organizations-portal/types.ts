// Contracts for Home's /user/organizations endpoints (see AI48Home docs/user/api.md).

export type PortalOrgRole = 'owner' | 'member'

export interface PortalOrgMembership {
  id: number
  name: string
  role: PortalOrgRole
}

export interface PortalSpendWindow {
  id: '1d' | '7d' | '30d'
  limit: number | null
  used: number
  remaining: number | null
}

export interface PortalOrgSummary {
  id: number
  name: string
  role: PortalOrgRole
  spend_limits: PortalSpendWindow[]
  credits?: number
  credits_unlimited?: boolean
}

export interface PortalOrgMember {
  user_id: number
  username: string
  role: PortalOrgRole
  limit_1d_credits: number | null
  limit_7d_credits: number | null
  limit_30d_credits: number | null
  spend_30d: number
  requests_30d: number
}

export interface PortalOrgKey {
  id: number
  api_key: string
  display_name: string | null
  created_by_user_id: number | null
  created_at: string
}

export interface PortalOrgCharge {
  id: string
  created_at: string
  model: string
  amount: number
  actor_user_id: number | null
  api_key_label: string
}

export interface PortalMemberForm {
  username: string
  role: PortalOrgRole
  limit1d: string
  limit7d: string
  limit30d: string
}

interface ApiFailure { statusCode?: number, status?: number, message?: string, data?: { error?: string, message?: string } }

export function portalOrgError(error: unknown, fallback: string): string {
  const failure = (error ?? {}) as ApiFailure
  return failure.data?.message || failure.data?.error || failure.message || fallback
}

export function isPortalOrgUnsupported(error: unknown): boolean {
  const failure = (error ?? {}) as ApiFailure
  return failure.statusCode === 404 || failure.status === 404
}

/** Empty means "no limit"; anything else must be a non-negative number. */
export function parsePortalLimit(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

export const emptyPortalMemberForm = (): PortalMemberForm => ({ username: '', role: 'member', limit1d: '', limit7d: '', limit30d: '' })
