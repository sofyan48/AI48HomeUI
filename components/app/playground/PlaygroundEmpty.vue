<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

const emit = defineEmits<{ prompt: [text: string] }>()
const { t } = usePortalI18n()
const { ready, activeModel, selectedModel } = usePlaygroundWorkspace()
const suggestions = computed(() => [
  { icon: 'i-tabler-file-text', text: t('playground.suggestSummarize') },
  { icon: 'i-tabler-terminal-2', text: t('playground.suggestCode') },
  { icon: 'i-tabler-sparkles', text: t('playground.suggestIdeas') },
  { icon: 'i-tabler-language', text: t('playground.suggestTranslate') }
])
</script>

<template>
  <div class="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10 text-center">
    <div class="space-y-3">
      <span class="playground-empty-icon mx-auto flex size-12 items-center justify-center rounded-2xl"><AppIcon name="i-tabler-sparkles" class="size-6" aria-hidden="true" /></span>
      <h2 class="text-2xl font-semibold tracking-tight text-[var(--ui-text-highlighted)]">{{ t('playground.emptyTitle') }}</h2>
      <p class="text-sm text-[var(--ui-text-muted)]">{{ activeModel?.display_name || selectedModel || t('playground.noModelSelected') }}</p>
    </div>
    <div class="grid w-full gap-2 sm:grid-cols-2">
      <button
        v-for="item in suggestions"
        :key="item.text"
        type="button"
        class="playground-suggestion"
        :disabled="!ready"
        @click="emit('prompt', item.text)"
      >
        <AppIcon :name="item.icon" class="mt-0.5 size-4 shrink-0 text-[var(--ui-primary)]" aria-hidden="true" />
        <span>{{ item.text }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.playground-empty-icon { color: var(--ui-primary); background: var(--user-selected); }
.playground-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  border: 1px solid var(--ui-border);
  border-radius: 1rem;
  background: var(--ui-bg);
  padding: 0.75rem 0.875rem;
  text-align: left;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ui-text-toned);
  transition: background-color 120ms ease, border-color 120ms ease;
}
.playground-suggestion:hover:not(:disabled) { background: var(--ui-bg-elevated); border-color: color-mix(in oklch, var(--ui-primary) 30%, var(--ui-border)); }
.playground-suggestion:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
.playground-suggestion:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
