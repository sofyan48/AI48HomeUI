import { computed, onScopeDispose, ref, watch } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import {
  organizationEndpointMissing, organizationScopeBody, organizationScopeOptions,
  readOrganizationDetail, readOrganizations, type Organization
} from '~/composables/users/organizations'

export function useOrganizations() {
  const { fetchAPI, t, toast, errorMessage, accessGroupsSupported, channelOptions, users, loading: usersLoading } = useUsersWorkspace()
  const organizations = useWorkspaceState<Organization[]>('admin:users:organizations', () => [])
  const loading = ref(false)
  const loaded = ref(false)
  const unavailable = ref(false)
  const loadError = ref('')
  const open = ref(false)
  const editing = ref<Organization | null>(null)
  const detailLoading = ref(false)
  const saving = ref(false)
  const formError = ref('')
  const name = ref('')
  const ownerId = ref(0)
  const selected = ref<number[]>([])
  const detailReady = ref(false)
  const detailScopeSupported = ref(false)
  let disposed = false
  let listController: AbortController | undefined
  let formController: AbortController | undefined

  // Empty lists cannot prove field support on an older runtime. Create without the field,
  // inspect the response, then offer editing instead of sending an unverified field.
  const createScopeSupported = computed(() => organizations.value.length > 0
    && organizations.value.every(org => org.channel_groups !== undefined))
  const scopeSupported = computed(() => accessGroupsSupported.value
    && (editing.value ? detailScopeSupported.value : createScopeSupported.value))
  const canSubmit = computed(() => loaded.value && !loading.value && !unavailable.value && !loadError.value
    && !detailLoading.value && !saving.value && (!editing.value || (detailReady.value && scopeSupported.value)))
  const scopeOptions = computed(() => organizationScopeOptions(channelOptions.value, selected.value))
  const ownerOptions = computed(() => [
    { value: 0, label: t('users.organizationNoOwner') },
    ...users.value.filter(user => !user.deleted_at && user.kind !== 'organization')
      .map(user => ({ value: Number(user.id), label: String(user.username) }))
  ])

  async function reload() {
    listController?.abort()
    const controller = new AbortController()
    listController = controller
    loading.value = true
    loadError.value = ''
    unavailable.value = false
    try {
      const response = await fetchAPI<unknown>('/organizations', { signal: controller.signal })
      if (disposed || controller.signal.aborted) return
      organizations.value = readOrganizations(response)
      loaded.value = true
    } catch (error) {
      if (disposed || controller.signal.aborted) return
      organizations.value = []
      loaded.value = false
      unavailable.value = organizationEndpointMissing(error)
      if (!unavailable.value) loadError.value = errorMessage(error)
    } finally {
      if (!disposed && listController === controller) loading.value = false
    }
  }

  function resetForm(org: Organization | null) {
    if (saving.value) return false
    formController?.abort()
    editing.value = org
    name.value = org?.name ?? ''
    ownerId.value = 0
    selected.value = []
    formError.value = ''
    detailReady.value = false
    detailScopeSupported.value = false
    detailLoading.value = false
    open.value = true
    return true
  }

  function openCreate() {
    if (loaded.value && !unavailable.value && !loadError.value) resetForm(null)
  }

  async function loadDetail() {
    const org = editing.value
    if (!org || saving.value) return
    formController?.abort()
    const controller = new AbortController()
    formController = controller
    detailLoading.value = true
    detailReady.value = false
    formError.value = ''
    try {
      const response = await fetchAPI<unknown>(`/organizations/${org.id}`, { signal: controller.signal })
      if (disposed || controller.signal.aborted) return
      const detail = readOrganizationDetail(response)
      if (detail.id !== org.id) throw new Error('Invalid organization response')
      selected.value = [...(detail.channel_groups ?? [])]
      detailScopeSupported.value = detail.channel_groups !== undefined
      detailReady.value = true
    } catch (error) {
      if (!disposed && !controller.signal.aborted) formError.value = errorMessage(error)
    } finally {
      if (!disposed && formController === controller) detailLoading.value = false
    }
  }

  async function openEdit(org: Organization) {
    if (accessGroupsSupported.value && resetForm(org)) await loadDetail()
  }

  function toggleScope(id: number) {
    if (saving.value || detailLoading.value || !scopeSupported.value) return
    selected.value = selected.value.includes(id) ? selected.value.filter(value => value !== id) : [...selected.value, id]
  }

  async function submit() {
    if (!canSubmit.value) return
    formError.value = ''
    if (!editing.value && !name.value.trim()) {
      formError.value = t('users.organizationNameRequired')
      return
    }
    const org = editing.value
    const body = org
      ? organizationScopeBody(selected.value, scopeSupported.value)
      : {
          name: name.value.trim(),
          ...(ownerId.value > 0 ? { owner_user_id: ownerId.value } : {}),
          ...(scopeSupported.value ? organizationScopeBody(selected.value, true) : {})
        }
    const controller = new AbortController()
    formController?.abort()
    formController = controller
    saving.value = true
    try {
      const response = await fetchAPI<unknown>(org ? `/organizations/${org.id}` : '/organizations', {
        method: org ? 'PATCH' : 'POST', body, signal: controller.signal
      })
      if (disposed || controller.signal.aborted) return
      const saved = readOrganizationDetail(response)
      open.value = false
      toast.add({ title: org ? t('users.organizationScopeSaved') : t('users.organizationCreated'), color: 'success' })
      await reload()
      if (disposed || controller.signal.aborted) return
      // A first creation establishes support even if the immediate list reload failed.
      if (!org && !('channel_groups' in body) && accessGroupsSupported.value && saved.channel_groups !== undefined) {
        saving.value = false
        await openEdit(saved)
      }
    } catch (error) {
      if (!disposed && !controller.signal.aborted) formError.value = errorMessage(error)
    } finally {
      if (!disposed && formController === controller) saving.value = false
    }
  }

  watch(open, (value) => {
    if (!value && !saving.value) {
      formController?.abort()
      detailLoading.value = false
    }
  })
  watch(accessGroupsSupported, () => {
    if (!saving.value) {
      open.value = false
      formController?.abort()
    }
  })
  onScopeDispose(() => {
    disposed = true
    listController?.abort()
    formController?.abort()
  })

  return {
    organizations, loading, loaded, unavailable, loadError, reload,
    open, editing, detailLoading, saving, formError, name, ownerId, selected,
    detailReady, scopeSupported, canSubmit, scopeOptions, ownerOptions, usersLoading,
    openCreate, openEdit, loadDetail, toggleScope, submit
  }
}
