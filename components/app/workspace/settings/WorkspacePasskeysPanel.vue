<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspacePasskeys } from '~/composables/workspace/useWorkspacePasskeys'
import { useWorkspaceFormat } from '~/composables/workspace/common'

const { t } = usePortalI18n()
const { currentUser: user } = useUserApi()
const { passkeyName, passkeyError, passkeySaving, passkeyColumns, addPasskey, confirmPasskeyDelete } = useWorkspacePasskeys()
const { formatDate } = useWorkspaceFormat()
</script>

<template>
  <AppCard id="settings-passkeys" class="settings-panel settings-passkeys min-w-0 overflow-hidden" :ui="{ body: 'p-0' }">
    <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('ws.settings.passkeys') }}</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.settings.passkeysDetail') }}</p></div></div></template>
    <div class="settings-passkey-form">
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="addPasskey">
        <PortalField :label="t('ws.settings.passkeyName')" :hint="t('ws.settings.optional')" class="min-w-0 flex-1"><PortalInput v-model="passkeyName" class="w-full" placeholder="MacBook Touch ID" /></PortalField>
        <AppButton type="submit" icon="i-tabler-fingerprint" :loading="passkeySaving">{{ t('ws.settings.addPasskey') }}</AppButton>
      </form>
      <PortalAlert v-if="passkeyError" class="mt-4" color="error" variant="subtle" :description="passkeyError" />
    </div>
    <div v-if="user?.passkeys?.length" class="overflow-x-auto">
      <PortalTable :data="user?.passkeys || []" :columns="passkeyColumns" :empty="t('ws.settings.noPasskeysRegistered')" class="min-w-[560px]">
        <template #empty><div class="flex flex-col items-center gap-2 py-6 text-center"><span class="settings-icon mb-1 flex size-10 items-center justify-center rounded-xl"><AppIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><p class="text-sm font-medium text-[var(--ui-text-highlighted)]">{{ t('ws.settings.noPasskeysTitle') }}</p><p class="max-w-xs text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.settings.noPasskeysHint') }}</p></div></template>
        <template #name-cell="{ row }"><span class="font-medium">{{ row.original.name || t('ws.settings.unnamedPasskey') }}</span></template>
        <template #created_at-cell="{ row }">{{ formatDate(row.original.created_at) }}</template>
        <template #updated_at-cell="{ row }">{{ formatDate(row.original.updated_at) }}</template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end"><AppButton icon="i-tabler-trash" color="error" variant="ghost" size="sm" :aria-label="t('ws.settings.deleteAria', { name: row.original.name || t('ws.settings.passkeyFallback') })" @click="confirmPasskeyDelete(row.original)" /></div>
        </template>
      </PortalTable>
    </div>
    <p v-else class="settings-passkey-empty text-xs text-[var(--ui-text-muted)]">{{ t('ws.settings.noPasskeysShort') }}</p>
  </AppCard>
</template>
