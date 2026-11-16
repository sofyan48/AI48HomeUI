<template>
    <AppModal
      v-model:open="changesOpen"
      :title="t('config.changes.title')"
      :description="t('config.changes.description')"
      :ui="{ content: 'sm:max-w-xl' }"
      ><template #body
        ><div class="space-y-2">
          <AppCard
            v-for="change in changes"
            :key="change.key"
            :ui="{ body: 'p-0' }"
            ><button
              type="button"
              class="w-full p-3 text-left transition-colors hover:bg-[var(--ui-bg-elevated)]"
              @click="
                changesOpen = false;
                scrollToSection(change.section);
              "
            >
              <p class="font-medium">{{ change.label }}</p>
              <p class="mt-1 break-all text-xs text-[var(--ui-text-muted)]">
                {{ change.before }} → {{ change.after }}
              </p>
            </button></AppCard
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
import AppModal from '~/components/AppModal.vue'
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const { t, changesOpen, changes, scrollToSection, reloadConfirmOpen, loadWorkspace } = useConfigWorkspace()
</script>
