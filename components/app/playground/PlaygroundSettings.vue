<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'

const { t } = usePortalI18n()
const { loading, ready, sending, selectedKey, selectedModel, keyOptions, modelOptions, systemPrompt, temperature, maxTokens, stream, endpoint, models, load } = usePlaygroundWorkspace()
</script>

<template>
  <AppCard class="playground-panel min-w-0" :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-adjustments-horizontal" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('playground.settings') }}</h2>
        <AppButton icon="i-tabler-refresh" color="neutral" variant="ghost" size="sm" :loading="loading" :disabled="sending" :aria-label="t('common.refresh')" :title="t('common.refresh')" @click="load" />
      </div>
    </template>
    <template v-if="loading">
      <PortalSkeleton v-for="index in 4" :key="index" class="h-14 w-full rounded-xl" />
    </template>
    <template v-else>
      <PortalField :label="t('playground.apiKey')" :hint="t('playground.apiKeyHint')">
        <PortalSelect v-model="selectedKey" :items="keyOptions" class="w-full" :disabled="!keyOptions.length || sending" :placeholder="t('playground.noKeyOption')" />
      </PortalField>
      <PortalField :label="t('playground.model')" :hint="t('playground.modelHint', { count: models.length })">
        <PortalSelect v-model="selectedModel" :items="modelOptions" class="w-full" :disabled="!ready || sending" :placeholder="t('playground.noModelOption')" />
      </PortalField>
      <PortalField :label="t('playground.systemPrompt')">
        <Textarea v-model="systemPrompt" :disabled="!ready || sending" rows="4" class="max-h-48 min-h-20 resize-y text-sm" :placeholder="t('playground.systemPromptPlaceholder')" :aria-label="t('playground.systemPrompt')" />
      </PortalField>
      <div class="grid grid-cols-2 gap-3">
        <PortalField :label="t('playground.temperature')">
          <PortalInput v-model="temperature" type="number" min="0" max="2" step="0.1" inputmode="decimal" :placeholder="t('playground.default')" class="w-full" :disabled="!ready || sending" />
        </PortalField>
        <PortalField :label="t('playground.maxTokens')">
          <PortalInput v-model="maxTokens" type="number" min="1" step="1" inputmode="numeric" :placeholder="t('playground.default')" class="w-full" :disabled="!ready || sending" />
        </PortalField>
      </div>
      <label class="flex items-center justify-between gap-3 rounded-xl border border-[var(--ui-border)] px-3 py-2.5 text-sm">
        <span class="min-w-0"><span class="block font-medium">{{ t('playground.stream') }}</span><span class="block text-xs text-[var(--ui-text-muted)]">{{ t('playground.streamHint') }}</span></span>
        <Switch v-model="stream" :disabled="!ready || sending" />
      </label>
      <div v-if="endpoint" class="rounded-xl bg-[var(--ui-bg-muted)] px-3 py-2.5">
        <p class="text-[11px] font-medium text-[var(--ui-text-muted)]">{{ t('playground.endpoint') }}</p>
        <code class="mt-0.5 block break-all text-xs">{{ endpoint }}</code>
      </div>
    </template>
  </AppCard>
</template>
