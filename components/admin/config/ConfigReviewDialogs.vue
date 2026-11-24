<template>
    <AppModal
      v-model:open="changesOpen"
      :title="t('config.changes.title')"
      :description="t('config.changes.description')"
      :ui="{ content: 'sm:max-w-3xl' }"
            @after:leave="navigateAfterClose"
      ><template #body
        ><div class="flex min-w-0 flex-col gap-3">
          <AppCard
            v-for="change in changes"
            :key="change.key"
            :ui="{ body: 'p-0' }"
            >
              <div class="flex min-w-0 items-center justify-between gap-2 border-b border-border p-3">
                <h3 class="min-w-0 font-medium [overflow-wrap:anywhere]">{{ change.label }}</h3>
                <AppButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-tabler-arrow-up-right"
                  :aria-label="`${t('common.view')}: ${change.label}`"
                  @click="requestNavigation(change.section)"
                >{{ t('common.view') }}</AppButton>
              </div>
              <ConfigValueDiff :before="change.before" :after="change.after" :format="change.key.endsWith('Json') ? 'json' : 'text'" />
            </AppCard
          >
        </div></template
      ></AppModal
    >

    <AppModal
      v-model:open="reloadConfirmOpen"
      :title="t('config.reload.title')"
      :description="t('config.reload.description')"
      ><template #body
        ><div class="flex justify-end gap-2">
          <AppButton
            color="neutral"
            variant="ghost"
            @click="reloadConfirmOpen = false"
            >{{ t('common.cancel') }}</AppButton
          ><AppButton
            color="error"
            @click="
              reloadConfirmOpen = false;
              loadWorkspace();
            "
            >{{ t('config.reload.confirm') }}</AppButton
          >
        </div></template
      ></AppModal
    >
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppButton from '~/components/AppButton.vue'
import ConfigValueDiff from './ConfigValueDiff.vue'
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const { t, changesOpen, changes, scrollToSection, reloadConfirmOpen, loadWorkspace } = useConfigWorkspace()
const pendingSection = ref<string | null>(null)
function requestNavigation(section: string) {
  pendingSection.value = section
  changesOpen.value = false
}
function navigateAfterClose() {
  if (!pendingSection.value) return
  scrollToSection(pendingSection.value)
  pendingSection.value = null
}
</script>
