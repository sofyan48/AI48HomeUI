<template>
  <section class="space-y-3"><div><h3 class="font-semibold">{{ t('cred.tab.overview') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.overview.description') }}</p></div><dl class="grid gap-3 text-sm"><div v-for="entry in overviewFields(detailsTarget)" :key="entry.label" class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"><dt class="text-xs text-[var(--ui-text-muted)]">{{ entry.label }}</dt><dd class="mt-1 break-words font-mono text-xs">{{ entry.value }}</dd></div></dl><PortalAlert v-if="detailsTarget.status_message" color="warning" variant="subtle" :description="detailsTarget.status_message" /></section>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const { t, overviewFields, detailsTarget } = useUpstreamAccounts()
</script>
