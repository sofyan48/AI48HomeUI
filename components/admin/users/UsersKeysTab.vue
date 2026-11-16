<template>
  <AdminTablePanel :title="t('users.clientKeys')" :description="t('users.keysCount', { shown: filteredKeys.length, total: keys.length })">
    <template #actions>
      <AdminInput v-model="search" icon="i-tabler-search" :placeholder="t('users.searchKeysPlaceholder')" :aria-label="t('users.searchKeys')" class="w-full sm:w-72" />
      <AppButton icon="i-tabler-plus" @click="emit('create')">{{ t('users.newKey') }}</AppButton>
    </template>
    <AppTable :columns="columns" :data="filteredKeys" :loading="loading" class="min-w-0">
      <template #key-cell="{ row }">
        <p class="font-mono text-xs">{{ maskKey(row.original.api_key) }}</p>
        <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.sequence', { sequence: sequence(row.original) }) }}</p>
      </template>
      <template #owner-cell="{ row }">
        <span v-if="userById(row.original.user_id)">{{ userById(row.original.user_id)?.username }}</span>
        <span v-else class="text-[var(--ui-text-muted)]">{{ t('users.unassigned') }}</span>
      </template>
      <template #credentialScope-cell="{ row }">
        <span class="block max-w-60 truncate">{{ scopeSummary(keyChannelNames(row.original)) }}</span>
      </template>
      <template #modelScope-cell="{ row }">
        <span class="block max-w-60 truncate">{{ scopeSummary(keyModelNames(row.original)) }}</span>
      </template>
      <template #length-cell="{ row }">{{ row.original.api_key.length }}</template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <AdminTableAction action="edit" :label="t('users.editClientKey')" @click="emit('edit', row.original)" />
          <AdminTableAction action="delete" :label="t('users.deleteClientKey')" destructive @click="emit('delete', row.original)" />
        </div>
      </template>
      <template #empty>
        <AppEmptyState icon="i-tabler-key" :text="t('users.noClientKeys')" />
      </template>
    </AppTable>
  </AdminTablePanel>
</template>

<script setup lang="ts">
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminTablePanel from '~/components/admin/general/TablePanel.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { computed } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { maskKey, type AnyRecord } from '~/composables/users/common'

const emit = defineEmits<{ create: []; edit: [key: AnyRecord]; delete: [key: AnyRecord] }>()

const { t, loading, keys, search, matches, userById, keyChannelNames, keyModelNames, scopeSummary } = useUsersWorkspace()

const filteredKeys = computed(() => keys.value.filter(key => matches([
  key.api_key, userById(key.user_id)?.username, ...keyChannelNames(key), ...keyModelNames(key)
])))

const actionsMeta = { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } }
const columns = computed(() => [
  { accessorKey: 'key', header: t('users.clientKey') },
  { accessorKey: 'owner', header: t('users.owner') },
  { accessorKey: 'credentialScope', header: t('users.credentialScope') },
  { accessorKey: 'modelScope', header: t('users.modelScope') },
  { accessorKey: 'length', header: t('users.length') },
  { id: 'actions', header: t('common.actions'), meta: actionsMeta }
])

// Position in the full list, so the number stays stable while filtering.
const sequence = (key: AnyRecord) => Math.max(keys.value.findIndex(item => item.id === key.id), 0) + 1
</script>
