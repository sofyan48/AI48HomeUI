<template>
  <div class="space-y-4">
    <PortalAlert
      v-if="unsupported"
      color="warning"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('organizations.unsupported.title')"
      :description="t('organizations.unsupported.description')"
    />
    <template v-else>
      <PortalAlert v-if="errorMessage" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('organizations.loadFailed')" :description="errorMessage" />

      <AppCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-semibold">{{ t('organizations.title') }}</h2>
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.description') }}</p>
            </div>
            <AppButton icon="i-tabler-plus" @click="openCreateOrg">{{ t('organizations.add') }}</AppButton>
          </div>
        </template>
        <AppTable :columns="columns" :data="organizations" :loading="loading">
          <template #name-cell="{ row }">
            <button type="button" class="text-left font-medium hover:underline" @click="openDetail(value(row))">{{ value(row).name }}</button>
          </template>
          <template #credits-cell="{ row }">
            <span class="tabular-nums">{{ value(row).credits_unlimited ? '∞' : value(row).credits }}</span>
          </template>
          <template #members-cell="{ row }">
            <button type="button" class="tabular-nums hover:underline" :aria-label="t('organizations.openMembers', { name: value(row).name })" @click="openDetail(value(row), 'members')">{{ value(row).member_count ?? 0 }}</button>
          </template>
          <template #owners-cell="{ row }">
            <span class="text-sm">{{ (value(row).owners || []).join(', ') || '—' }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <AdminTableAction action="view" :label="t('organizations.view')" @click="openDetail(value(row))" />
              <AdminTableAction action="view" icon="i-tabler-receipt" :label="t('organizations.openCharges')" @click="openDetail(value(row), 'charges')" />
              <AdminTableAction action="edit" :label="t('organizations.edit')" @click="openEditOrg(value(row))" />
              <AdminTableAction action="delete" :label="t('organizations.delete')" destructive @click="askDeleteOrg(value(row))" />
            </div>
          </template>
          <template #empty>
            <div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('organizations.empty') }}</div>
          </template>
        </AppTable>
      </AppCard>
    </template>

    <OrganizationsFormDialog />
    <OrganizationsDetailDialog />
    <OrganizationsMemberDialog />
    <OrganizationsKeyDialog />

    <AppConfirmModal
      :open="deleteTarget !== null"
      :title="t('organizations.deleteTitle')"
      :message="deleteMessage"
      :confirm-label="t('organizations.delete')"
      confirm-icon="i-tabler-trash"
      :error="deleteError"
      :loading="deleting"
      :locked="deleting"
      @update:open="open => { if (!open) deleteTarget = null }"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import OrganizationsFormDialog from '~/components/admin/organizations/OrganizationsFormDialog.vue'
import OrganizationsDetailDialog from '~/components/admin/organizations/OrganizationsDetailDialog.vue'
import OrganizationsMemberDialog from '~/components/admin/organizations/OrganizationsMemberDialog.vue'
import OrganizationsKeyDialog from '~/components/admin/organizations/OrganizationsKeyDialog.vue'
import { useDataSync } from '~/composables/useDataSync'
import { provideOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import type { Organization } from '~/composables/organizations/types'

const {
  t, unsupported, errorMessage, loading, organizations, openDetail, openCreateOrg, openEditOrg,
  askDeleteOrg, deleteTarget, deleting, deleteError, confirmDelete, loadAll,
} = provideOrganizationsWorkspace()

const columns = computed(() => [
  { accessorKey: 'name', header: t('organizations.col.name') },
  { accessorKey: 'credits', header: t('organizations.col.credits') },
  { accessorKey: 'members', header: t('organizations.col.members') },
  { accessorKey: 'owners', header: t('organizations.col.owners') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const deleteMessage = computed(() => {
  const target = deleteTarget.value
  if (!target) return ''
  if (target.kind === 'org') return t('organizations.deleteOrgMessage', { name: target.label })
  if (target.kind === 'member') return t('organizations.removeMemberMessage', { name: target.label })
  return t('organizations.deleteKeyMessage', { name: target.label })
})

const value = (row: Organization | { original: Organization }): Organization => ('original' in row ? row.original : row)

useDataSync('admin:organizations:sync', () => loadAll())
onMounted(loadAll)
</script>
