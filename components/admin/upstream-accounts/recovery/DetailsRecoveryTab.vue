<template>
  <section class="space-y-3"><h3 class="font-semibold">{{ t('cred.recovery.title') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.recovery.description') }}</p><UAlert v-if="actionError" color="warning" variant="subtle" :description="actionError" /><div class="flex flex-wrap gap-2"><AppButton v-if="refreshAvailable" size="sm" variant="outline" :disabled="busy || Boolean(credentialAction)" :loading="credentialAction === 'refresh'" @click="runCredentialAction('refresh')">{{ t('cred.recovery.refresh') }}</AppButton><AppButton v-if="supports('credential_cooldown_reset', false) && cooldownAvailable" size="sm" color="warning" variant="outline" :disabled="busy || Boolean(credentialAction)" :loading="credentialAction === 'cooldown'" @click="runCredentialAction('cooldown')">{{ t('cred.recovery.cooldown') }}</AppButton></div><p v-if="!supports('credential_cooldown_reset', false) || !cooldownAvailable" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.recovery.cooldownUnavailable') }}</p></section>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const { t, actionError, refreshAvailable, busy, credentialAction, runCredentialAction, supports, cooldownAvailable } = useUpstreamAccounts()
</script>
