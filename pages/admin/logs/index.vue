<template>
  <div class="space-y-4">
    <AppPanelTabs :model-value="activeView" :items="views" :label="t('logs.viewsLabel')" @update:model-value="switchView" />

    <LogsAlerts />
    <LogsFilterBar />

    <LogsEventsCard v-if="activeView === 'events'" />
    <LogsRequestLogsCard v-else-if="activeView === 'request-logs'" />
    <LogsErrorLogsCard v-else-if="activeView === 'error-logs'" />
    <LogsApplicationCard v-else />

    <LogsEventDetailDialog />
    <LogsApplicationDetailDialog />
    <LogsClearDialog />
  </div>
</template>

<script setup lang="ts">
import LogsAlerts from '~/components/admin/logs/LogsAlerts.vue'
import LogsErrorLogsCard from '~/components/admin/logs/LogsErrorLogsCard.vue'
import LogsFilterBar from '~/components/admin/logs/filters/LogsFilterBar.vue'
import LogsEventsCard from '~/components/admin/logs/request/LogsEventsCard.vue'
import LogsRequestLogsCard from '~/components/admin/logs/request/LogsRequestLogsCard.vue'
import LogsEventDetailDialog from '~/components/admin/logs/request/LogsEventDetailDialog.vue'
import LogsApplicationCard from '~/components/admin/logs/application/LogsApplicationCard.vue'
import LogsApplicationDetailDialog from '~/components/admin/logs/application/LogsApplicationDetailDialog.vue'
import LogsClearDialog from '~/components/admin/logs/application/LogsClearDialog.vue'
import { provideLogsPage } from '~/composables/logs/useLogsPage'

const { t, activeView, switchView } = provideLogsPage()

const views = computed(() => [
  { value: 'events', label: t('logs.view.events'), icon: 'i-tabler-list' },
  { value: 'request-logs', label: t('logs.view.requestLogs'), icon: 'i-tabler-file-download' },
  { value: 'error-logs', label: t('logs.view.errorLogs'), icon: 'i-tabler-alert-triangle' },
  { value: 'application', label: t('logs.view.application'), icon: 'i-tabler-terminal-2' },
])
</script>
