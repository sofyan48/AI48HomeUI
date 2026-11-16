<template>
  <AdminModalCard v-if="supportsRequestScopedErrors" as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.scopedErrors') }}</summary>
    <UFormField class="mt-3" :label="t('upstream.providers.scopedRules')" :hint="t('upstream.providers.scopedRulesHint')">
      <UTextarea v-model="requestScopedErrorsText" :rows="6" class="w-full" placeholder='[{"status": 400, "match": ["invalid request"], "action": "stop"}]' />
    </UFormField>
  </AdminModalCard>
  <AdminModalCard v-if="selectedProviderRoute === 'claude-api-key'" as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.cloakConfig') }}</summary>
    <div class="mt-3 space-y-3">
      <UFormField :label="t('upstream.providers.cloakMode')" :hint="t('upstream.providers.cloakModeHint')"><USelect v-model="cloakMode" :items="cloakModeOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
      <UCheckbox v-model="cloakStrictMode" :label="t('upstream.providers.strictMode')" />
      <UFormField :label="t('upstream.providers.sensitiveWords')" :hint="t('upstream.providers.sensitiveWordsHint')"><UTextarea v-model="cloakSensitiveWordsText" :rows="3" class="w-full" /></UFormField>
      <UFormField :label="t('upstream.providers.sensitiveWordsReplace')" :hint="t('upstream.providers.sensitiveWordsReplaceHint')"><UTextarea v-model="cloakSensitiveWordsReplaceText" :rows="3" class="w-full font-mono text-xs" spellcheck="false" placeholder='{"Claude Code": "Claude"}' /></UFormField>
      <UFormField :label="t('upstream.providers.sensitivePatternsReplace')" :hint="t('upstream.providers.sensitivePatternsReplaceHint')"><UTextarea v-model="cloakSensitivePatternsReplaceText" :rows="4" class="w-full font-mono text-xs" spellcheck="false" placeholder='[{"pattern": "(?m)^You are omp[^\\n]*\\n?", "replacement": ""}]' /></UFormField>
      <UFormField :label="t('upstream.providers.cacheUserId')"><USelect v-model="cloakCacheUserID" :items="cloakCacheOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
    </div>
  </AdminModalCard>

  <AdminModalCard v-if="!isCompat" as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.connectionPool') }}</summary>
    <div class="mt-3 space-y-3">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.connectionPoolHelp') }}</p>
      <UFormField :label="t('upstream.providers.connectionPoolMode')"><USelect v-model="connectionPoolMode" :items="connectionPoolOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
      <div v-if="connectionPoolMode === 'enabled'" class="grid gap-3 sm:grid-cols-2">
        <UFormField :label="t('upstream.providers.poolIdleTimeout')" :hint="t('upstream.providers.poolIdleTimeoutHint')"><UInput v-model="connectionPoolIdleTimeout" class="w-full" placeholder="300s" /></UFormField>
        <UFormField :label="t('upstream.providers.poolMaxIdle')" :hint="t('upstream.providers.poolMaxIdleHint')"><UInput v-model="connectionPoolMaxIdle" type="number" step="1" class="w-full" placeholder="2" /></UFormField>
      </div>
    </div>
  </AdminModalCard>
  <div v-if="selectedProviderRoute === 'vertex-api-key'" class="space-y-1">
    <UFormField :label="t('upstream.providers.vertexInteractions')" :hint="t('upstream.providers.vertexInteractionsHint')"><USelect v-model="vertexInteractions" :items="triStateOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
  </div>
</template>

<script setup>
import AdminModalCard from '~/components/admin/general/ModalCard.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const {
  t, supportsRequestScopedErrors, requestScopedErrorsText, selectedProviderRoute, isCompat,
  cloakMode, cloakModeOptions, cloakStrictMode, cloakSensitiveWordsText, cloakSensitiveWordsReplaceText, cloakSensitivePatternsReplaceText,
  cloakCacheUserID, cloakCacheOptions, connectionPoolMode, connectionPoolOptions, connectionPoolIdleTimeout, connectionPoolMaxIdle,
  vertexInteractions, triStateOptions
} = useUpstreamProvidersWorkspace()
</script>
