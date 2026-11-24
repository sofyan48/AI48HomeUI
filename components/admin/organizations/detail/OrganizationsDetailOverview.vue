<template>
  <div v-if="selected" class="grid gap-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-[var(--ui-border)] p-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.col.credits') }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">{{ selected.credits_unlimited ? '∞' : selected.credits }}</p>
      </div>
      <div class="rounded-lg border border-[var(--ui-border)] p-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.col.members') }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">{{ members.length }}</p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ owners || '—' }}</p>
      </div>
      <div class="rounded-lg border border-[var(--ui-border)] p-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.keysTitle') }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">{{ selectedKeys.length }}</p>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-lg border border-[var(--ui-border)] p-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.modelGroups') }}</p>
        <p class="mt-1 text-sm font-medium">{{ (selected.model_groups || []).map(modelGroupName).join(', ') || t('organizations.allModels') }}</p>
      </div>
      <div class="rounded-lg border border-[var(--ui-border)] p-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.overview.limits') }}</p>
        <p class="mt-1 font-mono text-xs">{{ memberLimitsSummary(selected, t('organizations.member.noLimits')) }}</p>
      </div>
    </div>
    <p class="text-xs text-[var(--ui-text-muted)]">{{ selected.allow_member_keys === false ? t('organizations.memberKeysOwnersOnly') : t('organizations.memberKeysAllowed') }}</p>
    <p v-if="selected.pending_topup" class="rounded-md border border-[var(--ui-border)] p-3 text-sm">
      {{ t('organizations.pendingTopup', { amount: selected.pending_topup.amount }) }}
    </p>
    <div class="flex flex-wrap justify-end gap-2">
      <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-receipt" :to="{ path: '/admin/billing', query: { organization: selected.id, section: 'charges' } }">{{ t('organizations.viewBilling') }}</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import { memberLimitsSummary } from '~/composables/organizations/memberLimits'

const { t, selected, selectedKeys, modelGroupName } = useOrganizationsWorkspace()

const members = computed(() => selected.value?.members || [])
const owners = computed(() => members.value.filter(member => member.role === 'owner').map(member => member.username).join(', '))
</script>
