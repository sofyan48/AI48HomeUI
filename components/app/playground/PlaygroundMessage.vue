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
  <div class="flex gap-3" :class="message.role === 'user' ? 'flex-row-reverse' : ''">
    <span class="playground-avatar" :class="message.role === 'user' ? 'playground-avatar--user' : ''" aria-hidden="true">
      <AppIcon :name="message.role === 'user' ? 'i-tabler-user' : 'i-tabler-sparkles'" class="size-4" />
    </span>
    <div class="flex min-w-0 max-w-[85%] flex-col gap-1" :class="message.role === 'user' ? 'items-end' : 'items-start'">
      <span class="px-1 text-[11px] font-medium text-[var(--ui-text-muted)]">{{ message.role === 'user' ? t('playground.you') : message.model || t('playground.assistant') }}</span>
      <div class="playground-bubble" :class="[message.role === 'user' ? 'playground-bubble--user' : '', message.error ? 'playground-bubble--error' : '']">
        <details v-if="message.reasoning" class="mb-2 text-xs text-[var(--ui-text-muted)]">
          <summary class="cursor-pointer select-none font-medium">{{ t('playground.reasoning') }}</summary>
          <p class="mt-1 whitespace-pre-wrap break-words">{{ message.reasoning }}</p>
        </details>
        <p v-if="message.content" class="whitespace-pre-wrap break-words">{{ message.content }}</p>
        <p v-if="message.error" class="flex items-start gap-1.5 text-[var(--ui-error)]"><AppIcon name="i-tabler-alert-triangle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message.error }}</p>
        <span v-if="message.pending && !message.content" class="playground-typing" role="status" :aria-label="t('playground.thinking')"><span /><span /><span /></span>
      </div>
      <div v-if="message.role === 'assistant' && !message.pending && message.content" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] tabular-nums text-[var(--ui-text-muted)]">
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
.playground-avatar--user { background: var(--ui-bg-accented); color: var(--ui-text-toned); }
.playground-bubble {
  border: 1px solid var(--ui-border);
  border-radius: 1rem;
  border-top-left-radius: 0.375rem;
  background: var(--ui-bg);
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.6;
}
.playground-bubble--user {
  border-color: color-mix(in oklch, var(--ui-primary) 22%, var(--ui-border));
  border-top-left-radius: 1rem;
  border-top-right-radius: 0.375rem;
  background: var(--user-selected);
}
.playground-bubble--error { border-color: color-mix(in oklch, var(--ui-error) 35%, var(--ui-border)); }
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
