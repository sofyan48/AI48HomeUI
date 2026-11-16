<template>
  <AppModal v-model:open="connectivityOpen" :dismissible="false" :title="t('cred.conn.title')" :description="t('cred.conn.description')">
    <template #body>
      <form class="space-y-4" @submit.prevent="runConnectivity">
        <PortalAlert color="warning" variant="subtle" :title="t('cred.conn.trustedTitle')" :description="t('cred.conn.trusted')" />
        <AdminField :label="t('cred.conn.credential')"><AdminInput :model-value="connectivityTarget?.label || connectivityTarget?.name || connectivityTarget?.id" readonly class="w-full" /></AdminField>
        <AdminField :label="t('cred.conn.url')" required><AdminInput v-model="connectivityURL" type="url" class="w-full" placeholder="https://api.example.com/v1/models" /></AdminField>
        <AdminField :label="t('cred.conn.authHeader')"><AdminInput model-value="Bearer $TOKEN$" readonly class="w-full font-mono" /></AdminField>
        <PortalAlert v-if="connectivityError" color="error" variant="subtle" :description="connectivityError" />
        <div v-if="connectivityResult" class="rounded-lg bg-[var(--ui-bg-muted)] p-4 text-sm">
          <p><strong>HTTP {{ connectivityResult.status_code }}</strong></p>
          <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{{ connectivityBody }}</pre>
        </div>
        <div class="flex justify-end gap-2"><AppButton type="button" color="neutral" variant="ghost" @click="connectivityOpen = false">{{ t('common.close') }}</AppButton><AppButton type="submit" :loading="testingConnectivity">{{ t('cred.conn.run') }}</AppButton></div>
      </form>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const {
  t, connectivityOpen, runConnectivity, connectivityTarget, connectivityURL, connectivityError, connectivityResult,
  connectivityBody, testingConnectivity
} = useUpstreamAccounts()
</script>
