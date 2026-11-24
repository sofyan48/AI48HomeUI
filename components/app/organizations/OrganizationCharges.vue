<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import OrganizationUsageSummary from '~/components/app/organizations/OrganizationUsageSummary.vue'
import PortalPagination from '~/components/app/general/PortalPagination.vue'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

const { t, charges, chargesTotal, chargesPage, chargesLoading, chargesPageSize, loadChargesPage, isOwner, memberName } = usePortalOrganizations()
const { intlLocale } = usePortalI18n()
const formatTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
</script>

<template>
  <OrganizationUsageSummary class="mb-4" />
  <AppCard class="finance-panel">
    <template #header>
      <div>
        <h3 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-receipt" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('org.chargesTitle') }}</h3>
        <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ isOwner ? t('org.chargesOwnerHint') : t('org.chargesMemberHint') }}</p>
      </div>
    </template>
    <ul v-if="charges.length" class="divide-y divide-[var(--ui-border)]" :aria-busy="chargesLoading || undefined" :class="{ 'opacity-60': chargesLoading }">
      <li v-for="charge in charges" :key="charge.id" class="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ charge.model || '—' }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ formatTime(charge.created_at) }}<span v-if="isOwner"> · {{ memberName(charge.actor_user_id) }}</span><span v-if="charge.api_key_label"> · {{ charge.api_key_label }}</span></p>
        </div>
        <span class="shrink-0 font-semibold tabular-nums">{{ charge.amount }}</span>
      </li>
    </ul>
    <p v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('org.chargesEmpty') }}</p>
    <div v-if="chargesTotal > chargesPageSize" class="mt-4 flex justify-end">
      <PortalPagination
        :page="chargesPage"
        :total="chargesTotal"
        :items-per-page="chargesPageSize"
        :sibling-count="1"
        :disabled="chargesLoading"
        size="sm"
        @update:page="loadChargesPage"
      />
    </div>
  </AppCard>
</template>
