<script setup lang="ts">
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceAccount } from '~/composables/workspace/useWorkspaceAccount'

const { t } = usePortalI18n()
const { currentUser: user, capabilities } = useUserApi()
const { passwordForm, passwordError, passwordSaving, email, emailError, emailSaving, emailDetail, changePassword, updateEmail, clearEmail, requestVerification } = useWorkspaceAccount()
</script>

<template>
  <AppCard id="settings-password" class="settings-panel min-w-0">
    <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-lock" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.settings.password') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.settings.passwordDetail') }}</p></div></div></template>
    <form class="space-y-4" @submit.prevent="changePassword">
      <UAlert v-if="passwordError" color="error" variant="subtle" :description="passwordError" />
      <UFormField :label="t('ws.settings.newPassword')" required><UInput v-model="passwordForm.password" type="password" autocomplete="new-password" class="w-full" /></UFormField>
      <UFormField :label="t('ws.settings.confirmPassword')" required><UInput v-model="passwordForm.confirm" type="password" autocomplete="new-password" class="w-full" /></UFormField>
      <div class="flex justify-end"><AppButton type="submit" :loading="passwordSaving">{{ t('ws.settings.changePassword') }}</AppButton></div>
    </form>
  </AppCard>

  <AppCard id="settings-email" class="settings-panel min-w-0">
    <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-mail" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.settings.recoveryEmail') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ emailDetail }}</p></div></div></template>
    <form v-if="capabilities.email_verification !== false" class="space-y-4" @submit.prevent="updateEmail">
      <UAlert v-if="emailError" color="error" variant="subtle" :description="emailError" />
      <UFormField :label="t('ws.settings.emailAddress')" required><UInput v-model="email" type="email" autocomplete="email" class="w-full" :disabled="capabilities.email_verification === false" /></UFormField>
      <div class="flex flex-wrap justify-end gap-2">
        <AppButton v-if="user?.email_status.configured" type="button" color="error" variant="soft" :loading="emailSaving" @click="clearEmail">{{ t('ws.settings.removeEmail') }}</AppButton>
        <AppButton v-if="user?.email_status.configured && !user?.email_status.verified" type="button" color="neutral" variant="outline" :loading="emailSaving" @click="requestVerification">{{ t('ws.settings.resendVerification') }}</AppButton>
        <AppButton type="submit" :loading="emailSaving" :disabled="capabilities.email_verification === false">{{ t('ws.settings.saveVerify') }}</AppButton>
      </div>
    </form>
  </AppCard>
</template>
