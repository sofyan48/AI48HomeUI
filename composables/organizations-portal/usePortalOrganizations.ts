import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalToast } from '~/composables/portal/usePortalToast'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import {
  emptyPortalMemberForm, isPortalOrgUnsupported, parsePortalLimit, portalOrgError,
  type PortalMemberForm, type PortalOrgCharge, type PortalOrgKey, type PortalOrgMember, type PortalOrgMembership, type PortalOrgSummary,
} from './types'

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
      fetchAPI<{ items: PortalOrgCharge[] }>(`${base.value}/billing/charges`, { query: { limit: 20 } }),
    ])
    summary.value = summaryResponse.organization
    keys.value = Array.isArray(keysResponse.api_keys) ? keysResponse.api_keys : []
    charges.value = Array.isArray(chargesResponse.items) ? chargesResponse.items : []
    members.value = []
    if (summary.value?.role === 'owner') {
      const membersResponse = await fetchAPI<{ members: PortalOrgMember[] }>(`${base.value}/members`)
      members.value = Array.isArray(membersResponse.members) ? membersResponse.members : []
    }
  }

  async function selectOrganization(id: number) {
    selectedId.value = id
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
      ? {
          username: member.username, role: member.role,
          limit1d: member.limit_1d_credits === null ? '' : String(member.limit_1d_credits),
          limit7d: member.limit_7d_credits === null ? '' : String(member.limit_7d_credits),
          limit30d: member.limit_30d_credits === null ? '' : String(member.limit_30d_credits),
        }
      : emptyPortalMemberForm()
    memberFormError.value = ''
    memberFormOpen.value = true
  }

  async function saveMember() {
    if (!base.value || memberSaving.value) return
    const form = memberForm.value
    const editing = editingMember.value
    if (!editing && !form.username.trim()) { memberFormError.value = t('org.errorUsername'); return }
    const limits = [parsePortalLimit(form.limit1d), parsePortalLimit(form.limit7d), parsePortalLimit(form.limit30d)]
    if (limits.some(limit => limit === undefined)) { memberFormError.value = t('org.errorLimit'); return }
    const body: Record<string, unknown> = { role: form.role, limit_1d_credits: limits[0], limit_7d_credits: limits[1], limit_30d_credits: limits[2] }
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
    memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, keyName, keyCreating, createdKey, pendingAction,
    loadMemberships, selectOrganization, createKey, deleteKey, removeMember, leaveOrganization, openMemberForm, saveMember,
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
