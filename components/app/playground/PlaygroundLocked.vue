<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

const { t } = usePortalI18n()
const { disabledReason, modelsError } = usePlaygroundWorkspace()
const content = computed(() => {
  if (disabledReason.value === 'noEndpoint') return { icon: 'i-tabler-plug-off', title: t('playground.locked.endpointTitle'), detail: t('playground.locked.endpointDetail') }
  if (disabledReason.value === 'noModel') return { icon: 'i-tabler-box-off', title: t('playground.locked.modelTitle'), detail: modelsError.value || t('playground.locked.modelDetail') }
  return { icon: 'i-tabler-key-off', title: t('playground.locked.keyTitle'), detail: t('playground.locked.keyDetail') }
})
</script>

<template>
  <div class="playground-locked" role="status">
    <span class="playground-locked__icon"><AppIcon :name="content.icon" class="size-6" aria-hidden="true" /></span>
    <div class="min-w-0 flex-1">
      <h2 class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ content.title }}</h2>
      <p class="mt-1 text-sm leading-relaxed text-[var(--ui-text-muted)]">{{ content.detail }}</p>
    </div>
    <AppButton v-if="disabledReason === 'noKey'" to="/app/api-keys" icon="i-tabler-plus" class="shrink-0 rounded-full">{{ t('playground.locked.createKey') }}</AppButton>
    <AppButton v-else-if="disabledReason === 'noModel'" to="/app/models" color="neutral" variant="outline" icon="i-tabler-box-multiple" class="shrink-0 rounded-full">{{ t('playground.locked.browseModels') }}</AppButton>
  </div>
</template>

<style scoped>
.playground-locked {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px dashed color-mix(in oklch, var(--ui-warning) 45%, var(--ui-border));
  border-radius: var(--user-panel-radius, 1rem);
  background: color-mix(in oklch, var(--ui-warning) 6%, var(--user-panel-bg));
}
.playground-locked__icon {
  display: flex;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: color-mix(in oklch, var(--ui-warning) 14%, transparent);
  color: var(--ui-warning);
}
</style>
