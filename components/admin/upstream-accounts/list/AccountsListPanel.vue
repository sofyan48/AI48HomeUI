<template>
  <section class="app-surface min-w-0 overflow-hidden" :aria-label="t('cred.title')">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-selected)] text-[var(--ui-primary)]" aria-hidden="true"><AppIcon name="i-tabler-user-shield" class="size-4" /></span>
        <div class="min-w-0"><h2 class="text-sm font-semibold">{{ t('cred.title') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.subtitle') }}</p></div>
      </div>
      <div class="flex items-center gap-2">

        <AppButton size="sm" icon="i-tabler-plus" :disabled="busy" @click="createOpen = true">{{ t('cred.add') }}</AppButton>
      </div>
    </div>
    <div class="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--admin-control-bg)] px-4 py-2.5 lg:flex-row lg:items-center">
      <AdminInput v-model="search" type="search" icon="i-tabler-search" :placeholder="t('cred.searchPlaceholder')" :aria-label="t('cred.searchAria')" class="w-full lg:max-w-80 lg:flex-1" />
      <div class="grid w-full grid-cols-1 items-center gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap lg:flex-1">
        <AdminSelect v-model="statusFilter" :aria-label="t('cred.filterStatus')" :items="statusOptions" value-key="value" label-key="label" class="w-full sm:w-40" />
        <AdminSelectMenu v-model="providerFilter" :aria-label="t('cred.filterProvider')" :items="providerOptions" value-key="value" label-key="label" :search-input="{ placeholder: t('quota.searchProviders') }" class="w-full sm:w-52" />
        <div class="col-span-full flex flex-wrap gap-2 sm:col-span-1">
          <AppButton size="sm" :color="attentionOnly ? 'warning' : 'neutral'" :variant="attentionOnly ? 'soft' : 'outline'" :aria-pressed="attentionOnly" @click="attentionOnly = !attentionOnly">{{ t('cred.needsAttention') }}</AppButton>
          <AppButton size="sm" color="neutral" :variant="websocketsFilter === 'on' ? 'soft' : 'outline'" :aria-pressed="websocketsFilter === 'on'" @click="websocketsFilter = websocketsFilter === 'on' ? ALL_FILTER : 'on'">{{ t('cred.websockets') }}</AppButton>
          <AdminSelect v-model="websocketsFilter" :aria-label="t('cred.filterWebsockets')" :items="websocketsOptions" value-key="value" label-key="label" class="w-36" />
        </div>
        <div class="col-span-full flex min-h-9 items-center justify-between gap-2 sm:ml-auto">
          <span role="status" aria-live="polite" class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('cred.results', { count: filteredCredentials.length, total: credentials.length }) }}</span>
          <AppButton v-if="hasActiveFilters" size="sm" color="neutral" variant="ghost" @click="clearFilters">{{ t('cred.clearFilters') }}</AppButton>
        </div>
      </div>
    </div>
    <div>
      <div v-if="selectedIDs.size" class="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--admin-selected)] px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div><p class="text-sm font-medium">{{ t('cred.selected', { count: selectedIDs.size }) }}</p><p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('cred.selectedBreakdown', { enabled: selectedEnabledCount, disabled: selectedDisabledCount }) }}</p></div>
        <div class="flex flex-wrap gap-2">
          <AppButton size="sm" color="neutral" variant="ghost" :disabled="bulkBusy" @click="selectedIDs = new Set()">{{ t('cred.clearSelection') }}</AppButton>
          <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-check" :disabled="!selectedDisabledCount || busy || pending" :loading="bulkBusy && bulkAction === 'Enable'" @click="bulkStatus(false)">{{ t('cred.enableSelected') }}</AppButton>
          <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-alert-triangle" :disabled="!selectedEnabledCount || busy || pending" :loading="bulkBusy && bulkAction === 'Disable'" @click="bulkStatus(true)">{{ t('cred.disableSelected') }}</AppButton>
          <AppButton size="sm" color="error" variant="ghost" icon="i-tabler-trash" :disabled="busy || pending" @click="bulkDeleteOpen = true">{{ t('cred.deleteSelected') }}</AppButton>
        </div>
      </div>
      <AccountsTable />
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'
import AccountsTable from '~/components/admin/upstream-accounts/list/AccountsTable.vue'

const {
  t, ALL_FILTER, busy, createOpen, search, statusFilter, statusOptions, providerFilter, providerOptions, attentionOnly,
  websocketsFilter, websocketsOptions, filteredCredentials, credentials, hasActiveFilters, clearFilters, selectedIDs,
  selectedEnabledCount, selectedDisabledCount, bulkBusy, bulkAction, bulkStatus, pending, bulkDeleteOpen
} = useUpstreamAccounts()
</script>
