import { inject, provide, type InjectionKey } from 'vue'
import { useAdminI18n, useApi, useCapabilities, useRoute, useToast } from '#imports'
import { useQuotaCollection } from '~/composables/useQuotaCollection'
import { supportsCredentialWebsockets, supportsCredentialUsingAPI } from '~/composables/credentialTransport'
import { ALL_FILTER, createAccountFormat } from './format'
import { useAccountBusy } from './useAccountBusy'
import { useAccountData } from './useAccountData'
import { useAccountDetailsState } from './useAccountDetailsState'
import { useAccountQuota } from './useAccountQuota'
import { useResetCredit } from './useResetCredit'
import { useAccountPolicy } from './useAccountPolicy'
import { useAccountFields } from './useAccountFields'
import { useAccountModels } from './useAccountModels'
import { useAccountRecovery } from './useAccountRecovery'
import { useConnectivity } from './useConnectivity'
import { useCredentialUpload } from './useCredentialUpload'
import { useOAuthFlow } from './useOAuthFlow'
import { useAccountList } from './useAccountList'
import { useAccountDetails } from './useAccountDetails'

type AccountsProps = { attentionRequest: number; syncRequest: number }
type AccountsEmit = (event: 'changed') => void

/**
 * Shared state for the upstream accounts panel (components/admin/upstream-accounts/UpstreamAccounts.vue).
 *
 * The entry component calls `provideUpstreamAccounts()` once; sections and dialogs call
 * `useUpstreamAccounts()`. Every workspace key is created here, exactly once per owner.
 */
function createUpstreamAccounts(props: AccountsProps, emit: AccountsEmit) {
  const quotaCollection = useQuotaCollection()
  const { fetchAPI, resolveUrl, token } = useApi()
  const { supports } = useCapabilities()
  const toast = useToast()
  const { t, intlLocale } = useAdminI18n()
  const route = useRoute()
  const base = { t, intlLocale, fetchAPI, resolveUrl, token, supports, toast, route, props, emit, quotaCollection }

  const format = createAccountFormat({ t, intlLocale })
  const busyState = useAccountBusy()
  const data = useAccountData({ ...base, ...format })
  const detailsState = useAccountDetailsState({ t })
  const shared = { ...base, ...format, ...busyState, ...data, ...detailsState }
  const quota = useAccountQuota(shared)
  const resetCredit = useResetCredit({ ...shared, ...quota })
  const policy = useAccountPolicy(shared)
  const fields = useAccountFields({ ...shared, ...policy })
  const models = useAccountModels(shared)
  const recovery = useAccountRecovery({ ...shared, ...fields, ...models })
  const connectivity = useConnectivity(shared)
  const upload = useCredentialUpload(shared)
  const oauth = useOAuthFlow({ ...shared, ...upload })
  const list = useAccountList(shared)
  const workspace = {
    ...shared, ...quota, ...resetCredit, ...policy, ...fields, ...models, ...recovery, ...connectivity, ...upload, ...oauth, ...list,
    ALL_FILTER, supportsWebsockets: supportsCredentialWebsockets, supportsUsingAPI: supportsCredentialUsingAPI
  }
  return { ...workspace, ...useAccountDetails(workspace) }
}

const upstreamAccountsKey: InjectionKey<ReturnType<typeof createUpstreamAccounts>> = Symbol('upstream-accounts')

export function provideUpstreamAccounts(props: AccountsProps, emit: AccountsEmit) {
  const workspace = createUpstreamAccounts(props, emit)
  provide(upstreamAccountsKey, workspace)
  return workspace
}

export function useUpstreamAccounts() {
  const workspace = inject(upstreamAccountsKey)
  if (!workspace) throw new Error('Upstream accounts workspace is not provided')
  return workspace
}
