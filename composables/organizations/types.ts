// Contracts for Home's /v8/management/organizations endpoints (see AI48Home docs/management/api.md).

export type OrganizationRole = 'owner' | 'member'

export interface Organization {
  id: number
  name: string
  credits: number
  credits_unlimited: boolean
  billing_multiplier: number | null
  limit_5h_credits: number | null
  limit_1d_credits: number | null
  limit_7d_credits: number | null
  limit_30d_credits: number | null
  model_groups: number[]
  member_count?: number
  owners?: string[]
  members?: OrganizationMember[]
  pending_topup?: { id: number, amount: number, note: string } | null
  created_at: string
}

export interface OrganizationMember {
  user_id: number
  username: string
  role: OrganizationRole
  limit_1d_credits: number | null
  limit_7d_credits: number | null
  limit_30d_credits: number | null
  spend_30d: number
  requests_30d: number
  created_at: string
}

export interface OrganizationAPIKey {
  id: number
  api_key: string
  display_name: string | null
  created_by_user_id: number | null
  created_at: string
}

export interface OrganizationForm {
  name: string
  credits: string
  ownerUserId: number | null
  modelGroups: number[]
}

/** Model group offered as a checkbox in the organization form. */
export interface OrganizationModelGroupOption {
  id: number
  name: string
  disabled: boolean
}

/** Personal user offered by the owner/member search dropdowns. */
export interface OrganizationUserOption {
  id: number
  username: string
  email?: string | null
}

export interface MemberForm {
  username: string
  role: OrganizationRole
  limit1d: string
  limit7d: string
  limit30d: string
}

export interface ApiFailure {
  statusCode?: number
  status?: number
  message?: string
  data?: { error?: string, message?: string }
}

export function organizationErrorMessage(error: unknown, fallback: string): string {
  const failure = (error ?? {}) as ApiFailure
  return failure.data?.message || failure.data?.error || failure.message || fallback
}

/** Home builds without organizations answer 404 on these routes. */
export function isOrganizationsUnsupported(error: unknown): boolean {
  const failure = (error ?? {}) as ApiFailure
  return failure.statusCode === 404 || failure.status === 404
}

/** Empty input means "no limit"; otherwise a non-negative number is required. */
export function parseOptionalLimit(raw: string): { ok: true, value: number | null } | { ok: false } {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return { ok: false }
  return { ok: true, value }
}


export function limitText(value: number | null | undefined): string {
  return value === null || value === undefined ? '∞' : String(value)
}

export const emptyOrganizationForm = (): OrganizationForm => ({ name: '', credits: '', ownerUserId: null, modelGroups: [] })
export const emptyMemberForm = (): MemberForm => ({ username: '', role: 'member', limit1d: '', limit7d: '', limit30d: '' })
