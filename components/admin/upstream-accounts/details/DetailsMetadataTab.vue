<template>
  <form class="space-y-4 text-sm" @submit.prevent="saveFields"><div><h3 class="font-semibold">{{ t('cred.tab.metadata') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.description') }}</p></div>
    <fieldset :disabled="savingFields || savingPolicy || Boolean(credentialAction)" class="space-y-4">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.hint') }}</p>
      <div class="grid gap-3 sm:grid-cols-2"><UFormField :label="t('cred.field.prefix')"><UInput v-model="fields.prefix" class="w-full" /></UFormField><UFormField :label="t('cred.field.proxyUrl')"><UInput v-model="fields.proxy_url" class="w-full" placeholder="socks5://..." /></UFormField><UFormField :label="t('cred.field.priority')"><UInput v-model="fields.priority" type="number" step="1" class="w-full" /></UFormField><UFormField :label="t('cred.field.requestRetries')"><UInput v-model="fields.request_retry" type="number" min="0" step="1" class="w-full" :placeholder="t('common.default')" /></UFormField></div>
      <UFormField :label="t('cred.field.weight')" :description="t('cred.meta.weightDescription')"><div class="flex gap-2"><UInput v-model="fields.weight" :disabled="!exclusionsLoaded" type="number" step="1" max="1000000" class="w-full" :placeholder="t('cred.weightUnset')" /><AppButton type="button" size="sm" color="neutral" variant="outline" :disabled="!exclusionsLoaded" @click="fields.weight = ''">{{ t('cred.meta.unset') }}</AppButton></div></UFormField>
      <UFormField :label="t('cred.field.note')"><UTextarea v-model="fields.note" class="w-full" /></UFormField>
      <AdminCredentialExcludedModels v-if="exclusionsLoaded" :key="detailsTarget.id" v-model="excludedModels" :credential-id="detailsTarget.id" :disabled="savingFields || savingPolicy || Boolean(credentialAction)" />
      <p v-if="exclusionsLoading" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.readingExclusions') }}</p>
      <UAlert v-if="exclusionsError" color="warning" variant="subtle" :description="exclusionsError" />
      <AppButton v-if="!exclusionsLoaded && !exclusionsLoading" type="button" size="sm" variant="outline" @click="loadExclusions">{{ t('cred.meta.readExclusions') }}</AppButton>
      <UCheckbox v-if="['on', 'off'].includes(credentialWebsocketState(detailsTarget || {}))" v-model="fields.websockets" :label="t('cred.meta.wsTransport')" />
      <div v-else class="flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3"><div><h4 class="font-semibold">{{ t('cred.meta.wsSupport') }}</h4><p class="text-xs text-[var(--ui-text-muted)]">{{ supportsWebsockets(detailsTarget) ? t('cred.meta.wsNotReturned') : t('cred.meta.wsNoToggle') }}</p></div><UBadge color="neutral" variant="subtle">{{ supportsWebsockets(detailsTarget) ? t('common.unknown') : t('cred.na') }}</UBadge></div>
      <UFormField v-if="supportsUsingAPI(detailsTarget)" :label="t('cred.field.xaiApiMode')" :description="t('cred.meta.xaiDescription')"><USwitch v-model="fields.using_api" :aria-label="t('cred.meta.xaiAria')" /></UFormField>
      <UFormField :label="t('cred.meta.coolingOverride')"><USelect v-model="fields.disable_cooling" :items="coolingOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
      <div class="flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3"><span class="font-semibold">{{ t('cred.meta.enableCredential') }}</span><USwitch v-model="fields.enabled" :aria-label="t('cred.meta.enableCredential')" :disabled="savingFields" /></div>
      <AdminCredentialConcurrencyPolicy v-model:total="policyTotal" v-model:models="policyModels" class="border-t border-[var(--ui-border)] pt-4" :available="policySupported" :dirty="policyDirty" :policy="policy" :loading="loadingPolicy" :saving="savingFields || savingPolicy" :conflict="policyConflict" :error="policyError" @reload="loadPolicy" @add="addPolicyModel" @remove="policyModels.splice($event, 1)" />
      <UAlert v-if="fieldsError" color="error" variant="subtle" :description="fieldsError" />
      <div class="flex justify-end border-t border-[var(--ui-border)] pt-3"><AppButton type="submit" size="sm" :loading="savingFields" :disabled="savingFields || savingPolicy || Boolean(credentialAction) || (!policySupported && policyDirty) || (policySupported && (loadingPolicy || !policy || policyConflict))">{{ t('cred.meta.saveChanges') }}</AppButton></div>
    </fieldset>
  </form>
</template>

<script setup lang="ts">
import AdminCredentialConcurrencyPolicy from '~/components/admin/credentials/CredentialConcurrencyPolicy.vue'
import AdminCredentialExcludedModels from '~/components/admin/credentials/CredentialExcludedModels.vue'
import { credentialWebsocketState } from '~/composables/credentialTransport'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, saveFields, savingFields, savingPolicy, credentialAction, fields, exclusionsLoaded, detailsTarget, excludedModels,
  exclusionsLoading, exclusionsError, loadExclusions, supportsWebsockets, supportsUsingAPI, coolingOptions, policyTotal,
  policyModels, policySupported, policyDirty, policy, loadingPolicy, policyConflict, policyError, loadPolicy,
  addPolicyModel, fieldsError
} = useUpstreamAccounts()
</script>
