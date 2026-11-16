<template>
  <div class="grid gap-4">
    <UFormField v-if="isCompat" :label="t('upstream.providers.providerName')" required><UInput v-model="providerForm.name" class="w-full" placeholder="my-upstream" /></UFormField>
    <UFormField v-if="!isCompat" :label="t('upstream.providers.serviceKey')" :required="providerEditorMode === 'create'"><UInput v-model="providerKey" type="password" autocomplete="new-password" class="w-full" :placeholder="providerEditorMode === 'edit' ? t('upstream.providers.keepCurrentKey') : t('upstream.providers.enterApiKey')" /></UFormField>
    <UFormField :label="t('upstream.providers.baseUrl')" :required="requiresBaseURL"><UInput v-model="providerForm['base-url']" type="url" class="w-full" placeholder="https://api.example.com" /></UFormField>
    <UFormField v-if="!isCompat" :label="t('upstream.providers.proxyUrl')"><UInput v-model="providerForm['proxy-url']" type="url" class="w-full" placeholder="http://127.0.0.1:7890" /></UFormField>
    <UFormField :label="t('upstream.providers.modelPrefix')"><UInput v-model="providerForm.prefix" class="w-full" /></UFormField>
    <UFormField :label="t('upstream.providers.priority')"><UInput v-model="providerForm.priority" type="number" step="1" class="w-full" /></UFormField>
    <UFormField v-if="!isCompat" :label="t('upstream.providers.weight')" :hint="t('upstream.providers.weightHint')"><UInput v-model="providerForm.weight" type="number" step="1" class="w-full" /></UFormField>
    <UFormField :label="t('upstream.providers.retryRounds')" :hint="t('upstream.providers.retryRoundsHint')"><UInput v-model="requestRetryText" type="number" step="1" class="w-full" :placeholder="t('upstream.providers.inheritGlobal')" /></UFormField>
    <UFormField :label="t('upstream.providers.coolingPolicy')" :hint="t('upstream.providers.coolingPolicyHint')">
            <USelect v-model="coolingPolicy" :items="coolingPolicyOptions" value-key="value" label-key="label" class="w-full" />
          </UFormField>
  </div>
  <AdminModalCard v-if="isCompat" class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium">{{ t('upstream.providers.keyEntries') }}</h3>
      <AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="addCompatKey()">{{ t('upstream.providers.addKey') }}</AppButton>
    </div>
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.compatHelp') }}</p>
    <UAlert v-if="!compatKeyRows.length" color="warning" variant="subtle" :title="t('upstream.providers.keylessTitle')" :description="t('upstream.providers.keylessDescription')" />
    <AdminModalCard v-for="(key, index) in compatKeyRows" :key="key.rowId" nested class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium">{{ t('upstream.providers.keyN', { n: index + 1 }) }}</span>
        <AppButton type="button" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('upstream.providers.removeKeyN', { n: index + 1 })" @click="compatKeyRows.splice(index, 1)">{{ t('common.remove') }}</AppButton>
      </div>
      <p v-if="key.source.id || key.source.uuid" class="break-all font-mono text-xs text-[var(--ui-text-muted)]">{{ key.source.id || key.source.uuid }}</p>
      <UFormField :label="t('upstream.providers.serviceKey')" :required="!key.source['api-key']" :hint="key.source['api-key'] ? t('upstream.providers.keepSavedHint') : undefined">
        <UInput v-model="key.secret" type="password" autocomplete="new-password" class="w-full" :placeholder="key.source['api-key'] ? t('upstream.providers.keepSaved') : t('upstream.providers.enterApiKey')" />
      </UFormField>
      <UFormField :label="t('upstream.providers.proxyUrl')" :hint="t('upstream.providers.keyProxyHint')">
        <UInput v-model="key.proxy" class="w-full" :placeholder="t('upstream.providers.keyProxyPlaceholder')" />
      </UFormField>
      <UFormField :label="t('upstream.providers.weight')" :hint="t('upstream.providers.keyWeightHint')">
        <UInput v-model="key.weight" type="number" max="1000000" step="1" class="w-full" placeholder="1" />
      </UFormField>
    </AdminModalCard>
  </AdminModalCard>
  <UCheckbox v-if="isCompat" v-model="providerForm['support-prompt-cache-key']" :label="t('upstream.providers.promptCacheKeySupport')" />
  <UCheckbox v-if="supportsWebsockets" v-model="providerForm.websockets" :label="t('upstream.providers.websocketSupport')" />
  <UCheckbox v-if="isCompat" v-model="providerForm.disabled" :label="t('common.disabled')" />
  <div v-if="selectedProviderRoute === 'codex-api-key'" class="space-y-3">
    <UCheckbox v-model="providerForm['alpha-search']" :label="t('upstream.providers.alphaSearch')" />
    <UFormField :label="t('upstream.providers.codexIdentity')" :hint="t('upstream.providers.codexIdentityHint')">
      <USelect v-model="codexCloakingPolicy" :items="codexCloakingOptions" value-key="value" label-key="label" class="w-full" />
    </UFormField>
  </div>
  <div v-if="selectedProviderRoute === 'claude-api-key'" class="space-y-3">
    <UCheckbox v-model="providerForm['experimental-cch-signing']" :label="t('upstream.providers.cchSigning')" />
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.cchSigningHelp') }}</p>
    <UCheckbox v-model="providerForm['native-tool-search']" :label="t('upstream.providers.nativeToolSearch')" />
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.nativeToolSearchHelp') }}</p>
    <UCheckbox v-model="providerForm['rebuild-mid-system-message']" :label="t('upstream.providers.rebuildSystem')" />
    <UFormField :label="t('upstream.providers.fingerprint')" :hint="t('upstream.providers.fingerprintHint')">
      <UInput v-model="providerForm['fingerprint-profile']" class="w-full" :placeholder="t('upstream.providers.fingerprintPlaceholder')" />
    </UFormField>
  </div>
</template>

<script setup>
import AdminModalCard from '~/components/admin/general/ModalCard.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const {
  t, isCompat, providerForm, providerEditorMode, providerKey, requiresBaseURL, requestRetryText, coolingPolicy, coolingPolicyOptions,
  addCompatKey, compatKeyRows, supportsWebsockets, selectedProviderRoute, codexCloakingPolicy, codexCloakingOptions
} = useUpstreamProvidersWorkspace()
</script>
