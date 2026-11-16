<template>
  <div class="playground-workspace">
    <aside v-if="isDesktop && historyOpen" class="playground-workspace__history">
      <PlaygroundHistory collapsible @collapse="historyOpen = false" />
    </aside>
    <Sheet v-if="!isDesktop" v-model:open="historySheetOpen">
      <SheetContent side="left" :show-close="false" :aria-describedby="undefined" class="w-72 max-w-[calc(100vw-2rem)] gap-0 p-0">
        <SheetTitle class="sr-only">{{ t('playground.historyTitle') }}</SheetTitle>
        <PlaygroundHistory @navigate="historySheetOpen = false" />
      </SheetContent>
    </Sheet>

    <section class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div v-if="loadError || locked" class="mx-auto w-full max-w-3xl space-y-3 px-4 pt-4">
        <PortalAlert v-if="loadError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('playground.loadFailed')" :description="loadError" />
        <PlaygroundLocked v-if="locked" />
      </div>
      <div class="flex min-h-0 flex-1 flex-col" :class="{ 'playground-disabled': locked }" :inert="locked || undefined" :aria-disabled="locked || undefined">
        <PlaygroundChat :history-visible="isDesktop && historyOpen" @toggle-history="toggleHistory" @open-settings="settingsOpen = true" />
      </div>
    </section>

    <Sheet v-model:open="settingsOpen">
      <SheetContent side="right" :close-label="t('common.close')" class="w-96 max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0">
        <SheetHeader class="border-b border-[var(--ui-border)]">
          <SheetTitle>{{ t('playground.settings') }}</SheetTitle>
          <SheetDescription>{{ t('playground.settingsDetail') }}</SheetDescription>
        </SheetHeader>
        <PlaygroundSettings />
      </SheetContent>
    </Sheet>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PlaygroundChat from '~/components/app/playground/PlaygroundChat.vue'
import PlaygroundHistory from '~/components/app/playground/PlaygroundHistory.vue'
import PlaygroundLocked from '~/components/app/playground/PlaygroundLocked.vue'
import PlaygroundSettings from '~/components/app/playground/PlaygroundSettings.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { providePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const { loading, loadError, disabledReason } = providePlaygroundWorkspace()
// Without a usable key, endpoint, or model the chat stays visible but disabled; history remains browsable.
const locked = computed(() => !loading.value && Boolean(disabledReason.value))

const isDesktop = useMediaQuery('(min-width: 1024px)')
const historyOpen = ref(true)
const historySheetOpen = ref(false)
const settingsOpen = ref(false)
watch(isDesktop, () => { historySheetOpen.value = false })

function toggleHistory() {
  if (isDesktop.value) historyOpen.value = !historyOpen.value
  else historySheetOpen.value = true
}
</script>

<style scoped>
/* Cancel the shell's main padding so the chat fills the viewport below the header. */
.playground-workspace {
  display: flex;
  height: calc(100dvh - 4rem);
  margin: -1.25rem -1rem;
  overflow: hidden;
}
@media (min-width: 640px) {
  .playground-workspace { margin: -1.25rem; }
}
@media (min-width: 1024px) {
  .playground-workspace { margin: -1.5rem; }
}
.playground-workspace__history {
  width: 16rem;
  flex-shrink: 0;
  border-right: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
}
.playground-disabled {
  opacity: 0.55;
  filter: grayscale(0.4);
  pointer-events: none;
  user-select: none;
}
</style>
