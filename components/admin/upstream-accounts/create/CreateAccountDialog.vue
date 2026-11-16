<template>
  <AppModal v-model:open="createOpen" :dismissible="false" :title="t('cred.add')" :description="t('cred.create.description')" :ui="{ content: 'sm:max-w-2xl' }" @update:open="handleCreateOpen">
    <template #body>
      <div class="space-y-5">
        <div class="grid grid-cols-3 gap-1 rounded-md bg-[var(--ui-bg-elevated)] p-1" role="tablist" :aria-label="t('cred.create.methodAria')">
          <AppButton v-for="mode in createModes" :key="mode.value" role="tab" :aria-selected="createMode === mode.value" color="neutral" :variant="createMode === mode.value ? 'solid' : 'ghost'" size="sm" class="justify-center" :disabled="uploading" @click="createMode = mode.value">{{ mode.label }}</AppButton>
        </div>
        <CreateOAuthPanel v-if="createMode === 'oauth'" />
        <CreateUploadPanel v-else-if="createMode === 'upload'" />
        <CreateVertexPanel v-else />
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'
import CreateOAuthPanel from '~/components/admin/upstream-accounts/create/CreateOAuthPanel.vue'
import CreateUploadPanel from '~/components/admin/upstream-accounts/create/CreateUploadPanel.vue'
import CreateVertexPanel from '~/components/admin/upstream-accounts/create/CreateVertexPanel.vue'

const { t, createOpen, handleCreateOpen, createModes, createMode, uploading } = useUpstreamAccounts()
</script>
