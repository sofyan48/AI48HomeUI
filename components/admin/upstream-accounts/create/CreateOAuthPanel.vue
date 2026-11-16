<template>
  <div class="max-h-[65vh] space-y-3 overflow-y-auto">
    <p class="text-sm text-[var(--ui-text-muted)]">{{ t('cred.oauth.intro') }}</p>
    <div v-for="provider in oauthProviders" :key="provider.value" class="rounded-lg border border-[var(--ui-border)] p-3">
      <div class="flex items-center justify-between gap-3"><strong>{{ provider.label }}</strong><AppButton size="sm" :loading="startingOAuth === provider.value" @click="startOAuth(provider.value)">{{ t('cred.oauth.start') }}</AppButton></div>
      <template v-if="oauthSessions[provider.value]">
        <div class="mt-3 break-all rounded-md bg-[var(--ui-bg-elevated)] p-2 font-mono text-xs">{{ oauthSessions[provider.value].url }}</div>
        <div class="mt-2 flex flex-wrap gap-2"><AppButton size="sm" color="neutral" variant="outline" @click="copyOAuthLink(provider.value)">{{ t('cred.oauth.copyLink') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" @click="openOAuthLink(provider.value)">{{ t('cred.oauth.openLink') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" :loading="checkingOAuth === provider.value" @click="checkOAuthStatus(provider.value)">{{ t('cred.oauth.checkStatus') }}</AppButton></div>
        <p v-if="oauthSessions[provider.value].status" class="mt-2 text-sm">{{ oauthSessions[provider.value].status }} {{ oauthSessions[provider.value].error }}</p>
        <form v-if="provider.value !== 'kimi'" class="mt-3 grid gap-2" @submit.prevent="submitCallback(provider.value)">
          <UInput v-model="oauthSessions[provider.value].redirect_url" :placeholder="t('cred.oauth.callbackUrl')" />
          <div class="grid gap-2 sm:grid-cols-2"><UInput v-model="oauthSessions[provider.value].code" :placeholder="t('cred.oauth.code')" /><UInput v-model="oauthSessions[provider.value].state" :placeholder="t('cred.oauth.state')" /></div>
          <UInput v-model="oauthSessions[provider.value].callback_error" :placeholder="t('cred.oauth.providerError')" />
          <AppButton type="submit" size="sm" :loading="submittingCallback === provider.value">{{ t('cred.oauth.submitCallback') }}</AppButton>
        </form>
      </template>
    </div>
    <UAlert v-if="oauthError" color="error" variant="subtle" :description="oauthError" />
  </div>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, oauthProviders, startingOAuth, startOAuth, oauthSessions, copyOAuthLink, openOAuthLink, checkingOAuth,
  checkOAuthStatus, submitCallback, submittingCallback, oauthError
} = useUpstreamAccounts()
</script>
