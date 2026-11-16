<template>
  <div
    v-if="errorMessage"
    class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
  >
    {{ errorMessage }}
  </div>

  <div v-if="activeView === 'application' && applicationError" role="alert" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
    <p>{{ applicationError }}</p>
    <AppButton v-if="applicationCursorExpired" class="mt-2" color="neutral" variant="outline" :loading="applicationLoading" @click="restartApplicationLogs">{{ t('logs.restartLatest') }}</AppButton>
  </div>
  <div v-if="activeView === 'application' && applicationSearchUnsupported" role="status" class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
    {{ t('logs.searchUnsupported') }}
  </div>
  <div v-if="activeView === 'application' && applicationResponse && !applicationAnchorId && applicationTotal > 0" role="status" class="text-sm text-[var(--ui-text-muted)]">
    {{ t('logs.anchorMissing') }}
  </div>
  <div v-if="activeView === 'application' && applicationMode === 'pages' && liveRefresh && applicationPage > 1" role="status" class="text-sm text-[var(--ui-text-muted)]">
    {{ t('logs.livePaused') }}
  </div>
</template>

<script setup lang="ts">
import { useLogsPage } from '~/composables/logs/useLogsPage'

const {
  t, errorMessage, activeView, liveRefresh, applicationError, applicationCursorExpired, applicationLoading,
  applicationSearchUnsupported, applicationResponse, applicationAnchorId, applicationTotal, applicationMode,
  applicationPage, restartApplicationLogs,
} = useLogsPage()
</script>
