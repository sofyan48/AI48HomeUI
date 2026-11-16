<template>
  <section class="space-y-3"><div><h3 class="font-semibold text-red-600 dark:text-red-400">{{ t('cred.danger.title') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.danger.description') }}</p></div><div class="flex flex-wrap gap-2"><AppButton size="sm" color="neutral" variant="outline" @click="downloadCredential(detailsTarget)">{{ t('cred.danger.download') }}</AppButton><AppButton size="sm" color="error" variant="outline" @click="confirmDelete(detailsTarget)">{{ t('cred.danger.delete') }}</AppButton></div></section>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const { t, downloadCredential, detailsTarget, confirmDelete } = useUpstreamAccounts()
</script>
