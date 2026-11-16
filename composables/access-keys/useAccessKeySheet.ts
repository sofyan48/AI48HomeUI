import { computed, reactive, ref } from 'vue'
import type { AccessKeysState } from './useAccessKeys'
import { generatedKey, MAX_DISPLAY_NAME_LENGTH, sameGroupIds, serializeEntry, type AccessKeyResource, type AccessKeyGroup, type AccessKeyGroupField } from './normalize'

export function useAccessKeySheet(state: AccessKeysState) {
  const { fetchAPI, t, toast, users, resources, supportsDisplayNames, submitting,
    selectedResource, sheetMode, detailOpen, syncData, showErrorToast, resourceSummary } = state
  const detailSecretVisible = ref(false)
  const formSecretVisible = ref(false)
  const keyValueError = ref('')
  const displayNameError = ref('')
  const form = reactive({ value: '', displayName: '', userId: null as number | null, channelGroupIds: [] as number[], modelGroupIds: [] as number[] })
  const ownerOptions = computed(() => {
    const options = [{ label: t('keys.unassigned'), value: 'unassigned' }]
    for (const user of users.value) {
      if (!user.deletedAt || user.id === form.userId)
        options.push({ label: user.deletedAt ? t('keys.deletedSuffix', { name: user.name }) : user.name, value: String(user.id) })
    }
    if (form.userId != null && !users.value.some(user => user.id === form.userId))
      options.push({ label: t('keys.unavailableId', { id: form.userId }), value: String(form.userId) })
    return options
  })
  const ownerUnavailable = computed(() => form.userId != null &&
    !users.value.some(user => user.id === form.userId && !user.deletedAt))
  const detailTitle = computed(() => sheetMode.value === 'create' ? t('keys.sheetNew')
    : sheetMode.value === 'edit' ? t('keys.sheetUpdate') : t('keys.sheetDetail'))
  const detailDescription = computed(() => {
    if (sheetMode.value === 'create') return t('keys.createHeading')
    return selectedResource.value ? resourceSummary(selectedResource.value) : t('keys.selectOrCreate')
  })

  function openCreate() {
    selectedResource.value = null
    sheetMode.value = 'create'
    form.value = ''
    form.displayName = ''
    form.userId = null
    form.channelGroupIds = []
    form.modelGroupIds = []
    resetFormState()
    detailOpen.value = true
  }
  function openDetail(resource: AccessKeyResource) {
    selectedResource.value = resource
    sheetMode.value = 'detail'
    detailSecretVisible.value = false
    detailOpen.value = true
  }
  function openEdit(resource: AccessKeyResource) {
    selectedResource.value = resource
    sheetMode.value = 'edit'
    form.value = resource.value
    form.displayName = resource.displayName || ''
    form.userId = resource.userId
    form.channelGroupIds = [...resource.channelGroupIds]
    form.modelGroupIds = [...resource.modelGroupIds]
    resetFormState()
    detailOpen.value = true
  }
  function resetFormState() {
    keyValueError.value = ''
    displayNameError.value = ''
    formSecretVisible.value = false
  }
  function cancelForm() {
    if (sheetMode.value === 'edit') {
      sheetMode.value = 'detail'
      resetFormState()
      return
    }
    detailOpen.value = false
  }
  function handleDetailOpen(open: boolean) {
    if (!open) {
      sheetMode.value = 'detail'
      detailSecretVisible.value = false
      resetFormState()
    }
  }
  function validateForm() {
    const value = form.value.trim()
    const displayName = form.displayName.trim()
    if (!value) keyValueError.value = t('keys.keyRequired')
    if (supportsDisplayNames.value && Array.from(displayName).length > MAX_DISPLAY_NAME_LENGTH)
      displayNameError.value = t('keys.displayNameTooLong', { max: MAX_DISPLAY_NAME_LENGTH })
    return Boolean(value) && !displayNameError.value
  }
  async function submitKey() {
    if (submitting.value) return
    keyValueError.value = ''
    displayNameError.value = ''
    if (!validateForm()) return
    submitting.value = true
    try {
      if (sheetMode.value === 'edit' && selectedResource.value) {
        const changed = await updateResource(selectedResource.value)
        if (!changed) {
          sheetMode.value = 'detail'
          return
        }
        await syncData()
        selectedResource.value = resources.value.find(resource => resource.id === selectedResource.value?.id) ?? null
        sheetMode.value = 'detail'
        toast.add({ title: t('keys.updated'), color: 'success' })
      } else {
        await createResource()
        detailOpen.value = false
        await syncData()
        toast.add({ title: t('keys.created'), color: 'success' })
      }
    } catch (error) {
      showErrorToast(error)
    } finally {
      submitting.value = false
    }
  }
  async function createResource() {
    const newResource = {
      value: form.value.trim(), userId: form.userId,
      channelGroupIds: [...form.channelGroupIds], modelGroupIds: [...form.modelGroupIds],
    }
    const newEntry = serializeEntry(newResource, supportsDisplayNames.value ? form.displayName : undefined)
    // Creation must never silently become a whole-list replacement.
    await fetchAPI('/access/api-keys', { method: 'POST', body: newEntry })
  }
  async function updateResource(resource: AccessKeyResource) {
    const nextValue = form.value.trim()
    const nextDisplayName = form.displayName.trim()
    const valueChanged = nextValue !== resource.value
    const displayNameChanged = supportsDisplayNames.value && nextDisplayName !== (resource.displayName || '')
    // Omitted fields preserve stored bindings without revalidating a deleted owner
    // or restoring group bindings removed since this form was opened.
    const bindings = {
      ...(form.userId === resource.userId ? {} : { user_id: form.userId ?? 0 }),
      ...(sameGroupIds(form.channelGroupIds, resource.channelGroupIds) ? {} : { channels: [...form.channelGroupIds] }),
      ...(sameGroupIds(form.modelGroupIds, resource.modelGroupIds) ? {} : { model_groups: [...form.modelGroupIds] }),
    }
    if (!valueChanged && !displayNameChanged && !Object.keys(bindings).length) return false
    if (valueChanged) {
      await fetchAPI('/access/api-keys', {
        method: 'PATCH',
        body: {
          ...(resource.numericId != null ? { id: resource.numericId } : { index: resource.index }),
          value: { api_key: nextValue, ...bindings },
          ...(displayNameChanged ? { display_name: nextDisplayName || null } : {}),
        },
      })
    } else {
      await fetchAPI('/access/api-keys', {
        method: 'PATCH',
        body: {
          ...(resource.numericId != null ? { id: resource.numericId } : { api_key: resource.value }),
          ...bindings,
          ...(displayNameChanged ? { display_name: nextDisplayName || null } : {}),
        },
      })
    }
    return true
  }
  function generateKey() {
    form.value = generatedKey()
    keyValueError.value = ''
  }
  function setFormOwner(value: unknown) {
    if (!value) return
    if (value === 'unassigned') {
      form.userId = null
      return
    }
    const id = Number(value)
    if (Number.isSafeInteger(id) && id > 0) form.userId = id
  }
  function scopeOptions(groups: AccessKeyGroup[], selected: number[]) {
    const options = groups.map(group => ({ id: group.id,
      label: group.disabled ? t('keys.disabledSuffix', { name: group.name }) : group.name }))
    for (const id of selected) {
      if (!groups.some(group => group.id === id)) options.push({ id, label: t('keys.unavailableId', { id }) })
    }
    return options
  }
  function toggleFormGroup(field: AccessKeyGroupField, id: number, checked: unknown) {
    form[field] = checked === true ? [...new Set([...form[field], id])] : form[field].filter(value => value !== id)
  }
  return { detailSecretVisible, formSecretVisible, keyValueError, displayNameError, form,
    ownerOptions, ownerUnavailable, detailTitle, detailDescription, openCreate, openDetail, openEdit,
    cancelForm, handleDetailOpen, submitKey, generateKey, setFormOwner, scopeOptions, toggleFormGroup }
}
