<template>
  <AppModal :open="!!selectedApplicationLog" :title="t('logs.appDetailTitle')" :description="t('logs.appDetailDescription')" @update:open="closeApplicationDetail">
    <template #body>
      <div v-if="selectedApplicationLog" class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailItem :label="t('logs.timestamp')" :value="formatDateTime(selectedApplicationLog.timestamp)" />
          <DetailItem :label="t('logs.stored')" :value="formatDateTime(selectedApplicationLog.created_at)" />
          <DetailItem :label="t('logs.level')" :value="selectedApplicationLog.level" />
          <DetailItem :label="t('logs.homeIp')" :value="selectedApplicationLog.home_ip" mono />
          <DetailItem :label="t('logs.clientIp')" :value="selectedApplicationLog.client_ip" mono />
          <DetailItem :label="t('logs.requestId')" :value="selectedApplicationLog.request_id" mono />
        </div>
        <pre class="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--ui-bg-muted)] p-4 text-xs">{{ selectedApplicationLog.line }}</pre>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import DetailItem from '~/components/admin/general/DetailItem.vue'
import { useLogsPage } from '~/composables/logs/useLogsPage'

const { t, formatDateTime, selectedApplicationLog } = useLogsPage()

const closeApplicationDetail = (open: boolean) => {
  if (!open) selectedApplicationLog.value = null
}
</script>
