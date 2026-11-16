<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceKeys } from '~/composables/workspace/useWorkspaceKeys'
import { maskKey } from '~/composables/workspace/keys'

const { t } = usePortalI18n()
const { keyFormOpen, keyFormError, keySaving, editingKey, keyValue, keyName, keyDeleteOpen, keyDeleteTarget, keyDeleting, closeKeyForm, closeKeyDelete, saveKey, deleteKey } = useWorkspaceKeys()
</script>

<template>
  <AppModal v-model:open="keyFormOpen" :title="editingKey ? t('ws.keys.formEditTitle') : t('ws.keys.formCreateTitle')" :description="editingKey ? t('ws.keys.formEditDesc') : t('ws.keys.formCreateDesc')">
    <template #body>
      <form class="space-y-5" @submit.prevent="saveKey">
        <div class="flex items-start gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-4"><AppIcon name="i-tabler-shield-lock" class="mt-0.5 size-5 shrink-0 text-[var(--ui-primary)]" aria-hidden="true" /><p class="text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.keys.formNotice') }}</p></div>
        <PortalAlert v-if="keyFormError" color="error" variant="subtle" :description="keyFormError" />
        <PortalField :label="t('ws.keys.name')" :hint="t('ws.keys.nameHint')"><PortalInput v-model="keyName" icon="i-tabler-tag" class="w-full" maxlength="128" :placeholder="t('ws.keys.namePlaceholder')" /></PortalField>
        <PortalField :label="t('ws.keys.key')" :hint="editingKey ? t('ws.keys.keyHintEdit') : t('ws.keys.keyHintCreate')">
          <PortalInput v-model="keyValue" icon="i-tabler-key" class="w-full font-mono" autocomplete="off" />
        </PortalField>

        <div class="flex justify-end gap-2"><AppButton type="button" color="neutral" variant="ghost" @click="closeKeyForm">{{ t('common.cancel') }}</AppButton><AppButton type="submit" :loading="keySaving">{{ editingKey ? t('ws.keys.save') : t('ws.keys.create') }}</AppButton></div>
      </form>
    </template>
  </AppModal>

  <AppModal v-model:open="keyDeleteOpen" :title="t('ws.keys.deleteTitle')" :description="t('ws.keys.deleteDesc')">
    <template #body><div class="space-y-5"><p class="break-all text-sm">{{ t('ws.keys.deletePrompt') }} <code>{{ keyDeleteTarget ? maskKey(keyDeleteTarget.api_key) : '' }}</code>?</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="keyDeleting" @click="closeKeyDelete">{{ t('common.cancel') }}</AppButton><AppButton color="error" icon="i-tabler-trash" :loading="keyDeleting" @click="deleteKey">{{ t('ws.keys.deleteKey') }}</AppButton></div></div></template>
  </AppModal>
</template>
