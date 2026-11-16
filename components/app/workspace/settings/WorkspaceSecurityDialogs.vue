<script setup lang="ts">
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceTOTP } from '~/composables/workspace/useWorkspaceTOTP'
import { useWorkspacePasskeys } from '~/composables/workspace/useWorkspacePasskeys'

const { t } = usePortalI18n()
const { totpDeleteOpen, totpDeleting, closeTOTPDelete, deleteTOTP } = useWorkspaceTOTP()
const { passkeyDeleteOpen, passkeyDeleteTarget, passkeyDeleting, closePasskeyDelete, deletePasskey } = useWorkspacePasskeys()
</script>

<template>
  <AppModal v-model:open="totpDeleteOpen" :title="t('ws.settings.totpDeleteTitle')" :description="t('ws.settings.totpDeleteDesc')">
    <template #body><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="totpDeleting" @click="closeTOTPDelete">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="totpDeleting" @click="deleteTOTP">{{ t('ws.settings.disableTotp') }}</AppButton></div></template>
  </AppModal>

  <AppModal v-model:open="passkeyDeleteOpen" :title="t('ws.settings.passkeyDeleteTitle')" :description="t('ws.settings.passkeyDeleteDesc')">
    <template #body><div class="space-y-5"><p class="text-sm">{{ t('ws.settings.passkeyDeletePrompt', { name: passkeyDeleteTarget?.name || t('ws.settings.thisPasskey') }) }}</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="passkeyDeleting" @click="closePasskeyDelete">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="passkeyDeleting" @click="deletePasskey">{{ t('ws.settings.deletePasskey') }}</AppButton></div></div></template>
  </AppModal>
</template>
