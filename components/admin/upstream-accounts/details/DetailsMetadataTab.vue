<template>
  <form class="space-y-4 text-sm" @submit.prevent="saveFields"><div><h3 class="font-semibold">{{ t('cred.tab.metadata') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.description') }}</p></div>
    <fieldset :disabled="savingFields || savingPolicy || Boolean(credentialAction)" class="space-y-4">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.hint') }}</p>
      <div class="grid gap-3 sm:grid-cols-2"><AdminField :label="t('cred.field.prefix')"><AdminInput v-model="fields.prefix" class="w-full" /></AdminField><AdminField :label="t('cred.field.proxyUrl')"><AdminInput v-model="fields.proxy_url" class="w-full" placeholder="socks5://..." /></AdminField><AdminField :label="t('cred.field.priority')"><AdminInput v-model="fields.priority" type="number" step="1" class="w-full" /></AdminField><AdminField :label="t('cred.field.requestRetries')"><AdminInput v-model="fields.request_retry" type="number" min="0" step="1" class="w-full" :placeholder="t('common.default')" /></AdminField></div>
      <AdminField :label="t('cred.field.weight')" :description="t('cred.meta.weightDescription')"><div class="flex gap-2"><AdminInput v-model="fields.weight" :disabled="!exclusionsLoaded" type="number" step="1" max="1000000" class="w-full" :placeholder="t('cred.weightUnset')" /><AppButton type="button" size="sm" color="neutral" variant="outline" :disabled="!exclusionsLoaded" @click="fields.weight = ''">{{ t('cred.meta.unset') }}</AppButton></div></AdminField>
      <AdminField :label="t('cred.field.note')"><AdminTextarea v-model="fields.note" class="w-full" /></AdminField>
      <AdminCredentialExcludedModels v-if="exclusionsLoaded" :key="detailsTarget.id" v-model="excludedModels" :credential-id="detailsTarget.id" :disabled="savingFields || savingPolicy || Boolean(credentialAction)" />
      <p v-if="exclusionsLoading" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.readingExclusions') }}</p>
      <PortalAlert v-if="exclusionsError" color="warning" variant="subtle" :description="exclusionsError" />
      <AppButton v-if="!exclusionsLoaded && !exclusionsLoading" type="button" size="sm" variant="outline" @click="loadExclusions">{{ t('cred.meta.readExclusions') }}</AppButton>
      <AdminCheckbox v-if="['on', 'off'].includes(credentialWebsocketState(detailsTarget || {}))" v-model="fields.websockets" :label="t('cred.meta.wsTransport')" />
      <div v-else class="flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3"><div><h4 class="font-semibold">{{ t('cred.meta.wsSupport') }}</h4><p class="text-xs text-[var(--ui-text-muted)]">{{ supportsWebsockets(detailsTarget) ? t('cred.meta.wsNotReturned') : t('cred.meta.wsNoToggle') }}</p></div><PortalBadge color="neutral" variant="subtle">{{ supportsWebsockets(detailsTarget) ? t('common.unknown') : t('cred.na') }}</PortalBadge></div>
      <AdminField v-if="supportsUsingAPI(detailsTarget)" :label="t('cred.field.xaiApiMode')" :description="t('cred.meta.xaiDescription')"><AdminSwitch v-model="fields.using_api" :aria-label="t('cred.meta.xaiAria')" /></AdminField>
      <AdminField :label="t('cred.meta.coolingOverride')"><AdminSelect v-model="fields.disable_cooling" :items="coolingOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
      <div class="flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3"><span class="font-semibold">{{ t('cred.meta.enableCredential') }}</span><AdminSwitch v-model="fields.enabled" :aria-label="t('cred.meta.enableCredential')" :disabled="savingFields" /></div>
      <AdminCredentialConcurrencyPolicy v-model:total="policyTotal" v-model:models="policyModels" class="border-t border-[var(--ui-border)] pt-4" :available="policySupported" :dirty="policyDirty" :policy="policy" :loading="loadingPolicy" :saving="savingFields || savingPolicy" :conflict="policyConflict" :error="policyError" @reload="loadPolicy" @add="addPolicyModel" @remove="policyModels.splice($event, 1)" />
      <PortalAlert v-if="fieldsError" color="error" variant="subtle" :description="fieldsError" />
      <div class="flex justify-end border-t border-[var(--ui-border)] pt-3"><AppButton type="submit" size="sm" :loading="savingFields" :disabled="savingFields || savingPolicy || Boolean(credentialAction) || (!policySupported && policyDirty) || (policySupported && (loadingPolicy || !policy || policyConflict))">{{ t('cred.meta.saveChanges') }}</AppButton></div>
    </fieldset>
  </form>
</template>

<script setup lang="ts">
import AdminCredentialConcurrencyPolicy from '~/components/admin/credentials/CredentialConcurrencyPolicy.vue'
import AdminCredentialExcludedModels from '~/components/admin/credentials/CredentialExcludedModels.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { credentialWebsocketState } from '~/composables/credentialTransport'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, saveFields, savingFields, savingPolicy, credentialAction, fields, exclusionsLoaded, detailsTarget, excludedModels,
  exclusionsLoading, exclusionsError, loadExclusions, supportsWebsockets, supportsUsingAPI, coolingOptions, policyTotal,
  policyModels, policySupported, policyDirty, policy, loadingPolicy, policyConflict, policyError, loadPolicy,
  addPolicyModel, fieldsError
} = useUpstreamAccounts()
</script>
