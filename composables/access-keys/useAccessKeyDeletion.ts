import { computed, ref } from 'vue'
import type { AccessKeysState } from './useAccessKeys'
import type { AccessKeyResource } from './normalize'

export function useAccessKeyDeletion(state: AccessKeysState) {
  const { t, fetchAPI, toast, deleting, bulkDeleting, selectedResources, selectedIDs,
    selectedResource, sheetMode, detailOpen, syncData, showErrorToast, resourceSummary } = state
  const confirmationOpen = ref(false)
  const confirmationType = ref<'delete' | 'bulk' | null>(null)
  const confirmationResources = ref<AccessKeyResource[]>([])
  const confirmationBusy = computed(() => deleting.value || bulkDeleting.value)
  const confirmationTitle = computed(() => confirmationType.value === 'bulk'
    ? t('keys.confirmBulkTitle') : t('keys.confirmDeleteTitle'))
  const confirmationDescription = computed(() => {
    if (confirmationType.value === 'bulk') return t('keys.confirmBulkDesc', { count: confirmationResources.value.length })
    const resource = confirmationResources.value[0]
    return resource ? t('keys.confirmDeleteDesc', { name: resourceSummary(resource) }) : ''
  })
  const confirmationActionLabel = computed(() => confirmationType.value === 'bulk' ? t('keys.deleteSelected') : t('common.delete'))
  function openDelete(resource: AccessKeyResource) {
    confirmationType.value = 'delete'
    confirmationResources.value = [resource]
    confirmationOpen.value = true
  }
  function openBulkDelete() {
    confirmationType.value = 'bulk'
    confirmationResources.value = [...selectedResources.value]
    confirmationOpen.value = true
  }
  function closeConfirmation() {
    confirmationOpen.value = false
    confirmationType.value = null
    confirmationResources.value = []
  }
  async function confirmDestructiveAction() {
    if (confirmationType.value === 'bulk') await deleteSelected()
    else await deleteOne()
  }
  async function requestDelete(resource: AccessKeyResource) {
    await fetchAPI('/access/api-keys', {
      method: 'DELETE',
      query: resource.numericId != null ? { id: resource.numericId } : { index: resource.index },
    })
  }
  async function deleteOne() {
    const resource = confirmationResources.value[0]
    if (!resource) return
    deleting.value = true
    try {
      await requestDelete(resource)
      selectedIDs.value = new Set([...selectedIDs.value].filter(id => id !== resource.id))
      selectedResource.value = null
      sheetMode.value = 'detail'
      detailOpen.value = false
      closeConfirmation()
      await syncData()
      toast.add({ title: t('keys.deleted'), color: 'success' })
    } catch (error) {
      showErrorToast(error)
    } finally {
      deleting.value = false
    }
  }
  async function deleteSelected() {
    const targets = [...confirmationResources.value].sort((left, right) => right.index - left.index)
    if (!targets.length) return
    bulkDeleting.value = true
    try {
      for (const resource of targets) await requestDelete(resource)
      selectedIDs.value = new Set()
      selectedResource.value = null
      sheetMode.value = 'detail'
      detailOpen.value = false
      closeConfirmation()
      await syncData()
      toast.add({ title: t('keys.bulkDeleted', { count: targets.length }), color: 'success' })
    } catch (error) {
      showErrorToast(error)
    } finally {
      bulkDeleting.value = false
    }
  }
  return { confirmationOpen, confirmationBusy, confirmationTitle, confirmationDescription,
    confirmationActionLabel, openDelete, openBulkDelete, closeConfirmation, confirmDestructiveAction }
}
