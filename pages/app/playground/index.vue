<template>
  <div class="playground-workspace min-w-0 space-y-5">
    <PortalAlert v-if="loadError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('playground.loadFailed')" :description="loadError" />
    <PlaygroundLocked v-if="locked" />
    <div class="grid min-w-0 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]" :class="{ 'playground-disabled': locked }" :inert="locked || undefined" :aria-disabled="locked || undefined">
      <PlaygroundSettings />
      <PlaygroundChat />
    </div>
  </div>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PlaygroundChat from '~/components/app/playground/PlaygroundChat.vue'
import PlaygroundLocked from '~/components/app/playground/PlaygroundLocked.vue'
import PlaygroundSettings from '~/components/app/playground/PlaygroundSettings.vue'
import { computed } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { providePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const { loading, loadError, disabledReason } = providePlaygroundWorkspace()
// Without a usable key, endpoint, or model the whole playground stays visible but disabled.
const locked = computed(() => !loading.value && Boolean(disabledReason.value))
</script>

<style scoped>
.playground-workspace {
  max-width: 80rem;
  padding-block: 0.25rem;
  margin-inline: auto;
}
.playground-disabled {
  opacity: 0.55;
  filter: grayscale(0.4);
  pointer-events: none;
  user-select: none;
}
</style>
