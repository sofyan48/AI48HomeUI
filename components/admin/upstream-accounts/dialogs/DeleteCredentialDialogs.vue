<template>
  <AppModal v-model:open="bulkDeleteOpen" :dismissible="false" :title="t('cred.bulkDelete.title')"><template #body><div class="space-y-5"><PortalAlert color="warning" variant="subtle" :title="t('cred.bulkDelete.confirm')" :description="t('cred.bulkDelete.description', { count: selectedIDs.size })"/><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" :disabled="bulkBusy" @click="bulkDeleteOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="bulkBusy" :disabled="!selectedIDs.size" @click="bulkDelete">{{ t('cred.bulkDelete.button', { count: selectedIDs.size }) }}</AppButton></div></div></template></AppModal>
  <AppModal v-model:open="deleteOpen" :dismissible="false" :title="t('cred.delete.title')"><template #body><div class="space-y-5"><PortalAlert color="warning" variant="subtle" :title="t('cred.delete.confirm')" :description="deleteTarget?.label || deleteTarget?.name || deleteTarget?.id"/><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" @click="deleteOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="deleting" :disabled="bulkBusy" @click="deleteCredential">{{ t('common.delete') }}</AppButton></div></div></template></AppModal>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const { t, bulkDeleteOpen, selectedIDs, bulkBusy, bulkDelete, deleteOpen, deleteTarget, deleting, deleteCredential } = useUpstreamAccounts()
</script>
