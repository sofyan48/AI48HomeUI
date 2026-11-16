<template>
            <AppCard
              id="config-oauth-rules"
            >
              <template #header
                ><div>
                  <h2 class="font-semibold">{{ t('config.oauthRules.title') }}</h2>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ t('config.oauthRules.description') }}
                  </p>
                </div></template
              >
              <div class="space-y-6">
                <section class="space-y-3">
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <UFormField :label="t('config.oauthRules.channel')" class="lg:w-64"
                      ><USelect
                        v-model="exclusionChannel"
                        :items="channelOptions"
                        value-key="value"
                        label-key="label"
                        class="w-full"
                        @update:model-value="loadChannelModels" /></UFormField
                    ><UInput
                      v-model="modelSearch"
                      icon="i-tabler-search"
                      :placeholder="t('config.oauthRules.searchPlaceholder')"
                      class="flex-1"
                    /><AppButton
                      color="neutral"
                      variant="outline"
                      :loading="modelsLoading"
                      @click="loadChannelModels"
                      >{{ t('config.oauthRules.reloadModels') }}</AppButton
                    >
                  </div>
                  <UAlert
                    v-if="modelsError"
                    color="warning"
                    variant="subtle"
                    :title="t('config.oauthRules.modelsUnavailable')"
                    :description="modelsError"
                  />
                  <div
                    class="max-h-80 overflow-y-auto rounded-md border border-[var(--ui-border)]"
                  >
                    <label
                      v-for="model in filteredChannelModels"
                      :key="model.id"
                      class="flex items-start gap-3 border-b border-[var(--ui-border)] px-3 py-2 last:border-b-0"
                      ><UCheckbox
                        :model-value="excludedForChannel.includes(model.id)"
                        :disabled="loading || saving || Boolean(validationErrors.oauthExcludedModelsJson)"
                        @update:model-value="toggleExcluded(model.id, $event)"
                      /><span
                        ><span class="block text-sm font-medium">{{
                          model.display_name || model.name || model.id
                        }}</span
                        ><span
                          class="font-mono text-xs text-[var(--ui-text-muted)]"
                          >{{ model.id }}</span
                        ></span
                      ></label
                    >
                    <p
                      v-if="modelsLoading || !filteredChannelModels.length"
                      class="p-6 text-center text-sm text-[var(--ui-text-muted)]"
                    >
                      {{ modelsLoading ? t('config.oauthRules.loadingModels') : t('config.oauthRules.noModels') }}
                    </p>
                  </div>
                  <div class="flex items-center justify-between">
                    <UBadge color="neutral" variant="subtle"
                      >{{ t('config.oauthRules.disabledCount', { count: excludedForChannel.length }) }}</UBadge
                    ><AppButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      :disabled="!excludedForChannel.length || loading || saving || Boolean(validationErrors.oauthExcludedModelsJson)"
                      @click="clearExcludedChannel"
                      >{{ t('config.oauthRules.clearChannel') }}</AppButton
                    >
                  </div>
                  <UFormField :label="t('config.oauthRules.manualLabel')" :hint="t('config.oauthRules.manualHint')" :error="validationErrors.oauthExcludedModelsJson">
                    <UTextarea v-model="draft.oauthExcludedModelsJson" :disabled="loading || saving" :rows="6" class="w-full font-mono text-xs" spellcheck="false" />
                  </UFormField>
                </section>

                <section
                  class="space-y-3 border-t border-[var(--ui-border)] pt-5"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-semibold">{{ t('config.aliases.title') }}</h3>
                      <p class="text-xs text-[var(--ui-text-muted)]">
                        {{ t('config.aliases.description') }}
                      </p>
                    </div>
                    <AppButton
                      size="sm"
                      color="neutral"
                      variant="outline"
                      @click="addAlias"
                      >{{ t('config.aliases.add') }}</AppButton
                    >
                  </div>
                  <AppCard
                    v-for="(row, index) in aliasRows"
                    :key="row.key"
                    :ui="{
                      body: 'grid gap-3 p-3 lg:grid-cols-2 lg:items-end',
                    }"
                    ><UFormField :label="t('config.oauthRules.channel')"
                      ><UInput v-model="row.channel" /></UFormField
                    ><UFormField :label="t('config.aliases.upstreamModel')"
                      ><UInput v-model="row.name" /></UFormField
                    ><UFormField :label="t('config.aliases.clientAlias')"
                      ><UInput v-model="row.alias" /></UFormField
                    ><UFormField :label="t('config.aliases.displayName')"
                      ><UInput v-model="row.displayName" /></UFormField
                    ><UCheckbox v-model="row.fork" :label="t('config.aliases.fork')" /><UCheckbox
                      v-model="row.forceMapping"
                      :label="t('config.aliases.forceMapping')" /><AppButton
                      color="error"
                      variant="ghost"
                      icon="i-tabler-trash"
                      :aria-label="t('config.aliases.remove')"
                      @click="aliasRows.splice(index, 1)"
                  /></AppCard>
                  <p
                    v-if="!aliasRows.length"
                    class="py-6 text-center text-sm text-[var(--ui-text-muted)]"
                  >
                    {{ t('config.aliases.empty') }}
                  </p>
                </section>
              </div>
            </AppCard>
</template>

<script setup lang="ts">
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const {
  t, draft, loading, saving, validationErrors, exclusionChannel, channelOptions,
  loadChannelModels, modelSearch, modelsLoading, modelsError, filteredChannelModels,
  excludedForChannel, toggleExcluded, clearExcludedChannel, addAlias, aliasRows,
} = useConfigWorkspace()
</script>
