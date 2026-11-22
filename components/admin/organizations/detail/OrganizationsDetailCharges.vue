<template>
  <section class="grid gap-2">
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.charges.hint') }}</p>
      <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="chargesLoading" :aria-label="t('organizations.charges.refresh')" @click="loadCharges()" />
    </div>
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
      <PortalPagination
        :page="chargesPage"
        :total="chargesTotal"
        :items-per-page="chargesPageSize"
        :sibling-count="1"
        :disabled="chargesLoading"
        size="sm"
        @update:page="loadCharges"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminI18n } from '#imports'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalPagination from '~/components/app/general/PortalPagination.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import type { OrganizationCharge } from '~/composables/organizations/types'

const {
  t, selected, charges, chargesTotal, chargesPage, chargesLoading, chargesError, chargesPageSize, loadCharges,
} = useOrganizationsWorkspace()
const { intlLocale } = useAdminI18n()

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
