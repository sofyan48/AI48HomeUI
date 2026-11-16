<template>
  <AppModal v-model:open="open" :title="t('users.userDetail')" :description="t('users.userDetailDescription')" :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div v-if="user" class="grid gap-5">
        <div class="rounded-md border border-[var(--ui-border)] p-4">
          <div class="flex flex-wrap gap-2">
            <PortalBadge :color="user.deleted_at || user.approval_pending ? 'warning' : 'success'" variant="subtle">{{ userStatus(user) }}</PortalBadge>
            <PortalBadge v-if="user.password_set || user.has_password" color="neutral" variant="subtle">{{ t('users.passwordStored') }}</PortalBadge>
          </div>
          <p class="mt-3 font-semibold">{{ user.username }}</p>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.userId', { id: user.id }) }}</p>
        </div>
        <UsersDetailSection :title="t('users.profile')" :items="profileItems(user)" />
        <UsersDetailSection :title="t('users.pendingTopup')" :items="topupItems(user)" />
        <UsersDetailSection v-if="resetAllowanceSupported" :title="t('users.resetAllowance')" :items="resetAllowanceItems(user)" />

        <section class="grid gap-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold">{{ t('users.periodLimits') }}</h3>
            <AppButton
              v-if="periodLimitsSupported"
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-tabler-refresh"
              :disabled="saving || !periods || !!periodError"
              @click="resetDialog?.openFor(user)"
            >
              {{ t('users.resetEllipsis') }}
            </AppButton>
          </div>
          <div v-if="periodLoading && !periods" class="grid gap-2">
            <PortalSkeleton v-for="window in periodWindowIds" :key="window" class="h-20 w-full rounded-md" />
          </div>
          <div v-else-if="periodError" class="grid gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950">
            <p class="text-sm text-red-700 dark:text-red-300">{{ t('users.periodStatusFailed') }}</p>
            <p class="break-words text-xs text-red-600 dark:text-red-400">{{ periodError }}</p>
            <div>
              <AppButton size="sm" color="neutral" variant="outline" @click="loadPeriods(user)">{{ t('common.retry') }}</AppButton>
            </div>
          </div>
          <div v-else-if="periods" class="grid gap-3">
            <div class="flex flex-wrap gap-2">
              <PortalBadge color="neutral" variant="subtle">{{ t('users.timezoneLabel') }} {{ periods.timezone || user.timezone || 'Asia/Shanghai' }}</PortalBadge>
              <PortalBadge v-if="periods.credits_unlimited || periods.creditsUnlimited || user.credits_unlimited" color="info" variant="subtle">
                {{ t('users.unlimitedBalance') }}
              </PortalBadge>
            </div>
            <UsersPeriodCard v-for="window in windows" :key="window.id" :window="window" />
          </div>
          <div v-else class="rounded-md border border-dashed border-[var(--ui-border)] px-3 py-2.5 text-xs text-[var(--ui-text-muted)]">
            {{ t('users.periodStatusUnsupported') }}
          </div>
        </section>

        <UsersDetailSection :title="t('users.accessScope')" :items="accessItems(user)" />
      </div>
    </template>
  </AppModal>

  <UsersPeriodResetDialog ref="resetDialog" :periods="periods" @reset="periods = $event" />
</template>

<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import AppModal from '~/components/AppModal.vue'
import { computed, ref } from 'vue'
import UsersDetailSection from './UsersDetailSection.vue'
import UsersPeriodCard from './UsersPeriodCard.vue'
import UsersPeriodResetDialog from './UsersPeriodResetDialog.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'
import { periodWindowIds, periodWindowList } from '~/composables/users/periods'

const {
  t, fetchAPI, saving, periodLimitsSupported, resetAllowanceSupported, errorMessage, formatCredits, formatDate,
  userStatus, periodWindowLabel, periodModeLabel, keysForUser, scopeSummary, effectiveChannelScopes, effectiveModelScopes
} = useUsersWorkspace()

const open = ref(false)
const user = useWorkspaceState<AnyRecord | null>('admin:users:userDetail', () => null)
const periods = useWorkspaceState<AnyRecord | null>('admin:users:detailPeriods', () => null)
const periodLoading = useWorkspaceState('admin:users:detailPeriodLoading', () => false)
const periodError = useWorkspaceState('admin:users:detailPeriodError', () => '')
const resetDialog = ref<InstanceType<typeof UsersPeriodResetDialog> | null>(null)

async function openFor(target: AnyRecord) {
  open.value = true
  user.value = target
  periods.value = null
  periodError.value = ''
  try {
    const response = await fetchAPI(`/users/${encodeURIComponent(target.id)}`)
    user.value = { ...target, ...(response?.user || response || {}) }
  } catch {}
  if (periodLimitsSupported.value) await loadPeriods(target)
}

