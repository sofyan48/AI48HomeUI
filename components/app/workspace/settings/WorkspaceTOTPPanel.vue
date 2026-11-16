<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceTOTP } from '~/composables/workspace/useWorkspaceTOTP'
import { useWorkspaceClipboard } from '~/composables/workspace/common'

const { t } = usePortalI18n()
const { currentUser: user } = useUserApi()
const { totpSetup, totpCode, totpError, totpLoading, totpSaving, openTOTPDelete, showTOTP, bindTOTP } = useWorkspaceTOTP()
const copyText = useWorkspaceClipboard()
</script>

<template>
  <AppCard id="settings-totp" class="settings-panel min-w-0">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-device-mobile" class="size-5" aria-hidden="true" /></span><div class="min-w-0"><h2 class="text-sm font-semibold">{{ t('ws.settings.authenticator') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ user?.totp_enabled ? t('ws.settings.totpOn') : t('ws.settings.totpOff') }}</p></div></div>
        <PortalBadge :color="user?.totp_enabled ? 'success' : 'neutral'" variant="subtle">{{ user?.totp_enabled ? t('ws.settings.enabled') : t('ws.settings.notEnabled') }}</PortalBadge>
      </div>
    </template>
    <div class="space-y-4">
      <PortalAlert v-if="totpError" color="error" variant="subtle" :description="totpError" />
      <div class="flex flex-wrap gap-2">
        <AppButton color="primary" variant="soft" :loading="totpLoading" @click="showTOTP(false)">{{ user?.totp_enabled ? t('ws.settings.viewSetup') : t('ws.settings.setupAuthenticator') }}</AppButton>
        <AppButton v-if="user?.totp_enabled || totpSetup" color="neutral" variant="ghost" :loading="totpLoading" @click="showTOTP(true)">{{ t('ws.settings.regenerate') }}</AppButton>
        <AppButton v-if="user?.totp_enabled" color="error" variant="soft" @click="openTOTPDelete">{{ t('ws.settings.disableTotp') }}</AppButton>
      </div>
      <form v-if="totpSetup" class="settings-setup min-w-0 space-y-4 rounded-xl border p-4" @submit.prevent="bindTOTP">
        <p class="text-sm text-[var(--ui-text-muted)]">{{ t('ws.settings.setupHelp') }}</p>
        <div>
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)]">{{ t('ws.settings.rawSecret') }}</p>
          <div class="mt-1 flex items-start gap-2"><code class="min-w-0 flex-1 break-all text-sm font-semibold">{{ totpSetup.secret }}</code><AppButton type="button" icon="i-tabler-clipboard" color="neutral" variant="ghost" size="xs" :aria-label="t('ws.settings.copySecret')" @click="copyText(totpSetup.secret, t('ws.settings.secretCopied'))" /></div>
        </div>
        <div v-if="totpSetup.otp_auth_url">
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)]">{{ t('ws.settings.setupLink') }}</p>
          <a :href="totpSetup.otp_auth_url" class="mt-1 block break-all text-sm text-primary-500 underline underline-offset-2">{{ totpSetup.otp_auth_url }}</a>
          <p class="mt-1 text-xs text-[var(--ui-text-dimmed)]">{{ t('ws.settings.noQr') }}</p>
        </div>
        <PortalField :label="t('ws.settings.verificationCode')" required><PortalInput v-model="totpCode" class="w-full font-mono tracking-[0.3em]" inputmode="numeric" autocomplete="one-time-code" /></PortalField>
        <div class="flex justify-end"><AppButton type="submit" :loading="totpSaving">{{ user?.totp_enabled ? t('ws.settings.confirmRegenerated') : t('ws.settings.enableTotp') }}</AppButton></div>
      </form>
    </div>
  </AppCard>
</template>
