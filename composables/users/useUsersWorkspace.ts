import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { apiErrorMessage, listFrom, type AnyRecord } from '~/composables/users/common'
import { keyOwnerName, loadKeyOwnerOrganizations, normalizeKeyOwners } from '~/composables/users/keyOwners'
import { useBindingCandidates } from '~/composables/users/useBindingCandidates'
import { keyEntries, normalizeKey } from '~/composables/users/normalize'

/**
 * Shared state for the admin users page (/admin/users).
 *
 * The page calls `provideUsersWorkspace()` once; tabs and dialogs call `useUsersWorkspace()`.
 * Workspace refs must be created exactly once per page owner, so children never call
 * `useWorkspaceState` for these keys themselves.
 */
function createUsersWorkspace() {
  const api = useApi()
  // The users API returns loosely shaped JSON, so callers read fields defensively.
  const fetchAPI = <T = any>(path: string, options?: Parameters<typeof api.fetchAPI>[1]) => api.fetchAPI<T>(path, options)
  const { supports, refreshCapabilities, error: capabilitiesError } = useCapabilities()
  const toast = useAdminToast()
  const { t, intlLocale } = useAdminI18n()

  const loading = useWorkspaceState('admin:users:loading', () => false)
  const saving = useWorkspaceState('admin:users:saving', () => false)
  const pageErrors = useWorkspaceState<string[]>('admin:users:pageErrors', () => [])
  const usersData = useWorkspaceState<AnyRecord[]>('admin:users:usersData', () => [])
  const keyOwnerOrganizations = ref<unknown>(null)
  const keysData = useWorkspaceState<AnyRecord[]>('admin:users:keysData', () => [])
  const channelGroupsData = useWorkspaceState<AnyRecord[]>('admin:users:channelGroupsData', () => [])
  const channelDetailsData = useWorkspaceState<AnyRecord[]>('admin:users:channelDetailsData', () => [])
  const modelGroupsData = useWorkspaceState<AnyRecord[]>('admin:users:modelGroupsData', () => [])
  const modelDetailsData = useWorkspaceState<AnyRecord[]>('admin:users:modelDetailsData', () => [])

  const users = computed(() => usersData.value)
  const keys = computed(() => keysData.value)
  const channelGroups = computed(() => channelGroupsData.value)
  const modelGroups = computed(() => modelGroupsData.value)

  const usersSupported = computed(() => supports('users', true))
  const accessGroupsSupported = computed(() => supports('access_groups', true))
  const periodLimitsSupported = computed(() => supports('user_period_limits', false))
  const modelChannelBindingsSupported = computed(() => supports('model_channel_bindings', false))
  const resetAllowanceSupported = computed(() => supports('user_reset_allowance', false))
  const topupApprovalSupported = computed(() => supports('topup_approval', false))

  // Shared by every tab: switching tabs keeps the query.
  const activeTab = ref<'users' | 'keys' | 'channelGroups' | 'modelGroups' | 'organizations'>('users')
  const userSegment = ref('all')
  const search = ref('')
  const selectedUserIds = ref(new Set<number | string>())
  const approvingUserId = ref<number | string | null>(null)
  const approvingTopupUserId = ref<number | string | null>(null)

  const errorMessage = (error: unknown) => apiErrorMessage(error, t('users.unexpectedError'))
  const formatCredits = (value: unknown) =>
    new Intl.NumberFormat(intlLocale.value, { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(Number(value || 0))
  const formatDate = (value: unknown) => value
    ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value as string))
    : t('users.notReturned')
  const compactFormatter = computed(() => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }))
  const compactNumber = (value: unknown) => Number(value) >= 10000
    ? compactFormatter.value.format(Number(value))
    : new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
  const userStatus = (user: AnyRecord) =>
    user.deleted_at ? t('users.deleted') : user.approval_pending ? t('users.pendingApproval') : t('common.active')
  const periodWindowLabel = (id: string) =>
    ({ '5h': t('users.window5h'), '1d': t('users.window1d'), '7d': t('users.window7d'), '30d': t('users.window30d') } as Record<string, string>)[id]
  const periodModeLabel = (value: string) =>
    value === 'sliding' ? t('users.modeSliding') : value === 'calendar' ? t('users.modeCalendar') : t('users.modeFirstUse')

  const normalize = (value: unknown) => String(value ?? '').toLowerCase()
  const matches = (values: unknown[]) => {
    const query = normalize(search.value).trim()
    return !query || values.some(value => normalize(value).includes(query))
  }

  const keyOwners = computed(() => normalizeKeyOwners(users.value, keyOwnerOrganizations.value))
  const ownerName = (id: number | null | undefined) => keyOwnerName(id, keyOwners.value, t('users.unassigned'))
  const bindingCandidates = useBindingCandidates({ fetchAPI: api.fetchAPI, errorMessage })

  const userById = (id: unknown) => users.value.find(user => Number(user.id) === Number(id))
  const channelName = (id: unknown) => channelGroups.value.find(group => Number(group.id) === Number(id))?.channel_name || `#${id}`
  const modelGroupName = (id: unknown) => modelGroups.value.find(group => Number(group.id) === Number(id))?.group_name || `#${id}`
  const keyChannelNames = (key: AnyRecord): string[] => key.channels.map(channelName)
  const keyModelNames = (key: AnyRecord): string[] => key.model_groups.map(modelGroupName)
  const keysByUser = computed(() => {
    const grouped = new Map<number, AnyRecord[]>()
    for (const key of keys.value) {
      const id = Number(key.user_id)
      if (!grouped.has(id)) grouped.set(id, [])
      grouped.get(id)!.push(key)
    }
    return grouped
  })
  const keysForUser = (id: unknown) => keysByUser.value.get(Number(id)) || []
  const effectiveChannelScopes = (id: unknown) => {
    const owned = keysForUser(id)
    if (!owned.length || owned.some(key => !key.channels.length)) return []
    return [...new Set(owned.flatMap(keyChannelNames))]
  }
  const effectiveModelScopes = (id: unknown) => {
    const owned = keysForUser(id)
    if (!owned.length || owned.some(key => !key.model_groups.length)) return []
    return [...new Set(owned.flatMap(keyModelNames))]
  }
  const scopeSummary = (names: string[]) => names.length ? names.join(', ') : t('users.unrestricted')
  const channelDetailsFor = (id: unknown) =>
    channelDetailsData.value.filter(item => Number(item.channel_group_id) === Number(id) && !item.deleted_at)
  const modelDetailsFor = (id: unknown) =>
    modelDetailsData.value.filter(item => Number(item.model_group_id) === Number(id) && !item.deleted_at)
  const channelOptions = computed(() => channelGroups.value.map(group => ({ label: group.channel_name, value: Number(group.id) })))
  const modelGroupOptions = computed(() => modelGroups.value.map(group => ({ label: group.group_name, value: Number(group.id) })))

  function clearAccessGroups() {
    channelGroupsData.value = []
    channelDetailsData.value = []
    modelGroupsData.value = []
    modelDetailsData.value = []
  }

  async function safeLoad<T>(label: string, request: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await request()
    } catch (error) {
      pageErrors.value.push(`${label}: ${errorMessage(error)}`)
      return fallback
    }
  }

  async function syncAll(notify = false) {
    loading.value = true
    pageErrors.value = []
    try {
      try {
        await refreshCapabilities(true)
      } catch {}
      if (!usersSupported.value) {
        usersData.value = []
        keysData.value = []
        clearAccessGroups()
        return
      }
      const tasks: Promise<void>[] = [
        safeLoad<unknown>(t('users.owner'), () => loadKeyOwnerOrganizations(() => fetchAPI('/organizations')), null).then(value => {
          keyOwnerOrganizations.value = value
        }),
        safeLoad<any>(t('common.users'), () => fetchAPI('/users'), { users: [] }).then((value) => {
          usersData.value = Array.isArray(value) ? value : listFrom(value, ['users', 'items', 'records', 'data'])
        }),
        safeLoad<any>(t('users.clientKeys'), () => fetchAPI('/access/api-keys'), { items: [] }).then((value) => {
          keysData.value = keyEntries(value).map(normalizeKey)
        })
      ]
      if (accessGroupsSupported.value) {
        tasks.push(
          bindingCandidates.loadCredentials(),
          safeLoad<any>(t('users.credentialScopes'), () => fetchAPI('/channel-groups'), { channel_groups: [] }).then((value) => {
            channelGroupsData.value = listFrom(value, ['channel_groups', 'items'])
          }),
          safeLoad<any>(t('users.credentialBindings'), () => fetchAPI('/channel-group-details'), { channel_group_details: [] }).then((value) => {
            channelDetailsData.value = listFrom(value, ['channel_group_details', 'items'])
          }),
          safeLoad<any>(t('users.modelScopes'), () => fetchAPI('/model-groups'), { model_groups: [] }).then((value) => {
            modelGroupsData.value = listFrom(value, ['model_groups', 'items'])
          }),
          safeLoad<any>(t('users.modelBindings'), () => fetchAPI('/model-group-details'), { model_group_details: [] }).then((value) => {
            modelDetailsData.value = listFrom(value, ['model_group_details', 'items'])
          })
        )
      } else {
        clearAccessGroups()
      }
      await Promise.all(tasks)
      if (notify) toast.add({ title: t('users.dataSynchronized'), color: 'success' })
    } finally {
      loading.value = false
    }
  }

  return {
    fetchAPI, toast, t, intlLocale, capabilitiesError,
    loading, saving, pageErrors, activeTab, userSegment, search, selectedUserIds, approvingUserId, approvingTopupUserId,
    usersData, keysData, channelGroupsData, channelDetailsData, modelGroupsData, modelDetailsData,

    users, keys, channelGroups, modelGroups,
    usersSupported, accessGroupsSupported, periodLimitsSupported, modelChannelBindingsSupported,
    resetAllowanceSupported, topupApprovalSupported,
    errorMessage, formatCredits, formatDate, compactNumber, userStatus, periodWindowLabel, periodModeLabel, matches,
    bindingCandidates, ownerName, userById, channelName, modelGroupName, keyChannelNames, keyModelNames, keysForUser,
    effectiveChannelScopes, effectiveModelScopes, scopeSummary, channelDetailsFor, modelDetailsFor,
    channelOptions, modelGroupOptions,
    syncAll
  }
}

export type UsersWorkspace = ReturnType<typeof createUsersWorkspace>

const usersWorkspaceKey: InjectionKey<UsersWorkspace> = Symbol('admin-users-workspace')

export function provideUsersWorkspace(): UsersWorkspace {
  const workspace = createUsersWorkspace()
  provide(usersWorkspaceKey, workspace)
  return workspace
}

export function useUsersWorkspace(): UsersWorkspace {
  const workspace = inject(usersWorkspaceKey)
  if (!workspace) throw new Error('useUsersWorkspace() must be used inside pages/admin/users.vue')
  return workspace
}
