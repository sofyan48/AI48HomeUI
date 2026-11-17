<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '~/components/AppCard.vue'
import AppButton from '~/components/AppButton.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { FieldGroup } from '~/components/ui/field'
import AnalyticsTrend from './AnalyticsTrend.vue'
import AnalyticsBreakdown from './AnalyticsBreakdown.vue'
import { useUserAnalytics } from '~/composables/analytics/useUserAnalytics'

const {
  t, filters, filterError, unsupported, result, pending, error, errorMessage,
  refresh, applyFilters, download, modelOptions, modelRows, keyRows,
} = useUserAnalytics()
const { intlLocale } = usePortalI18n()
const formatNumber = (value: number) => new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 8 }).format(value)
const summary = computed(() => result.value ? [
  { label: t('analytics.summary.requests'), value: result.value.summary.requests },
  { label: t('analytics.summary.billed'), value: result.value.summary.billed_amount },
  { label: t('analytics.summary.base'), value: result.value.summary.base_amount },
  { label: t('analytics.summary.unpriced'), value: result.value.summary.unpriced_requests },
  { label: t('analytics.summary.inputTokens'), value: result.value.summary.input_tokens },
  { label: t('analytics.summary.outputTokens'), value: result.value.summary.output_tokens },
  { label: t('analytics.summary.cacheTokens'), value: result.value.summary.cache_tokens },
] : [])
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5 py-3">
    <PortalAlert v-if="unsupported" color="warning" :description="t('analytics.unsupported')" />
    <PortalAlert v-else-if="error" color="error" :title="t('analytics.loadFailed')" :description="errorMessage" />
    <AppCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold">{{ t('analytics.title') }}</h2>
            <p class="text-sm text-muted-foreground">{{ t('analytics.description') }}</p>
          </div>
          <AppButton icon="i-tabler-refresh" color="neutral" variant="outline" :loading="pending" @click="refresh">{{ t('analytics.refresh') }}</AppButton>
        </div>
      </template>
      <form @submit.prevent="applyFilters">
        <FieldGroup class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PortalField :label="t('analytics.from')" required>
            <PortalInput v-model="filters.from" type="date" required :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <PortalField :label="t('analytics.to')" required>
            <PortalInput v-model="filters.to" type="date" required :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <PortalField :label="t('analytics.model')">
            <PortalSelect v-model="filters.model" :items="modelOptions" :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <PortalField :label="t('analytics.key') + ' ID'">
            <PortalInput v-model="filters.api_key_id" type="number" min="1" step="1" :placeholder="t('analytics.allKeys')" :disabled="pending || unsupported" class="w-full" />
          </PortalField>
          <div class="flex items-end">
            <AppButton type="submit" icon="i-tabler-filter" :disabled="pending || unsupported">{{ t('analytics.apply') }}</AppButton>
          </div>
        </FieldGroup>
      </form>
      <PortalAlert v-if="filterError" class="mt-3" color="error" :description="filterError" />
      <p class="mt-3 text-xs text-muted-foreground">{{ t('analytics.scopeNote') }}</p>
    </AppCard>

    <PortalSkeleton v-if="pending" class="h-64 w-full" :aria-label="t('analytics.loading')" />
    <template v-else-if="result">
      <p class="text-xs text-muted-foreground">{{ result.from }} → {{ result.to }} · UTC</p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AppCard v-for="metric in summary" :key="metric.label">
          <p class="text-xs text-muted-foreground">{{ metric.label }}</p>
          <p class="mt-2 break-words text-xl font-semibold tabular-nums">{{ formatNumber(metric.value) }}</p>
        </AppCard>
      </div>
      <div class="flex flex-wrap gap-2" :aria-label="t('analytics.export')">
        <AppButton icon="i-tabler-download" color="neutral" variant="outline" @click="download('daily')">{{ t('analytics.csvDaily') }}</AppButton>
        <AppButton icon="i-tabler-download" color="neutral" variant="outline" @click="download('models')">{{ t('analytics.csvModels') }}</AppButton>
        <AppButton icon="i-tabler-download" color="neutral" variant="outline" @click="download('keys')">{{ t('analytics.csvKeys') }}</AppButton>
      </div>
      <AnalyticsTrend :daily="result.daily" />
      <AnalyticsBreakdown :title="t('analytics.byModel')" :rows="modelRows" />
      <AnalyticsBreakdown :title="t('analytics.byKey')" :rows="keyRows" />
    </template>
  </div>
</template>
