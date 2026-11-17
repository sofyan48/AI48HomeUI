<template>
  <AppCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">{{ t('alerting.channels.title') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('alerting.channels.description') }}</p>
        </div>
        <AppButton icon="i-tabler-plus" @click="openCreateChannel">{{ t('alerting.channels.add') }}</AppButton>
      </div>
    </template>
    <AppTable :columns="columns" :data="channels" :loading="loading">
      <template #identity-cell="{ row }">
        <div class="min-w-48">
          <p class="font-medium">{{ value(row).name }}</p>
          <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ target(value(row)) }}</p>
        </div>
      </template>
      <template #type-cell="{ row }">
        <PortalBadge color="neutral" variant="outline">{{ value(row).type === 'telegram' ? t('alerting.channel.type.telegram') : t('alerting.channel.type.teams') }}</PortalBadge>
      </template>
      <template #enabled-cell="{ row }">
        <AdminSwitch :model-value="value(row).enabled" :aria-label="t('common.enabled')" @update:model-value="toggleChannel(value(row), $event)" />
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <AdminTableAction action="test" :label="t('alerting.channel.test')" :loading="testingId === value(row).id" :disabled="testingId !== null && testingId !== value(row).id" @click="testChannel(value(row))" />
          <AdminTableAction action="edit" :label="t('alerting.channel.edit')" @click="openEditChannel(value(row))" />
          <AdminTableAction action="delete" :label="t('alerting.channel.delete')" destructive @click="askDeleteChannel(value(row))" />
        </div>
      </template>
      <template #empty>
        <div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('alerting.channels.empty') }}</div>
      </template>
    </AppTable>
  </AppCard>

  <AlertingChannelForm />

  <AppConfirmModal
    :open="deleteTarget !== null"
    :title="t('alerting.channel.deleteTitle')"
    :message="t('alerting.channel.deleteMessage', { name: deleteTarget?.name || '' })"
    :confirm-label="t('alerting.channel.delete')"
    confirm-icon="i-tabler-trash"
    :error="deleteError"
    :loading="deleting"
    :locked="deleting"
    @update:open="open => { if (!open) deleteTarget = null }"
    @confirm="confirmDeleteChannel"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import AlertingChannelForm from '~/components/admin/alerting/AlertingChannelForm.vue'
import { useAlertingWorkspace } from '~/composables/alerting/useAlertingWorkspace'
import type { AlertChannel } from '~/composables/alerting/types'

const {
  t, channels, loading, testingId, deleteTarget, deleting, deleteError,
  openCreateChannel, openEditChannel, toggleChannel, testChannel, askDeleteChannel, confirmDeleteChannel,
} = useAlertingWorkspace()

const columns = computed(() => [
  { accessorKey: 'identity', header: t('alerting.channels.col.channel') },
  { accessorKey: 'type', header: t('alerting.channels.col.type') },
  { accessorKey: 'enabled', header: t('common.enabled') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const value = (row: AlertChannel | { original: AlertChannel }): AlertChannel => ('original' in row ? row.original : row)
const target = (channel: AlertChannel) => channel.type === 'telegram'
  ? `chat ${channel.chat_id}${channel.thread_id ? ` / thread ${channel.thread_id}` : ''} · ${channel.bot_token_hint}`
  : channel.webhook_url_hint
</script>
