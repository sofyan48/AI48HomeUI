<template>
  <section class="grid w-full gap-4">
    <AdminStatGrid v-if="hasLoaded && !primaryError" :label="t('keys.summaryLabel')" :items="keySummary" :columns="4" />
    <AppCard v-if="primaryError">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold text-[var(--ui-text-highlighted)]">{{ t('keys.loadErrorTitle') }}</h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('keys.loadErrorHint') }}</p>
        </div>
        <AppButton color="neutral" variant="outline" icon="i-tabler-refresh" :loading="loading" @click="syncData">{{ t('common.retry') }}</AppButton>
      </div>
    </AppCard>
    <AppCard v-else-if="loading && !hasLoaded">
      <div class="py-8 text-center">
        <h2 class="font-semibold text-[var(--ui-text-highlighted)]">{{ t('keys.loadingTitle') }}</h2>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('keys.loadingHint') }}</p>
      </div>
    </AppCard>
    <AccessKeysTable v-else :table="table" @create="sheet.openCreate" @bulk-delete="deletion.openBulkDelete" @replaced="handleListReplaced" />
    <AccessKeySheet :sheet="sheet" @delete="deletion.openDelete" />
    <AccessKeyDeleteDialog :deletion="deletion" />
  </section>
</template>

<script setup lang="ts">
import AdminStatGrid from '~/components/admin/general/StatGrid.vue'
import AccessKeysTable from '~/components/admin/access-keys/AccessKeysTable.vue'
import AccessKeySheet from '~/components/admin/access-keys/AccessKeySheet.vue'
import AccessKeyDeleteDialog from '~/components/admin/access-keys/AccessKeyDeleteDialog.vue'
import { provideAccessKeys } from '~/composables/access-keys/useAccessKeys'
import { useAccessKeySheet } from '~/composables/access-keys/useAccessKeySheet'
import { useAccessKeyDeletion } from '~/composables/access-keys/useAccessKeyDeletion'
import { useAccessKeyTable } from '~/composables/access-keys/useAccessKeyTable'
import { useAccessKeySummary } from '~/composables/access-keys/useAccessKeySummary'
import { useDataSync } from '~/composables/useDataSync'

const state = provideAccessKeys()
const { t, hasLoaded, primaryError, loading, syncData, handleListReplaced } = state
const sheet = useAccessKeySheet(state)
const deletion = useAccessKeyDeletion(state)
const table = useAccessKeyTable(state, { openDetail: sheet.openDetail, openEdit: sheet.openEdit, openDelete: deletion.openDelete })
const keySummary = useAccessKeySummary(state)
useDataSync('admin:access-keys:sync', syncData)
await syncData()
</script>
