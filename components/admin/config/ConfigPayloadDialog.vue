<template>
    <AppModal
      v-model:open="payloadEditorOpen"
      :title="payloadEditIndex < 0 ? t('config.payload.addTitle') : t('config.payload.editTitle')"
      :ui="{ content: 'sm:max-w-3xl' }"
      ><template #body
        ><form class="space-y-4" @submit.prevent="savePayloadEditor">
          <UFormField :label="t('config.payload.models')" required
            ><UTextarea
              v-model="payloadEditor.models"
              :rows="8"
              class="font-mono text-xs" /></UFormField
          ><UFormField
            :label="
              payloadEditMode === 'filter'
                ? t('config.payload.filterParams')
                : t('config.payload.params')
            "
            required
            ><UTextarea
              v-model="payloadEditor.params"
              :rows="10"
              class="font-mono text-xs" /></UFormField
          ><UAlert
            v-if="payloadEditorError"
            color="error"
            variant="subtle"
            :description="payloadEditorError"
          />
          <div class="flex justify-end gap-2">
            <AppButton
              type="button"
              color="neutral"
              variant="ghost"
              @click="payloadEditorOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton type="submit">{{ t('config.payload.saveRule') }}</AppButton>
          </div>
        </form></template
      ></AppModal
    >
</template>

<script setup lang="ts">
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const {
  t, payloadEditorOpen, payloadEditIndex, savePayloadEditor,
  payloadEditor, payloadEditMode, payloadEditorError,
} = useConfigWorkspace()
</script>
