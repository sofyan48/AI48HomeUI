<template>
  <section class="space-y-5 text-sm"><div><h3 class="font-semibold">{{ t('cred.tab.concurrency') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.description') }}</p></div>
    <PortalAlert v-if="policyError || concurrencyError" color="error" variant="subtle" :description="policyError || concurrencyError" />
    <AdminCredentialConcurrencyPolicy v-model:total="policyTotal" v-model:models="policyModels" :available="policySupported" :dirty="policyDirty" :policy="policy" :loading="loadingPolicy" :saving="savingFields || savingPolicy" :conflict="policyConflict" :error="policyError" show-save @reload="loadPolicy" @save="savePolicy" @add="addPolicyModel" @remove="policyModels.splice($event, 1)" />
    <p v-if="!snapshotsSupported" class="text-[var(--ui-text-muted)]">{{ t('cred.conc.snapshotsUnavailable') }}</p>
    <section class="space-y-3 border-t border-[var(--ui-border)] pt-4"><div class="flex items-center justify-between gap-2"><div><h3 class="font-semibold">{{ t('cred.conc.current') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.currentDescription') }}</p></div><AppButton size="sm" color="neutral" variant="outline" :loading="loadingConcurrency" @click="loadConcurrency()">{{ t('common.refresh') }}</AppButton></div><div v-if="concurrencyState" class="space-y-2"><p>{{ t('cred.conc.admitted') }} <strong>{{ concurrencyState.admitted_in_flight }}</strong> / {{ concurrencyState.max_in_flight ?? '∞' }} <PortalBadge v-if="concurrencyState.total_saturated" color="warning" variant="subtle">{{ t('cred.saturated') }}</PortalBadge></p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.stateLine', { remaining: concurrencyState.remaining ?? t('cred.conc.unlimited'), version: concurrencyState.policy_version, enforced: concurrencyState.fully_enforced }) }}</p><div v-for="model in concurrencyState.models || []" :key="model.model" class="rounded-md border border-[var(--ui-border)] p-3"><span class="font-medium">{{ model.model }}</span> · {{ model.admitted_in_flight }} / {{ model.max_in_flight }} <PortalBadge v-if="model.saturated" color="warning" variant="subtle">{{ t('cred.saturated') }}</PortalBadge></div></div><p v-if="flightDetails?.stale || flightDetails?.details_truncated || flightDetails?.coverage_complete === false" class="text-xs text-amber-500">{{ t('cred.conc.stale') }}</p><p v-if="flightDetails?.observed_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.observed', { at: flightDetails.observed_at, total: flightDetails.total }) }}</p><div v-for="request in flightDetails?.items || []" :key="request.request_id" class="rounded-md border border-[var(--ui-border)] p-3"><p class="break-all font-mono text-xs">{{ request.request_id }}</p><p>{{ request.model || t('cred.conc.unknownModel') }} · {{ request.request_kind || t('cred.conc.requestKind') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.started', { at: request.started_at }) }}</p></div><p v-if="snapshotsSupported && !loadingConcurrency && !flightDetails?.items?.length" class="text-[var(--ui-text-muted)]">{{ t('cred.conc.noRequests') }}</p><AppButton v-if="flightDetails?.next_offset != null" color="neutral" variant="outline" :loading="loadingConcurrency" @click="loadConcurrency(flightDetails.next_offset)">{{ t('cred.conc.loadMore') }}</AppButton></section>
  </section>
</template>

<script setup lang="ts">
import AdminCredentialConcurrencyPolicy from '~/components/admin/credentials/CredentialConcurrencyPolicy.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, policyError, concurrencyError, policyTotal, policyModels, policySupported, policyDirty, policy, loadingPolicy,
  savingFields, savingPolicy, policyConflict, loadPolicy, savePolicy, addPolicyModel, snapshotsSupported,
  loadingConcurrency, loadConcurrency, concurrencyState, flightDetails
} = useUpstreamAccounts()
</script>
