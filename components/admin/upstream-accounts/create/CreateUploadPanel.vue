<template>
  <div class="space-y-4">
    <button type="button" class="w-full rounded-lg border border-dashed border-[var(--ui-border)] p-6 text-center disabled:opacity-50" :disabled="uploadActive || busy" @click="fileInput?.click()" @dragenter.prevent @dragover.prevent @dragleave.prevent @drop.prevent.stop="uploadDroppedFiles"><UIcon name="i-tabler-upload" class="mx-auto mb-2 size-6" /><p class="text-sm">{{ t('cred.upload.drop') }}</p></button>
    <p v-if="uploadResults.length" class="text-xs text-[var(--ui-text-muted)]">{{ uploadActive ? t('cred.upload.progress', { done: uploadResults.filter(item => ['success', 'error'].includes(item.status)).length, total: uploadResults.length }) : t('cred.upload.summary', { succeeded: uploadResults.filter(item => item.status === 'success').length, failed: failedUploads.length }) }}</p>
    <div v-for="(result, index) in uploadResults" :key="result.id" class="rounded-md border border-[var(--ui-border)] p-3 text-sm">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0"><p class="truncate font-medium">{{ result.file.name }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ formatFileSize(result.file.size) }} · {{ uploadMessage(result) }}<span v-if="result.resultName"> · {{ result.resultName }}</span></p></div>
        <div class="flex gap-1"><AppButton v-if="isRetryableUpload(result)" size="xs" variant="ghost" @click="retryUpload(result)">{{ t('common.retry') }}</AppButton><AppButton v-if="result.status !== 'uploading' && !uploadActive" size="xs" variant="ghost" color="error" @click="uploadResults.splice(index, 1)">{{ t('common.remove') }}</AppButton></div>
      </div>
      <div v-if="result.status === 'uploading'" class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"><div class="h-full bg-[var(--ui-primary)]" :style="{ width: `${result.progress}%` }" /></div>
    </div>
    <div v-if="!uploadActive" class="flex gap-2"><AppButton v-if="failedUploads.filter(isRetryableUpload).length > 1" size="sm" variant="outline" @click="retryFailedUploads">{{ t('cred.upload.retryFailed') }}</AppButton><AppButton v-if="uploadResults.length" size="sm" variant="ghost" @click="uploadResults = []">{{ t('cred.upload.clearResults') }}</AppButton></div>
  </div>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, uploadActive, busy, fileInput, uploadDroppedFiles, uploadResults, failedUploads, formatFileSize, uploadMessage,
  isRetryableUpload, retryUpload, retryFailedUploads
} = useUpstreamAccounts()
</script>
