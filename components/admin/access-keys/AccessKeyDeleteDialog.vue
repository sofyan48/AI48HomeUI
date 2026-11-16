<template>
  <AppModal v-model:open="confirmationOpen" :title="confirmationTitle" :description="confirmationDescription">
    <template #body>
      <div class="flex justify-end gap-2">
        <AppButton color="neutral" variant="outline" :disabled="confirmationBusy" @click="closeConfirmation">{{ t('common.cancel') }}</AppButton>
        <AppButton color="error" :loading="confirmationBusy" @click="confirmDestructiveAction">{{ confirmationActionLabel }}</AppButton>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useAccessKeys } from '~/composables/access-keys/useAccessKeys'
import type { useAccessKeyDeletion } from '~/composables/access-keys/useAccessKeyDeletion'
const props = defineProps<{ deletion: ReturnType<typeof useAccessKeyDeletion> }>()
const { t } = useAccessKeys()
// AppModal preserves overlay dismissal while only the cancel action is disabled during deletion.
const { confirmationOpen, confirmationTitle, confirmationDescription, confirmationBusy,
  closeConfirmation, confirmDestructiveAction, confirmationActionLabel } = props.deletion
</script>
