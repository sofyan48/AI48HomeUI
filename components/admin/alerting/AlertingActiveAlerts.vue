<template>
  <AppCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">{{ t('alerting.alerts.title') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('alerting.alerts.description') }}</p>
        </div>
        <div class="flex gap-2">
          <AppButton color="neutral" variant="outline" icon="i-tabler-refresh" :loading="loading" @click="loadAlerts">{{ t('alerting.alerts.refresh') }}</AppButton>
          <AppButton icon="i-tabler-player-play" :loading="evaluating" @click="evaluateNow">{{ t('alerting.evaluate.action') }}</AppButton>
        </div>
      </div>
    </template>
    <AppTable :columns="columns" :data="alerts" :loading="loading">
      <template #rule-cell="{ row }">
        <PortalBadge :color="ruleColor(value(row).rule)" variant="subtle">{{ ruleLabel(value(row).rule) }}</PortalBadge>
      </template>
      <template #alert-cell="{ row }">
        <div class="min-w-64 max-w-xl">
          <p class="font-medium">{{ value(row).title }}</p>
          <p class="text-xs text-[var(--ui-text-muted)] break-words">{{ value(row).detail }}</p>
        </div>
      </template>
      <template #since-cell="{ row }">
        <span class="text-sm tabular-nums">{{ formatDate(value(row).first_seen_at) }}</span>
      </template>
      <template #notified-cell="{ row }">
        <span class="text-sm tabular-nums text-[var(--ui-text-muted)]">{{ formatDate(value(row).last_notified_at) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <AdminTableAction v-if="value(row).rule === 'node_offline'" action="remove" :label="t('alerting.alerts.forgetNode')" destructive @click="forgetNode(value(row))" />
        </div>
      </template>
      <template #empty>
        <div class="flex flex-col items-center gap-2 py-12 text-center text-sm text-[var(--ui-text-muted)]">
          <AppIcon name="i-tabler-circle-check" class="size-6 text-[var(--ui-success)]" />
          {{ t('alerting.alerts.empty') }}
        </div>
      </template>
    </AppTable>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useAlertingWorkspace } from '~/composables/alerting/useAlertingWorkspace'
import type { AlertState } from '~/composables/alerting/types'

const { t, alerts, loading, evaluating, loadAlerts, evaluateNow, forgetNode } = useAlertingWorkspace()
const { intlLocale } = useAdminI18n()

const columns = computed(() => [
  { accessorKey: 'rule', header: t('alerting.alerts.col.rule') },
  { accessorKey: 'alert', header: t('alerting.alerts.col.alert') },
  { accessorKey: 'since', header: t('alerting.alerts.col.since') },
  { accessorKey: 'notified', header: t('alerting.alerts.col.notified') },
  { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } },
])

const value = (row: AlertState | { original: AlertState }): AlertState => ('original' in row ? row.original : row)
const formatDate = (input: string | null | undefined) => input ? new Date(input).toLocaleString(intlLocale.value) : '—'

function ruleLabel(rule: string) {
  switch (rule) {
    case 'credential_dead': return t('alerting.rule.credentialDead')
    case 'credential_refresh': return t('alerting.rule.credentialRefresh')
    case 'credential_cooldown': return t('alerting.rule.credentialCooldown')
    case 'quota_low': return t('alerting.rule.quotaLow')
    case 'node_offline': return t('alerting.rule.nodeOffline')
    default: return rule
  }
}

function ruleColor(rule: string): 'error' | 'warning' | 'info' {
  if (rule === 'credential_dead' || rule === 'node_offline') return 'error'
  if (rule === 'quota_low') return 'info'
  return 'warning'
}
</script>
