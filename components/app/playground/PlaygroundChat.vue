<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { nextTick, ref, watch } from 'vue'
import { Textarea } from '~/components/ui/textarea'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '~/components/ui/empty'
import PlaygroundMessage from './PlaygroundMessage.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

const { t } = usePortalI18n()
const { messages, draft, sending, ready, canSend, activeModel, selectedModel, send, stop, clearChat } = usePlaygroundWorkspace()
const scroller = ref<HTMLElement | null>(null)

watch(() => messages.value.map(message => message.content.length + (message.reasoning?.length || 0)).join(), async () => {
  await nextTick()
  const element = scroller.value
  if (element) element.scrollTop = element.scrollHeight
})

function onKeydown(event: KeyboardEvent) {
  // Enter sends; Shift+Enter inserts a newline; IME composition is left alone.
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void send()
}
</script>

<template>
  <AppCard class="playground-panel playground-chat flex min-h-0 min-w-0 flex-col" :ui="{ root: 'flex flex-col', body: 'flex min-h-0 flex-1 flex-col p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-message-chatbot" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('playground.chat') }}</h2>
          <p class="mt-0.5 truncate text-xs text-[var(--ui-text-muted)]">{{ activeModel?.display_name || selectedModel || t('playground.noModelSelected') }}</p>
        </div>
        <AppButton icon="i-tabler-trash" color="neutral" variant="ghost" size="sm" :disabled="!messages.length" @click="clearChat">{{ t('playground.clear') }}</AppButton>
      </div>
    </template>
    <div ref="scroller" class="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite" :aria-busy="sending">
      <Empty v-if="!messages.length" class="h-full gap-4 border-0 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon" class="playground-empty-icon mb-2 size-12 rounded-2xl"><AppIcon name="i-tabler-sparkles" aria-hidden="true" /></EmptyMedia>
          <EmptyTitle class="text-sm font-semibold">{{ t('playground.emptyTitle') }}</EmptyTitle>
          <EmptyDescription>{{ t('playground.emptyDetail') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <PlaygroundMessage v-for="message in messages" :key="message.id" :message="message" />
    </div>
    <form class="border-t border-[var(--ui-border)] p-3 sm:p-4" @submit.prevent="send">
      <div class="playground-composer">
        <Textarea
          v-model="draft"
          rows="2"
          class="max-h-48 min-h-12 resize-none border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          :placeholder="ready ? t('playground.placeholder') : t('playground.placeholderDisabled')"
          :aria-label="t('playground.message')"
          :disabled="!ready"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between gap-2">
          <span class="hidden text-[11px] text-[var(--ui-text-muted)] sm:block">{{ t('playground.shortcut') }}</span>
          <AppButton v-if="sending" type="button" color="neutral" variant="outline" size="sm" icon="i-tabler-player-stop" class="ml-auto rounded-full" @click="stop">{{ t('playground.stop') }}</AppButton>
          <AppButton v-else type="submit" size="sm" icon="i-tabler-send" class="ml-auto rounded-full" :disabled="!canSend">{{ t('playground.send') }}</AppButton>
        </div>
      </div>
    </form>
  </AppCard>
</template>

<style scoped>
.playground-chat { min-height: 32rem; }
@media (min-width: 1024px) {
  .playground-chat { height: calc(100dvh - 4rem - 3rem - 1.5rem); }
}
.playground-composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 1rem;
  background: var(--ui-bg);
  padding: 0.5rem 0.625rem;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.playground-composer:focus-within {
  border-color: color-mix(in oklch, var(--ui-primary) 45%, var(--ui-border));
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-primary) 14%, transparent);
}
.playground-empty-icon { color: var(--ui-primary); background: var(--user-selected); }
</style>
