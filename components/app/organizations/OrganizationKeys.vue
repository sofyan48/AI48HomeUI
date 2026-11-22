<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { maskKey } from '~/composables/workspace/keys'
import { useWorkspaceClipboard } from '~/composables/workspace/common'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

const { t, keys, isOwner, canCreateKeys, keyName, keyCreating, pendingAction, memberName, createKey, deleteKey } = usePortalOrganizations()
const copyText = useWorkspaceClipboard()
</script>

<template>
  <AppCard class="finance-panel">
    <template #header>
      <div>
        <h3 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-key" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('org.keysTitle') }}</h3>
        <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ isOwner ? t('org.keysOwnerHint') : t('org.keysMemberHint') }}</p>
      </div>
    </template>
    <PortalAlert v-if="!canCreateKeys" color="neutral" variant="subtle" icon="i-tabler-lock" :description="t('org.keysOwnerIssued')" />
    <form v-else class="flex flex-wrap items-end gap-3" @submit.prevent="createKey">
      <PortalField :label="t('org.keyName')" class="min-w-0 flex-1">
        <PortalInput v-model="keyName" icon="i-tabler-tag" maxlength="128" class="w-full" :placeholder="t('org.keyNamePlaceholder')" />
      </PortalField>
      <AppButton type="submit" icon="i-tabler-plus" class="rounded-full" :loading="keyCreating">{{ t('org.keyCreate') }}</AppButton>
    </form>

    <ul v-if="keys.length" class="mt-4 divide-y divide-[var(--ui-border)]">
      <li v-for="key in keys" :key="key.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <p class="break-words text-sm font-medium">{{ key.display_name || t('org.unnamedKey') }}</p>
          <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ maskKey(key.api_key) }}<span v-if="isOwner"> · {{ memberName(key.created_by_user_id) }}</span></p>
        </div>
        <div class="flex items-center gap-1">
          <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('org.copyKey')" @click="copyText(key.api_key, t('org.copied'))" />
          <AppButton type="button" size="xs" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('org.deleteKey')" :loading="pendingAction === `key:${key.id}`" @click="deleteKey(key)" />
        </div>
      </li>
    </ul>
    <p v-else class="mt-4 text-sm text-[var(--ui-text-muted)]">{{ t('org.keysEmpty') }}</p>
  </AppCard>
</template>
