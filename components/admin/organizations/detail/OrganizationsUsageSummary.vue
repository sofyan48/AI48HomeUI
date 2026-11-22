<template>
  <section class="grid gap-3" :aria-label="t('organizations.usage.title')" :aria-busy="loading || undefined">
    <PortalAlert v-if="error" color="error" variant="subtle" icon="i-tabler-alert-circle" :description="error" />
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-7">
      <div v-for="card in cards" :key="card.label" class="rounded-lg border border-[var(--ui-border)] p-3" :class="card.wide ? 'col-span-2' : ''">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ card.label }}</p>
        <p class="mt-1 truncate text-lg font-semibold tabular-nums" :class="{ 'opacity-50': loading }">{{ card.value }}</p>
      </div>
    </div>
    <div class="grid gap-3 lg:grid-cols-3">
      <AppOrganizationDailyCharge class="lg:col-span-2"
        :title="t('organizations.usage.daily')" :points="trend" :loading="loading"
        :loading-text="t('organizations.scope.loading')" :empty-text="t('organizations.usage.empty')"
        :format-amount="formatAmount" :format-count="formatCount"
      />
      <div class="rounded-lg border border-[var(--ui-border)] p-3">
        <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('organizations.usage.byMember') }}</p>
        <OrganizationsUsageRanking :items="memberItems" :total="overview?.total_charge_amount || 0" :empty="t('organizations.usage.empty')" :format-amount="formatAmount" />
        <p class="mb-2 mt-4 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('organizations.usage.byModel') }}</p>
        <OrganizationsUsageRanking :items="overview?.top_models || []" :total="overview?.total_charge_amount || 0" :empty="t('organizations.usage.empty')" :format-amount="formatAmount" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppOrganizationDailyCharge from '~/components/AppOrganizationDailyCharge.vue'
import { useAdminI18n } from '#imports'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import OrganizationsUsageRanking from '~/components/admin/organizations/detail/OrganizationsUsageRanking.vue'
import type { OrganizationMember } from '~/composables/organizations/types'
import { fillOrganizationDailyTrend } from '~/composables/organizations/useOrganizationUsageSummary'
import type { OrganizationUsageOverview } from '~/composables/organizations/useOrganizationUsageSummary'

const props = defineProps<{
  overview: OrganizationUsageOverview | null
  loading: boolean
  error: string
  trendMax: number
  members: OrganizationMember[]
  dateRange: { from: string, to: string }
}>()
const { t, intlLocale } = useAdminI18n()

const formatAmount = (value: number) => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 4 }).format(value)
const formatCount = (value: number) => new Intl.NumberFormat(intlLocale.value, { notation: value >= 100000 ? 'compact' : 'standard' }).format(value)

const trend = computed(() => fillOrganizationDailyTrend(
  props.overview?.daily_trend || [], props.dateRange.from, props.dateRange.to,
).map(point => ({
  date: point.date, amount: point.charge_amount, requests: point.request_count,
})))

const memberItems = computed(() => (props.overview?.top_members || []).map(item => {
  const member = props.members.find(entry => String(entry.user_id) === String(item.id))
  return { ...item, label: member?.username || item.label || t('organizations.key.formerMember') }
}))

const cards = computed(() => {
  const data = props.overview
  return [
    { label: t('organizations.usage.charged'), value: data ? formatAmount(data.total_charge_amount) : '—', wide: true },
    { label: t('organizations.usage.requests'), value: data ? formatCount(data.request_count) : '—' },
    { label: t('organizations.usage.inputTokens'), value: data ? formatCount(data.input_tokens) : '—' },
    { label: t('organizations.usage.outputTokens'), value: data ? formatCount(data.output_tokens) : '—' },
    { label: t('organizations.usage.cacheTokens'), value: data ? formatCount(data.cache_tokens) : '—' },
    { label: t('organizations.usage.activeMembers'), value: data ? formatCount(data.top_members.length || data.active_user_count) : '—' },
  ]
})
</script>
