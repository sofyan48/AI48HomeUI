<template>
  <div class="min-w-0 overflow-x-auto">
    <AppTable :columns="columns" :data="pagedCredentials" :loading="pending" :number-offset="(page - 1) * pageSize" class="accounts-table min-w-0">
      <template #select-header><input type="checkbox" :aria-label="t('cred.selectAll')" :checked="allVisibleSelected" :indeterminate="someVisibleSelected && !allVisibleSelected" :disabled="bulkBusy || pending || !pagedCredentials.length" @change="toggleAllVisible($event.target.checked)"></template>
      <template #select-cell="{ row }"><input type="checkbox" :aria-label="t('cred.selectOne', { name: value(row).label || value(row).name || value(row).id })" :checked="selectedIDs.has(value(row).id)" :disabled="bulkBusy || pending" @change="toggleSelected(value(row).id, $event.target.checked)"></template>
      <template #identity-cell="{ row }"><div class="flex min-w-0 items-center gap-2.5"><span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-elevated)] text-[var(--ui-primary)]"><AppIcon name="i-tabler-key" class="size-4" /></span><div class="min-w-0"><p class="truncate font-medium">{{ value(row).label || value(row).name }}</p><p class="mt-1 truncate font-mono text-xs text-[var(--ui-text-muted)]" :title="credentialIdentifier(value(row))">{{ compactIdentifier(credentialIdentifier(value(row))) }}</p><p v-if="value(row).note" class="mt-0.5 truncate text-xs text-[var(--ui-text-muted)]">{{ value(row).note }}</p></div></div></template>
      <template #provider-cell="{ row }"><div class="flex flex-col items-start gap-1"><PortalBadge color="primary" variant="subtle">{{ value(row).provider || value(row).type || t('common.unknown') }}</PortalBadge><PortalBadge v-if="value(row).type && String(value(row).type).toLowerCase() !== String(value(row).provider || '').toLowerCase()" color="neutral" variant="subtle" class="font-mono text-xs">{{ value(row).type }}</PortalBadge></div></template>
      <template #status-cell="{ row }"><div class="flex items-center gap-2"><AdminSwitch :model-value="!value(row).disabled" :disabled="busy" :loading="changing === value(row).id" :aria-label="value(row).disabled ? t('cred.enableOne', { name: value(row).label || value(row).id }) : t('cred.disableOne', { name: value(row).label || value(row).id })" @update:model-value="toggleStatus(value(row))" /><PortalBadge :color="credentialColor(value(row))" variant="subtle"><AppIcon :name="value(row).disabled || value(row).unavailable ? 'i-tabler-alert-triangle' : 'i-tabler-circle-check'" class="mr-1 inline size-3" />{{ credentialStatusLabel(credentialStatus(value(row))) }}</PortalBadge></div></template>
      <template #concurrency-cell="{ row }"><div class="text-sm"><span class="font-semibold">{{ concurrency(value(row)).in_flight || value(row).in_flight || 0 }}</span><span class="text-[var(--ui-text-muted)]"> / {{ concurrency(value(row)).max_in_flight ?? value(row).max_in_flight ?? '∞' }}</span><p v-if="concurrency(value(row)).total_saturated || value(row).total_saturated" class="text-xs text-amber-500">{{ t('cred.saturated') }}</p></div></template>
      <template #quota-cell="{ row }">
        <button type="button" class="rounded-md p-1 -m-1 text-left hover:bg-[var(--ui-hover)]" :aria-label="t('cred.viewQuotaFor', { name: value(row).label || value(row).id })" @click="openAccountQuota(value(row))">
          <AdminCredentialQuotaPreview :quota="quotaByID.get(value(row).id)" :pending="quotaPending" :read-error="quotaError" />
        </button>
      </template>
      <template #websockets-cell="{ row }">
        <div v-if="['on', 'off'].includes(credentialWebsocketState(value(row)))" class="flex flex-col items-start gap-1" :title="t('cred.wsSettingTitle')">
          <AdminSwitch :model-value="credentialWebsocketState(value(row)) === 'on'" :disabled="busy || !value(row).id" :loading="inlineChanging === value(row).id" :aria-label="t('cred.wsFor', { name: value(row).label || value(row).name || value(row).id })" @update:model-value="setInlineField(value(row), 'websockets', $event)" />
          <span class="text-xs text-[var(--ui-text-muted)]">{{ credentialWebsocketState(value(row)) === 'on' ? t('cred.wsEnabled') : t('cred.wsDisabled') }}</span>
        </div>
        <span v-else class="text-xs text-[var(--ui-text-muted)]" :title="supportsWebsockets(value(row)) ? t('cred.wsUnknownTitle') : t('cred.wsNotApplicable')">{{ supportsWebsockets(value(row)) ? t('common.unknown') : t('cred.na') }}</span>
      </template>
      <template #cooling-cell="{ row }"><AdminSwitch :model-value="!value(row)['disable-cooling']" :disabled="busy || !value(row).id" :loading="inlineChanging === value(row).id" :aria-label="t('cred.coolingFor', { name: value(row).label || value(row).name || value(row).id })" @update:model-value="setInlineField(value(row), 'disable_cooling', !$event)" /></template>
      <template #priority-cell="{ row }"><span class="font-mono text-xs tabular-nums" :title="value(row).priority == null ? t('cred.notSet') : undefined">{{ value(row).priority ?? '—' }}</span></template>
      <template #actions-cell="{ row }">
        <AdminRowActions :actions="credentialRowActions(value(row))" :max-inline="1" :menu-label="t('cred.menuLabel', { name: value(row).label || value(row).name || value(row).id })" />
      </template>
      <template #empty><div class="py-8 text-center text-sm text-[var(--ui-text-muted)]"><p>{{ pending ? t('cred.loadingAccounts') : pageError ? t('cred.loadAccountsFailed') : hasActiveFilters ? t('cred.noMatching') : t('cred.none') }}</p><AppButton v-if="hasActiveFilters && !pending" class="mt-3" color="neutral" variant="outline" size="sm" @click="clearFilters">{{ t('cred.clearFilters') }}</AppButton></div></template>
    </AppTable>

  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import AdminCredentialQuotaPreview from '~/components/admin/credentials/CredentialQuotaPreview.vue'
import AdminRowActions from '~/components/admin/general/RowActions.vue'

import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { credentialWebsocketState } from '~/composables/credentialTransport'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, value, columns, filteredCredentials, pagedCredentials, page, pageSize, pending, allVisibleSelected, someVisibleSelected, bulkBusy, toggleAllVisible,
  selectedIDs, toggleSelected, credentialIdentifier, compactIdentifier, busy, changing, toggleStatus, credentialColor,
  credentialStatusLabel, credentialStatus, concurrency, openAccountQuota, quotaByID, quotaPending, quotaError,
  inlineChanging, setInlineField, supportsWebsockets, credentialRowActions, pageError, hasActiveFilters, clearFilters
} = useUpstreamAccounts()
</script>

<style scoped>
.accounts-table :deep(th:first-child),
.accounts-table :deep(td:first-child) { width: 2.75rem; }

</style>
