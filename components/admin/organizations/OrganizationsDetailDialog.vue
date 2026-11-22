<template>
  <AppModal v-model:open="detailOpen" :title="selected?.name || t('organizations.title')" :description="t('organizations.detailDescription')" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div v-if="selected" class="grid gap-5">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-[var(--ui-border)] p-3">
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.col.credits') }}</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ selected.credits_unlimited ? '∞' : selected.credits }}</p>
          </div>
          <div class="rounded-lg border border-[var(--ui-border)] p-3">
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.col.members') }}</p>
            <p class="mt-1 text-lg font-semibold tabular-nums">{{ members.length }}</p>
          </div>
          <div class="rounded-lg border border-[var(--ui-border)] p-3">
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.modelGroups') }}</p>
            <p class="mt-1 text-sm font-medium">{{ (selected.model_groups || []).map(modelGroupName).join(', ') || t('organizations.allModels') }}</p>
          </div>
        </div>
        <p v-if="selected.pending_topup" class="rounded-md border border-[var(--ui-border)] p-3 text-sm">
          {{ t('organizations.pendingTopup', { amount: selected.pending_topup.amount }) }}
        </p>

        <section class="grid gap-2">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold">{{ t('organizations.membersTitle') }}</h3>
            <AppButton size="sm" icon="i-tabler-user-plus" @click="openAddMember">{{ t('organizations.member.add') }}</AppButton>
          </div>
          <AppTable :columns="memberColumns" :data="members" :loading="detailLoading">
            <template #username-cell="{ row }">
              <p class="font-medium">{{ member(row).username }}</p>
              <p class="text-xs text-[var(--ui-text-muted)]">#{{ member(row).user_id }}</p>
            </template>
            <template #role-cell="{ row }">
              <PortalBadge :color="member(row).role === 'owner' ? 'primary' : 'neutral'" variant="subtle">{{ t(`organizations.role.${member(row).role}`) }}</PortalBadge>
            </template>
            <template #limits-cell="{ row }">
              <span class="font-mono text-xs">{{ limitText(member(row).limit_1d_credits) }} / {{ limitText(member(row).limit_7d_credits) }} / {{ limitText(member(row).limit_30d_credits) }}</span>
            </template>
            <template #spend-cell="{ row }">
              <span class="tabular-nums">{{ member(row).spend_30d }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-1">
                <AdminTableAction action="add" icon="i-tabler-key" :label="t('organizations.key.create')" :loading="creatingKeyFor === member(row).user_id" @click="createKeyFor(member(row))" />
                <AdminTableAction action="edit" :label="t('organizations.member.edit')" @click="openEditMember(member(row))" />
                <AdminTableAction action="delete" :label="t('organizations.member.remove')" destructive @click="askRemoveMember(member(row))" />
              </div>
            </template>
            <template #empty>
              <div class="py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('organizations.membersEmpty') }}</div>
            </template>
          </AppTable>
        </section>

        <section class="grid gap-2">
          <h3 class="text-sm font-semibold">{{ t('organizations.keysTitle') }}</h3>
          <AppTable :columns="keyColumns" :data="selectedKeys" :loading="detailLoading">
            <template #key-cell="{ row }">
              <p class="font-medium">{{ key(row).display_name || `#${key(row).id}` }}</p>
              <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ maskKey(key(row).api_key) }}</p>
            </template>
            <template #owner-cell="{ row }">
              <span class="text-sm">{{ ownerName(key(row).created_by_user_id) }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <AdminTableAction action="delete" :label="t('organizations.key.delete')" destructive @click="askDeleteKey(key(row))" />
              </div>
            </template>
            <template #empty>
              <div class="py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('organizations.keysEmpty') }}</div>
            </template>
          </AppTable>
        </section>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import { limitText, type OrganizationAPIKey, type OrganizationMember } from '~/composables/organizations/types'

const {
  t, selected, selectedKeys, detailOpen, detailLoading, openAddMember, openEditMember,
  askRemoveMember, askDeleteKey, createKeyFor, creatingKeyFor, modelGroupName,
} = useOrganizationsWorkspace()

const members = computed(() => selected.value?.members || [])

const memberColumns = computed(() => [
  { accessorKey: 'username', header: t('organizations.member.username') },
  { accessorKey: 'role', header: t('organizations.member.role') },
  { accessorKey: 'limits', header: t('organizations.member.limits') },
  { accessorKey: 'spend', header: t('organizations.member.spend30d') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const keyColumns = computed(() => [
  { accessorKey: 'key', header: t('organizations.key.title') },
  { accessorKey: 'owner', header: t('organizations.key.owner') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const member = (row: OrganizationMember | { original: OrganizationMember }): OrganizationMember => ('original' in row ? row.original : row)
const key = (row: OrganizationAPIKey | { original: OrganizationAPIKey }): OrganizationAPIKey => ('original' in row ? row.original : row)
const maskKey = (value: string) => (value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value)
const ownerName = (id: number | null) => {
  if (id === null) return t('organizations.key.adminOwned')
  return members.value.find(item => item.user_id === id)?.username || `#${id}`
}
</script>
