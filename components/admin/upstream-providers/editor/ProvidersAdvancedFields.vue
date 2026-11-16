<template>
  <AdminModalCard v-if="supportsRequestScopedErrors" as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.scopedErrors') }}</summary>
    <AdminField class="mt-3" :label="t('upstream.providers.scopedRules')" :hint="t('upstream.providers.scopedRulesHint')">
      <AdminTextarea v-model="requestScopedErrorsText" :rows="6" class="w-full" placeholder='[{"status": 400, "match": ["invalid request"], "action": "stop"}]' />
    </AdminField>
  </AdminModalCard>
  <AdminModalCard v-if="selectedProviderRoute === 'claude-api-key'" as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.cloakConfig') }}</summary>
    <div class="mt-3 space-y-3">
      <AdminField :label="t('upstream.providers.cloakMode')" :hint="t('upstream.providers.cloakModeHint')"><AdminSelect v-model="cloakMode" :items="cloakModeOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
      <AdminCheckbox v-model="cloakStrictMode" :label="t('upstream.providers.strictMode')" />
      <AdminField :label="t('upstream.providers.sensitiveWords')" :hint="t('upstream.providers.sensitiveWordsHint')"><AdminTextarea v-model="cloakSensitiveWordsText" :rows="3" class="w-full" /></AdminField>
      <AdminField :label="t('upstream.providers.sensitiveWordsReplace')" :hint="t('upstream.providers.sensitiveWordsReplaceHint')"><AdminTextarea v-model="cloakSensitiveWordsReplaceText" :rows="3" class="w-full font-mono text-xs" spellcheck="false" placeholder='{"Claude Code": "Claude"}' /></AdminField>
      <AdminField :label="t('upstream.providers.sensitivePatternsReplace')" :hint="t('upstream.providers.sensitivePatternsReplaceHint')"><AdminTextarea v-model="cloakSensitivePatternsReplaceText" :rows="4" class="w-full font-mono text-xs" spellcheck="false" placeholder='[{"pattern": "(?m)^You are omp[^\\n]*\\n?", "replacement": ""}]' /></AdminField>
      <AdminField :label="t('upstream.providers.cacheUserId')"><AdminSelect v-model="cloakCacheUserID" :items="cloakCacheOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
    </div>
  </AdminModalCard>

  <AdminModalCard v-if="!isCompat" as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.connectionPool') }}</summary>
    <div class="mt-3 space-y-3">
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.connectionPoolHelp') }}</p>
      <AdminField :label="t('upstream.providers.connectionPoolMode')"><AdminSelect v-model="connectionPoolMode" :items="connectionPoolOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
      <div v-if="connectionPoolMode === 'enabled'" class="grid gap-3 sm:grid-cols-2">
        <AdminField :label="t('upstream.providers.poolIdleTimeout')" :hint="t('upstream.providers.poolIdleTimeoutHint')"><AdminInput v-model="connectionPoolIdleTimeout" class="w-full" placeholder="300s" /></AdminField>
        <AdminField :label="t('upstream.providers.poolMaxIdle')" :hint="t('upstream.providers.poolMaxIdleHint')"><AdminInput v-model="connectionPoolMaxIdle" type="number" step="1" class="w-full" placeholder="2" /></AdminField>
      </div>
    </div>
  </AdminModalCard>
  <div v-if="selectedProviderRoute === 'vertex-api-key'" class="space-y-1">
    <AdminField :label="t('upstream.providers.vertexInteractions')" :hint="t('upstream.providers.vertexInteractionsHint')"><AdminSelect v-model="vertexInteractions" :items="triStateOptions" value-key="value" label-key="label" class="w-full" /></AdminField>
  </div>
</template>

<script setup>
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import AdminModalCard from '~/components/admin/general/ModalCard.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const {
  t, supportsRequestScopedErrors, requestScopedErrorsText, selectedProviderRoute, isCompat,
  cloakMode, cloakModeOptions, cloakStrictMode, cloakSensitiveWordsText, cloakSensitiveWordsReplaceText, cloakSensitivePatternsReplaceText,
  cloakCacheUserID, cloakCacheOptions, connectionPoolMode, connectionPoolOptions, connectionPoolIdleTimeout, connectionPoolMaxIdle,
  vertexInteractions, triStateOptions
} = useUpstreamProvidersWorkspace()
</script>
