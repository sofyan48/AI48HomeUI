import { computed, inject, onScopeDispose, provide, ref, watch, type InjectionKey } from 'vue'
import { useApi, useAdminI18n } from '#imports'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useCapabilities } from '~/composables/useCapabilities'
import { datesForRange } from '~/composables/usage/useUsageFilters'
import { useOrganizationCredentialScopes } from './useOrganizationCredentialScopes'
import { useOrganizationKeyForm } from './useOrganizationKeyForm'
import { memberLimitsBody, memberLimitsFromRecord } from './memberLimits'
import { memberAccessBody, memberAccessFromRecord } from './memberAccess'
import type { MemberResetPolicy } from './memberResetAllowance'
import {
  emptyMemberForm, emptyOrganizationForm, isOrganizationsUnsupported, organizationErrorMessage,
  type MemberForm, type Organization, type OrganizationAPIKey, type OrganizationCharge, type OrganizationDetailTab,
  type OrganizationForm, type OrganizationMember,
  type OrganizationModelGroupOption, type OrganizationUserOption,
} from './types'

const chargesPageSize = 20

function createOrganizationsWorkspace() {
  const { fetchAPI } = useApi()
  const { t } = useAdminI18n()
  const toast = useAdminToast()
  const { capabilities } = useCapabilities()
  const memberResetSupported = computed(() => capabilities.value.organization_member_reset_allowance === true)

  async function updateMemberReset(userId: number, signal: AbortSignal, policy?: MemberResetPolicy) {
    const org = selected.value
    if (!org || !memberResetSupported.value) return
    const path = `/organizations/${org.id}/members/${userId}`
    const response = policy
      ? await fetchAPI<{ member: OrganizationMember }>(`${path}/reset-allowance`, { method: 'PUT', body: policy, signal })
      : await fetchAPI<{ member: OrganizationMember }>(`${path}/period-limits/reset`, { method: 'POST', signal })
    if (signal.aborted || selected.value?.id !== org.id) return
    selected.value.members = selected.value.members?.map(member => member.user_id === userId ? { ...member, ...response.member } : member)
  }

  const loading = useWorkspaceState<boolean>('admin:organizations:loading', () => false)
  const unsupported = useWorkspaceState<boolean>('admin:organizations:unsupported', () => false)
  const errorMessage = useWorkspaceState<string>('admin:organizations:errorMessage', () => '')
  const organizations = useWorkspaceState<Organization[]>('admin:organizations:list', () => [])

  // Transient detail and form state stays local to the mounted page.
  const selected = ref<Organization | null>(null)
  const selectedKeys = ref<OrganizationAPIKey[]>([])
  const detailLoading = ref(false)
  const detailError = ref('')
  const detailTab = ref<OrganizationDetailTab>('overview')

  // Organization charges load lazily when the Charges tab opens.
  const charges = ref<OrganizationCharge[]>([])
  const chargesTotal = ref(0)
  const chargesPage = ref(1)
  const chargesLoading = ref(false)
  const chargesError = ref('')
  const chargesLoadedFor = ref<number | null>(null)
  // Shared by the charges table and the usage summary so both show the same scope.
  const chargesFilter = ref<{ range: string, member: string }>({ range: '30d', member: '' })
  let chargesVersion = 0

  function chargesScopeQuery(orgId: number) {
    const { from, to } = datesForRange(chargesFilter.value.range)
    const query: Record<string, string | number> = { user_id: orgId }
    if (from) query.from = from
    if (to) query.to = to
    if (chargesFilter.value.member) query.actor_user_id = chargesFilter.value.member
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone) query.timezone = timezone
    return query
  }

  async function loadCharges(page = chargesPage.value) {
    const org = selected.value
    if (!org) return
    const version = ++chargesVersion
    chargesPage.value = page
    chargesLoading.value = true
    chargesError.value = ''
    try {
      const response = await fetchAPI<{ items: OrganizationCharge[], total?: number }>('/billing/charges', {
        query: { ...chargesScopeQuery(org.id), limit: chargesPageSize, offset: (Math.max(1, page) - 1) * chargesPageSize },
      })
      if (version !== chargesVersion || selected.value?.id !== org.id) return
      charges.value = Array.isArray(response.items) ? response.items : []
      chargesTotal.value = typeof response.total === 'number' ? response.total : charges.value.length
      chargesLoadedFor.value = org.id
    } catch (error) {
      if (version === chargesVersion) chargesError.value = organizationErrorMessage(error, t('organizations.charges.loadFailed'))
    } finally {
      if (version === chargesVersion) chargesLoading.value = false
    }
  }

  function setDetailTab(tab: OrganizationDetailTab) {
    detailTab.value = tab
    if (tab === 'charges' && chargesLoadedFor.value !== selected.value?.id) void loadCharges(1)
  }

  const orgFormOpen = ref(false)
  const orgForm = ref<OrganizationForm>(emptyOrganizationForm())
  const orgFormError = ref('')
  const orgSaving = ref(false)
  const editingOrg = ref<Organization | null>(null)
  const orgFormLoading = ref(false)
  const orgFormLoadError = ref('')
  const credentialScopes = useOrganizationCredentialScopes(fetchAPI, orgForm, t)
  const orgSubmitDisabled = computed(() => orgSaving.value || orgFormLoading.value || Boolean(orgFormLoadError.value)
    || credentialScopes.scopesLoading.value || !credentialScopes.scopesLoaded.value || Boolean(credentialScopes.scopesError.value))
  let orgFormVersion = 0
  let orgFormController: AbortController | undefined
  const invalidateOrgForm = () => { orgFormVersion++; orgFormController?.abort() }
  watch(orgFormOpen, open => { if (!open) invalidateOrgForm() }, { flush: 'sync' })
  onScopeDispose(invalidateOrgForm)

  const memberFormOpen = ref(false)
  const memberForm = ref<MemberForm>(emptyMemberForm())
  const memberFormError = ref('')
  const memberSaving = ref(false)
  const editingMember = ref<OrganizationMember | null>(null)

  const deleteTarget = ref<{ kind: 'org' | 'member' | 'key', label: string, run: () => Promise<void> } | null>(null)
  const deleting = ref(false)
  const deleteError = ref('')

  // Personal users for the owner/member search dropdowns. Loaded lazily when a form opens.
  const users = ref<OrganizationUserOption[]>([])
  const usersLoading = ref(false)
  const usersLoaded = ref(false)
  const userOptions = computed(() => users.value.map(user => ({ value: user.id, label: user.username, description: `#${user.id}`, keywords: String(user.id) })))
  // Members already in the selected organization cannot be added twice.
  const memberUserOptions = computed(() => {
    const existing = new Set((selected.value?.members || []).map(member => member.user_id))
    return userOptions.value.map(option => ({ ...option, disabled: existing.has(option.value) }))
  })

  // Model groups for the organization form checkboxes. Loaded lazily when the form opens.
  const modelGroups = ref<OrganizationModelGroupOption[]>([])
  const modelGroupsLoading = ref(false)
  const modelGroupsLoaded = ref(false)
  const modelGroupsError = ref('')
  // Disabled groups are only listed while the organization still uses them, so they can be unchecked.
  const modelGroupOptions = computed(() => modelGroups.value.filter(group => !group.disabled || orgForm.value.modelGroups.includes(group.id)))
  // Member subsets must stay inside the organization scope (or any enabled group when unrestricted).
  const memberModelGroupOptions = computed(() => {
    const scope = selected.value?.model_groups || []
    const chosen = memberForm.value.access.modelGroups
    return modelGroups.value.filter(group => (scope.length ? scope.includes(group.id) : !group.disabled) || chosen.includes(group.id))
  })

  async function loadModelGroups(force = false) {
    if (modelGroupsLoading.value || (modelGroupsLoaded.value && !force)) return
    modelGroupsLoading.value = true
    modelGroupsError.value = ''
    try {
      const response = await fetchAPI<{ model_groups: Array<{ id: number, group_name: string, disabled?: boolean, deleted_at?: string | null }> }>('/model-groups')
      modelGroups.value = (Array.isArray(response.model_groups) ? response.model_groups : [])
        .filter(group => !group.deleted_at)
        .map(group => ({ id: group.id, name: group.group_name || t('organizations.unnamedModelGroup'), disabled: Boolean(group.disabled) }))
      modelGroupsLoaded.value = true
    } catch (error) {
      modelGroupsError.value = organizationErrorMessage(error, t('organizations.modelGroupsLoadFailed'))
    } finally {
      modelGroupsLoading.value = false
    }
  }

  const modelGroupName = (id: number) => modelGroups.value.find(group => group.id === id)?.name || t('organizations.unknownModelGroup')

  function toggleModelGroup(id: number, checked: boolean) {
    const current = orgForm.value.modelGroups.filter(item => item !== id)
    orgForm.value.modelGroups = checked ? [...current, id].sort((a, b) => a - b) : current
  }

  async function loadUsers(force = false) {
    if (usersLoading.value || (usersLoaded.value && !force)) return
    usersLoading.value = true
    try {
      const response = await fetchAPI<{ users: Array<OrganizationUserOption & { approval_pending?: boolean, deleted_at?: string | null }> }>('/users')
      users.value = (Array.isArray(response.users) ? response.users : [])
        .filter(user => !user.approval_pending && !user.deleted_at)
        .map(user => ({ id: user.id, username: user.username }))
      usersLoaded.value = true
    } catch (error) {
      toast.add({ title: t('organizations.usersLoadFailed'), description: organizationErrorMessage(error, ''), color: 'error' })
    } finally {
      usersLoading.value = false
    }
  }

  async function loadAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      const response = await fetchAPI<{ organizations: Organization[] }>('/organizations')
      unsupported.value = false
      organizations.value = Array.isArray(response.organizations) ? response.organizations : []
    } catch (error) {
      if (isOrganizationsUnsupported(error)) unsupported.value = true
      else errorMessage.value = organizationErrorMessage(error, t('organizations.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  async function loadDetail(id: number) {
    detailLoading.value = true
    detailError.value = ''
    try {
      const [orgResponse, keysResponse] = await Promise.all([
        fetchAPI<{ organization: Organization }>(`/organizations/${id}`),
        fetchAPI<{ api_keys: OrganizationAPIKey[] }>(`/organizations/${id}/api-keys`),
      ])
      selected.value = orgResponse.organization
      selectedKeys.value = Array.isArray(keysResponse.api_keys) ? keysResponse.api_keys : []
    } catch (error) {
      if (isOrganizationsUnsupported(error)) unsupported.value = true
      detailError.value = organizationErrorMessage(error, t('organizations.loadFailed'))
    } finally {
      detailLoading.value = false
    }
  }

  // Loads the dedicated detail page for one organization id.
  async function openDetail(id: number, tab: OrganizationDetailTab = 'overview') {
    const sameOrg = selected.value?.id === id
    if (!sameOrg) {
      selected.value = organizations.value.find(org => org.id === id) ?? null
      selectedKeys.value = []
      chargesFilter.value = { range: '30d', member: '' }
    }
    chargesVersion++
    charges.value = []
    chargesTotal.value = 0
    chargesPage.value = 1
    chargesError.value = ''
    chargesLoading.value = false
    chargesLoadedFor.value = null
    detailTab.value = tab
    await Promise.all([loadDetail(id), loadModelGroups(), credentialScopes.loadCredentialScopes()])
    if (selected.value?.id === id) setDetailTab(detailTab.value)
  }

  function openCreateOrg() {
    if (orgSaving.value) return
    invalidateOrgForm()
    orgFormLoading.value = false
    orgFormLoadError.value = ''
    editingOrg.value = null
    orgForm.value = emptyOrganizationForm()
    orgFormError.value = ''
    orgFormOpen.value = true
    void loadUsers()
    void loadModelGroups()
    void credentialScopes.loadCredentialScopes()
  }

  function openEditOrg(org: Organization) {
    if (orgSaving.value) return
    invalidateOrgForm()
    editingOrg.value = org
    orgForm.value = {
      name: org.name, credits: String(org.credits ?? ''), ownerUserId: null,
      modelGroups: [...(org.model_groups || [])], channelGroups: [...(org.channel_groups || [])], allowMemberKeys: org.allow_member_keys !== false,
    }
    orgFormError.value = ''
    orgFormOpen.value = true
    void loadModelGroups()
    void credentialScopes.loadCredentialScopes()
    void reloadOrgForm()
  }

  async function reloadOrgForm() {
    const id = editingOrg.value?.id
    if (!id) return
    invalidateOrgForm()
    const version = orgFormVersion
    orgFormController = new AbortController()
    orgFormLoading.value = true
    orgFormLoadError.value = ''
    try {
      const response = await fetchAPI<{ organization: Organization }>(`/organizations/${id}`, { signal: orgFormController.signal })
      if (version !== orgFormVersion || !orgFormOpen.value) return
      const org = response.organization
      if (!org || org.id !== id) throw new Error(t('organizations.loadFailed'))
      editingOrg.value = org
      orgForm.value = {
        name: org.name, credits: String(org.credits ?? ''), ownerUserId: null,
        modelGroups: [...(org.model_groups || [])], channelGroups: [...(org.channel_groups || [])], allowMemberKeys: org.allow_member_keys !== false,
      }
    } catch (error) {
      if (version === orgFormVersion) orgFormLoadError.value = organizationErrorMessage(error, t('organizations.loadFailed'))
    } finally {
      if (version === orgFormVersion) orgFormLoading.value = false
    }
  }

  async function saveOrg() {
    if (orgSubmitDisabled.value) return
    const form = orgForm.value
    const editing = editingOrg.value
    if (!form.name.trim()) { orgFormError.value = t('organizations.error.name'); return }
    const body: Record<string, unknown> = { name: form.name.trim() }
    if (form.credits.trim() !== '') {
      const credits = Number(form.credits)
      if (!Number.isFinite(credits)) { orgFormError.value = t('organizations.error.credits'); return }
      body.credits = credits
    }
    if (form.modelGroups.length || editing) body.model_groups = [...form.modelGroups]
    // Do not introduce an empty scope field when older Home responses omit it.
    if (form.channelGroups.length || editing?.channel_groups !== undefined) body.channel_groups = [...form.channelGroups]
    if (!editing && form.ownerUserId !== null) body.owner_user_id = form.ownerUserId
    // Older Home builds omit the flag; only send it when it is known or changed.
    if (editing ? form.allowMemberKeys !== (editing.allow_member_keys !== false) : !form.allowMemberKeys) body.allow_member_keys = form.allowMemberKeys
    orgSaving.value = true
    orgFormError.value = ''
    try {
      if (editing) await fetchAPI(`/organizations/${editing.id}`, { method: 'PATCH', body })
      else await fetchAPI('/organizations', { method: 'POST', body })
      orgFormOpen.value = false
      toast.add({ title: editing ? t('organizations.updated') : t('organizations.created'), color: 'success' })
      await loadAll()
      if (editing && selected.value?.id === editing.id) await loadDetail(editing.id)
    } catch (error) {
      orgFormError.value = organizationErrorMessage(error, t('organizations.saveFailed'))
    } finally {
      orgSaving.value = false
    }
  }

  function openAddMember() {
    editingMember.value = null
    memberForm.value = emptyMemberForm()
    memberFormError.value = ''
    memberFormOpen.value = true
    void loadUsers()
    void loadModelGroups()
  }

  function openEditMember(member: OrganizationMember) {
    editingMember.value = member
    memberForm.value = { username: member.username, role: member.role, limits: memberLimitsFromRecord(member), access: memberAccessFromRecord(member) }
    memberFormError.value = ''
    memberFormOpen.value = true
    void loadModelGroups()
  }

  async function saveMember() {
    const org = selected.value
    if (!org || memberSaving.value) return
    const form = memberForm.value
    const editing = editingMember.value
    if (!editing && !form.username.trim()) { memberFormError.value = t('organizations.error.username'); return }
    const limits = memberLimitsBody(form.limits, org)
    if (!limits.ok) {
      memberFormError.value = limits.reason === 'exceeds'
        ? t('organizations.error.limitExceedsOrg', { window: limits.window, cap: limits.cap })
        : t('organizations.error.limit')
      return
    }
    const access = memberAccessBody(form.access)
    if (!access.ok) { memberFormError.value = t('organizations.error.maxKeys'); return }
    const body: Record<string, unknown> = { role: form.role, ...limits.body, ...access.body }
    if (!editing) body.username = form.username.trim()
    memberSaving.value = true
    memberFormError.value = ''
    try {
      if (editing) await fetchAPI(`/organizations/${org.id}/members/${editing.user_id}`, { method: 'PATCH', body })
      else await fetchAPI(`/organizations/${org.id}/members`, { method: 'POST', body })
      memberFormOpen.value = false
      toast.add({ title: editing ? t('organizations.member.updated') : t('organizations.member.added'), color: 'success' })
      await Promise.all([loadDetail(org.id), loadAll()])
    } catch (error) {
      memberFormError.value = organizationErrorMessage(error, t('organizations.member.saveFailed'))
    } finally {
      memberSaving.value = false
    }
  }

  const keyForm = useOrganizationKeyForm({ fetchAPI, t, toast, selected, supports: useCapabilities().supports, reload: loadDetail })

  function askDelete(kind: 'org' | 'member' | 'key', label: string, run: () => Promise<void>) {
    deleteError.value = ''
    deleteTarget.value = { kind, label, run }
  }

  function askDeleteOrg(org: Organization, afterDelete?: () => void) {
    askDelete('org', org.name, async () => {
      await fetchAPI(`/organizations/${org.id}`, { method: 'DELETE' })
      if (selected.value?.id === org.id) selected.value = null
      afterDelete?.()
      await loadAll()
    })
  }

  function askRemoveMember(member: OrganizationMember) {
    const org = selected.value
    if (!org) return
    askDelete('member', member.username, async () => {
      await fetchAPI(`/organizations/${org.id}/members/${member.user_id}`, { method: 'DELETE' })
      await Promise.all([loadDetail(org.id), loadAll()])
    })
  }

  function askDeleteKey(key: OrganizationAPIKey) {
    const org = selected.value
    if (!org) return
    askDelete('key', key.display_name || `#${key.id}`, async () => {
      await fetchAPI(`/organizations/${org.id}/api-keys/${key.id}`, { method: 'DELETE' })
      await loadDetail(org.id)
    })
  }

  async function confirmDelete() {
    const target = deleteTarget.value
    if (!target || deleting.value) return
    deleting.value = true
    deleteError.value = ''
    try {
      await target.run()
      deleteTarget.value = null
      toast.add({ title: t('organizations.deleted'), color: 'success' })
    } catch (error) {
      deleteError.value = organizationErrorMessage(error, t('organizations.deleteFailed'))
    } finally {
      deleting.value = false
    }
  }

  return {
    t, loading, unsupported, errorMessage, organizations, memberResetSupported, updateMemberReset,
    selected, selectedKeys, detailLoading, detailError, openDetail, detailTab, setDetailTab,
    charges, chargesTotal, chargesPage, chargesLoading, chargesError, chargesPageSize, loadCharges, chargesFilter, chargesScopeQuery,
    orgFormOpen, orgForm, orgFormError, orgSaving, editingOrg, openCreateOrg, openEditOrg, saveOrg,
    orgFormLoading, orgFormLoadError, orgSubmitDisabled, reloadOrgForm, ...credentialScopes,
    memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, openAddMember, openEditMember, saveMember,
    ...keyForm, userOptions, memberUserOptions, usersLoading, loadUsers,
    modelGroupOptions, memberModelGroupOptions, modelGroupsLoading, modelGroupsError, loadModelGroups, toggleModelGroup, modelGroupName,
    deleteTarget, deleting, deleteError, askDeleteOrg, askRemoveMember, askDeleteKey, confirmDelete,
    loadAll,
  }
}

const organizationsWorkspaceKey: InjectionKey<ReturnType<typeof createOrganizationsWorkspace>> = Symbol('organizations-workspace')

export function provideOrganizationsWorkspace() {
  // Created once in the page scope so child sections share the same workspace generation.
  const workspace = createOrganizationsWorkspace()
  provide(organizationsWorkspaceKey, workspace)
  return workspace
}

export function useOrganizationsWorkspace() {
  const workspace = inject(organizationsWorkspaceKey)
  if (!workspace) throw new Error('Organizations workspace is not provided')
  return workspace
}
