<template>
  <section class="grid gap-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap items-end gap-2">
        <AdminField :label="t('usage.timeRange')" class="w-full sm:w-44">
          <AdminSelect :model-value="chargesFilter.range" :items="rangeItems" value-key="value" label-key="label" class="w-full" @update:model-value="setRange" />
        </AdminField>
        <AdminField :label="t('organizations.scope.member')" class="w-full sm:w-52">
          <AdminSelect :model-value="chargesFilter.member || allValue" :items="memberItems" value-key="value" label-key="label" class="w-full" @update:model-value="setMember" />
        </AdminField>
      </div>
      <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-refresh" :loading="chargesLoading || summary.loading.value" :aria-label="t('organizations.charges.refresh')" @click="reload">{{ t('organizations.charges.refresh') }}</AppButton>
    </div>

    <OrganizationsUsageSummary
      :overview="summary.overview.value" :loading="summary.loading.value" :error="summary.error.value"
      :trend-max="summary.trendMax.value" :members="selected?.members || []" :date-range="chartDateRange"
    />

    <div class="grid gap-2">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.charges.hint') }}</p>
      <PortalAlert v-if="chargesError" color="error" variant="subtle" icon="i-tabler-alert-circle" :description="chargesError" />
      <AppTable :columns="columns" :data="charges" :loading="chargesLoading">
        <template #time-cell="{ row }">
          <span class="text-xs">{{ formatTime(charge(row).created_at) }}</span>
        </template>
        <template #model-cell="{ row }">
          <p class="font-medium">{{ charge(row).model || '—' }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ charge(row).provider }}</p>
        </template>
        <template #member-cell="{ row }">
          <p class="text-sm">{{ memberName(charge(row).actor_user_id) }}</p>
          <p v-if="charge(row).api_key_label" class="text-xs text-[var(--ui-text-muted)]">{{ charge(row).api_key_label }}</p>
        </template>
        <template #amount-cell="{ row }">
          <span class="font-semibold tabular-nums">{{ charge(row).amount }}</span>
        </template>
        <template #empty>
          <div class="py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('organizations.charges.empty') }}</div>
        </template>
      </AppTable>
      <div v-if="chargesTotal > chargesPageSize" class="flex justify-end">
        <PortalPagination :page="chargesPage" :total="chargesTotal" :items-per-page="chargesPageSize" :sibling-count="1" :disabled="chargesLoading" size="sm" @update:page="loadCharges" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose } from 'vue'
import { useAdminI18n, useApi } from '#imports'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalPagination from '~/components/app/general/PortalPagination.vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import OrganizationsUsageSummary from '~/components/admin/organizations/detail/OrganizationsUsageSummary.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import { datesForRange } from '~/composables/usage/useUsageFilters'
import { useOrganizationUsageSummary } from '~/composables/organizations/useOrganizationUsageSummary'
import type { OrganizationCharge } from '~/composables/organizations/types'

const {
  t, selected, charges, chargesTotal, chargesPage, chargesLoading, chargesError, chargesPageSize, loadCharges,
  chargesFilter, chargesScopeQuery,
} = useOrganizationsWorkspace()
const { intlLocale } = useAdminI18n()
const { fetchAPI } = useApi()
const summary = useOrganizationUsageSummary(fetchAPI)
onScopeDispose(summary.invalidate)

const chartDateRange = computed(() => datesForRange(chargesFilter.value.range))
const allValue = '__all__'
const rangeItems = computed(() => [
  { label: t('common.today'), value: 'today' },
  { label: t('common.last7d'), value: '7d' },
  { label: t('common.last30d'), value: '30d' },
  { label: t('usage.range.month'), value: 'month' },
  { label: t('usage.range.all'), value: 'all' },
])
const memberItems = computed(() => [
  { label: t('organizations.scope.allMembers'), value: allValue },
  ...(selected.value?.members || []).map(member => ({ label: member.username, value: String(member.user_id) })),
])

function loadSummary() {
  const org = selected.value
  if (org) void summary.load(chargesScopeQuery(org.id), t('organizations.usage.loadFailed'))
}
function reload() {
  loadSummary()
  void loadCharges(1)
}
function setRange(value: unknown) {
  chargesFilter.value = { ...chargesFilter.value, range: String(value || '30d') }
  reload()
}
function setMember(value: unknown) {
  chargesFilter.value = { ...chargesFilter.value, member: value === allValue ? '' : String(value ?? '') }
  reload()
}
onMounted(loadSummary)

const columns = computed(() => [
  { accessorKey: 'time', header: t('organizations.charges.time') },
  { accessorKey: 'model', header: t('organizations.charges.model') },
  { accessorKey: 'member', header: t('organizations.charges.member') },
  { accessorKey: 'amount', header: t('organizations.charges.amount') },
])

const charge = (row: OrganizationCharge | { original: OrganizationCharge }): OrganizationCharge => ('original' in row ? row.original : row)
const formatTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
const memberName = (id: number | null | undefined) => {
  if (id === null || id === undefined) return t('organizations.key.adminOwned')
  return (selected.value?.members || []).find(item => item.user_id === id)?.username || t('organizations.key.formerMember')
}
</script>
