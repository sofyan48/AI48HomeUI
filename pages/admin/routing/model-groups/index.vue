<template>
  <div class="space-y-4">
    <AppCard :ui="{ body: 'p-3 sm:p-3' }">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-selected)] text-[var(--ui-primary)]" aria-hidden="true"><AppIcon name="i-tabler-layout-grid" class="size-4.5" /></span>
          <div class="min-w-0">
            <p class="text-sm text-[var(--ui-text-muted)]">{{ t('groups.intro') }}</p>
            <div class="mt-1.5 flex flex-wrap gap-1.5 text-xs" :aria-label="t('routing.groupSummary')">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5"><strong class="tabular-nums">{{ groups.length }}</strong> {{ t('routing.summaryGroups') }}</span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5"><span class="size-1.5 rounded-full bg-emerald-500" /><strong class="tabular-nums">{{ groups.filter(group => !group.disabled).length }}</strong> {{ t('routing.summaryActive') }}</span>
              <span v-if="groups.some(group => group.disabled)" class="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5"><span class="size-1.5 rounded-full bg-zinc-400" /><strong class="tabular-nums">{{ groups.filter(group => group.disabled).length }}</strong> {{ t('routing.summaryDisabled') }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AdminInput v-model="search" icon="i-tabler-search" :placeholder="t('groups.searchPlaceholder')" :aria-label="t('groups.searchLabel')" class="w-full sm:w-64" />
          <AppButton color="neutral" variant="outline" icon="i-tabler-refresh" :loading="pending" :aria-label="t('common.refresh')" @click="refreshWorkspace" />
          <AppButton color="primary" icon="i-tabler-plus" @click="openCreateGroup">{{ t('groups.newGroup') }}</AppButton>
        </div>
      </div>
    </AppCard>

    <PortalAlert v-if="pageError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('groups.loadFailed')" :description="pageError" />

    <div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
      <AppCard :ui="{ body: 'p-0' }">
        <template #header>
          <div>
            <p class="font-semibold">{{ t('routing.groupsTitle') }}</p>
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('groups.selectHint') }}</p>
          </div>
        </template>
        <AppTable :columns="groupColumns" :data="filteredGroups" :loading="pending" @select="selectGroup">
          <template #identity-cell="{ row }">
            <button type="button" class="w-full text-left" @click.stop="selectGroup(rowValue(row))">
              <p class="font-medium text-[var(--ui-text-highlighted)]">{{ rowValue(row).group_name }}</p>
              <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('routing.groupNumber', { id: rowValue(row).id }) }}</p>
            </button>
          </template>
          <template #status-cell="{ row }">
            <PortalBadge :color="rowValue(row).disabled ? 'error' : 'success'" variant="subtle" size="sm">{{ rowValue(row).disabled ? t('common.disabled') : t('common.active') }}</PortalBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <AdminTableAction action="edit" :label="t('routing.editGroup')" @click.stop="openEditGroup(rowValue(row))" />
              <AdminTableAction action="delete" :label="t('routing.deleteGroup')" destructive @click.stop="confirmDelete('group', rowValue(row))" />
            </div>
          </template>
          <template #empty>
            <div class="px-6 py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ search ? t('groups.noMatching') : t('groups.empty') }}</div>
          </template>
        </AppTable>
      </AppCard>

      <AppCard v-if="selectedGroup" :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="flex items-center gap-2">
                <p class="text-base font-semibold">{{ selectedGroup.group_name }}</p>
                <PortalBadge :color="selectedGroup.disabled ? 'error' : 'success'" variant="subtle" size="sm">{{ selectedGroup.disabled ? t('common.disabled') : t('common.active') }}</PortalBadge>
              </div>
              <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ details.length === 1 ? t('groups.bindingCountOne', { count: details.length }) : t('groups.bindingCountOther', { count: details.length }) }}</p>
            </div>
            <AppButton color="primary" variant="soft" icon="i-tabler-plus" @click="openCreateDetail">{{ t('groups.addModel') }}</AppButton>
          </div>
        </template>
        <AppTable :columns="detailColumns" :data="details" :loading="detailsPending" searchable :search-placeholder="t('groups.searchModels')">
          <template #model-cell="{ row }">
            <div class="min-w-0">
              <p class="truncate font-mono text-sm font-semibold">{{ rowValue(row).model_id }}</p>
              <p v-if="modelById(rowValue(row).model_id)?.display_name" class="mt-1 truncate text-xs text-[var(--ui-text-muted)]">{{ modelById(rowValue(row).model_id).display_name }}</p>
            </div>
          </template>
          <template #channels-cell="{ row }">
            <div v-if="rowValue(row).channels?.length" class="flex max-w-md flex-wrap gap-1">
              <PortalBadge v-for="id in rowValue(row).channels" :key="id" color="primary" variant="subtle" size="sm">{{ channelName(id) }}</PortalBadge>
            </div>
            <span v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('groups.inheritScope') }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <AdminTableAction action="edit" :label="t('groups.editBinding')" @click="openEditDetail(rowValue(row))" />
              <AdminTableAction action="delete" :label="t('groups.deleteBinding')" destructive @click="confirmDelete('detail', rowValue(row))" />
            </div>
          </template>
          <template #empty>
            <div class="flex flex-col items-center px-6 py-8 text-center">
              <AppIcon name="i-tabler-box" class="mb-3 size-8 text-[var(--ui-text-muted)]" />
              <p class="font-medium">{{ t('groups.noModels') }}</p>
              <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('groups.noModelsHint') }}</p>
            </div>
          </template>
        </AppTable>
      </AppCard>

      <div v-else class="flex min-h-40 flex-col items-center justify-center rounded-[var(--admin-panel-radius)] border border-dashed border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)]/60 p-8 text-center">
        <AppIcon name="i-tabler-layout-grid" class="mb-3 size-8 text-[var(--ui-text-muted)]" />
        <p class="font-medium">{{ t('groups.selectGroup') }}</p>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('groups.selectGroupHint') }}</p>
      </div>
    </div>

    <AppModal v-model:open="groupFormOpen" :title="editingGroup ? t('groups.editGroupTitle') : t('groups.createGroupTitle')" :description="t('groups.groupFormDescription')">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitGroup">
          <PortalAlert v-if="formError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('groups.saveGroupFailed')" :description="formError" />
          <AdminField :label="t('routing.groupName')" required>
            <AdminInput v-model="groupForm.group_name" class="w-full" placeholder="premium-models" autofocus />
          </AdminField>
          <AdminField :label="t('common.status')">
            <div class="flex items-center gap-3 rounded-lg border border-[var(--ui-border)] p-3">
              <AdminSwitch v-model="groupForm.enabled" />
              <div>
                <p class="text-sm font-medium">{{ groupForm.enabled ? t('common.active') : t('common.disabled') }}</p>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ t('groups.disabledHint') }}</p>
              </div>
            </div>
          </AdminField>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4">
            <AppButton color="neutral" variant="ghost" type="button" @click="groupFormOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="primary" type="submit" :loading="submitting">{{ editingGroup ? t('routing.saveChanges') : t('routing.createGroup') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="detailFormOpen" :title="editingDetail ? t('groups.editBindingTitle') : t('groups.addBindingTitle')" :description="t('groups.bindingFormDescription')">
      <template #body>
        <form class="space-y-5" @submit.prevent="submitDetail">
          <PortalAlert v-if="formError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('groups.saveBindingFailed')" :description="formError" />
          <AdminField :label="t('groups.catalogModel')" :hint="t('common.optional')">
            <AdminSelectMenu v-model="detailForm.suggested_model_id" :items="modelOptions" value-key="value" label-key="label" class="w-full" :placeholder="t('groups.searchCatalog')" :search-input="{ placeholder: t('groups.searchCatalogInput') }" @update:model-value="applyModelSuggestion" />
          </AdminField>
          <AdminField :label="t('groups.modelId')" required>
            <AdminInput v-model="detailForm.model_id" class="w-full font-mono" placeholder="gpt-5.5" autofocus />
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('groups.modelIdHint') }}</p>
          </AdminField>
          <fieldset class="rounded-lg border border-[var(--ui-border)] p-4">
            <legend class="px-1 text-sm font-medium">{{ t('groups.allowedChannels') }}</legend>
            <p class="mb-3 text-xs text-[var(--ui-text-muted)]">{{ t('groups.allowedChannelsHint') }}</p>
            <div v-if="channels.length" class="max-h-56 space-y-2 overflow-auto pr-1">
              <AdminCheckbox
                v-for="channel in channels"
                :key="channel.id"
                :model-value="detailForm.channels.includes(channel.id)"
                :label="`${channel.channel_name}${channel.disabled ? t('groups.channelDisabledSuffix') : ''}`"
                @update:model-value="toggleChannel(channel.id, $event)"
              />
            </div>
            <p v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('groups.noChannels') }}</p>
          </fieldset>
          <div class="flex justify-end gap-3 border-t border-[var(--ui-border)] pt-4">
            <AppButton color="neutral" variant="ghost" type="button" @click="detailFormOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="primary" type="submit" :loading="submitting">{{ editingDetail ? t('routing.saveChanges') : t('groups.addModel') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="deleteOpen" :title="deleteKind === 'group' ? t('groups.deleteGroupTitle') : t('groups.removeBindingTitle')" :description="t('routing.softDeleteDescription')">
      <template #body>
        <div class="space-y-5">
          <PortalAlert color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('routing.confirmDeletion')" :description="deleteDescription" />
          <div class="flex justify-end gap-3">
            <AppButton color="neutral" variant="ghost" @click="deleteOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="error" :loading="deleting" @click="performDelete">{{ t('common.delete') }}</AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AppIcon from '~/components/AppIcon.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
