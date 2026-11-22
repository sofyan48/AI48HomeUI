// Contracts for Home's /user/organizations endpoints (see AI48Home docs/ai48home/user/api.md).
import { emptyMemberLimits, type MemberLimitRecord, type MemberLimitWindow, type MemberLimitsForm } from '~/composables/organizations/memberLimits'
import { emptyMemberAccess, type MemberAccessForm, type MemberAccessRecord } from '~/composables/organizations/memberAccess'

export type PortalOrgRole = 'owner' | 'member'

export interface PortalOrgMembership {
  id: number
  name: string
  role: PortalOrgRole
}

export interface PortalSpendWindow {
  id: MemberLimitWindow
  limit: number | null
  used: number
  remaining: number | null
  /** Absent on older Home builds, which only had rolling windows. */
  mode?: string
  active?: boolean
  reset_at?: string | null
}

export interface PortalOrgSummary {
  id: number
  name: string
  role: PortalOrgRole
  spend_limits: PortalSpendWindow[]
  credits?: number
  credits_unlimited?: boolean
  /** Older Home builds omit these and always allow member keys. */
  allow_member_keys?: boolean
  can_create_keys?: boolean
  /** Owner only: organization caps that member limits must stay within. */
  organization_limits?: MemberLimitRecord
  /** Owner only: groups that may be assigned to members. */
  model_group_options?: Array<{ id: number, name: string }>
}

export interface PortalOrgMember extends MemberLimitRecord, MemberAccessRecord {
  user_id: number
  username: string
  role: PortalOrgRole
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
  limits: MemberLimitsForm
  access: MemberAccessForm
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

export const emptyPortalMemberForm = (): PortalMemberForm => ({ username: '', role: 'member', limits: emptyMemberLimits(), access: emptyMemberAccess() })
