<template>
            <AppCard
              id="config-payload"
            >
              <template #header
                ><div>
                  <h2 class="font-semibold">{{ t('config.payload.title') }}</h2>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ t('config.payload.description') }}
                  </p>
                </div></template
              >
              <div class="space-y-4">
                <div class="flex flex-wrap gap-2" :aria-label="t('config.payload.ruleCounts')">
                  <span
                    v-for="mode in payloadModes"
                    :key="mode.value"
                    class="inline-flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-2.5 py-1 text-xs"
                    ><span class="text-[var(--ui-text-muted)]">{{ payloadModeLabel(mode.value) }}</span
                    ><strong class="tabular-nums text-[var(--ui-text-highlighted)]">{{
                      payloadDraft[mode.value]?.length || 0
                    }}</strong></span
                  >
                </div>
                <div
                  v-for="mode in payloadModes"
                  :key="mode.value"
                  class="space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <h3 class="font-semibold">{{ payloadModeLabel(mode.value) }}</h3>
                    <AppButton
                      size="sm"
                      color="neutral"
                      variant="outline"
                      @click="addPayloadRule(mode.value)"
                      >{{ t('config.payload.addRule') }}</AppButton
                    >
                  </div>
                  <AppCard
                    v-for="(rule, index) in payloadDraft[mode.value] || []"
                    :key="index"
                    :ui="{ body: 'p-3' }"
                    ><div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-sm font-medium">
                          {{ payloadRuleSummary(rule) }}
                        </p>
                        <p class="text-xs text-[var(--ui-text-muted)]">
                          {{ payloadRulePaths(rule, mode.value) }}
                        </p>
                      </div>
                      <div class="flex gap-1">
                        <AppButton
                          size="sm"
                          color="neutral"
                          variant="ghost"
                          @click="editPayload(mode.value, index)"
                          >{{ t('common.edit') }}</AppButton
                        ><AppButton
                          size="sm"
                          color="neutral"
                          variant="ghost"
                          @click="duplicatePayload(mode.value, index)"
                          >{{ t('config.payload.duplicate') }}</AppButton
                        ><AppButton
                          size="sm"
                          color="error"
                          variant="ghost"
                          @click="removePayload(mode.value, index)"
                          >{{ t('common.remove') }}</AppButton
                        >
                      </div>
                    </div></AppCard
                  >
                </div>
                <details>
                  <summary class="cursor-pointer text-sm">
                    {{ t('config.payload.viewJson') }}
                  </summary>
                  <pre
                    class="mt-2 max-h-80 overflow-auto rounded-md bg-[var(--ui-bg-muted)] p-3 text-xs"
                    >{{ JSON.stringify(payloadDraft, null, 2) }}</pre
                  >
                </details>
              </div>
            </AppCard>
</template>

<script setup lang="ts">
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const {
  t, payloadModes, payloadModeLabel, payloadDraft, addPayloadRule,
  payloadRuleSummary, payloadRulePaths, editPayload, duplicatePayload, removePayload,
} = useConfigWorkspace()
</script>
