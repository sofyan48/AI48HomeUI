import { computed, ref } from 'vue'
import { errorMessage, type AdminToast, type FetchAPI, type ProviderEditor, type ProviderEntry, type Translate } from './types'
import type { useProviderList } from './useProviderList'
import type { useProviderPayload } from './useProviderPayload'

type ActionsOptions = { t: Translate; fetchAPI: FetchAPI; toast: AdminToast; emit: (event: 'changed') => void; list: ReturnType<typeof useProviderList>; editor: ProviderEditor } & ReturnType<typeof useProviderPayload>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { cloneValue, providerApiPath } from '~/composables/upstream-providers/categories'
import { v8GroupsFromEntries } from '~/composables/upstream-providers/v8Groups'

// Editor open/duplicate/save flows, delete confirmation and row actions.
export function useProviderActions({ t, fetchAPI, toast, emit, list, editor, loadGuidedEntry, guidedEntry }: ActionsOptions) {
  const { selectedProvider, selectedProviderLabel, providerEntries, refreshWorkspace, refreshCategoryStats, providerEntryLabel, safeEndpoint } = list
  const { providerEditorOpen, providerEditorMode, editingProviderEntry, editingProviderIndex, editorError, isCompat, providerKey, supportsWebsockets } = editor
  const savingProvider = useWorkspaceState('admin:upstream-providers:savingProvider', () => (false))
  const deleteOpen = ref(false)
  const deleteTarget = ref<ProviderEntry | null>(null)
  const deleting = useWorkspaceState('admin:upstream-providers:deleting', () => (false))

  const providerRowActions = (entry: ProviderEntry) => [
    { id: 'view', label: t('common.view'), ariaLabel: t('upstream.providers.viewAria'), icon: 'i-tabler-eye', onSelect: () => openProviderDetail(entry) },
    { id: 'edit', label: t('common.edit'), ariaLabel: t('upstream.providers.editAria'), icon: 'i-tabler-pencil', onSelect: () => openProviderEdit(entry) },
    { id: 'duplicate', label: t('upstream.providers.duplicate'), ariaLabel: t('upstream.providers.duplicateAria'), icon: 'i-tabler-copy', onSelect: () => duplicateProvider(entry) },
    { id: 'delete', label: t('common.delete'), ariaLabel: t('upstream.providers.deleteAria'), icon: 'i-tabler-trash', destructive: true, onSelect: () => confirmProviderDelete(entry) }
  ]

  const deleteDescription = computed(() => deleteTarget.value ? t('upstream.providers.deleteDescription', { provider: selectedProviderLabel.value }) : '')
  const providerDetailFields = computed(() => {
    const entry = editingProviderEntry.value || {}
    return [
      { label: t('upstream.providers.identifier'), value: providerEntryLabel(entry) },
      { label: t('upstream.providers.baseUrl'), value: safeEndpoint(entry['base-url'] || entry.base_url) },
      { label: t('upstream.providers.proxyUrl'), value: safeEndpoint(entry['proxy-url'] || entry.proxy_url) },
      { label: t('upstream.providers.prefix'), value: entry.prefix || t('common.none') },
      { label: t('common.models'), value: String(entry.models?.length || 0) },
      { label: t('upstream.providers.headers'), value: String(Object.keys(entry.headers || {}).length) }
    ]
  })
  const providerMetadataFields = computed(() => {
    const entry = editingProviderEntry.value || {}
    return [
      { label: t('upstream.providers.authIndex'), value: entry.auth_index || t('upstream.providers.notAvailable') },
      ...(isCompat.value ? [] : [{ label: t('upstream.providers.excludedModels'), value: String(entry['excluded-models']?.length || 0) }]),
      { label: t('upstream.providers.keyEntries'), value: String(entry['api-key-entries']?.length || 0) },
      { label: t('upstream.providers.priority'), value: entry.priority ?? t('upstream.providers.notSet') },
      { label: t('upstream.providers.weight'), value: entry.weight ?? t('upstream.providers.weightDefault') },
      { label: t('upstream.providers.requestRetry'), value: entry['request-retry'] ?? t('upstream.providers.inherited') },
      { label: t('upstream.providers.coolingDisabled'), value: entry['disable-cooling'] ? t('common.yes') : t('common.no') },
      ...(isCompat.value ? [{ label: t('upstream.providers.promptCacheKey'), value: entry['support-prompt-cache-key'] ? t('upstream.providers.supported') : t('upstream.providers.notEnabled') }] : []),
      ...(supportsWebsockets.value ? [{ label: 'WebSockets', value: entry.websockets ? t('common.enabled') : t('common.disabled') }] : [])
    ]
  })

  function openProviderCreate() {
    providerEditorMode.value = 'create'
    editingProviderEntry.value = null
    editingProviderIndex.value = -1
    loadGuidedEntry(selectedProvider.value.template)
    editorError.value = ''
    providerEditorOpen.value = true
  }

  function openProviderDetail(entry: ProviderEntry) {
    editingProviderEntry.value = entry
    providerEditorMode.value = 'detail'
    providerEditorOpen.value = true
  }

  function openProviderEdit(entry: ProviderEntry) {
    providerEditorMode.value = 'edit'
    editingProviderEntry.value = entry
    editingProviderIndex.value = providerEntries.value.indexOf(entry)
    loadGuidedEntry(entry)
    editorError.value = ''
    providerEditorOpen.value = true
  }

  function duplicateProvider(entry: ProviderEntry) {
    providerEditorMode.value = 'create'
    editingProviderEntry.value = null
    editingProviderIndex.value = -1
    const copy = cloneValue(entry)
    delete copy.id
    delete copy.uuid
    delete copy.auth_index
    delete copy.disabled
    delete copy.__v8GroupIndex
    delete copy.__v8KeyIndex
    // Keep unexposed group/key properties, but never reuse credential identity or secrets.
    for (const source of [copy.__v8Group, copy.__v8Key]) {
      if (!source) continue
      delete source.id
      delete source.uuid
      delete source.auth_index
      delete source['api-key']
    }
    if (isCompat.value) {
      copy.name = ''
      copy['api-key-entries'] = providerEntries.value
        .filter(candidate => candidate.__v8GroupIndex === entry.__v8GroupIndex)
        .flatMap(candidate => candidate['api-key-entries'] || [])
        .map(key => ({ ...cloneValue(key), id: undefined, uuid: undefined, auth_index: undefined, 'api-key': '' }))
    } else copy['api-key'] = ''
    loadGuidedEntry(copy)
    editorError.value = ''
    providerEditorOpen.value = true
  }

  async function saveProviderEntry() {
    editorError.value = ''
    const value = guidedEntry()
    if (!value) return
    if (isCompat.value && !String(value.name || '').trim()) {
      editorError.value = t('upstream.providers.nameRequired')
      return
    }
    if (savingProvider.value) return
    if (!isCompat.value && providerEditorMode.value === 'edit' && !providerKey.value.trim()) delete value['api-key']

    savingProvider.value = true
    try {
      let entries = [...providerEntries.value]
      if (providerEditorMode.value === 'create') entries.push(value)
      else {
        const targetIndex = entries.findIndex(candidate => providerEntryMatches(candidate, editingProviderEntry.value))
        if (targetIndex < 0) throw new Error(t('upstream.providers.entryMissing'))
        if (isCompat.value) {
          // One edited row now owns the complete key list; remove its flattened siblings.
          const groupIndex = editingProviderEntry.value!.__v8GroupIndex
          const firstIndex = entries.findIndex(candidate => candidate.__v8GroupIndex === groupIndex)
          entries = entries.filter(candidate => candidate.__v8GroupIndex !== groupIndex)
          entries.splice(firstIndex, 0, value)
        } else entries.splice(targetIndex, 1, { ...editingProviderEntry.value, ...value })
      }
      await fetchAPI(providerApiPath(selectedProvider.value), { method: 'PUT', body: v8GroupsFromEntries(entries, selectedProvider.value) })
      providerEditorOpen.value = false
      await refreshWorkspace()
      void refreshCategoryStats()
      emit('changed')
      toast.add({ title: providerEditorMode.value === 'create' ? t('upstream.providers.created') : t('upstream.providers.updated'), color: 'success', icon: 'i-tabler-circle-check' })
    } catch (error) {
      editorError.value = errorMessage(error, t('upstream.providers.saveFailed'), true)
    } finally {
      savingProvider.value = false
    }
  }

  function providerEntryMatches(candidate: ProviderEntry | null, target: ProviderEntry | null) {
    if (!candidate || !target) return false
    return candidate.__v8GroupIndex === target.__v8GroupIndex && candidate.__v8KeyIndex === target.__v8KeyIndex
  }

  function confirmProviderDelete(entry: ProviderEntry) {
    deleteTarget.value = entry
    deleteOpen.value = true
  }

  async function performDelete() {
    if (!deleteTarget.value) return
    deleting.value = true
    try {
      const targetIndex = providerEntries.value.findIndex(candidate => providerEntryMatches(candidate, deleteTarget.value))
      if (targetIndex < 0) throw new Error(t('upstream.providers.entryMissingList'))
      const remaining = providerEntries.value.filter((_, index) => index !== targetIndex)
      await fetchAPI(providerApiPath(selectedProvider.value), { method: 'PUT', body: remaining.length ? v8GroupsFromEntries(remaining, selectedProvider.value) : [] })
      deleteOpen.value = false
      await refreshWorkspace()
      void refreshCategoryStats()
      emit('changed')
      toast.add({ title: t('upstream.providers.deletedToast'), color: 'success', icon: 'i-tabler-circle-check' })
    } catch (error) {
      toast.add({ title: t('upstream.providers.deleteFailed'), description: errorMessage(error, t('upstream.providers.deleteFailedDetail'), true), color: 'error' })
    } finally {
      deleting.value = false
    }
  }

  return {
    savingProvider, deleteOpen, deleteTarget, deleting, providerRowActions, deleteDescription, providerDetailFields, providerMetadataFields,
    openProviderCreate, openProviderDetail, openProviderEdit, duplicateProvider, saveProviderEntry, confirmProviderDelete, performDelete
  }
}
