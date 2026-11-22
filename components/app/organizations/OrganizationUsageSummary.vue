<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import AppOrganizationDailyCharge from '~/components/AppOrganizationDailyCharge.vue'
import AppIcon from '~/components/AppIcon.vue'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'
import { portalOrganizationDailyTrend, usePortalOrganizationUsage } from '~/composables/organizations-portal/usePortalOrganizationUsage'

const { t, selectedId, isOwner } = usePortalOrganizations()
const { intlLocale } = usePortalI18n()
const { fetchAPI } = useUserApi()
const { usage, loading, unavailable, load, invalidate } = usePortalOrganizationUsage(fetchAPI)
onScopeDispose(invalidate)

const days = ref('30')
watch([selectedId, days], ([id]) => { if (id) void load(id, Number(days.value)) }, { immediate: true })

const amount = (value: number) => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 4 }).format(value)
const count = (value: number) => new Intl.NumberFormat(intlLocale.value, { notation: value >= 100000 ? 'compact' : 'standard' }).format(value)
const cards = computed(() => {
  const summary = usage.value?.summary
  return [
    { label: t('org.usage.charged'), value: summary ? amount(summary.billed_amount) : '—' },
    { label: t('org.usage.requests'), value: summary ? count(summary.requests) : '—' },
    { label: t('org.usage.inputTokens'), value: summary ? count(summary.input_tokens) : '—' },
    { label: t('org.usage.outputTokens'), value: summary ? count(summary.output_tokens) : '—' },
  ]
})
const daily = computed(() => portalOrganizationDailyTrend(usage.value?.daily || []))
const topModels = computed(() => (usage.value?.per_model || []).slice(0, 5))
const total = computed(() => usage.value?.summary.billed_amount || 0)
</script>

<template>
  <AppCard v-if="!unavailable" class="finance-panel">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-chart-bar" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('org.usage.title') }}</h3>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ isOwner ? t('org.usage.ownerHint') : t('org.usage.memberHint') }}</p>
        </div>
        <ToggleGroup v-model="days" type="single" variant="outline" size="sm" :aria-label="t('org.usage.range')">
          <ToggleGroupItem value="7">7d</ToggleGroupItem>
          <ToggleGroupItem value="30">30d</ToggleGroupItem>
          <ToggleGroupItem value="90">90d</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </template>
    <div class="flex flex-col gap-4" :aria-busy="loading || undefined">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div v-for="card in cards" :key="card.label" class="rounded-2xl border border-[var(--ui-border)] p-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ card.label }}</p>
          <p class="mt-1 truncate text-lg font-semibold tabular-nums" :class="{ 'opacity-50': loading }">{{ card.value }}</p>
        </div>
      </div>
      <div class="grid gap-3 lg:grid-cols-3">
        <AppOrganizationDailyCharge class="lg:col-span-2"
          :title="t('org.usage.daily')" :points="daily" :loading="loading"
          :loading-text="t('common.loading')" :empty-text="t('org.usage.empty')"
          :format-amount="amount" :format-count="count"
        />
        <div class="rounded-lg border border-[var(--ui-border)] p-3">
          <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('org.usage.byModel') }}</p>
          <ul v-if="topModels.length" class="flex flex-col gap-2">
            <li v-for="row in topModels" :key="row.model" class="flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2 text-sm"><span class="truncate">{{ row.model || '—' }}</span><span class="shrink-0 font-medium tabular-nums">{{ amount(row.billed_amount) }}</span></div>
              <div class="h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" :style="{ width: `${total > 0 ? Math.max(1, (row.billed_amount / total) * 100) : 0}%` }" /></div>
            </li>
          </ul>
          <p v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('org.usage.empty') }}</p>
        </div>
      </div>
    </div>
  </AppCard>
</template>
