<template>
  <div class="space-y-4">
    <PortalAlert
      v-if="unsupported"
      color="warning"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('alerting.unsupported.title')"
      :description="t('alerting.unsupported.description')"
    />
    <template v-else>
      <PortalAlert v-if="errorMessage" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('alerting.loadFailed')" :description="errorMessage" />

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('alerting.summary.status') }}</p>
          <p class="mt-1 font-semibold" :class="settings?.enabled ? 'text-[var(--ui-success)]' : 'text-[var(--ui-text-muted)]'">
            {{ settings?.enabled ? t('common.enabled') : t('common.disabled') }}
          </p>
        </div>
        <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('alerting.summary.firing') }}</p>
          <p class="mt-1 text-lg font-semibold tabular-nums" :class="alerts.length ? 'text-[var(--ui-error)]' : ''">{{ alerts.length }}</p>
        </div>
        <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('alerting.summary.channels') }}</p>
          <p class="mt-1 text-lg font-semibold tabular-nums">{{ enabledChannelCount }} / {{ channels.length }}</p>
        </div>
      </div>

      <PortalAlert
        v-if="!loading && settings?.enabled && enabledChannelCount === 0"
        color="warning"
        variant="subtle"
        icon="i-tabler-info-circle"
        :description="t('alerting.summary.noChannels')"
      />

      <AlertingActiveAlerts />
      <div class="grid items-start gap-4 xl:grid-cols-2">
        <AlertingSettings />
        <AlertingChannels />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AlertingActiveAlerts from '~/components/admin/alerting/AlertingActiveAlerts.vue'
import AlertingSettings from '~/components/admin/alerting/AlertingSettings.vue'
import AlertingChannels from '~/components/admin/alerting/AlertingChannels.vue'
import { useDataSync } from '~/composables/useDataSync'
import { provideAlertingWorkspace } from '~/composables/alerting/useAlertingWorkspace'

const { t, unsupported, errorMessage, loading, settings, alerts, channels, enabledChannelCount, loadAll, loadAlerts } = provideAlertingWorkspace()

useDataSync('admin:alerting:sync', () => loadAlerts())
onMounted(loadAll)
</script>
