import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalToast } from '~/composables/portal/usePortalToast'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { memberLimitsBody, memberLimitsFromRecord } from '~/composables/organizations/memberLimits'
import { memberAccessBody, memberAccessFromRecord } from '~/composables/organizations/memberAccess'
import {
  emptyPortalMemberForm, isPortalOrgUnsupported, portalOrgError,
  type PortalMemberForm, type PortalOrgCharge, type PortalOrgKey, type PortalOrgMember, type PortalOrgMembership, type PortalOrgSummary,
} from './types'

const chargesPageSize = 20

function createPortalOrganizations() {
  const { t } = usePortalI18n()
  const toast = usePortalToast()
  const { fetchAPI } = useUserApi()

  const memberships = useWorkspaceState<PortalOrgMembership[]>('user:organizations:memberships', () => [])
  const selectedId = useWorkspaceState<number | null>('user:organizations:selected', () => null)
  const summary = useWorkspaceState<PortalOrgSummary | null>('user:organizations:summary', () => null)
  const keys = useWorkspaceState<PortalOrgKey[]>('user:organizations:keys', () => [])
  const members = useWorkspaceState<PortalOrgMember[]>('user:organizations:members', () => [])
  const charges = useWorkspaceState<PortalOrgCharge[]>('user:organizations:charges', () => [])
  const chargesTotal = useWorkspaceState<number>('user:organizations:chargesTotal', () => 0)
  const chargesPage = useWorkspaceState<number>('user:organizations:chargesPage', () => 1)
  const chargesLoading = ref(false)
  const loading = useWorkspaceState<boolean>('user:organizations:loading', () => false)
  const unsupported = useWorkspaceState<boolean>('user:organizations:unsupported', () => false)
  const loadError = useWorkspaceState<string>('user:organizations:error', () => '')

  // Transient forms stay local to the mounted page.
  const memberFormOpen = ref(false)
  const memberForm = ref<PortalMemberForm>(emptyPortalMemberForm())
  const memberFormError = ref('')
  const memberSaving = ref(false)
  const editingMember = ref<PortalOrgMember | null>(null)
  const keyName = ref('')
  const keyCreating = ref(false)
  const createdKey = ref<string>('')
  const pendingAction = ref<string | null>(null)

  const isOwner = computed(() => summary.value?.role === 'owner')
  // Older Home builds omit can_create_keys and always allow member keys.
  const canCreateKeys = computed(() => summary.value?.can_create_keys !== false)
  const memberKeysAllowed = computed(() => summary.value?.allow_member_keys !== false)
  const settingsSupported = computed(() => typeof summary.value?.allow_member_keys === 'boolean')
  // Older Home builds omit the options; the member scope editor is hidden then.
  const modelGroupOptions = computed(() => summary.value?.model_group_options)
  const modelGroupName = (id: number) => modelGroupOptions.value?.find(group => group.id === id)?.name || t('org.unknownModelGroup')
  const base = computed(() => (selectedId.value ? `/organizations/${selectedId.value}` : ''))
  const memberName = (id: number | null) => {
    if (id === null) return t('org.adminKey')
    return members.value.find(member => member.user_id === id)?.username || `#${id}`
  }

  async function loadMemberships() {
    loading.value = true
    loadError.value = ''
    try {
      const response = await fetchAPI<{ organizations: PortalOrgMembership[] }>('/organizations')
      unsupported.value = false
      memberships.value = Array.isArray(response.organizations) ? response.organizations : []
      if (!memberships.value.some(item => item.id === selectedId.value)) selectedId.value = memberships.value[0]?.id ?? null
      if (selectedId.value) await loadSelected()
    } catch (error) {
      if (isPortalOrgUnsupported(error)) unsupported.value = true
      else loadError.value = portalOrgError(error, t('org.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  async function loadSelected() {
    if (!base.value) return
    const [summaryResponse, keysResponse, chargesResponse] = await Promise.all([
      fetchAPI<{ organization: PortalOrgSummary }>(base.value),
      fetchAPI<{ api_keys: PortalOrgKey[] }>(`${base.value}/api-keys`),
      fetchCharges(chargesPage.value),
    ])
    summary.value = summaryResponse.organization
    keys.value = Array.isArray(keysResponse.api_keys) ? keysResponse.api_keys : []
    applyCharges(chargesResponse)
    members.value = []
    if (summary.value?.role === 'owner') {
      const membersResponse = await fetchAPI<{ members: PortalOrgMember[] }>(`${base.value}/members`)
      members.value = Array.isArray(membersResponse.members) ? membersResponse.members : []
    }
  }

  function fetchCharges(page: number) {
    return fetchAPI<{ items: PortalOrgCharge[], total?: number }>(`${base.value}/billing/charges`, {
      query: { limit: chargesPageSize, offset: (Math.max(1, page) - 1) * chargesPageSize },
    })
  }

  function applyCharges(response: { items: PortalOrgCharge[], total?: number }) {
    charges.value = Array.isArray(response.items) ? response.items : []
    chargesTotal.value = typeof response.total === 'number' ? response.total : charges.value.length
  }

  // Version guard: a slow page response must not overwrite a newer page.
  let chargesVersion = 0
  async function loadChargesPage(page: number) {
    if (!base.value) return
    const version = ++chargesVersion
    chargesPage.value = page
    chargesLoading.value = true
    try {
      const response = await fetchCharges(page)
      if (version === chargesVersion) applyCharges(response)
    } catch (error) {
      if (version === chargesVersion) toast.add({ title: t('org.chargesLoadFailed'), description: portalOrgError(error, ''), color: 'error' })
    } finally {
      if (version === chargesVersion) chargesLoading.value = false
    }
  }

  async function selectOrganization(id: number) {
    selectedId.value = id
    chargesPage.value = 1
    createdKey.value = ''
    loading.value = true
    try {
      await loadSelected()
    } catch (error) {
      loadError.value = portalOrgError(error, t('org.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  async function createKey() {
    if (!base.value || keyCreating.value) return
    keyCreating.value = true
    try {
      const name = keyName.value.trim()
      const response = await fetchAPI<{ api_key: PortalOrgKey }>(`${base.value}/api-keys`, { method: 'POST', body: name ? { display_name: name } : {} })
      createdKey.value = response.api_key?.api_key || ''
      keyName.value = ''
      toast.add({ title: t('org.keyCreated'), color: 'success' })
      await loadSelected()
    } catch (error) {
      toast.add({ title: t('org.keyCreateFailed'), description: portalOrgError(error, ''), color: 'error' })
    } finally {
      keyCreating.value = false
    }
  }

  async function runAction(id: string, action: () => Promise<unknown>, success: string, failure: string) {
    if (pendingAction.value) return
    pendingAction.value = id
    try {
      await action()
      toast.add({ title: success, color: 'success' })
      await loadSelected()
    } catch (error) {
      toast.add({ title: failure, description: portalOrgError(error, ''), color: 'error' })
    } finally {
      pendingAction.value = null
    }
  }

  const setMemberKeysAllowed = (allowed: boolean) => runAction('settings',
    () => fetchAPI(base.value, { method: 'PATCH', body: { allow_member_keys: allowed } }), t('org.settingsSaved'), t('org.settingsFailed'))

  const createKeyForMember = (member: PortalOrgMember) => runAction(`issue:${member.user_id}`,
    async () => {
      const response = await fetchAPI<{ api_key: PortalOrgKey }>(`${base.value}/api-keys`, { method: 'POST', body: { member_user_id: member.user_id } })
      createdKey.value = response.api_key?.api_key || ''
    }, t('org.keyCreated'), t('org.keyCreateFailed'))

  const deleteKey = (key: PortalOrgKey) => runAction(`key:${key.id}`,
    () => fetchAPI(`${base.value}/api-keys/${key.id}`, { method: 'DELETE', body: {} }), t('org.keyDeleted'), t('org.keyDeleteFailed'))

  const removeMember = (member: PortalOrgMember) => runAction(`member:${member.user_id}`,
    () => fetchAPI(`${base.value}/members/${member.user_id}`, { method: 'DELETE', body: {} }), t('org.memberRemoved'), t('org.memberSaveFailed'))

  async function leaveOrganization(userId: number) {
    if (pendingAction.value || !base.value) return
    pendingAction.value = 'leave'
    try {
      await fetchAPI(`${base.value}/members/${userId}`, { method: 'DELETE', body: {} })
      toast.add({ title: t('org.left'), color: 'success' })
      selectedId.value = null
      await loadMemberships()
    } catch (error) {
      toast.add({ title: t('org.leaveFailed'), description: portalOrgError(error, ''), color: 'error' })
    } finally {
      pendingAction.value = null
    }
  }

  function openMemberForm(member?: PortalOrgMember) {
    editingMember.value = member || null
    memberForm.value = member
      ? { username: member.username, role: member.role, limits: memberLimitsFromRecord(member), access: memberAccessFromRecord(member) }
      : emptyPortalMemberForm()
    memberFormError.value = ''
    memberFormOpen.value = true
  }

  async function saveMember() {
    if (!base.value || memberSaving.value) return
    const form = memberForm.value
    const editing = editingMember.value
    if (!editing && !form.username.trim()) { memberFormError.value = t('org.errorUsername'); return }
    const limits = memberLimitsBody(form.limits, summary.value?.organization_limits)
    if (!limits.ok) {
      memberFormError.value = limits.reason === 'exceeds'
        ? t('org.errorLimitExceedsOrg', { window: limits.window, cap: limits.cap })
        : t('org.errorLimit')
      return
    }
    const access = memberAccessBody(form.access)
    if (!access.ok) { memberFormError.value = t('org.errorMaxKeys'); return }
    const body: Record<string, unknown> = { role: form.role, ...limits.body, max_api_keys: access.body.max_api_keys }
    if (modelGroupOptions.value) body.model_groups = access.body.model_groups
    if (!editing) body.username = form.username.trim()
    memberSaving.value = true
    memberFormError.value = ''
    try {
      if (editing) await fetchAPI(`${base.value}/members/${editing.user_id}`, { method: 'PATCH', body })
      else await fetchAPI(`${base.value}/members`, { method: 'POST', body })
      memberFormOpen.value = false
      toast.add({ title: editing ? t('org.memberUpdated') : t('org.memberAdded'), color: 'success' })
      await loadSelected()
    } catch (error) {
      memberFormError.value = portalOrgError(error, t('org.memberSaveFailed'))
    } finally {
      memberSaving.value = false
    }
  }

  return {
    t, memberships, selectedId, summary, keys, members, charges, loading, unsupported, loadError, isOwner, memberName,
    chargesTotal, chargesPage, chargesLoading, chargesPageSize, loadChargesPage,
    canCreateKeys, memberKeysAllowed, settingsSupported, modelGroupOptions, modelGroupName,
    memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, keyName, keyCreating, createdKey, pendingAction,
    loadMemberships, selectOrganization, createKey, deleteKey, removeMember, leaveOrganization, openMemberForm, saveMember,
    setMemberKeysAllowed, createKeyForMember,
  }
}

const portalOrganizationsKey: InjectionKey<ReturnType<typeof createPortalOrganizations>> = Symbol('portal-organizations')

export function providePortalOrganizations() {
  // Created once in the page scope so child sections share the same workspace generation.
  const workspace = createPortalOrganizations()
  provide(portalOrganizationsKey, workspace)
  return workspace
}

export function usePortalOrganizations() {
  const workspace = inject(portalOrganizationsKey)
  if (!workspace) throw new Error('Portal organizations workspace is not provided')
  return workspace
}
