<template>
  <div class="space-y-4">
    <PortalAlert v-if="loadError" color="error" variant="subtle" :title="t('dashboard.loadErrorTitle')" :description="loadError">
      <template #actions>
        <AppButton color="neutral" variant="outline" size="sm" @click="refreshDashboard">{{ t('common.retry') }}</AppButton>
      </template>
    </PortalAlert>

    <div v-if="snapshot && !loadError" class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <DashboardHero class="lg:col-span-5" />
      <DashboardMetrics class="lg:col-span-7" />

      <AdminDashboardTokenTrend v-if="tokenTrend.length" :class="activity.length ? 'lg:col-span-8' : 'lg:col-span-12'" :trend="tokenTrend" :range="usage?.range" />
      <AdminDashboardRequestHealth v-if="activity.length" :class="tokenTrend.length ? 'lg:col-span-4' : 'lg:col-span-12'" :activity="activity" :range="usage?.range" />

      <DashboardRankCard
        class="lg:col-span-4"
        tone="violet"
        :title="t('dashboard.topClientKeys')"
        :summary="t('dashboard.topClientKeysSummary', { active: formatNumber(usage?.totals?.active_client_key_count ?? 0), quiet: formatNumber(quietKeyCount), configured: formatNumber(clientKeys.length) })"
        :details-label="t('dashboard.keyUsageDetails')"
        :items="topClientKeys"
        :label-of="keyLabel"
        empty-icon="i-tabler-key-off"
        :empty-text="usage ? t('dashboard.noKeyActivity') : t('dashboard.keyUsageUnavailable')"
      />
      <DashboardRankCard
        class="lg:col-span-4"
        tone="blue"
        :title="t('dashboard.modelDistribution')"
        :summary="t('dashboard.modelsUsed', { count: formatNumber(usage?.totals?.active_model_count ?? 0) })"
        :details-label="t('dashboard.modelUsageDetails')"
        :items="topModels"
        :label-of="(item) => item.label || item.id"
        empty-icon="i-tabler-box-off"
        :empty-text="usage ? t('dashboard.noModelActivity') : t('dashboard.modelUsageUnavailable')"
      />
      <DashboardInventory class="lg:col-span-4" />

      <DashboardProviderAccess class="lg:col-span-7" />
      <DashboardConfigSwitches class="lg:col-span-5" />
    </div>
    <p v-else-if="loading" class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('dashboard.loading') }}</p>
  </div>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AdminDashboardTokenTrend from '~/components/admin/dashboard/DashboardTokenTrend.vue'
import AdminDashboardRequestHealth from '~/components/admin/dashboard/DashboardRequestHealth.vue'
import { computed, onMounted } from 'vue'
import { useDataSync } from '~/composables/useDataSync'
import { provideDashboard } from '~/composables/dashboard/useDashboard'
import { useDashboardFormat } from '~/composables/dashboard/format'
import DashboardConfigSwitches from '~/components/admin/dashboard/DashboardConfigSwitches.vue'
import DashboardHero from '~/components/admin/dashboard/DashboardHero.vue'
import DashboardInventory from '~/components/admin/dashboard/DashboardInventory.vue'
import DashboardMetrics from '~/components/admin/dashboard/DashboardMetrics.vue'
import DashboardProviderAccess from '~/components/admin/dashboard/DashboardProviderAccess.vue'
import DashboardRankCard from '~/components/admin/dashboard/DashboardRankCard.vue'
import '~/components/admin/dashboard/dashboard.css'

// All dashboard state lives in useDashboard(); sections read it through inject.
const { t } = useAdminI18n()
const { loading, loadError, snapshot, usage, clientKeys, snapshotUsers, refreshDashboard } = provideDashboard()
const { formatNumber } = useDashboardFormat()

const topClientKeys = computed<any[]>(() => Array.isArray(usage.value?.top?.client_keys) ? usage.value.top.client_keys.slice(0, 3) : [])
const topModels = computed<any[]>(() => Array.isArray(usage.value?.top?.models) ? usage.value.top.models.slice(0, 3) : [])
const activity = computed(() => Array.isArray(usage.value?.activity) ? usage.value.activity : [])
// The token chart needs a total for every point, otherwise it would draw misleading gaps.
const tokenTrend = computed(() =>
  Array.isArray(usage.value?.trend)
  && usage.value?.totals?.token_breakdown?.total_tokens != null
  && usage.value.trend.every((point: any) => point.token_breakdown?.total_tokens != null)
    ? usage.value.trend
    : [])
const quietKeyCount = computed(() => Math.max(0, clientKeys.value.length - Number(usage.value?.totals?.active_client_key_count || 0)))

function keyLabel(item: any) {
  if (item.metadata?.username) return item.metadata.username
  const owner = snapshotUsers.value.find(user => Number(user.id) === Number(item.metadata?.user_id))
  if (owner?.username) return owner.username
  const key = clientKeys.value.find(entry => String(entry.id) === String(item.metadata?.api_key_id || item.id))
  return key?.display_name || key?.name || item.label || item.id || t('dashboard.clientKey')
}

useDataSync('admin:dashboard:sync', refreshDashboard)
onMounted(refreshDashboard)
</script>
