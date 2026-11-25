import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import {
  isPlainObject,
  normalizeGroups,
  normalizeResource,

  selectAPIKeyEntries,
  type AccessKeyGroup,
  type AccessKeyResource,
  type AccessKeyUser,
} from '~/composables/access-keys/normalize'

import { keyOwnerName, loadKeyOwnerOrganizations, normalizeKeyOwners } from '~/composables/users/keyOwners'

export type AccessKeySheetMode = 'detail' | 'create' | 'edit'

/**
 * Shared state for the admin access keys page (/admin/access-keys).
 *
 * The page calls `provideAccessKeys()` once; sections and dialogs call `useAccessKeys()`.
 * Workspace refs must be created exactly once per page owner, so children never call
 * `useWorkspaceState` for these keys themselves.
 */
function createAccessKeys() {
  const { fetchAPI, fetchRaw } = useApi()
  const { supports } = useCapabilities()
  const toast = useAdminToast()
  const { t } = useAdminI18n()

  const loading = useWorkspaceState('admin:access-keys:loading', () => (false))
  const hasLoaded = useWorkspaceState('admin:access-keys:hasLoaded', () => (false))
  const primaryError = useWorkspaceState('admin:access-keys:primaryError', () => (""))
  const resources = useWorkspaceState<AccessKeyResource[]>('admin:access-keys:resources', () => ([]))
  const users = useWorkspaceState<AccessKeyUser[]>('admin:access-keys:users', () => ([]))
  const channelGroups = useWorkspaceState<AccessKeyGroup[]>('admin:access-keys:channelGroups', () => ([]))
  const modelGroups = useWorkspaceState<AccessKeyGroup[]>('admin:access-keys:modelGroups', () => ([]))
  const supportsDisplayNames = useWorkspaceState('admin:access-keys:supportsDisplayNames', () => (true))
  const submitting = useWorkspaceState('admin:access-keys:submitting', () => (false))
  const supplementalError = useWorkspaceState('admin:access-keys:supplementalError', () => (""))
  const deleting = useWorkspaceState('admin:access-keys:deleting', () => (false))
  const bulkDeleting = useWorkspaceState('admin:access-keys:bulkDeleting', () => (false))

  const search = ref("")
  const selectedIDs = ref(new Set<string>())

  // The detail sheet is closed or re-pointed by sync, delete and list replacement.
  const detailOpen = ref(false)
  const sheetMode = ref<AccessKeySheetMode>("detail")
  const selectedResource = ref<AccessKeyResource | null>(null)

  function ownerName(resource: AccessKeyResource) {
    return keyOwnerName(resource.userId, users.value, t('keys.unassigned'))
  }

  function groupName(id: number, groups: AccessKeyGroup[]) {
    return groups.find((group) => group.id === id)?.name || String(id)
  }

  function credentialScope(resource: AccessKeyResource) {
    return resource.channelGroupIds.length
      ? resource.channelGroupIds
          .map((id) => groupName(id, channelGroups.value))
          .join(", ")
      : t('keys.unrestricted')
  }

  function modelScope(resource: AccessKeyResource) {
    return resource.modelGroupIds.length
      ? resource.modelGroupIds
          .map((id) => groupName(id, modelGroups.value))
          .join(", ")
      : t('keys.unrestricted')
  }

  function resourceSummary(resource: AccessKeyResource) {
    const identity = resource.identifier
      ? `${resource.identifier} · ${resource.maskedValue}`
      : resource.maskedValue
    return resource.displayName
      ? `${resource.displayName} · ${identity}`
      : identity
  }

  function errorMessage(error: unknown) {
    const message = (error as { message?: unknown } | null)?.message
    return typeof message === "string" && message.trim()
      ? message
      : t('keys.requestFailed')
  }

  function showErrorToast(error: unknown) {
    toast.add({ title: errorMessage(error), color: "error" })
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.add({ title: successMessage, color: "success" })
    } catch (error) {
      showErrorToast(error)
    }
  }

  const filteredResources = computed(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) return resources.value
    return resources.value.filter((resource) =>
      [
        resource.value,
        resource.maskedValue,
        resource.identifier ?? "",
        resource.displayName ?? "",
        resource.prefix,
        resource.suffix,
        String(resource.index),
        resource.userId == null || resource.userId === 0
          ? ""
          : ownerName(resource),
        credentialScope(resource),
        modelScope(resource),
      ].some((value) => String(value).toLowerCase().includes(query)),
    )
  })

  const selectedResources = computed(() =>
    resources.value.filter((resource) => selectedIDs.value.has(resource.id)),
  )

  function toggleSelected(resource: AccessKeyResource, checked: boolean) {
    const next = new Set(selectedIDs.value)
    if (checked) next.add(resource.id)
    else next.delete(resource.id)
    selectedIDs.value = next
  }

  function toggleAllFiltered(checked: boolean) {
    const next = new Set(selectedIDs.value)
    for (const resource of filteredResources.value) {
      if (checked) next.add(resource.id)
      else next.delete(resource.id)
    }
    selectedIDs.value = next
  }

  function clearSelection() {
    selectedIDs.value = new Set()
  }

  async function loadPrimary() {
    const response = await fetchRaw("/access/api-keys")
    const payload = response._data
    const entries = selectAPIKeyEntries(payload)
    resources.value = entries
      .map(normalizeResource)
      .filter((resource) => resource.value)
    supportsDisplayNames.value =
      entries.length === 0 ||
      entries.some(
        (entry) =>
          isPlainObject(entry) &&
          Object.prototype.hasOwnProperty.call(entry, "display_name"),
      )
  }

  async function supplementalRequest(path: string) {
    try {
      return await fetchAPI(path)
    } catch {
      supplementalError.value = "Some owner or group metadata could not be loaded."
      return null
    }
  }

  async function loadSupplemental() {
    supplementalError.value = ""
    const tasks: Promise<unknown>[] = []
    let usersIndex = -1
    let organizationsIndex = -1
    let channelGroupsIndex = -1
    let modelGroupsIndex = -1

    if (supports("users", true)) {
      usersIndex = tasks.length
      tasks.push(supplementalRequest("/users"))
      organizationsIndex = tasks.length
      tasks.push(loadKeyOwnerOrganizations(() => fetchAPI('/organizations')).catch(() => {
        supplementalError.value = 'Some owner or group metadata could not be loaded.'
        return null
      }))
    }

    if (supports("access_groups", true)) {
      channelGroupsIndex = tasks.length
      tasks.push(supplementalRequest("/channel-groups"))

      modelGroupsIndex = tasks.length
      tasks.push(supplementalRequest("/model-groups"))
    }

    const results = await Promise.all(tasks)
    users.value = normalizeKeyOwners(results[usersIndex], results[organizationsIndex])
    channelGroups.value =
      channelGroupsIndex >= 0
        ? normalizeGroups(results[channelGroupsIndex], "channel")
        : []
    modelGroups.value =
      modelGroupsIndex >= 0
        ? normalizeGroups(results[modelGroupsIndex], "model")
        : []
  }

  async function syncData() {
    loading.value = true
    primaryError.value = ""
    try {
      await loadPrimary()
      await loadSupplemental()
      const validIDs = new Set(resources.value.map((resource) => resource.id))
      selectedIDs.value = new Set(
        [...selectedIDs.value].filter((id) => validIDs.has(id)),
      )
      if (selectedResource.value)
        selectedResource.value =
          resources.value.find(
            (resource) => resource.id === selectedResource.value?.id,
          ) ?? null
      hasLoaded.value = true
    } catch (error) {
      resources.value = []
      users.value = []
      channelGroups.value = []
      modelGroups.value = []

      primaryError.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function handleListReplaced() {
    detailOpen.value = false
    selectedResource.value = null
    clearSelection()
    await syncData()
  }

  return {
    fetchAPI, supports, toast, t,
    loading, hasLoaded, primaryError, resources, users, channelGroups, modelGroups,
    supportsDisplayNames, submitting, supplementalError, deleting, bulkDeleting,
    search, selectedIDs, detailOpen, sheetMode, selectedResource,
    filteredResources, selectedResources,
    ownerName, credentialScope, modelScope, resourceSummary,
    errorMessage, showErrorToast, copyText,
    toggleSelected, toggleAllFiltered, clearSelection,
    syncData, handleListReplaced,
  }
}

export type AccessKeysState = ReturnType<typeof createAccessKeys>

const accessKeysKey: InjectionKey<AccessKeysState> = Symbol('admin-access-keys')

export function provideAccessKeys(): AccessKeysState {
  const state = createAccessKeys()
  provide(accessKeysKey, state)
  return state
}

export function useAccessKeys(): AccessKeysState {
  const state = inject(accessKeysKey)
  if (!state) throw new Error('useAccessKeys() must be used inside pages/admin/access-keys.vue')
  return state
}
