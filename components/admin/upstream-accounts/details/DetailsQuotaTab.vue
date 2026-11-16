<template>
  <section class="space-y-3 text-sm"><div><h3 class="font-semibold">{{ t('cred.tab.quota') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.quotaTab.description') }}</p></div>
    <UAlert v-if="accountQuotaError" color="error" variant="subtle" :description="accountQuotaError" />
    <p v-if="accountQuotaLoading" class="py-8 text-center text-[var(--ui-text-muted)]">{{ t('cred.quotaTab.loading') }}</p>
    <template v-else-if="accountQuotaDetail">
      <div class="flex flex-wrap items-center gap-2"><UBadge color="neutral" variant="subtle">{{ accountQuotaDetail.credential?.provider || detailsTarget?.provider || t('cred.quotaTab.unknownProvider') }}</UBadge><UBadge :color="quotaColor(accountQuotaDetail.credential?.quota_status)" variant="subtle">{{ quotaStatusLabel(accountQuotaDetail.credential?.quota_status || 'unknown') }}</UBadge><UBadge color="neutral" variant="subtle">{{ freshnessLabel(accountQuotaDetail.collection?.freshness || 'never') }}</UBadge><UBadge v-if="accountQuotaDetail.collection?.status" color="neutral" variant="subtle">{{ collectionLabel(accountQuotaDetail.collection.status) }}</UBadge></div>
      <p v-if="quotaHistorical(accountQuotaDetail.credential)" class="text-xs text-amber-500">{{ t('quota.historical') }}</p>
      <p v-if="accountQuotaDetail.credential?.source === 'response_header' && accountQuotaDetail.collection?.status === 'success'" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.passiveHeader') }}</p>
      <p v-if="accountQuotaDetail.credential?.plan?.name" class="font-medium">{{ accountQuotaDetail.credential.plan.name }}</p>
      <p v-if="accountQuotaDetail.credential?.plan?.expires_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.subscriptionEnds', { date: formatDateTime(accountQuotaDetail.credential.plan.expires_at) }) }}</p>
      <div v-if="['xai', 'grok'].includes(accountQuotaDetail.credential?.provider)" class="space-y-2">
        <p>{{ t('quota.onDemand', { state: onDemandLabel(xaiOnDemandState(accountQuotaDetail.credential)) }) }}</p>
        <div v-if="xaiProductWindows(accountQuotaDetail.credential).length" class="space-y-2 rounded-md border border-[var(--ui-border)] p-3">
          <p class="font-medium">{{ t('cred.quotaTab.sharedUsage') }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.sharedAllowance') }}</p>
          <div v-for="window in xaiProductWindows(accountQuotaDetail.credential)" :key="window.id">
            <p>{{ window.label || window.id }}: {{ quotaProductUsed(window, t) }}</p>
            <p v-if="isRetainedQuotaWindow(accountQuotaDetail.credential, window)" class="text-xs text-amber-500">{{ t('quota.retainedObserved', { date: formatDateTime(window.observed_at) }) }}</p>
          </div>
        </div>
      </div>
      <div v-for="window in accountQuotaWindows" :key="window.id" class="rounded-md border border-[var(--ui-border)] p-3"><div class="flex items-start justify-between gap-3"><p class="font-medium">{{ quotaWindowLabel(window, accountQuotaDetail.credential?.provider, t) }}</p><UBadge :color="quotaColor(window.status)" variant="subtle">{{ quotaStatusLabel(window.status) }}</UBadge></div><p v-if="isRetainedQuotaWindow(accountQuotaDetail.credential, window)" class="text-xs text-amber-500">{{ t('quota.retainedObserved', { date: formatDateTime(window.observed_at) }) }}</p><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ quotaWindowRemaining(window) }} · {{ t('quota.usedAmount', { amount: quotaWindowAmount(window.used, window, intlLocale) }) }} · {{ t('quota.resetLine', { date: window.reset_at ? formatDateTime(window.reset_at) : '—' }) }}</p><div v-if="quotaWindowRatio(window) !== null" class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"><div class="h-full bg-[var(--ui-primary)]" :style="{ width: `${Math.round(quotaWindowRatio(window) * 100)}%` }" /></div></div>
      <p v-if="accountQuotaDetail.collection?.error" class="text-xs text-red-500">{{ quotaCollectionMessage(accountQuotaDetail.collection.error, t) }}</p><p v-if="!accountQuotaDetail.windows?.length" class="text-[var(--ui-text-muted)]">{{ t('quota.noWindowsRecorded') }}</p>
      <div v-if="accountQuotaDetail.reset_credits || resetCreditSupported" class="rounded-md border border-[var(--ui-border)] p-3"><p class="font-medium">{{ t('cred.quotaTab.resetCredits', { count: accountQuotaDetail.reset_credits?.available_count ?? '—' }) }}</p><p v-if="String(accountQuotaDetail.credential?.provider).toLowerCase() === 'claude'" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('cred.quotaTab.claudeNote') }}</p><p v-if="accountQuotaDetail.reset_credits?.observed_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.observedAt', { date: formatDateTime(accountQuotaDetail.reset_credits.observed_at) }) }}</p><p v-for="(credit, index) in accountQuotaDetail.reset_credits?.credits || []" :key="index" class="mt-1 text-xs">{{ quotaStatusLabel(credit.status) }} · {{ t('quota.expiresAt', { date: credit.expires_at ? formatDateTime(credit.expires_at) : '—' }) }}</p><AppButton v-if="resetCreditSupported" size="sm" color="neutral" variant="outline" class="mt-3" :disabled="!canResetCredit || resetCreditSubmitting || Boolean(resetCreditAttempts[detailsTarget?.id])" @click="openResetCredit">{{ t('cred.quotaTab.resetCodex') }}</AppButton><p v-if="resetCreditDisabledReason" class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ resetCreditDisabledReason }}</p></div>
    </template>
    <UAlert v-if="resetCreditNotice && resetCreditNoticeCredential === detailsTarget?.id" :color="resetCreditNoticeColor" variant="subtle" :description="resetCreditNotice" />
    <p role="status" class="text-xs text-[var(--ui-text-muted)]">{{ accountQuotaCollecting ? t('cred.quotaTab.waiting') : accountQuotaNotice || t('cred.quotaTab.tracking') }}</p>
    <div class="flex flex-wrap justify-end gap-2 border-t border-[var(--ui-border)] pt-3"><AppButton size="sm" color="neutral" variant="outline" :loading="accountQuotaLoading" @click="refreshAccountQuota">{{ t('common.refresh') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" :loading="accountQuotaCollecting" @click="collectAccountQuota">{{ t('cred.quotaTab.collectNow') }}</AppButton></div>
  </section>
</template>

<script setup lang="ts">
import { quotaHistorical, isRetainedQuotaWindow, xaiOnDemandState, xaiProductWindows, quotaProductUsed, quotaWindowLabel, quotaWindowAmount, quotaCollectionMessage } from '~/composables/upstreamQuota'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, intlLocale, accountQuotaError, accountQuotaLoading, accountQuotaDetail, detailsTarget, quotaColor, quotaStatusLabel,
  freshnessLabel, collectionLabel, formatDateTime, onDemandLabel, accountQuotaWindows, quotaWindowRemaining,
  quotaWindowRatio, resetCreditSupported, canResetCredit, resetCreditSubmitting, resetCreditAttempts, openResetCredit,
  resetCreditDisabledReason, resetCreditNotice, resetCreditNoticeCredential, resetCreditNoticeColor,
  accountQuotaCollecting, accountQuotaNotice, refreshAccountQuota, collectAccountQuota
} = useUpstreamAccounts()
</script>
