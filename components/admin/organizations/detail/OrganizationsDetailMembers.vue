<template>
  <section class="grid gap-2">
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.members.hint') }}</p>
      <AppButton size="sm" icon="i-tabler-user-plus" @click="openAddMember">{{ t('organizations.member.add') }}</AppButton>
    </div>
    <AppTable :columns="columns" :data="members" :loading="detailLoading">
      <template #username-cell="{ row }">
        <p class="font-medium">{{ member(row).username }}</p>
      </template>
      <template #role-cell="{ row }">
        <PortalBadge :color="member(row).role === 'owner' ? 'primary' : 'neutral'" variant="subtle">{{ t(`organizations.role.${member(row).role}`) }}</PortalBadge>
      </template>
      <template #limits-cell="{ row }">
        <p class="font-mono text-xs">{{ memberLimitsSummary(member(row), t('organizations.member.noLimits')) }}</p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ scopeText(member(row)) }} · {{ t('organizations.member.keysUsed', { usage: memberKeyUsage(member(row)) }) }}</p>
        <AppOrganizationMemberReset
          v-if="memberResetSupported" :key="`${selected?.id}:${member(row).user_id}`"
          :member="member(row)" can-configure
          :save="(body, signal) => updateMemberReset(member(row).user_id, signal, body)"
          :reset="signal => updateMemberReset(member(row).user_id, signal)"
        />
      </template>
      <template #spend-cell="{ row }">
        <span class="tabular-nums">{{ member(row).spend_30d }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-chart-bar" :aria-label="t('organizations.memberUsage', { name: member(row).username })" :title="t('organizations.memberUsage', { name: member(row).username })" :to="{ path: '/admin/usage', query: { organization: selected?.id, member: member(row).user_id } }" />
          <AdminTableAction action="add" icon="i-tabler-key" :label="t('organizations.key.create')" @click="openCreateKey(member(row))" />
          <AdminTableAction action="edit" :label="t('organizations.member.edit')" @click="openEditMember(member(row))" />
          <AdminTableAction action="delete" :label="t('organizations.member.remove')" destructive @click="askRemoveMember(member(row))" />
        </div>
      </template>
      <template #empty>
        <div class="py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('organizations.membersEmpty') }}</div>
      </template>
    </AppTable>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppOrganizationMemberReset from '~/components/AppOrganizationMemberReset.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import type { OrganizationMember } from '~/composables/organizations/types'
import { memberLimitsSummary } from '~/composables/organizations/memberLimits'
import { memberKeyUsage } from '~/composables/organizations/memberAccess'

const {
  memberResetSupported, updateMemberReset,
  t, selected, detailLoading, openAddMember, openEditMember, askRemoveMember, openCreateKey, modelGroupName,
} = useOrganizationsWorkspace()

const members = computed(() => selected.value?.members || [])

const columns = computed(() => [
  { accessorKey: 'username', header: t('organizations.member.username') },
  { accessorKey: 'role', header: t('organizations.member.role') },
  { accessorKey: 'limits', header: t('organizations.member.limits') },
  { accessorKey: 'spend', header: t('organizations.member.spend30d') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const member = (row: OrganizationMember | { original: OrganizationMember }): OrganizationMember => ('original' in row ? row.original : row)
const scopeText = (row: OrganizationMember) =>
  row.model_groups?.length ? row.model_groups.map(modelGroupName).join(', ') : t('organizations.member.inheritModelGroups')
</script>