const { fetchAPI } = useApi()
const { t } = useAdminI18n()
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
const toast = useAdminToast()
const rowValue = (row) => row?.original ?? row
const search = ref('')
const pageError = useWorkspaceState('admin:routing:model-groups:pageError', () => (''))
const selectedGroupId = ref(null)
const groupFormOpen = ref(false)
const detailFormOpen = ref(false)
const formError = ref('')
const submitting = useWorkspaceState('admin:routing:model-groups:submitting', () => (false))
const editingGroup = ref(null)
const editingDetail = ref(null)
const deleteOpen = ref(false)
const deleteKind = ref('')
const deleteTarget = ref(null)
const deleting = useWorkspaceState('admin:routing:model-groups:deleting', () => (false))
const groupForm = ref({ group_name: '', enabled: true })
const detailForm = ref({ model_id: '', suggested_model_id: '', channels: [] })

const groupColumns = computed(() => [
  { accessorKey: 'identity', header: t('groups.columnGroup') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])
const detailColumns = computed(() => [
  { accessorKey: 'model', header: t('common.model') },
  { accessorKey: 'channels', header: t('groups.columnScope') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])

async function loadWorkspace() {
  pageError.value = ''
  try {
    const [groupsResponse, channelsResponse, modelsResponse, staticModelsResponse] = await Promise.all([
      fetchAPI('/model-groups'),
      fetchAPI('/channel-groups'),
      fetchAPI('/models?scope=available'),
      fetchAPI('/models?scope=static').catch(() => ({ models: {} }))
    ])
    return { groupsResponse, channelsResponse, modelsResponse, staticModelsResponse }
  } catch (error) {
    pageError.value = errorMessage(error)
    return { groupsResponse: { model_groups: [] }, channelsResponse: { channel_groups: [] }, modelsResponse: { models: [] } }
  }
}
const { data, pending, refresh: refreshWorkspace } = useStoreData('admin:routing:model-groups:routing-model-groups', loadWorkspace)
const groups = computed(() => Array.isArray(data.value?.groupsResponse?.model_groups) ? data.value.groupsResponse.model_groups : [])
const channels = computed(() => Array.isArray(data.value?.channelsResponse?.channel_groups) ? data.value.channelsResponse.channel_groups : [])
const models = computed(() => {
  const available = Array.isArray(data.value?.modelsResponse?.models) ? data.value.modelsResponse.models : []
  const staticGroups = data.value?.staticModelsResponse?.models
  const staticModels = staticGroups && typeof staticGroups === 'object' && !Array.isArray(staticGroups)
    ? Object.values(staticGroups).flatMap(group => Array.isArray(group) ? group : [])
    : []
  return [...new Map([...staticModels, ...available]
    .filter(model => model?.id)
    .map(model => [model.id, model])).values()]
})
const selectedGroup = computed(() => groups.value.find(group => group.id === selectedGroupId.value) || null)
const filteredGroups = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return groups.value
  return groups.value.filter(group => [group.id, group.group_name].some(value => String(value || '').toLowerCase().includes(query)))
})
const modelOptions = computed(() => [...models.value]
  .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
  .map(model => ({ value: model.id, label: `${model.display_name || model.id} · ${model.id}` })))