async function loadPeriods(target: AnyRecord) {
  periodLoading.value = true
  periodError.value = ''
  try {
    periods.value = await fetchAPI(`/users/${encodeURIComponent(target.id)}/period-limits`)
  } catch (error) {
    periodError.value = errorMessage(error)
  } finally {
    periodLoading.value = false
  }
}

function topupItems(target: AnyRecord) {
  const request = target.pending_topup
  return request ? [
    { label: t('users.requestId'), value: String(request.id) },
    { label: t('users.amount'), value: t('users.creditsAmount', { amount: formatCredits(request.amount) }) },
    { label: t('users.requested'), value: formatDate(request.created_at) },
    { label: t('users.note'), value: request.note || '—' }
  ] : [{ label: t('users.request'), value: t('common.none') }]
}

function resetAllowanceItems(target: AnyRecord) {
  const allowance = target.reset_allowance
  return allowance ? [
    { label: t('users.available'), value: String(allowance.available) },
    { label: t('users.mode'), value: allowance.mode === 'monthly' ? t('users.monthly') : t('users.oneTime') },
    { label: t('users.amount'), value: String(allowance.amount) },
    { label: t('users.renews'), value: formatDate(allowance.renews_at) },
    { label: t('users.expires'), value: formatDate(allowance.expires_at) }
  ] : [{ label: t('users.allowance'), value: t('users.notConfigured') }]
}

function profileItems(target: AnyRecord) {
  const mfa = Array.isArray(target.mfa)
    ? target.mfa.length > 0
    : target.mfa && typeof target.mfa === 'object'
      ? Object.keys(target.mfa).length > 0
      : Boolean(target.mfa || target.totp_enabled)
  const passkeys = Array.isArray(target.passkey)
    ? target.passkey.length
    : Array.isArray(target.passkeys)
      ? target.passkeys.length
      : target.passkey && typeof target.passkey === 'object' ? 1 : Number(target.passkey_count || 0)
  return [
    { label: t('common.created'), value: formatDate(target.created_at) },
    { label: t('common.updated'), value: formatDate(target.updated_at) },
    { label: t('users.deletedAt'), value: target.deleted_at ? formatDate(target.deleted_at) : t('users.notDeleted') },
    { label: t('users.credits'), value: target.credits_unlimited ? t('users.unlimited') : formatCredits(target.credits) },
    { label: 'MFA', value: mfa ? t('common.enabled') : t('common.disabled') },
    { label: t('users.passkeys'), value: String(passkeys) }
  ]
}

function accessItems(target: AnyRecord) {
  return [
    { label: t('users.clientKeys'), value: String(keysForUser(target.id).length) },
    { label: t('users.credentialScope'), value: scopeSummary(effectiveChannelScopes(target.id)) },
    { label: t('users.modelScope'), value: scopeSummary(effectiveModelScopes(target.id)) }
  ]
}

const statusLabels = computed<Record<string, string>>(() => ({
  Disabled: t('common.disabled'),
  Exhausted: t('users.exhausted'),
  Active: t('common.active'),
  'Not started': t('users.notStarted')
}))

const windows = computed(() => {
  const list = periodWindowList(periods.value)
  return periodWindowIds.map((id) => {
    const item = list.find(window => (window.id || window.window) === id) || {}
    const enabled = item.enabled ?? item.limit != null
    const remaining = Number.isFinite(Number(item.remaining)) ? Number(item.remaining) : null
    const exhausted = enabled && remaining != null && remaining <= 0
    const active = Boolean(item.active)
    const used = Number(item.used || 0)
    const limit = Number.isFinite(Number(item.limit)) ? Number(item.limit) : null
    const progress = !enabled || limit == null ? null : limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 100
    const mode = item.mode === 'sliding' || item.mode === 'rolling'
      ? 'sliding'
      : item.mode === 'calendar' && id !== '5h' ? 'calendar' : 'first_use'
    const start = item.window_start || item.windowStart
    const end = item.window_end || item.windowEnd
    const reset = item.reset_at || item.resetAt
    const state = active && start && end
      ? `${formatDate(start)} – ${formatDate(end)}`
      : !active && mode === 'first_use' ? t('users.windowOpensOnCharge') : ''
    // Status values stay English: UsersPeriodCard uses them to pick badge colors.
    const status = !enabled ? 'Disabled' : exhausted ? 'Exhausted' : active ? 'Active' : 'Not started'
    return {
      id,
      label: periodWindowLabel(id),
      enabled,
      status,
      statusLabel: statusLabels.value[status],
      progress,
      used: formatCredits(used),
      limit: limit == null ? '—' : formatCredits(limit),
      remaining: remaining == null ? '—' : formatCredits(remaining),
      description: `${periodModeLabel(mode)}${state ? ` · ${state}` : ''}${reset ? ` · ${t('users.resetsAt', { date: formatDate(reset) })}` : ''}`
    }
  })
})

defineExpose({ openFor })
</script>
