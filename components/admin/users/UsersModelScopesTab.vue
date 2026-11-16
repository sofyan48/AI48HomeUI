<template>
  <AdminDataPanel :title="t('users.modelScopes')" :description="t('users.scopesCount', { count: filteredGroups.length })" content-class="p-4">
    <UsersUnsupportedScopes v-if="!accessGroupsSupported" />
    <section v-else class="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="self-start rounded-lg border border-[var(--ui-border)] bg-[var(--glass-card)] p-3 max-xl:hidden" :aria-label="t('users.modelScopes')">
        <div class="flex items-center justify-between px-2 pb-2">
          <p class="text-xs font-medium uppercase text-[var(--ui-text-muted)]">{{ t('users.modelScopes') }}</p>
          <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-plus" :aria-label="t('users.newModelScope')" @click="emit('create')" />
        </div>
        <nav class="grid gap-1" :aria-label="t('users.modelScopes')">
          <button
            v-for="group in filteredGroups"
            :key="group.id"
            type="button"
            :aria-current="isSelected(group) ? 'page' : undefined"
            class="flex w-full min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors"
            :class="isSelected(group)
              ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]'
              : 'border-transparent hover:border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)]'"
            @click="selectedId = group.id"
          >
            <span class="flex min-w-0 items-center gap-2.5">
              <span class="app-surface flex size-6 shrink-0 items-center justify-center rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] text-[10px] font-semibold">M</span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{{ group.group_name }}</span>
                <span class="mt-0.5 block text-xs text-[var(--ui-text-muted)]">{{ t('users.modelsCount', { count: modelDetailsFor(group.id).length }) }}</span>
              </span>
            </span>
            <AppIcon v-if="group.disabled" name="i-tabler-alert-triangle" class="size-4 shrink-0 text-[var(--ui-warning)]" />
            <span v-else class="shrink-0 rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs">{{ modelDetailsFor(group.id).length }}</span>
          </button>
          <p v-if="!filteredGroups.length" class="px-3 py-8 text-center text-sm text-[var(--ui-text-muted)]">{{ t('users.noModelScopesMatch') }}</p>
        </nav>
      </aside>

      <div class="min-w-0">
        <AdminDataPanel
          :title="selected?.group_name || t('users.modelScopes')"
          :description="selected
            ? t('users.scopeBindingsSummary', { id: selected.id, count: bindings.length })
            : t('users.selectOrCreateModelScope')"
        >
          <template #actions>
            <AdminSelectMenu
              v-model="selectedId"
              :items="scopeOptions"
              value-key="value"
              label-key="label"
              :search-input="{ placeholder: t('users.searchModelScopes') }"
              class="w-56 xl:hidden"
            />
            <template v-if="selected">
              <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-pencil" :aria-label="t('users.editModelScope')" @click="emit('edit', selected)" />
              <AppButton size="sm" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('users.deleteModelScope')" @click="emit('delete', selected)" />
            </template>
            <AppButton size="sm" icon="i-tabler-plus" @click="selected ? emit('bind', selected) : emit('create')">
              {{ selected ? t('users.addModels') : t('users.newScope') }}
            </AppButton>
          </template>
          <AppTable :columns="columns" :data="bindings" :loading="loading" class="min-w-0">
            <template #model-cell="{ row }">
              <p class="truncate font-mono text-xs font-medium text-[var(--ui-text-highlighted)]" :title="row.original.model_id">{{ row.original.model_id }}</p>
            </template>
            <template #channels-cell="{ row }">
              <span class="block max-w-64 truncate text-xs text-[var(--ui-text-muted)]" :title="channelLabel(row.original)">{{ channelLabel(row.original) }}</span>
            </template>
            <template #updated-cell="{ row }">
              <span class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]">{{ formatDate(row.original.updated_at) }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <AdminTableAction action="remove" :label="t('users.removeModelFromScope')" destructive @click="emit('deleteDetail', row.original)" />
              </div>
            </template>
            <template #empty>
              <AppEmptyState icon="i-tabler-cube" :text="selected ? t('users.noModelsBound') : t('users.selectModelScope')" />
            </template>
          </AppTable>
        </AdminDataPanel>
      </div>
    </section>
  </AdminDataPanel>
</template>

<script setup lang="ts">
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import AppIcon from '~/components/AppIcon.vue'
import AdminDataPanel from '~/components/admin/general/DataPanel.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { computed, ref, watch } from 'vue'
import UsersUnsupportedScopes from './UsersUnsupportedScopes.vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'

const emit = defineEmits<{
  create: []
  edit: [group: AnyRecord]
  delete: [group: AnyRecord]
  bind: [group: AnyRecord]
  deleteDetail: [detail: AnyRecord]
}>()

const { t, loading, accessGroupsSupported, modelGroups, matches, modelDetailsFor, channelName, formatDate } = useUsersWorkspace()

const selectedId = ref<number | string | null>(null)

const filteredGroups = computed(() => modelGroups.value.filter(group => matches([
  group.id, group.group_name, ...modelDetailsFor(group.id).map(item => item.model_id)
])))
const scopeOptions = computed(() => filteredGroups.value.map(group => ({
  label: `${group.group_name} · ${t('users.modelsCount', { count: modelDetailsFor(group.id).length })}`,
  value: Number(group.id)
})))
const selected = computed(() =>
  modelGroups.value.find(group => Number(group.id) === Number(selectedId.value)) || filteredGroups.value[0] || null)
const bindings = computed(() => selected.value ? modelDetailsFor(selected.value.id) : [])
const isSelected = (group: AnyRecord) => Number(selected.value?.id) === Number(group.id)

// Keep the selection inside the filtered list.
watch(filteredGroups, (groups) => {
  if (!groups.length) selectedId.value = null
  else if (!groups.some(group => Number(group.id) === Number(selectedId.value))) selectedId.value = Number(groups[0].id)
}, { immediate: true })

const actionsMeta = { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } }
const columns = computed(() => [
  { accessorKey: 'model', header: t('users.modelId') },
  { accessorKey: 'channels', header: t('users.credentialScope') },
  { accessorKey: 'updated', header: t('common.updated') },
  { id: 'actions', header: t('common.actions'), meta: actionsMeta }
])

function channelLabel(detail: AnyRecord) {
  const ids = Array.isArray(detail?.channels) ? detail.channels : []
  return ids.length ? ids.map(channelName).join(', ') : t('users.inheritsKeyScope')
}
</script>
