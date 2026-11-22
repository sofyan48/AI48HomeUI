<template>
  <section class="grid gap-2">
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.keys.hint') }}</p>
    <AppTable :columns="columns" :data="selectedKeys" :loading="detailLoading">
      <template #key-cell="{ row }">
        <p class="font-medium">{{ key(row).display_name || t('organizations.key.unnamed') }}</p>
        <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ maskKey(key(row).api_key) }}</p>
      </template>
      <template #owner-cell="{ row }">
        <span class="text-sm">{{ ownerName(key(row).created_by_user_id) }}</span>
      </template>
      <template #created-cell="{ row }">
        <span class="text-xs text-[var(--ui-text-muted)]">{{ formatDate(key(row).created_at) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <AdminTableAction v-if="canRenameKeys" action="edit" icon="i-tabler-tag" :label="t('organizations.key.rename')" @click="openRenameKey(key(row))" />
          <AdminTableAction action="delete" :label="t('organizations.key.delete')" destructive @click="askDeleteKey(key(row))" />
        </div>
      </template>
      <template #empty>
        <div class="py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('organizations.keysEmpty') }}</div>
      </template>
    </AppTable>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminI18n } from '#imports'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import type { OrganizationAPIKey } from '~/composables/organizations/types'

const { t, selected, selectedKeys, detailLoading, askDeleteKey, canRenameKeys, openRenameKey } = useOrganizationsWorkspace()
const { intlLocale } = useAdminI18n()

const columns = computed(() => [
  { accessorKey: 'key', header: t('organizations.key.title') },
  { accessorKey: 'owner', header: t('organizations.key.owner') },
  { accessorKey: 'created', header: t('organizations.key.createdAt') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const key = (row: OrganizationAPIKey | { original: OrganizationAPIKey }): OrganizationAPIKey => ('original' in row ? row.original : row)
const maskKey = (value: string) => (value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value)
const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium' }).format(date)
}
const ownerName = (id: number | null) => {
  if (id === null) return t('organizations.key.adminOwned')
  return (selected.value?.members || []).find(item => item.user_id === id)?.username || t('organizations.key.formerMember')
}
</script>
