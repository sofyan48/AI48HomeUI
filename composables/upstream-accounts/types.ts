import type { useAdminI18n } from '~/composables/useAdminI18n'
import type { useApi } from '~/composables/useApi'
import type { useCapabilities } from '~/composables/useCapabilities'
import type { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import type { useQuotaCollection } from '~/composables/useQuotaCollection'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { QuotaCollectionEntry, quotaWindowAmount } from '~/composables/upstreamQuota'
import type { credentialModelCards } from '~/composables/credentialModelCards'
import type { createAccountFormat } from './format'
import type { useAccountBusy } from './useAccountBusy'
import type { useAccountData } from './useAccountData'
import type { useAccountDetailsState } from './useAccountDetailsState'
import type { useAccountQuota } from './useAccountQuota'
import type { useAccountPolicy } from './useAccountPolicy'
import type { useAccountFields } from './useAccountFields'
import type { useAccountModels } from './useAccountModels'
import type { useAccountRecovery } from './useAccountRecovery'
import type { useConnectivity } from './useConnectivity'
import type { useCredentialUpload } from './useCredentialUpload'
import type { useAccountList } from './useAccountList'

export type AccountCredential = {
  id: string
  name?: string
  auth_index?: string
  label?: string
  email?: string
  provider?: string
  type?: string
  source?: string
  account?: string
  prefix?: string
  proxy_url?: string
  priority?: number | null
  weight?: number | null
  'request-retry'?: number | null
  'disable-cooling'?: boolean | null
  note?: string
  disabled?: boolean
  unavailable?: boolean
  status?: string
  websockets?: boolean | string
  using_api?: boolean | string
  path?: string
  size?: number
  mod_time?: string
  updated_at?: string
  last_refresh?: string
}
export type CredentialList = AccountCredential[] | { files?: AccountCredential[]; credentials?: AccountCredential[]; items?: AccountCredential[] }
export type QuotaWindow = Parameters<typeof quotaWindowAmount>[1] & { remaining?: number | null; limit?: number | null }
export type AccountQuotaEntry = QuotaCollectionEntry & { primary_windows?: QuotaWindow[]; windows?: QuotaWindow[] }
export type AccountQuotaDetail = {
  credential?: AccountQuotaEntry
  windows?: QuotaWindow[]
  collection?: { error?: { code?: string; message?: string; upstream_status_code?: number } | null }
  reset_credits?: { available_count?: number | null; observed_at?: string; credits?: { status: string; expires_at?: string }[] }
}
export type FlightSummary = { credential_id: string; in_flight?: number; [key: string]: unknown }
export type FlightDetails = {
  items?: { request_id: string; model?: string; request_kind?: string; started_at?: string }[]
  snapshot_cursor?: string
  stale?: boolean
  details_truncated?: boolean
  coverage_complete?: boolean
  observed_at?: string
  total?: number
  next_offset?: number | null
}
export type ConcurrencyPolicy = { credential_id: string; version: number; max_in_flight?: number | null; max_in_flight_by_model?: Record<string, number> }
export type PolicyPatch = { version?: number; max_in_flight?: number | null; max_in_flight_by_model?: Record<string, number> }
export type ConcurrencyState = {
  credential_id: string
  admitted_in_flight?: number
  max_in_flight?: number | null
  total_saturated?: boolean
  remaining?: number | null
  policy_version?: number
  fully_enforced?: string | number
  models?: { model: string; admitted_in_flight?: number; max_in_flight?: number; saturated?: boolean }[]
}
export type RuntimeModel = Parameters<typeof credentialModelCards>[1][number] & {
  [key: string]: unknown
}
export type ModelStates = { credential?: { credential_id: string; models?: RuntimeModel[] }; credentials?: { credential_id: string; models?: RuntimeModel[] }[] }
export type AccountFields = { prefix: string; proxy_url: string; priority: string; weight: string; request_retry: string; note: string; websockets: boolean; using_api: boolean; disable_cooling: string; enabled: boolean }
export type FieldsPatch = PolicyPatch & { id: string; weight?: number | null; excluded_models?: string[]; [key: string]: string | number | boolean | null | string[] | Record<string, number> | undefined }
export type UploadErrorCode = 'notJson' | 'emptyFile' | 'invalidJson' | 'unauthorized' | 'network' | 'unsupported' | 'server'
export type UploadItem = { id: string; file: File; status: 'queued' | 'uploading' | 'success' | 'error'; progress: number; resultName: string | null; errorCode: UploadErrorCode | null }
export type UploadResponse = { files?: string[]; name?: string; message?: string; error?: string }
export type VertexResult = { status?: string; project_id?: string; email?: string; location?: string; 'auth-file'?: string }
export type OAuthSession = { url: string; state: string; status: string; code: string; redirect_url: string; callback_error: string; error?: string }
export type OAuthStatus = { status?: string; error?: string }
export type ResetCreditAttempt = { credentialId: string; id: string }
export type ConnectivityResult = { status_code: number; body?: string }

export type AccountBase = Pick<ReturnType<typeof useAdminI18n>, 't' | 'intlLocale'> &
  Pick<ReturnType<typeof useApi>, 'fetchAPI' | 'resolveUrl' | 'token'> & {
    supports: ReturnType<typeof useCapabilities>['supports']
    toast: ReturnType<typeof useAdminToast>
    route: RouteLocationNormalizedLoaded
    props: { attentionRequest: number; syncRequest: number }
    emit: (event: 'changed') => void
    quotaCollection: ReturnType<typeof useQuotaCollection>
  }
export type AccountFormat = ReturnType<typeof createAccountFormat>
export type AccountShared = AccountBase & AccountFormat & ReturnType<typeof useAccountBusy> & ReturnType<typeof useAccountData> & ReturnType<typeof useAccountDetailsState>
export type AccountDetailsContext = AccountShared & ReturnType<typeof useAccountQuota> & ReturnType<typeof useAccountPolicy> & ReturnType<typeof useAccountFields> & ReturnType<typeof useAccountModels> & ReturnType<typeof useAccountRecovery> & ReturnType<typeof useConnectivity> & ReturnType<typeof useAccountList>

/** Catch values are unknown; expose only the fields used by the existing API error fallbacks. */
export function accountError(error: unknown) {
  return error as { statusCode?: number; code?: string; message?: string; data?: { message?: string; error?: string } } | null | undefined
}
