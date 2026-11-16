<template>
  <AppModal v-model:open="resetCreditOpen" :dismissible="false" :title="t('cred.resetModal.title')" :description="t('cred.resetModal.description')" @update:open="handleResetCreditOpen">
    <template #body>
      <div class="space-y-4">
        <UAlert color="info" variant="subtle" :title="t('cred.resetModal.alertTitle')" :description="t('cred.resetModal.alert', { name: resetCreditTarget?.label || resetCreditTarget?.name || resetCreditTarget?.id || t('cred.resetModal.thisCredential') })" />
        <UAlert v-if="resetCreditError" color="error" variant="subtle" :description="resetCreditError" />
        <div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="resetCreditSubmitting" @click="resetCreditOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="primary" :loading="resetCreditSubmitting" :disabled="!canConfirmResetCredit" @click="redeemResetCredit">{{ t('cred.resetModal.consume') }}</AppButton></div>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, resetCreditOpen, handleResetCreditOpen, resetCreditTarget, resetCreditError, resetCreditSubmitting,
  canConfirmResetCredit, redeemResetCredit
} = useUpstreamAccounts()
</script>
