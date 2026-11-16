<template>
  <div class="space-y-4">
    <p class="text-sm text-[var(--ui-text-muted)]">{{ t('cred.oauth.intro') }}</p>
    <section v-for="provider in oauthProviders" :key="provider.value" class="min-w-0 rounded-lg border border-[var(--ui-border)] p-4">
      <header class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">{{ provider.label }}</h2>
        <AppButton size="sm" :loading="startingOAuth === provider.value" :disabled="Boolean(startingOAuth) && startingOAuth !== provider.value" @click="startOAuth(provider.value)">{{ t('cred.oauth.start') }}</AppButton>
      </header>
      <template v-if="oauthSessions[provider.value]">
        <div class="mt-4 break-all rounded-md bg-[var(--ui-bg-elevated)] p-3 font-mono text-xs">{{ oauthSessions[provider.value].url }}</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <AppButton size="sm" color="neutral" variant="outline" @click="copyOAuthLink(provider.value)">{{ t('cred.oauth.copyLink') }}</AppButton>
          <AppButton size="sm" color="neutral" variant="outline" @click="openOAuthLink(provider.value)">{{ t('cred.oauth.openLink') }}</AppButton>
          <AppButton size="sm" color="neutral" variant="outline" :loading="checkingOAuth === provider.value" @click="checkOAuthStatus(provider.value)">{{ t('cred.oauth.checkStatus') }}</AppButton>
        </div>
        <p v-if="oauthSessions[provider.value].status || oauthSessions[provider.value].error" role="status" class="mt-3 break-words text-sm">{{ oauthSessions[provider.value].status }} {{ oauthSessions[provider.value].error }}</p>
        <form v-if="provider.value !== 'kimi'" class="mt-4 space-y-4 border-t border-[var(--ui-border)] pt-4" @submit.prevent="submitCallback(provider.value)">
          <AdminField :label="t('cred.oauth.callbackUrl')">
            <AdminInput v-model="oauthSessions[provider.value].redirect_url" class="w-full" :placeholder="t('cred.oauth.callbackUrl')" />
          </AdminField>
          <AdminField :label="t('cred.oauth.code')">
            <AdminInput v-model="oauthSessions[provider.value].code" class="w-full" :placeholder="t('cred.oauth.code')" />
          </AdminField>
          <AdminField :label="t('cred.oauth.state')">
            <AdminInput v-model="oauthSessions[provider.value].state" class="w-full" :placeholder="t('cred.oauth.state')" />
          </AdminField>
          <AdminField :label="t('cred.oauth.providerError')">
            <AdminInput v-model="oauthSessions[provider.value].callback_error" class="w-full" :placeholder="t('cred.oauth.providerError')" />
          </AdminField>
          <AppButton type="submit" size="sm" class="w-full justify-center" :loading="submittingCallback === provider.value">{{ t('cred.oauth.submitCallback') }}</AppButton>
        </form>
      </template>
    </section>
    <PortalAlert v-if="oauthError" color="error" variant="subtle" :description="oauthError" />
  </div>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, oauthProviders, startingOAuth, startOAuth, oauthSessions, copyOAuthLink, openOAuthLink, checkingOAuth,
  checkOAuthStatus, submitCallback, submittingCallback, oauthError
} = useUpstreamAccounts()
</script>
