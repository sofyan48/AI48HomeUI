// Contracts for Home's /v8/management/organizations endpoints (see AI48Home docs/ai48home/management/api.md).
import { emptyMemberLimits, type MemberLimitRecord, type MemberLimitsForm } from './memberLimits'
import { emptyMemberAccess, type MemberAccessForm, type MemberAccessRecord } from './memberAccess'
import type { MemberResetRecord } from './memberResetAllowance'

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
  /** Omitted by older Home builds; an empty array means unrestricted. */
  channel_groups?: number[]
  /** Missing on older Home builds, which always allow member keys. */
  allow_member_keys?: boolean
  member_count?: number
  owners?: string[]
  members?: OrganizationMember[]
  pending_topup?: { id: number, amount: number, note: string } | null
  created_at: string
}

export interface OrganizationMember extends MemberLimitRecord, MemberAccessRecord, MemberResetRecord {
  user_id: number
  username: string
  role: OrganizationRole
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

/** Charge row from GET /billing/charges?user_id=<organization>. */
export interface OrganizationCharge {
  id: string
  created_at: string
  provider: string
  model: string
  amount: number
  actor_user_id?: number | null
  api_key_label?: string
  input_tokens?: number
  output_tokens?: number
}

export type OrganizationDetailTab = 'overview' | 'members' | 'keys' | 'charges'
export const organizationDetailTabs: OrganizationDetailTab[] = ['overview', 'members', 'keys', 'charges']

export interface OrganizationForm {
  name: string
  credits: string
  ownerUserId: number | null
  modelGroups: number[]
  channelGroups: number[]
  allowMemberKeys: boolean
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
  limits: MemberLimitsForm
  access: MemberAccessForm
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

export const emptyOrganizationForm = (): OrganizationForm => ({ name: '', credits: '', ownerUserId: null, modelGroups: [], channelGroups: [], allowMemberKeys: true })
export const emptyMemberForm = (): MemberForm => ({ username: '', role: 'member', limits: emptyMemberLimits(), access: emptyMemberAccess() })
