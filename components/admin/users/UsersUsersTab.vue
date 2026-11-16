<template>
  <AdminTablePanel :title="t('common.users')" :description="description">
    <template #actions>
      <UInput v-model="search" icon="i-tabler-search" :placeholder="t('users.searchUsersPlaceholder')" :aria-label="t('users.searchUsers')" class="w-full sm:w-72" />
      <AppButton icon="i-tabler-user-plus" @click="emit('create')">{{ t('users.newUser') }}</AppButton>
    </template>

    <template v-if="selectedUsers.length" #bulk>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-sm font-medium">{{ t('users.usersSelected', { count: selectedUsers.length }) }}</p>
          <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('users.bulkHint') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton size="sm" color="neutral" variant="ghost" @click="selectedUserIds = new Set()">{{ t('users.clearSelection') }}</AppButton>
          <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-cash-banknote" @click="emit('balance', selectedUsers)">
            {{ t('users.balanceOperation') }}
          </AppButton>
        </div>
      </div>
    </template>

    <AppTable
      :columns="visibleColumns"
      :data="filteredUsers"
      :virtualize="{ estimateSize: 64, overscan: 8 }"
      :get-row-id="(user: AnyRecord) => String(user.id)"
      :ui="{ base: 'w-full table-fixed lg:min-w-[90rem]' }"
      :loading="loading"
      :empty="t('users.noUsersMatch')"
    >
      <template #select-header>
        <UCheckbox
          :model-value="allSelected"
          :indeterminate="someSelected"
          :disabled="!operableUsers.length"
          :aria-label="t('users.selectOperableUsers')"
          @update:model-value="toggleAll(Boolean($event))"
        />
      </template>
      <template #select-cell="{ row }">
        <UCheckbox
          :model-value="selectedUserIds.has(row.original.id)"
          :disabled="!isOperableUser(row.original)"
          :aria-label="t('users.selectUser', { name: row.original.username })"
          @update:model-value="toggleOne(row.original.id, Boolean($event))"
        />
      </template>
      <template #user-cell="{ row }">
        <p class="truncate font-medium" :title="row.original.username">{{ row.original.username }}</p>
        <p v-if="row.original.pending_topup" class="text-xs text-[var(--ui-text-muted)]">{{ t('users.topupPending') }}</p>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="row.original.deleted_at || row.original.approval_pending ? 'warning' : 'success'" variant="subtle">{{ userStatus(row.original) }}</UBadge>
      </template>
      <template #credits-cell="{ row }">
        <span class="tabular-nums">{{ formatCredits(row.original.credits) }}</span>
      </template>
      <template #pendingTopup-cell="{ row }">
        <UBadge v-if="row.original.pending_topup" color="warning" variant="subtle">
          {{ t('users.creditsAmount', { amount: formatCredits(row.original.pending_topup.amount) }) }}
        </UBadge>
        <span v-else class="text-[var(--ui-text-muted)]">—</span>
      </template>
      <template #periodLimits-cell="{ row }">
        <span
          v-if="zeroPeriodWindows(row.original).length"
          class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
          :title="t('users.blockedWindows', { windows: zeroPeriodWindows(row.original).join(', ') })"
        ><UIcon name="i-tabler-lock" class="size-3.5" />{{ t('users.blocked') }}</span>
        <span v-else-if="periodWindows(row.original).length" class="tabular-nums">
          {{ t('users.windowsCount', { count: periodWindows(row.original).length }) }}
        </span>
        <span v-else class="text-[var(--ui-text-muted)]">—</span>
      </template>
      <template #resetAllowance-cell="{ row }">
        <UsersResetAllowanceCell v-if="resetAllowanceSupported && row.original.reset_allowance" :allowance="row.original.reset_allowance" />
        <span v-else class="text-[var(--ui-text-muted)]">—</span>
      </template>
      <template #keys-cell="{ row }">{{ keysForUser(row.original.id).length }}</template>
      <template #credentialScope-cell="{ row }">
        <span class="block max-w-52 truncate" :title="effectiveChannelScopes(row.original.id).join(', ')">{{ scopeSummary(effectiveChannelScopes(row.original.id)) }}</span>
      </template>
      <template #modelScope-cell="{ row }">
        <span class="block max-w-52 truncate" :title="effectiveModelScopes(row.original.id).join(', ')">{{ scopeSummary(effectiveModelScopes(row.original.id)) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <UsersRowActions
          :user="row.original"
          :operable="isOperableUser(row.original)"
          :topup-supported="topupApprovalSupported"
          :reset-supported="resetAllowanceSupported"
          :approving="approvingUserId !== null"
          :approving-topup="approvingTopupUserId !== null"
          @view="emit('view', row.original)"
          @edit="emit('edit', row.original)"
          @balance="emit('balance', [row.original])"
          @reset="emit('reset', row.original)"
          @approve="emit('approve', row.original)"
          @topup="emit('topup', row.original)"
          @delete="emit('delete', row.original)"
        />
      </template>
    </AppTable>
  </AdminTablePanel>
</template>

<script setup lang="ts">
import AdminTablePanel from '~/components/admin/general/TablePanel.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UsersResetAllowanceCell from './UsersResetAllowanceCell.vue'
import UsersRowActions from './UsersRowActions.vue'
import { useUserSegments } from '~/composables/users/useUserSegments'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { isOperableUser, periodWindows, zeroPeriodWindows, type AnyRecord } from '~/composables/users/common'

const emit = defineEmits<{
  create: []
  view: [user: AnyRecord]
  edit: [user: AnyRecord]
  balance: [users: AnyRecord[]]
  reset: [user: AnyRecord]
  approve: [user: AnyRecord]
  topup: [user: AnyRecord]
  delete: [user: AnyRecord]
}>()

const {
  t, loading, users, search, userSegment, selectedUserIds, approvingUserId, approvingTopupUserId,
  resetAllowanceSupported, topupApprovalSupported, compactNumber, formatCredits, userStatus, matches,
  keysForUser, effectiveChannelScopes, effectiveModelScopes, scopeSummary
} = useUsersWorkspace()
const { segments, inSegment } = useUserSegments()

const filteredUsers = computed(() => users.value.filter(user => inSegment(user) && matches([user.id, user.username, userStatus(user)])))
const description = computed(() => {
  const counts = t('users.usersCount', { shown: compactNumber(filteredUsers.value.length), total: compactNumber(users.value.length) })
  const segment = userSegment.value !== 'all' ? segments.value.find(item => item.value === userSegment.value)?.label : ''
  return segment ? `${counts} · ${segment}` : counts
})

const actionsMeta = { class: { th: 'w-24 whitespace-nowrap text-right', td: 'w-24 whitespace-nowrap text-right' } }
const columns = computed(() => [
  { id: 'select', header: '', meta: { class: { th: 'w-12', td: 'w-12' } } },
  { accessorKey: 'user', header: t('common.user') },
  { accessorKey: 'status', header: t('common.status'), meta: { class: { th: 'w-28', td: 'w-28' } } },
  { accessorKey: 'credits', header: t('users.credits') },
  { accessorKey: 'pendingTopup', header: t('users.pendingTopup') },
  { accessorKey: 'periodLimits', header: t('users.periodLimits') },
  { accessorKey: 'resetAllowance', header: t('users.resetAllowance') },
  { accessorKey: 'keys', header: t('users.clientKeys') },
  { accessorKey: 'credentialScope', header: t('users.credentialScope') },
  { accessorKey: 'modelScope', header: t('users.modelScope') },
  { id: 'actions', header: '', meta: actionsMeta }
])

// Narrow screens keep only identity, status and actions.
const compact = ref(false)
const compactColumns = ['select', 'user', 'status', 'actions']
const visibleColumns = computed(() => compact.value
  ? columns.value.filter(column => compactColumns.includes(column.id || column.accessorKey || ''))
  : columns.value)
let media: MediaQueryList | undefined
const updateLayout = () => { compact.value = Boolean(media?.matches) }
onMounted(() => {
  media = window.matchMedia('(max-width: 63.99rem)')
  updateLayout()
  media.addEventListener('change', updateLayout)
})
onBeforeUnmount(() => media?.removeEventListener('change', updateLayout))

const operableUsers = computed(() => filteredUsers.value.filter(isOperableUser))
const selectedUsers = computed(() => users.value.filter(user => selectedUserIds.value.has(user.id) && isOperableUser(user)))
const allSelected = computed(() => operableUsers.value.length > 0 && operableUsers.value.every(user => selectedUserIds.value.has(user.id)))
const someSelected = computed(() => !allSelected.value && operableUsers.value.some(user => selectedUserIds.value.has(user.id)))

function toggleOne(id: number | string, checked: boolean) {
  const next = new Set(selectedUserIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedUserIds.value = next
}

function toggleAll(checked: boolean) {
  const next = new Set(selectedUserIds.value)
  for (const user of operableUsers.value) {
    if (checked) next.add(user.id)
    else next.delete(user.id)
  }
  selectedUserIds.value = next
}
</script>
