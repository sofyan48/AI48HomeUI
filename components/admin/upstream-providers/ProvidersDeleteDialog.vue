<template>
  <AppModal v-model:open="deleteOpen" centered :title="t('upstream.providers.deleteTitle')">
    <template #body>
      <div class="space-y-5">
        <PortalAlert
          color="warning"
          variant="subtle"
          icon="i-tabler-alert-triangle"
          :title="t('upstream.providers.deleteWarning')"
          :description="deleteDescription"
        />
        <div class="flex justify-end gap-3">
          <AppButton color="neutral" variant="ghost" @click="deleteOpen = false">{{ t('common.cancel') }}</AppButton>
          <AppButton color="error" :loading="deleting" @click="performDelete">{{ t('common.delete') }}</AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<script setup>
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const { t, deleteOpen, deleteDescription, deleting, performDelete } = useUpstreamProvidersWorkspace()
</script>
