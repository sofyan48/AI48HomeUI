<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useWorkspaceClipboard } from '~/composables/workspace/common'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

// Shown above every tab so a key issued from the Members tab is still visible.
const { t, createdKey } = usePortalOrganizations()
const copyText = useWorkspaceClipboard()
</script>

<template>
  <PortalAlert v-if="createdKey" color="success" variant="subtle" :title="t('org.keyCreatedTitle')">
    <template #description>
      <div class="flex min-w-0 items-center gap-2">
        <code class="min-w-0 break-all text-xs">{{ createdKey }}</code>
        <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('org.copyKey')" @click="copyText(createdKey, t('org.copied'))" />
        <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-x" :aria-label="t('org.dismissKey')" @click="createdKey = ''" />
      </div>
    </template>
  </PortalAlert>
</template>
