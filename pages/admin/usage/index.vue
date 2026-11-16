<script setup lang="ts">
import AdminUsageLegacyRecords from '~/components/admin/usage/UsageLegacyRecords.vue'
import AdminRequestRecords from '~/components/admin/usage/RequestRecords.vue'
import AdminUsageInsights from '~/components/admin/usage/UsageInsights.vue'
import UsageFilters from '~/components/admin/usage/overview/UsageFilters.vue'
import UsageSummary from '~/components/admin/usage/overview/UsageSummary.vue'
import UsageCharts from '~/components/admin/usage/overview/UsageCharts.vue'
import UsageRankingCards from '~/components/admin/usage/ranking/UsageRankingCards.vue'
import UsageRankingDialog from '~/components/admin/usage/ranking/UsageRankingDialog.vue'
import UsageCredentials from '~/components/admin/usage/credentials/UsageCredentials.vue'
import UsageDetailDialog from '~/components/admin/usage/detail/UsageDetailDialog.vue'
import { provideUsagePage } from '~/composables/usage/useUsagePage'

const { t, activeView, usageTabs, setView, legacyRecords, capabilitiesReady, errorMessage, supports, insightQuery } = provideUsagePage()
</script>

<template>
  <div class="space-y-4">
    <AppPanelTabs :model-value="activeView" :items="usageTabs" :label="t('usage.tabsLabel')" @update:model-value="setView" />

    <template v-if="activeView === 'requests'">
      <AdminUsageLegacyRecords v-if="legacyRecords" />
      <AdminRequestRecords v-else-if="capabilitiesReady" />
      <p v-else role="status" class="text-sm text-[var(--ui-text-muted)]">{{ t('usage.checkingCapabilities') }}</p>
    </template>

    <template v-else>
      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </div>

      <UAlert v-if="!supports('usage_overview')" color="warning" variant="subtle" :title="t('usage.overviewUnavailable')" />
      <UsageFilters />
      <UsageSummary />
      <UsageCharts />
      <UsageRankingCards />
      <UsageCredentials />
      <AdminUsageInsights :common-query="insightQuery" />
      <UsageRankingDialog />
      <UsageDetailDialog />
    </template>
  </div>
</template>
