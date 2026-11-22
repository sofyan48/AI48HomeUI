<script setup lang="ts">
import { computed } from 'vue'
import AppOrganizationMemberReset from '~/components/AppOrganizationMemberReset.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalProgress from '~/components/app/general/PortalProgress.vue'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'
import { enabledSpendWindows } from '~/composables/organizations/memberLimits'
import type { PortalSpendWindow } from '~/composables/organizations-portal/types'

const { t, summary, isOwner, memberships, selectedId, pendingAction, leaveOrganization, memberResetSupported, updateMemberReset } = usePortalOrganizations()
const { currentUser } = useUserApi()

const windows = computed(() => enabledSpendWindows(summary.value?.spend_limits ?? []))
const windowLabel = (window: PortalSpendWindow) => t(`org.limitWindow${window.id}`)
const modeLabel = (window: PortalSpendWindow) => t(window.mode === 'first_use' ? 'org.modeFirstUse' : window.mode === 'calendar' ? 'org.modeCalendar' : 'org.modeSliding')
const resetText = (window: PortalSpendWindow) => {
  if (window.mode === 'first_use' && window.active === false) return t('org.opensOnUse')
  return window.reset_at ? t('org.resetsAt', { time: new Date(window.reset_at).toLocaleString() }) : ''
}
const percent = (window: PortalSpendWindow) => (window.limit && window.limit > 0 ? Math.min(100, (window.used / window.limit) * 100) : 0)
const canLeave = computed(() => !isOwner.value && Boolean(currentUser.value?.id) && memberships.value.some(item => item.id === selectedId.value))
</script>

<template>
  <div class="grid gap-4" :class="{ 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]': !isOwner }">
    <AppCard v-if="!isOwner" class="finance-panel">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.role') }}</p>
      <PortalBadge class="mt-2" :color="isOwner ? 'primary' : 'neutral'" variant="subtle">{{ t(isOwner ? 'org.roleOwner' : 'org.roleMember') }}</PortalBadge>
      <p class="mt-4 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('org.memberHint') }}</p>
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
    <AppCard v-if="windows.length" class="finance-panel">
      <template #header>
        <h3 class="text-sm font-semibold">{{ t('org.yourLimits') }}</h3>

      </template>
      <AppOrganizationMemberReset
        v-if="memberResetSupported && summary?.member" :key="`${selectedId}:${summary.member.user_id}`"
        class="mt-3" :member="summary.member" :can-configure="isOwner"
        :save="(body, signal) => updateMemberReset(summary!.member!.user_id, signal, body)"
        :reset="signal => updateMemberReset(summary!.member!.user_id, signal)"
      />
      <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="window in windows" :key="window.id" class="min-w-0 rounded-lg border border-border p-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ windowLabel(window) }}<span v-if="window.mode"> · {{ modeLabel(window) }}</span></p>
          <p class="mt-1 text-sm font-semibold tabular-nums">{{ window.used }} / {{ window.limit ?? '∞' }}</p>
          <PortalProgress v-if="window.limit !== null" class="mt-2" :model-value="percent(window)" />
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ window.limit === null ? t('org.noLimit') : t('org.remaining', { amount: window.remaining ?? 0 }) }}</p>
          <p v-if="window.limit !== null && resetText(window)" class="text-xs text-[var(--ui-text-muted)]">{{ resetText(window) }}</p>
        </div>
      </div>
    </AppCard>
  </div>
</template>
