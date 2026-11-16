import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage, useWorkspaceClipboard } from './common'
import { keyEntries, normalizeKey, type WorkspaceKey } from './keys'

function createWorkspaceKeys() {
  const { t } = usePortalI18n()
  const toast = useToast()
  const { fetchAPI } = useUserApi()
  const copyText = useWorkspaceClipboard()
  const keys = useWorkspaceState<WorkspaceKey[]>('user:workspace:keys', () => [])
  const keySearch = ref('')
  const filteredKeys = computed(() => {
    const query = keySearch.value.trim().toLowerCase()
    if (!query) return keys.value
    return keys.value.filter(key =>
      (key.display_name || t('ws.keys.unnamed')).toLowerCase().includes(query) ||
      key.api_key.toLowerCase().includes(query)
    )
  })
  const keysLoading = useWorkspaceState('user:workspace:keys-loading', () => false)
  const keyFormOpen = ref(false)
  const keyFormError = useWorkspaceState('user:workspace:key-form-error', () => '')
  const keySaving = useWorkspaceState('user:workspace:key-saving', () => false)
  const editingKey = ref<WorkspaceKey | null>(null)
  const keyValue = ref('')
  const keyName = ref('')
  const keyDeleteOpen = ref(false)
  const keyDeleteTarget = ref<WorkspaceKey | null>(null)
  const keyDeleting = useWorkspaceState('user:workspace:key-deleting', () => false)
  async function loadKeys() {
    keysLoading.value = true
    try {
      const response = await fetchAPI<any>('/api-keys')
      keys.value = keyEntries(response).map(normalizeKey).filter((item): item is WorkspaceKey => Boolean(item))
    } finally {
      keysLoading.value = false
    }
  }
  function openKeyForm(key?: WorkspaceKey) {
    editingKey.value = key || null
    keyValue.value = key?.api_key || ''
    keyName.value = key?.display_name || ''
    keyFormError.value = ''
    keyFormOpen.value = true
  }
  function closeKeyForm() { keyFormOpen.value = false }
  function closeKeyDelete() { keyDeleteOpen.value = false }
  async function saveKey() {
    keyFormError.value = ''
    const nextValue = keyValue.value.trim()
    const nextName = keyName.value.trim()
    if ([...nextName].length > 128) {
      keyFormError.value = t('ws.keys.nameTooLong')
      return
    }
    if (editingKey.value && !nextValue) {
      keyFormError.value = t('ws.keys.keyRequired')
      return
    }
    keySaving.value = true
    try {
      if (editingKey.value) {
        if (editingKey.value.id != null) {
          await fetchAPI(`/api-keys/${editingKey.value.id}`, { method: 'PATCH', body: { api_key: nextValue, display_name: nextName } })
        } else {
          await fetchAPI('/api-keys', { method: 'PATCH', body: { old: editingKey.value.api_key, new_api_key: nextValue, display_name: nextName } })
        }
      } else {
        await fetchAPI('/api-keys', { method: 'POST', body: { ...(nextValue ? { api_key: nextValue } : {}), display_name: nextName } })
      }
      keyFormOpen.value = false
      await loadKeys()
      toast.add({ title: editingKey.value ? t('ws.keys.updatedToast') : t('ws.keys.createdToast'), color: 'success' })
    } catch (error: any) {
      keyFormError.value = errorMessage(error, t('ws.keys.saveFailed'))
    } finally {
      keySaving.value = false
    }
  }
  function confirmKeyDelete(key: WorkspaceKey) {
    keyDeleteTarget.value = key
    keyDeleteOpen.value = true
  }
  async function deleteKey() {
    const target = keyDeleteTarget.value
    if (!target) return
    keyDeleting.value = true
    try {
      if (target.id != null) await fetchAPI(`/api-keys/${target.id}`, { method: 'DELETE', body: {} })
      else await fetchAPI('/api-keys', { method: 'DELETE', body: { api_key: target.api_key } })
      keyDeleteOpen.value = false
      keyDeleteTarget.value = null
      await loadKeys()
      toast.add({ title: t('ws.keys.deletedToast'), color: 'success' })
    } catch (error: any) {
      toast.add({ title: t('ws.keys.deleteFailed'), description: errorMessage(error, t('ws.keys.deleteFailedDetail')), color: 'error' })
    } finally {
      keyDeleting.value = false
    }
  }
  async function copyKey(value: string) { await copyText(value, t('ws.keys.copiedToast')) }
  return { keys, keySearch, filteredKeys, keysLoading, keyFormOpen, keyFormError, keySaving, editingKey, keyValue, keyName, keyDeleteOpen, keyDeleteTarget, keyDeleting, loadKeys, openKeyForm, closeKeyForm, closeKeyDelete, saveKey, confirmKeyDelete, deleteKey, copyKey }
}
const keysKey: InjectionKey<ReturnType<typeof createWorkspaceKeys>> = Symbol('workspace-keys')
export function provideWorkspaceKeys() {
  const keys = createWorkspaceKeys()
  provide(keysKey, keys)
  return keys
}
export function useWorkspaceKeys() {
  const keys = inject(keysKey)
  if (!keys) throw new Error('Workspace keys are not provided')
  return keys
}
