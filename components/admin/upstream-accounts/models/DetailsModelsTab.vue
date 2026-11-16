<template>
  <section class="space-y-3 text-sm">
    <div class="flex items-center justify-between gap-2"><div><h3 class="font-semibold">{{ t('cred.tab.models') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.models.description') }}</p></div><AppButton size="sm" color="neutral" variant="outline" :loading="modelsLoading" @click="loadModels(detailsTarget, true)">{{ t('common.refresh') }}</AppButton></div>
    <PortalAlert v-if="modelsError" color="error" variant="subtle" :description="modelsError" />
    <PortalAlert v-if="modelStatesNotice" color="warning" variant="subtle" :description="modelStatesNotice" />
    <p v-if="modelsLoading" class="py-8 text-center text-[var(--ui-text-muted)]">{{ t('cred.models.loading') }}</p>
    <template v-else>
      <div v-if="modelStates?.credential" class="space-y-2"><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.models.runtime', { ip: modelStates.node?.ip, port: modelStates.node?.port, at: modelStates.observed_at, version: modelStates.credential.state_version }) }}</p><p>{{ t('cred.models.state', { status: modelStates.credential.status, unavailable: modelStates.credential.unavailable, blocked: modelStates.credential.refresh_blocked }) }}</p><p v-if="modelStates.credential.status_message">{{ modelStates.credential.status_message }}</p></div>
      <AdminSelect v-model="modelScope" :aria-label="t('cred.models.scopeAria')" :items="modelScopeOptions" value-key="value" label-key="label" class="w-full" />
      <div v-for="model in scopedModelCards" :key="model.id" class="rounded-md border border-[var(--ui-border)] p-3">
        <p class="font-medium">{{ model.display_name || model.id }}</p>
        <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ model.id }}</p>
        <div v-for="state in model.diagnostics" :key="JSON.stringify([state.upstream_model, state.state_key])" class="mt-2 space-y-1">
          <p class="font-mono text-xs">{{ t('cred.models.upstream', { upstream: state.upstream_model, state: state.state_key }) }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.models.diag', { status: state.status, block: state.blocked ? state.block_reason : t('cred.models.notBlocked'), registered: state.registered }) }}</p>
          <p v-if="state.remaining_cooldown || state.next_retry_after" class="text-xs">{{ t('cred.models.cooldown', { cooldown: state.remaining_cooldown || '—', retry: state.next_retry_after || '—' }) }}</p>
          <p v-if="state.status_message || state.last_error?.message" class="text-xs">{{ state.status_message || state.last_error?.message }}</p>
        </div>
      </div>
      <p v-if="!scopedModelCards.length" class="py-6 text-center text-[var(--ui-text-muted)]">{{ t('cred.models.none') }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, modelsLoading, loadModels, detailsTarget, modelsError, modelStatesNotice, modelStates, modelScope,
  modelScopeOptions, scopedModelCards
} = useUpstreamAccounts()
</script>
