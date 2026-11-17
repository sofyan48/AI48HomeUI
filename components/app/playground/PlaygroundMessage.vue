<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceClipboard, useWorkspaceFormat } from '~/composables/workspace/common'
import type { ChatMessage } from '~/composables/playground/chat'

const props = defineProps<{ message: ChatMessage }>()
const { t } = usePortalI18n()
const { formatNumber } = useWorkspaceFormat()
const copyText = useWorkspaceClipboard()
const copy = () => copyText(props.message.content, t('common.copied'))
</script>

<template>
  <!-- ChatGPT-style turn: user text in a right-aligned bubble, assistant reply as plain text with an avatar. -->
  <div v-if="message.role === 'user'" class="flex justify-end">
    <div class="playground-bubble playground-bubble--user max-w-[85%]">
      <span class="sr-only">{{ t('playground.you') }}:</span>
      <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
    </div>
  </div>
  <div v-else class="flex gap-3">
    <span class="playground-avatar" aria-hidden="true">
      <AppIcon name="i-tabler-sparkles" class="size-4" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="text-[11px] font-medium text-[var(--ui-text-muted)]">{{ message.model || t('playground.assistant') }}</span>
      <div class="playground-reply" :class="{ 'playground-bubble--error': message.error }">
        <details v-if="message.reasoning" class="mb-2 text-xs text-[var(--ui-text-muted)]">
          <summary class="cursor-pointer select-none font-medium">{{ t('playground.reasoning') }}</summary>
          <p class="mt-1 whitespace-pre-wrap break-words">{{ message.reasoning }}</p>
        </details>
        <p v-if="message.content" class="whitespace-pre-wrap break-words">{{ message.content }}</p>
        <p v-if="message.error" class="flex items-start gap-1.5 text-[var(--ui-error)]"><AppIcon name="i-tabler-alert-triangle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message.error }}</p>
        <span v-if="message.pending && !message.content" class="playground-typing" role="status" :aria-label="t('playground.thinking')"><span /><span /><span /></span>
      </div>
      <div v-if="!message.pending && message.content" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-[var(--ui-text-muted)]">
        <span v-if="message.stopped">{{ t('playground.stoppedShort') }}</span>
        <span v-if="message.latencyMs != null">{{ formatNumber(message.latencyMs) }} ms</span>
        <span v-if="message.usage?.prompt_tokens != null">{{ t('playground.tokensIn', { value: formatNumber(message.usage.prompt_tokens) }) }}</span>
        <span v-if="message.usage?.completion_tokens != null">{{ t('playground.tokensOut', { value: formatNumber(message.usage.completion_tokens) }) }}</span>
        <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('common.copy')" :title="t('common.copy')" @click="copy" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground-avatar {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--user-selected);
  color: var(--ui-primary);
}
.playground-bubble {
  border-radius: 1.25rem;
  padding: 0.625rem 1rem;
  font-size: 0.9375rem;
  line-height: 1.6;
}
.playground-bubble--user { background: var(--ui-bg-accented); color: var(--ui-text-highlighted); }
.playground-reply {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--ui-text);
}
.playground-bubble--error {
  border: 1px solid color-mix(in oklch, var(--ui-error) 35%, var(--ui-border));
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
}
.playground-typing { display: inline-flex; gap: 0.25rem; padding-block: 0.375rem; }
.playground-typing span {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--ui-text-muted);
  animation: playground-blink 1.2s infinite ease-in-out;
}
.playground-typing span:nth-child(2) { animation-delay: 0.15s; }
.playground-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes playground-blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .playground-typing span { animation: none; }
}
</style>
