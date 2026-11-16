<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Textarea } from '~/components/ui/textarea'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PlaygroundEmpty from './PlaygroundEmpty.vue'
import PlaygroundMessage from './PlaygroundMessage.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

defineProps<{ historyVisible?: boolean }>()
const emit = defineEmits<{ toggleHistory: []; openSettings: [] }>()
const { t } = usePortalI18n()
const { messages, draft, sending, ready, canSend, selectedModel, modelOptions, activeConversation, activeConversationId, send, stop, newChat } = usePlaygroundWorkspace()
const scroller = ref<HTMLElement | null>(null)
const input = ref<InstanceType<typeof Textarea> | null>(null)
const title = computed(() => activeConversation.value?.title || t('playground.newChat'))

async function scrollToBottom() {
  await nextTick()
  const element = scroller.value
  if (element) element.scrollTop = element.scrollHeight
}
watch(() => messages.value.map(message => message.content.length + (message.reasoning?.length || 0)).join(), scrollToBottom)
watch(activeConversationId, async () => {
  await scrollToBottom()
  ;(input.value?.$el as HTMLTextAreaElement | undefined)?.focus({ preventScroll: true })
})

function onKeydown(event: KeyboardEvent) {
  // Enter sends; Shift+Enter inserts a newline; IME composition is left alone.
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void send()
}
function usePrompt(text: string) {
  draft.value = text
  void nextTick(() => (input.value?.$el as HTMLTextAreaElement | undefined)?.focus())
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <header class="flex h-14 shrink-0 items-center gap-1.5 border-b border-[var(--ui-border)] px-2 sm:px-3">
      <AppButton v-if="!historyVisible" icon="i-tabler-layout-sidebar-left-expand" color="neutral" variant="ghost" :aria-label="t('playground.showHistory')" :title="t('playground.showHistory')" @click="emit('toggleHistory')" />
      <AppButton v-if="!historyVisible" icon="i-tabler-edit" color="neutral" variant="ghost" :aria-label="t('playground.newChat')" :title="t('playground.newChat')" @click="newChat" />
      <PortalSelect v-model="selectedModel" :items="modelOptions" size="sm" class="w-44 shrink-0 sm:w-60" :disabled="!ready || sending" :placeholder="t('playground.noModelOption')" :aria-label="t('playground.model')" />
      <p class="hidden min-w-0 flex-1 truncate px-2 text-center text-sm font-medium text-[var(--ui-text-toned)] md:block" :title="title">{{ title }}</p>
      <AppButton icon="i-tabler-adjustments-horizontal" color="neutral" variant="ghost" class="ml-auto md:ml-0" :aria-label="t('playground.settings')" :title="t('playground.settings')" @click="emit('openSettings')" />
    </header>

    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto" aria-live="polite" :aria-busy="sending">
      <PlaygroundEmpty v-if="!messages.length" @prompt="usePrompt" />
      <div v-else class="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <PlaygroundMessage v-for="message in messages" :key="message.id" :message="message" />
      </div>
    </div>

    <form class="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-6 sm:pb-4" @submit.prevent="send">
      <div class="playground-composer">
        <Textarea
          ref="input"
          v-model="draft"
          rows="1"
          class="max-h-52 min-h-11 resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
          :placeholder="ready ? t('playground.placeholder') : t('playground.placeholderDisabled')"
          :aria-label="t('playground.message')"
          :disabled="!ready"
          @keydown="onKeydown"
        />
        <AppButton v-if="sending" type="button" color="neutral" size="sm" icon="i-tabler-player-stop" class="playground-composer__action" :aria-label="t('playground.stop')" :title="t('playground.stop')" @click="stop" />
        <AppButton v-else type="submit" size="sm" icon="i-tabler-arrow-up" class="playground-composer__action" :disabled="!canSend" :aria-label="t('playground.send')" :title="t('playground.send')" />
      </div>
      <p class="mt-2 hidden text-center text-[11px] text-[var(--ui-text-muted)] sm:block">{{ t('playground.shortcut') }}</p>
    </form>
  </div>
</template>

<style scoped>
.playground-composer {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 1.5rem;
  background: var(--ui-bg);
  padding: 0.375rem 0.5rem 0.375rem 0.75rem;
  box-shadow: 0 1px 2px color-mix(in oklch, var(--ui-text) 6%, transparent);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.playground-composer:focus-within {
  border-color: color-mix(in oklch, var(--ui-primary) 45%, var(--ui-border));
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-primary) 14%, transparent);
}
.playground-composer__action {
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  margin-bottom: 0.25rem;
  border-radius: 9999px;
}
</style>
