<template>
    <AppModal
      v-model:open="payloadEditorOpen"
      :title="payloadEditIndex < 0 ? t('config.payload.addTitle') : t('config.payload.editTitle')"
      :ui="{ content: 'sm:max-w-3xl' }"
      ><template #body
        ><form class="space-y-4" @submit.prevent="savePayloadEditor">
          <AdminField :label="t('config.payload.models')" required
            ><AdminTextarea
              v-model="payloadEditor.models"
              :rows="8"
              class="font-mono text-xs" /></AdminField
          ><AdminField
            :label="
              payloadEditMode === 'filter'
                ? t('config.payload.filterParams')
                : t('config.payload.params')
            "
            required
            ><AdminTextarea
              v-model="payloadEditor.params"
              :rows="10"
              class="font-mono text-xs" /></AdminField
          ><PortalAlert
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
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const {
  t, payloadEditorOpen, payloadEditIndex, savePayloadEditor,
  payloadEditor, payloadEditMode, payloadEditorError,
} = useConfigWorkspace()
</script>