async function loadDetails() {
  if (!selectedGroupId.value) return { model_group_details: [] }
  try {
    return await fetchAPI(`/model-group-details?model_group_id=${selectedGroupId.value}`)
  } catch (error) {
    pageError.value = errorMessage(error)
    return { model_group_details: [] }
  }
}
const { data: detailsData, pending: detailsPending, refresh: refreshDetails } = useStoreData('admin:routing:model-groups:routing-model-group-details', loadDetails, { immediate: false })
const details = computed(() => Array.isArray(detailsData.value?.model_group_details) ? detailsData.value.model_group_details : [])
const deleteDescription = computed(() => {
  if (!deleteTarget.value) return ''
  return deleteKind.value === 'group'
    ? t('groups.deleteGroupDescription', { name: deleteTarget.value.group_name })
    : t('groups.removeBindingDescription', { model: deleteTarget.value.model_id, group: selectedGroup.value?.group_name || t('routing.thisGroup') })
})

async function selectGroup(row) {
  selectedGroupId.value = rowValue(row).id
  await refreshDetails()
}
function openCreateGroup() {
  editingGroup.value = null
  groupForm.value = { group_name: '', enabled: true }
  formError.value = ''
  groupFormOpen.value = true
}
function openEditGroup(group) {
  editingGroup.value = group
  groupForm.value = { group_name: group.group_name || '', enabled: !group.disabled }
  formError.value = ''
  groupFormOpen.value = true
}
async function submitGroup() {
  formError.value = ''
  const groupName = groupForm.value.group_name.trim()
  if (!groupName) return void (formError.value = t('routing.groupNameRequired'))
  submitting.value = true
  try {
    const response = await fetchAPI(editingGroup.value ? `/model-groups/${editingGroup.value.id}` : '/model-groups', {
      method: editingGroup.value ? 'PATCH' : 'POST',
      body: { group_name: groupName, disabled: !groupForm.value.enabled }
    })
    groupFormOpen.value = false
    await refreshWorkspace()
    if (!editingGroup.value && response?.model_group?.id) selectedGroupId.value = response.model_group.id
    if (editingGroup.value?.id === selectedGroupId.value) selectedGroupId.value = editingGroup.value.id
    if (selectedGroupId.value) await refreshDetails()
    toast.add({ title: editingGroup.value ? t('groups.groupUpdated') : t('groups.groupCreated'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    submitting.value = false
  }
}
function openCreateDetail() {
  editingDetail.value = null
  detailForm.value = { model_id: '', suggested_model_id: '', channels: [] }
  formError.value = ''
  detailFormOpen.value = true
}
function openEditDetail(detail) {
  editingDetail.value = detail
  detailForm.value = {
    model_id: detail.model_id || '',
    suggested_model_id: models.value.some(model => model.id === detail.model_id) ? detail.model_id : '',
    channels: Array.isArray(detail.channels) ? [...detail.channels] : []
  }
  formError.value = ''
  detailFormOpen.value = true
}
function applyModelSuggestion(value) {
  if (value) detailForm.value.model_id = value
}
function toggleChannel(id, checked) {
  const ids = detailForm.value.channels
  if (checked && !ids.includes(id)) ids.push(id)
  if (!checked) detailForm.value.channels = ids.filter(value => value !== id)
}
async function submitDetail() {
  formError.value = ''
  const modelId = detailForm.value.model_id.trim()
  if (!modelId) return void (formError.value = t('groups.modelIdRequired'))
  submitting.value = true
  try {
    await fetchAPI(editingDetail.value ? `/model-group-details/${editingDetail.value.id}` : '/model-group-details', {
      method: editingDetail.value ? 'PATCH' : 'POST',
      body: { model_group_id: selectedGroupId.value, model_id: modelId, channels: [...detailForm.value.channels] }
    })
    detailFormOpen.value = false
    await refreshDetails()
    toast.add({ title: editingDetail.value ? t('groups.bindingUpdated') : t('groups.modelAdded'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    submitting.value = false
  }
}
function confirmDelete(kind, target) {
  deleteKind.value = kind
  deleteTarget.value = target
  deleteOpen.value = true
}
async function performDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await fetchAPI(deleteKind.value === 'group' ? `/model-groups/${deleteTarget.value.id}` : `/model-group-details/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    if (deleteKind.value === 'group') {
      if (selectedGroupId.value === deleteTarget.value.id) selectedGroupId.value = null
      await refreshWorkspace()
    } else {
      await refreshDetails()
    }
    toast.add({ title: deleteKind.value === 'group' ? t('groups.groupDeleted') : t('groups.bindingRemoved'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) {
    toast.add({ title: t('routing.deleteFailed'), description: errorMessage(error), color: 'error', icon: 'i-tabler-alert-circle' })
  } finally {
    deleting.value = false
  }
}
function modelById(id) {
  return models.value.find(model => model.id === id)
}
function channelName(id) {
  const channel = channels.value.find(item => item.id === id)
  return channel ? `${channel.channel_name}${channel.disabled ? t('groups.channelDisabledSuffix') : ''}` : t('groups.channelNumber', { id })
}
function errorMessage(error) {
  return error?.data?.message || error?.data?.error || error?.response?._data?.message || error?.response?._data?.error || error?.message || t('routing.unexpectedError')
}
</script>
