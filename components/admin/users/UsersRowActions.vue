<template>
  <div class="flex items-center justify-end gap-1">
    <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-eye" :aria-label="t('users.viewUserNamed', { name: user.username })" :title="t('users.viewUser')" @click="$emit('view')" />
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-dots-vertical" :aria-label="t('users.actionsFor', { name: user.username })" :title="t('users.userActions')" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem v-for="item in items" :key="item.label" :disabled="item.disabled" :variant="item.color === 'error' ? 'destructive' : 'default'" @select="item.onSelect">
          <AppIcon :name="item.icon" />
          {{ item.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'

const props = defineProps<{
  user: { username: string; deleted_at?: string; approval_pending?: boolean; pending_topup?: unknown }
  operable: boolean
  topupSupported: boolean
  resetSupported: boolean
  approving: boolean
  approvingTopup: boolean
}>()
const emit = defineEmits(['view', 'edit', 'balance', 'reset', 'approve', 'topup', 'delete'])
const { t } = useAdminI18n()
const items = computed(() => [
  ...(props.user.approval_pending && !props.user.deleted_at ? [{ label: t('users.approveUser'), icon: 'i-tabler-user-check', disabled: props.approving, onSelect: () => emit('approve') }] : []),
  ...(props.topupSupported && props.user.pending_topup && !props.user.deleted_at ? [{ label: t('users.approveTopup'), icon: 'i-tabler-coins', disabled: props.approvingTopup, onSelect: () => emit('topup') }] : []),
  { label: t('users.editUser'), icon: 'i-tabler-edit', onSelect: () => emit('edit') },
  { label: t('users.balanceOperation'), icon: 'i-tabler-cash-banknote', disabled: !props.operable, onSelect: () => emit('balance') },
  ...(props.resetSupported ? [{ label: t('users.configureResetAllowance'), icon: 'i-tabler-refresh', disabled: !props.operable, onSelect: () => emit('reset') }] : []),
  { label: t('users.deleteUser'), icon: 'i-tabler-trash', color: 'error' as const, onSelect: () => emit('delete') }
])
</script>
