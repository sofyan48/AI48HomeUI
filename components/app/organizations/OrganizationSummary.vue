<script setup lang="ts">
import { computed } from 'vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalProgress from '~/components/app/general/PortalProgress.vue'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'
import type { PortalSpendWindow } from '~/composables/organizations-portal/types'

const { t, summary, isOwner, memberships, selectedId, pendingAction, leaveOrganization } = usePortalOrganizations()
const { currentUser } = useUserApi()

const windows = computed(() => summary.value?.spend_limits || [])
const windowLabel = (window: PortalSpendWindow) => t(window.id === '1d' ? 'org.window1d' : window.id === '7d' ? 'org.window7d' : 'org.window30d')
const percent = (window: PortalSpendWindow) => (window.limit && window.limit > 0 ? Math.min(100, (window.used / window.limit) * 100) : 0)
const canLeave = computed(() => !isOwner.value && Boolean(currentUser.value?.id) && memberships.value.some(item => item.id === selectedId.value))
</script>

<template>
  <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <AppCard class="finance-panel">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.role') }}</p>
      <PortalBadge class="mt-2" :color="isOwner ? 'primary' : 'neutral'" variant="subtle">{{ t(isOwner ? 'org.roleOwner' : 'org.roleMember') }}</PortalBadge>
      <template v-if="isOwner">
        <p class="mt-4 text-xs text-[var(--ui-text-muted)]">{{ t('org.balance') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ summary?.credits_unlimited ? '∞' : summary?.credits ?? 0 }}</p>
        <p class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ t('org.topupHint') }}</p>
      </template>
      <p v-else class="mt-4 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('org.memberHint') }}</p>
      <AppButton
        v-if="canLeave"
        class="mt-4 rounded-full"
        color="error"
        variant="ghost"
        size="sm"
        icon="i-tabler-logout"
        :loading="pendingAction === 'leave'"
        @click="leaveOrganization(Number(currentUser?.id))"
      >
        {{ t('org.leave') }}
      </AppButton>
    </AppCard>
    <AppCard class="finance-panel">
      <h3 class="text-sm font-semibold">{{ t('org.yourLimits') }}</h3>
      <div class="mt-3 grid gap-4 sm:grid-cols-3">
        <div v-for="window in windows" :key="window.id" class="min-w-0">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ windowLabel(window) }}</p>
          <p class="mt-1 text-sm font-semibold tabular-nums">{{ window.used }} / {{ window.limit ?? '∞' }}</p>
          <PortalProgress v-if="window.limit !== null" class="mt-2" :model-value="percent(window)" />
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ window.limit === null ? t('org.noLimit') : t('org.remaining', { amount: window.remaining ?? 0 }) }}</p>
        </div>
      </div>
    </AppCard>
  </div>
</template>
