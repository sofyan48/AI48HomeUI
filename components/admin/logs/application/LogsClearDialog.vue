<template>
  <AppModal v-model:open="clearConfirmOpen" centered :title="t('logs.clearTitle')" :description="t('logs.clearDescription')">
    <template #body>
      <div class="space-y-5">
        <div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
          {{ t('logs.clearWarning', { count: formatNumber(applicationTotal) }) }}
        </div>
        <div class="flex justify-end gap-3">
          <AppButton color="neutral" variant="ghost" @click="clearConfirmOpen = false">{{ t('common.cancel') }}</AppButton>
          <AppButton color="error" icon="i-tabler-trash" :loading="clearingLogs" @click="clearApplicationLogs">
            {{ t('logs.clearAll') }}
          </AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useLogsPage } from '~/composables/logs/useLogsPage'

const { t, formatNumber, applicationTotal, clearConfirmOpen, clearingLogs, clearApplicationLogs } = useLogsPage()
</script>
