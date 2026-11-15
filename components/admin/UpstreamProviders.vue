<template>
  <div class="space-y-4">
    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('upstream.providers.loadErrorTitle')"
      :description="pageError"
    />

    <section class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="self-start max-xl:hidden" :aria-label="t('upstream.providers.categories')">
        <AppCard :ui="{ header: 'px-4 py-3', body: 'p-2' }">
          <template #header><h2 class="font-semibold">{{ t('upstream.providers.categories') }}</h2></template>
          <nav class="grid gap-1" :aria-label="t('upstream.providers.categories')">
          <button
            v-for="category in providerCategories"
            :key="category.value"
            type="button"
            :disabled="providerEditorOpen || deleteOpen"
            :aria-current="selectedProviderRoute === category.value ? 'page' : undefined"
            class="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="selectedProviderRoute === category.value ? 'border-[color-mix(in_oklch,var(--ui-primary)_30%,transparent)] bg-[var(--admin-selected)] text-[var(--ui-primary)]' : 'border-transparent hover:bg-[var(--ui-hover)]'"
            @click="selectedProviderRoute = category.value"
          >
            <span class="flex min-w-0 items-center gap-2.5">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-muted)] text-[10px] font-semibold" aria-hidden="true">{{ category.mark }}</span>
              <span class="min-w-0">
              <span class="block truncate text-sm font-medium">{{ categoryLabel(category) }}</span>
              <span class="mt-0.5 block text-xs text-[var(--ui-text-muted)]">
                {{ categoryStats[category.value] ? t('upstream.providers.categoryCounts', { active: categoryStats[category.value].active, total: categoryStats[category.value].total }) : t('upstream.providers.countsUnavailable') }}
              </span>
              </span>
            </span>
            <UIcon v-if="categoryStats[category.value]?.disabled" name="i-tabler-alert-triangle" class="size-4 shrink-0 text-[var(--ui-warning)]" :aria-label="t('upstream.providers.disabledEntries', { count: categoryStats[category.value].disabled })" />
            <span v-else class="shrink-0 rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5 text-xs tabular-nums" :aria-label="categoryStats[category.value] ? t('upstream.providers.entriesCount', { count: categoryStats[category.value].total }) : t('upstream.providers.countsUnavailable')">{{ categoryStats[category.value]?.total ?? '—' }}</span>
          </button>
          </nav>
        </AppCard>
      </aside>

      <div class="min-w-0">
        <AppCard :ui="{ body: 'p-0' }">
        <div class="flex flex-col gap-3 border-b border-[var(--ui-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div class="w-full sm:w-auto">
            <label class="mb-1.5 block text-sm font-medium xl:hidden">{{ t('upstream.providers.category') }}</label>
            <USelectMenu
              v-model="selectedProviderRoute"
              :items="providerOptions"
              value-key="value"
              label-key="label"
              :search-input="{ placeholder: t('upstream.providers.searchCategories') }"
              :disabled="providerEditorOpen || deleteOpen"
              class="w-full xl:hidden"
            />
            <h2 class="hidden items-center gap-2 text-base font-semibold text-[var(--ui-text-highlighted)] xl:flex"><span class="flex size-5 items-center justify-center rounded border border-[var(--ui-border)] text-[9px]" aria-hidden="true">{{ selectedProvider.mark }}</span>{{ selectedProviderLabel }} <span class="font-mono text-xs font-normal text-[var(--ui-text-muted)]">/{{ selectedProviderRoute }}</span></h2>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <UInput v-model="providerSearch" icon="i-tabler-search" :placeholder="t('upstream.providers.filterEntries')" class="w-full sm:w-72" />
            <AppButton color="primary" icon="i-tabler-plus" :disabled="pending || !!pageError" @click="openProviderCreate">{{ t('upstream.providers.newProvider') }}</AppButton>
          </div>
        </div>

        <AppTable :columns="providerColumns" :data="filteredProviderEntries" :loading="pending">
          <template #identity-cell="{ row }">
            <div class="min-w-0">
              <p class="max-w-52 truncate font-medium text-[var(--ui-text-highlighted)]">{{ providerEntryLabel(rowValue(row)) }}</p>
              <p class="mt-1 max-w-52 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).api_key_preview || rowValue(row).auth_index || rowValue(row).id || selectedProviderLabel }}</p>
            </div>
          </template>

          <template #endpoint-cell="{ row }">
            <p class="max-w-56 truncate font-mono text-xs text-[var(--ui-text-muted)]" :title="safeEndpoint(rowValue(row)['base-url'] || rowValue(row).base_url)">{{ safeEndpoint(rowValue(row)['base-url'] || rowValue(row).base_url) }}</p>
          </template>
          <template #prefix-cell="{ row }"><span class="rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5 font-mono text-xs">{{ rowValue(row).prefix || t('common.none') }}</span></template>
          <template #models-cell="{ row }"><span class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.modelsHeaders', { models: Array.isArray(rowValue(row).models) ? rowValue(row).models.length : 0, headers: Object.keys(rowValue(row).headers || {}).length }) }}</span></template>
          <template #status-cell="{ row }">
            <UBadge :color="rowValue(row).disabled ? 'warning' : 'success'" variant="subtle" size="sm" :icon="rowValue(row).disabled ? 'i-tabler-alert-triangle' : 'i-tabler-circle-check'">{{ rowValue(row).disabled ? t('common.disabled') : t('common.active') }}</UBadge>
          </template>

          <template #actions-cell="{ row }">
            <AdminRowActions :actions="providerRowActions(rowValue(row))" :menu-label="t('upstream.providers.rowMenu', { name: providerEntryLabel(rowValue(row)) })" />
          </template>

          <template #empty>
            <div class="flex flex-col items-center justify-center px-6 py-8 text-center">
              <div class="mb-3 rounded-full bg-[var(--ui-bg-muted)] p-3 text-[var(--ui-text-muted)]">
                <UIcon name="i-tabler-server-2" class="size-6 text-[var(--ui-text-muted)]" />
              </div>
              <p class="font-medium">{{ pending ? t('upstream.providers.emptyLoading') : pageError ? t('upstream.providers.emptyUnavailable') : providerSearch ? t('upstream.providers.emptyNoMatch') : t('upstream.providers.emptyNone', { provider: selectedProviderLabel }) }}</p>
              <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ pageError ? t('upstream.providers.emptyCheckError') : providerSearch ? t('upstream.providers.emptyTryDifferent') : t('upstream.providers.emptyAddHint') }}</p>
            </div>
          </template>
        </AppTable>
        </AppCard>
      </div>
    </section>

    <AdminModalForm
      v-model:open="providerEditorOpen"
      :title="providerEditorMode === 'detail' ? t('upstream.providers.detailsTitle') : isCompat ? (providerEditorMode === 'edit' ? t('upstream.providers.editCompat') : t('upstream.providers.newCompat')) : providerEditorMode === 'edit' ? t('upstream.providers.editKey', { provider: selectedProviderLabel }) : t('upstream.providers.newKey', { provider: selectedProviderLabel })"
      :description="t('upstream.providers.modalDescription')"
    >
        <div v-if="providerEditorMode === 'detail' && editingProviderEntry" class="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
          <div><p class="text-xs font-medium uppercase text-[var(--ui-text-muted)]">{{ t('upstream.providers.detailsTitle') }}</p><h2 class="mt-2 text-base font-semibold">{{ providerEntryLabel(editingProviderEntry) }}</h2></div>
          <dl class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <div v-for="field in providerDetailFields" :key="field.label" class="min-w-0"><dt class="text-xs text-[var(--ui-text-muted)]">{{ field.label }}</dt><dd class="mt-1 break-words font-mono text-xs">{{ field.value }}</dd></div>
          </dl>
          <details class="rounded-md border border-[var(--ui-border)] px-3 py-2.5 text-sm"><summary class="cursor-pointer font-medium">{{ t('upstream.providers.additionalMetadata') }}</summary>
            <dl class="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2"><div v-for="field in providerMetadataFields" :key="field.label"><dt class="text-xs text-[var(--ui-text-muted)]">{{ field.label }}</dt><dd class="mt-1 break-words font-mono text-xs">{{ field.value }}</dd></div></dl>
          </details>
          <div class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"><AppButton color="neutral" variant="ghost" @click="providerEditorOpen = false">{{ t('common.close') }}</AppButton><AppButton color="primary" icon="i-tabler-pencil" @click="openProviderEdit(editingProviderEntry)">{{ t('common.edit') }}</AppButton></div>
        </div>
        <form v-else novalidate class="max-h-[75vh] space-y-4 overflow-y-auto pr-1" @submit.prevent="saveProviderEntry">
          <UAlert
            v-if="editorError"
            color="error"
            variant="subtle"
            icon="i-tabler-alert-circle"
            :title="t('upstream.providers.invalidEntry')"
            :description="editorError"
          />


            <div class="grid gap-4">
              <UFormField v-if="isCompat" :label="t('upstream.providers.providerName')" required><UInput v-model="providerForm.name" class="w-full" placeholder="my-upstream" /></UFormField>
              <UFormField v-if="!isCompat" :label="t('upstream.providers.serviceKey')" :required="providerEditorMode === 'create'"><UInput v-model="providerKey" type="password" autocomplete="new-password" class="w-full" :placeholder="providerEditorMode === 'edit' ? t('upstream.providers.keepCurrentKey') : t('upstream.providers.enterApiKey')" /></UFormField>
              <UFormField :label="t('upstream.providers.baseUrl')" :required="requiresBaseURL"><UInput v-model="providerForm['base-url']" type="url" class="w-full" placeholder="https://api.example.com" /></UFormField>
              <UFormField v-if="!isCompat" :label="t('upstream.providers.proxyUrl')"><UInput v-model="providerForm['proxy-url']" type="url" class="w-full" placeholder="http://127.0.0.1:7890" /></UFormField>
              <UFormField :label="t('upstream.providers.modelPrefix')"><UInput v-model="providerForm.prefix" class="w-full" /></UFormField>
              <UFormField :label="t('upstream.providers.priority')"><UInput v-model="providerForm.priority" type="number" step="1" class="w-full" /></UFormField>
              <UFormField v-if="!isCompat" :label="t('upstream.providers.weight')" :hint="t('upstream.providers.weightHint')"><UInput v-model="providerForm.weight" type="number" step="1" class="w-full" /></UFormField>
              <UFormField :label="t('upstream.providers.retryRounds')" :hint="t('upstream.providers.retryRoundsHint')"><UInput v-model="requestRetryText" type="number" step="1" class="w-full" :placeholder="t('upstream.providers.inheritGlobal')" /></UFormField>
              <UFormField :label="t('upstream.providers.coolingPolicy')" :hint="t('upstream.providers.coolingPolicyHint')">
                      <USelect v-model="coolingPolicy" :items="coolingPolicyOptions" value-key="value" label-key="label" class="w-full" />
                    </UFormField>
            </div>
            <AdminModalCard v-if="isCompat" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-medium">{{ t('upstream.providers.keyEntries') }}</h3>
                <AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="addCompatKey()">{{ t('upstream.providers.addKey') }}</AppButton>
              </div>
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.compatHelp') }}</p>
              <UAlert v-if="!compatKeyRows.length" color="warning" variant="subtle" :title="t('upstream.providers.keylessTitle')" :description="t('upstream.providers.keylessDescription')" />
              <AdminModalCard v-for="(key, index) in compatKeyRows" :key="key.rowId" nested class="space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium">{{ t('upstream.providers.keyN', { n: index + 1 }) }}</span>
                  <AppButton type="button" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('upstream.providers.removeKeyN', { n: index + 1 })" @click="compatKeyRows.splice(index, 1)">{{ t('common.remove') }}</AppButton>
                </div>
                <p v-if="key.source.id || key.source.uuid" class="break-all font-mono text-xs text-[var(--ui-text-muted)]">{{ key.source.id || key.source.uuid }}</p>
                <UFormField :label="t('upstream.providers.serviceKey')" :required="!key.source['api-key']" :hint="key.source['api-key'] ? t('upstream.providers.keepSavedHint') : undefined">
                  <UInput v-model="key.secret" type="password" autocomplete="new-password" class="w-full" :placeholder="key.source['api-key'] ? t('upstream.providers.keepSaved') : t('upstream.providers.enterApiKey')" />
                </UFormField>
                <UFormField :label="t('upstream.providers.proxyUrl')" :hint="t('upstream.providers.keyProxyHint')">
                  <UInput v-model="key.proxy" class="w-full" :placeholder="t('upstream.providers.keyProxyPlaceholder')" />
                </UFormField>
                <UFormField :label="t('upstream.providers.weight')" :hint="t('upstream.providers.keyWeightHint')">
                  <UInput v-model="key.weight" type="number" max="1000000" step="1" class="w-full" placeholder="1" />
                </UFormField>
              </AdminModalCard>
            </AdminModalCard>
            <UCheckbox v-if="isCompat" v-model="providerForm['support-prompt-cache-key']" :label="t('upstream.providers.promptCacheKeySupport')" />
            <UCheckbox v-if="supportsWebsockets" v-model="providerForm.websockets" :label="t('upstream.providers.websocketSupport')" />
            <UCheckbox v-if="isCompat" v-model="providerForm.disabled" :label="t('common.disabled')" />
            <div v-if="selectedProviderRoute === 'codex-api-key'" class="space-y-3">
              <UCheckbox v-model="providerForm['alpha-search']" :label="t('upstream.providers.alphaSearch')" />
              <UFormField :label="t('upstream.providers.codexIdentity')" :hint="t('upstream.providers.codexIdentityHint')">
                <USelect v-model="codexCloakingPolicy" :items="codexCloakingOptions" value-key="value" label-key="label" class="w-full" />
              </UFormField>
            </div>
            <div v-if="selectedProviderRoute === 'claude-api-key'" class="space-y-3">
              <UCheckbox v-model="providerForm['experimental-cch-signing']" :label="t('upstream.providers.cchSigning')" />
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.cchSigningHelp') }}</p>
              <UCheckbox v-model="providerForm['native-tool-search']" :label="t('upstream.providers.nativeToolSearch')" />
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.nativeToolSearchHelp') }}</p>
              <UCheckbox v-model="providerForm['rebuild-mid-system-message']" :label="t('upstream.providers.rebuildSystem')" />
              <UFormField :label="t('upstream.providers.fingerprint')" :hint="t('upstream.providers.fingerprintHint')">
                <UInput v-model="providerForm['fingerprint-profile']" class="w-full" :placeholder="t('upstream.providers.fingerprintPlaceholder')" />
              </UFormField>
            </div>
            <AdminModalCard v-if="supportsRequestScopedErrors" as="details" class="space-y-3">
              <summary class="cursor-pointer font-medium">{{ t('upstream.providers.scopedErrors') }}</summary>
              <UFormField class="mt-3" :label="t('upstream.providers.scopedRules')" :hint="t('upstream.providers.scopedRulesHint')">
                <UTextarea v-model="requestScopedErrorsText" :rows="6" class="w-full" placeholder='[{"status": 400, "match": ["invalid request"], "action": "stop"}]' />
              </UFormField>
            </AdminModalCard>
            <AdminModalCard v-if="selectedProviderRoute === 'claude-api-key'" as="details" class="space-y-3">
              <summary class="cursor-pointer font-medium">{{ t('upstream.providers.cloakConfig') }}</summary>
              <div class="mt-3 space-y-3">
                <UFormField :label="t('upstream.providers.cloakMode')" :hint="t('upstream.providers.cloakModeHint')"><USelect v-model="cloakMode" :items="cloakModeOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
                <UCheckbox v-model="cloakStrictMode" :label="t('upstream.providers.strictMode')" />
                <UFormField :label="t('upstream.providers.sensitiveWords')" :hint="t('upstream.providers.sensitiveWordsHint')"><UTextarea v-model="cloakSensitiveWordsText" :rows="3" class="w-full" /></UFormField>
                <UFormField :label="t('upstream.providers.cacheUserId')"><USelect v-model="cloakCacheUserID" :items="cloakCacheOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
              </div>
            </AdminModalCard>

            <AdminModalCard as="details" class="space-y-3">
              <summary class="cursor-pointer font-medium">{{ t('upstream.providers.customModels') }}</summary>
              <div class="mt-3 flex justify-end"><AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="addProviderModel">{{ t('upstream.providers.addModel') }}</AppButton></div>

              <AdminModalCard v-if="supportsDiscovery" nested class="space-y-3">
                <p class="text-sm font-medium">{{ t('upstream.providers.discoverModels') }}</p>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.discoverDescription') }}</p>
                <div class="flex flex-wrap items-center gap-2">
                  <AppButton type="button" color="neutral" variant="outline" icon="i-tabler-search" :loading="discovering" :disabled="!discoveryReady" @click="discoverModels">{{ discoveryLoaded ? t('common.reload') : t('upstream.providers.discoverModels') }}</AppButton>
                  <span class="text-xs text-[var(--ui-text-muted)]">{{ discoveryAuthLabel }} · {{ requiresBaseURL ? providerForm['base-url']?.trim() ? t('upstream.providers.baseUrlSet') : t('upstream.providers.baseUrlRequiredShort') : t('upstream.providers.defaultBaseUrl') }}</span>
                </div>
                <UAlert v-if="discoveryError" color="error" variant="subtle" :title="t('upstream.providers.discoveryFailed')" :description="discoveryError" />
                <div v-if="discoveryVisible" class="space-y-2">
                  <UInput v-model="discoverySearch" icon="i-tabler-search" :placeholder="t('upstream.providers.searchModels')" class="w-full" />
                  <p v-if="discoveryLoaded && !discoveredModels.length" class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.noModelsFound') }}</p>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm">{{ t('upstream.providers.selectedOf', { selected: selectedDiscovered.length, total: discoveredModels.length }) }}</p>
                    <div class="flex gap-2"><AppButton type="button" size="sm" color="neutral" variant="ghost" @click="selectAllDiscoveredModels">{{ t('upstream.providers.selectAll') }}</AppButton><AppButton type="button" size="sm" color="neutral" variant="ghost" @click="selectedDiscovered = []">{{ t('upstream.providers.clear') }}</AppButton></div>
                  </div>
                  <div class="max-h-40 space-y-1 overflow-y-auto">
                    <UCheckbox v-for="model in filteredDiscoveredModels" :key="model.name" :model-value="existingModelNames.has(model.name.toLowerCase()) || selectedDiscovered.includes(model.name)" :disabled="existingModelNames.has(model.name.toLowerCase())" :label="existingModelNames.has(model.name.toLowerCase()) ? t('upstream.providers.alreadyAdded', { name: model.name }) : model.displayName ? `${model.name} · ${model.displayName}` : model.name" @update:model-value="toggleDiscoveredModel(model.name, $event)" />
                  </div>
                  <div class="flex justify-end gap-2"><AppButton type="button" size="sm" color="neutral" variant="ghost" @click="discoveryVisible = false">{{ t('common.close') }}</AppButton><AppButton type="button" size="sm" color="primary" :disabled="!selectedDiscovered.length" @click="applyDiscoveredModels">{{ t('common.apply') }}</AppButton></div>
                </div>
              </AdminModalCard>
              <AdminModalCard v-for="(model, index) in providerForm.models" :key="index" nested class="space-y-2">
                <div class="grid gap-2 sm:grid-cols-2"><UFormField :label="t('upstream.providers.modelId')"><UInputMenu v-model="model.name" :items="modelSuggestions" create-item class="w-full" :placeholder="t('upstream.providers.searchCatalog')" @create="model.name = $event.trim()" /></UFormField><UFormField :label="t('upstream.providers.alias')"><UInput v-model="model.alias" class="w-full" /></UFormField><UFormField v-if="supportsModelMapping" :label="t('upstream.providers.displayName')"><UInput v-model="model['display-name']" class="w-full" /></UFormField><div class="flex items-end justify-between gap-2"><UCheckbox v-if="supportsModelMapping" v-model="model['force-mapping']" :label="t('upstream.providers.forceMapping')" /><AppButton type="button" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('upstream.providers.removeModel')" :disabled="providerForm.models.length <= 1" @click="removeProviderModel(index)" /></div></div>
                <details class="rounded-md border border-[var(--ui-border)] p-3">
                  <summary class="cursor-pointer text-sm font-medium">{{ t('upstream.providers.modelCapabilities') }}</summary>
                  <div class="mt-3 space-y-3">
                    <UFormField v-if="supportsContextLimit" :label="t('upstream.providers.contextLimit')" :hint="t('upstream.providers.contextLimitHint')">
                      <UInput v-model="model['max-context-length']" type="number" min="1" step="1" class="w-full" />
                    </UFormField>
                    <UCheckbox v-if="supportsContextLimit" v-model="model['is-compat']" :label="t('upstream.providers.retainThinking')" />
                    <UCheckbox v-if="selectedProviderRoute === 'codex-api-key'" v-model="model['support-configuration-update']" :label="t('upstream.providers.configurationUpdate')" />
                    <UCheckbox :model-value="model.thinking != null" :label="t('upstream.providers.overrideThinking')" @update:model-value="model.thinking = $event ? (model.thinking || {}) : undefined" />
                    <div v-if="model.thinking != null" class="grid gap-3 sm:grid-cols-2">
                      <UFormField :label="t('upstream.providers.minBudget')"><UInput v-model="model.thinking.min" type="number" min="0" step="1" class="w-full" /></UFormField>
                      <UFormField :label="t('upstream.providers.maxBudget')"><UInput v-model="model.thinking.max" type="number" min="0" step="1" class="w-full" /></UFormField>
                      <UCheckbox v-model="model.thinking['zero-allowed']" :label="t('upstream.providers.allowZero')" />
                      <UCheckbox v-model="model.thinking['dynamic-allowed']" :label="t('upstream.providers.allowDynamic')" />
                      <UFormField :label="t('upstream.providers.thinkingLevels')" :hint="t('upstream.providers.thinkingLevelsHint')" class="sm:col-span-2">
                        <UInput :model-value="(model.thinking.levels || []).join(', ')" class="w-full" @update:model-value="model.thinking.levels = splitModelList($event)" />
                      </UFormField>
                    </div>
                    <template v-if="isCompat">
                      <UCheckbox v-model="model.image" :label="t('upstream.providers.imageModel')" />
                      <UCheckbox v-model="model['use-max-completion-tokens']" :label="t('upstream.providers.maxCompletionTokens')" />
                      <UFormField v-for="field in ['input-modalities', 'output-modalities']" :key="field" :label="field === 'input-modalities' ? t('upstream.providers.inputModalities') : t('upstream.providers.outputModalities')" :hint="t('upstream.providers.modalitiesHint')">
                        <UInput :model-value="(model[field] || []).join(', ')" class="w-full" placeholder="text, image" @update:model-value="model[field] = splitModelList($event)" />
                      </UFormField>
                    </template>
                  </div>
                </details>
              </AdminModalCard>
            </AdminModalCard>
            <AdminModalCard v-if="!isCompat" as="details"><summary class="cursor-pointer font-medium">{{ t('upstream.providers.excludedModels') }}</summary><UTextarea v-model="excludedModelsText" :rows="3" class="mt-3 w-full" :placeholder="t('upstream.providers.excludedPlaceholder')" /></AdminModalCard>
            <AdminModalCard as="details" class="space-y-3">
              <summary class="cursor-pointer font-medium">{{ t('upstream.providers.requestHeaders') }}</summary>
              <div class="mt-3 space-y-3">
                <div class="flex justify-end"><AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="headerRows.push({ name: '', value: '' })">{{ t('upstream.providers.addHeader') }}</AppButton></div>
                <div v-for="(header, index) in headerRows" :key="index" class="flex items-end gap-2">
                <UFormField :label="t('upstream.providers.headerName')" class="flex-1"><UInput v-model="header.name" class="w-full" /></UFormField>
                <UFormField :label="t('upstream.providers.headerValue')" class="flex-1"><UInput v-model="header.value" class="w-full" /></UFormField>
                <AppButton type="button" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('upstream.providers.removeHeader')" :disabled="headerRows.length <= 1" @click="headerRows.splice(index, 1)" />
              </div>
              </div>
            </AdminModalCard>
            <AdminModalCard v-if="supportsTest" class="space-y-3">
              <UFormField :label="t('upstream.providers.testModel')"><USelect v-model="testModel" :items="testModelOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
              <AppButton type="button" color="neutral" variant="outline" :loading="testingConnection" @click="testProviderConnection">{{ t('upstream.providers.testConnectivity') }}</AppButton>
              <UAlert v-if="testError" color="error" variant="subtle" :title="t('upstream.providers.testFailed')" :description="testError" />
              <UAlert v-if="testSuccess" color="success" variant="subtle" :title="t('upstream.providers.testSucceeded')" />
            </AdminModalCard>
          <div class="flex items-center justify-between border-t border-[var(--ui-border)] pt-4">
            <span class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.keepKeyFooter') }}</span>
            <div class="flex gap-3">
              <AppButton color="neutral" variant="ghost" type="button" @click="providerEditorOpen = false">{{ t('common.cancel') }}</AppButton>
              <AppButton color="primary" type="submit" :loading="savingProvider">{{ t('upstream.providers.saveEntry') }}</AppButton>
            </div>
          </div>
        </form>
    </AdminModalForm>

    <AppModal v-model:open="deleteOpen" :title="t('upstream.providers.deleteTitle')">
      <template #body>
        <div class="space-y-5">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-tabler-alert-triangle"
            :title="t('upstream.providers.deleteWarning')"
            :description="deleteDescription"
          />
          <div class="flex justify-end gap-3">
            <AppButton color="neutral" variant="ghost" @click="deleteOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="error" :loading="deleting" @click="performDelete">{{ t('common.delete') }}</AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
const props = defineProps({ syncRequest: { type: Number, default: 0 } })
const emit = defineEmits(['changed'])
const { fetchAPI } = useApi()
const toast = useToast()
const { t } = useAdminI18n()
const rowValue = row => row?.original || row
const providerRowActions = entry => [
  { id: 'view', label: t('common.view'), ariaLabel: t('upstream.providers.viewAria'), icon: 'i-tabler-eye', onSelect: () => openProviderDetail(entry) },
  { id: 'edit', label: t('common.edit'), ariaLabel: t('upstream.providers.editAria'), icon: 'i-tabler-pencil', onSelect: () => openProviderEdit(entry) },
  { id: 'duplicate', label: t('upstream.providers.duplicate'), ariaLabel: t('upstream.providers.duplicateAria'), icon: 'i-tabler-copy', onSelect: () => duplicateProvider(entry) },
  { id: 'delete', label: t('common.delete'), ariaLabel: t('upstream.providers.deleteAria'), icon: 'i-tabler-trash', destructive: true, onSelect: () => confirmProviderDelete(entry) }
]

const providerCategories = [
  { value: 'gemini-api-key', path: '/config/api-keys/gemini', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, 'excluded-models': [] } },
  { value: 'interactions-api-key', path: '/config/api-keys/interactions', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, 'excluded-models': [] } },
  { value: 'claude-api-key', path: '/config/api-keys/claude', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, 'excluded-models': [] } },
  { value: 'codex-api-key', path: '/config/api-keys/codex', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, websockets: false } },
  { value: 'xai-api-key', path: '/config/api-keys/xai', template: { 'api-key': '', 'base-url': 'https://api.x.ai/v1', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {}, websockets: false } },
  { value: 'meta-api-key', path: '/config/api-keys/meta', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {} } },
  { value: 'vertex-api-key', path: '/config/api-keys/vertex', template: { 'api-key': '', 'base-url': '', priority: 0, weight: 1, prefix: '', 'proxy-url': '', models: [], headers: {} } },
  { value: 'openai-compatibility', path: '/config/api-keys/openai-compatibility', template: { name: '', 'base-url': '', priority: 0, weight: 1, disabled: false, prefix: '', 'api-key-entries': [], models: [], headers: {} } }
]

const providerMarks = ['G', 'G', 'C', 'Cx', 'xAI', 'M', 'V', 'AI']
providerCategories.forEach((category, index) => { category.mark = providerMarks[index] })

function categoryLabel(category) {
  return ({
    'gemini-api-key': t('upstream.providers.category.gemini'),
    'interactions-api-key': t('upstream.providers.category.interactions'),
    'claude-api-key': t('upstream.providers.category.claude'),
    'codex-api-key': t('upstream.providers.category.codex'),
    'xai-api-key': t('upstream.providers.category.xai'),
    'meta-api-key': t('upstream.providers.category.meta'),
    'vertex-api-key': t('upstream.providers.category.vertex'),
    'openai-compatibility': t('upstream.providers.category.openaiCompat')
  })[category?.value] || category?.value || ''
}

const selectedProviderRoute = ref(providerCategories[0].value)
const providerSearch = ref('')
const pageError = useWorkspaceState('admin:upstream-providers:pageError', () => (''))
const providerEditorOpen = ref(false)
const providerEditorMode = ref('create')
const editingProviderEntry = ref(null)
const editingProviderIndex = ref(-1)
const providerForm = ref({})
const excludedModelsText = ref('')
const headerRows = ref([{ name: '', value: '' }])
const providerKey = ref('')
const compatKeyRows = ref([])
let compatKeyRowId = 0
function addCompatKey(source = {}) {
  compatKeyRows.value.push({ rowId: ++compatKeyRowId, source: cloneValue(source), secret: '', proxy: source['proxy-url'] || '', weight: source.weight ?? '' })
}
const primaryProviderKey = computed(() => isCompat.value ? compatKeyRows.value[0]?.secret.trim() || '' : providerKey.value.trim())
const unsetCloakMode = '__not-set__'
const automaticTestModel = '__auto__'
const cloakMode = ref(unsetCloakMode)
const cloakStrictMode = ref(false)
const cloakSensitiveWordsText = ref('')
const cloakCacheUserID = ref('inherit')
const cloakModeOptions = computed(() => [{ label: t('upstream.providers.cloakNotSet'), value: unsetCloakMode }, { label: t('upstream.providers.cloakAuto'), value: 'auto' }, { label: t('upstream.providers.cloakAlways'), value: 'always' }, { label: t('upstream.providers.cloakNever'), value: 'never' }])
const cloakCacheOptions = computed(() => [{ label: t('upstream.providers.cacheDefault'), value: 'inherit' }, { label: t('upstream.providers.cachePerKey'), value: 'enabled' }, { label: t('upstream.providers.cachePerRequest'), value: 'disabled' }])
const requestRetryText = ref('')
const coolingPolicy = ref('inherit')
const coolingPolicyOptions = computed(() => [{ label: t('upstream.providers.coolingInherit'), value: 'inherit' }, { label: t('upstream.providers.coolingDisable'), value: 'disabled' }, { label: t('upstream.providers.coolingEnable'), value: 'enabled' }])
const codexCloakingPolicy = ref('inherit')
const codexCloakingOptions = computed(() => [{ label: t('upstream.providers.codexUnset'), value: 'inherit' }, { label: t('upstream.providers.codexDisable'), value: 'disabled' }, { label: t('upstream.providers.codexUse'), value: 'enabled' }])
const requestScopedErrorsText = ref('')
const supportsRequestScopedErrors = computed(() => selectedProviderRoute.value !== 'vertex-api-key')
const supportsContextLimit = computed(() => selectedProviderRoute.value !== 'vertex-api-key')

const isCompat = computed(() => selectedProviderRoute.value === 'openai-compatibility')
const supportsWebsockets = computed(() => ['codex-api-key', 'xai-api-key'].includes(selectedProviderRoute.value))
const supportsTest = computed(() => ['claude-api-key', 'openai-compatibility'].includes(selectedProviderRoute.value))
const testModel = ref(automaticTestModel)
const testModelOptions = computed(() => [{ label: t('upstream.providers.testAuto'), value: automaticTestModel }, ...providerForm.value.models.filter(model => String(model.name || '').trim()).map(model => ({ label: model.alias?.trim() ? `${model.name} · ${model.alias}` : model.name, value: model.name }))])
const testError = useWorkspaceState('admin:upstream-providers:testError', () => (''))
const testSuccess = useWorkspaceState('admin:upstream-providers:testSuccess', () => (false))
const testingConnection = useWorkspaceState('admin:upstream-providers:testingConnection', () => (false))
const supportsModelMapping = computed(() => true)
const requiresBaseURL = computed(() => ['codex-api-key', 'xai-api-key', 'openai-compatibility'].includes(selectedProviderRoute.value))
const supportsDiscovery = computed(() => ['gemini-api-key', 'interactions-api-key', 'claude-api-key', 'codex-api-key', 'meta-api-key', 'openai-compatibility'].includes(selectedProviderRoute.value))
const discoveredModels = useWorkspaceState('admin:upstream-providers:discoveredModels', () => ([]))
const discoverySearch = ref('')
const discoveryVisible = ref(false)
const discoveryLoaded = useWorkspaceState('admin:upstream-providers:discoveryLoaded', () => (false))
const selectedDiscovered = ref([])
const discoveryError = useWorkspaceState('admin:upstream-providers:discoveryError', () => (''))
const discovering = useWorkspaceState('admin:upstream-providers:discovering', () => (false))
let discoveryGeneration = 0
const discoveryAuthIndex = computed(() => {
  if (providerEditorMode.value !== 'edit') return ''
  const entry = editingProviderEntry.value
  if (isCompat.value) {
    if (compatKeyRows.value.length === 1) {
      const credential = compatKeyRows.value[0]?.source
      return String(credential?.auth_index || credential?.id || credential?.uuid || '').trim()
    }
    return compatKeyRows.value.length === 0 && entry?.__v8KeyIndex === -1
      ? String(entry.__v8Group?.auth_index || entry.__v8Group?.id || entry.__v8Group?.uuid || '').trim()
      : ''
  }
  return String(entry?.auth_index || entry?.id || '').trim()
})
const discoveryHeaders = computed(() => Object.fromEntries(headerRows.value.filter(row => row.name.trim()).map(row => [row.name.trim(), row.value])))
const discoveryAuthLabel = computed(() => primaryProviderKey.value ? t('upstream.providers.authEnteredKey') : discoveryAuthIndex.value ? t('upstream.providers.authSavedCredential') : hasProviderAuthHeader.value ? t('upstream.providers.authHeader') : t('upstream.providers.authRequired'))
const hasProviderAuthHeader = computed(() => Object.entries(discoveryHeaders.value).some(([name, value]) =>
  name.toLowerCase() === (['gemini-api-key', 'interactions-api-key'].includes(selectedProviderRoute.value) ? 'x-goog-api-key' : selectedProviderRoute.value === 'claude-api-key' ? 'x-api-key' : 'authorization') && String(value).trim()))
const discoveryReady = computed(() => (primaryProviderKey.value || discoveryAuthIndex.value || hasProviderAuthHeader.value) && (!requiresBaseURL.value || String(providerForm.value['base-url'] || '').trim()))
const existingModelNames = computed(() => new Set(providerForm.value.models.map(model => String(model.name || '').trim().toLowerCase()).filter(Boolean)))
const filteredDiscoveredModels = computed(() => discoveredModels.value.filter(model => `${model.name} ${model.displayName || ''} ${model.description || ''}`.toLowerCase().includes(discoverySearch.value.trim().toLowerCase())))
const defaultDiscoveryURL = computed(() => {
  const rawBase = String(providerForm.value['base-url'] || '').trim().replace(/\/+$/, '')
  const base = rawBase && !/^https?:\/\//i.test(rawBase) ? `https://${rawBase}` : rawBase
  const route = selectedProviderRoute.value
  if (['gemini-api-key', 'interactions-api-key'].includes(route)) return `${(base || 'https://generativelanguage.googleapis.com').replace(/\/v1beta(?:\/.*)?$/i, '')}/v1beta/models`
  if (route === 'claude-api-key') return `${(base || 'https://api.anthropic.com').replace(/\/v1(?:\/.*)?$/i, '')}/v1/models`
  if (route === 'meta-api-key') return /\/models$/i.test(base) ? base : `${base || 'https://api.meta.ai/v1'}/models`
  if (!base) return ''
  if (route === 'codex-api-key') return /\/v1\/models$/i.test(base) ? base : /\/v1$/i.test(base) ? `${base}/models` : `${base}/v1/models`
  return /\/models$/i.test(base) ? base : `${base}/models`
})
const editorError = ref('')
const savingProvider = useWorkspaceState('admin:upstream-providers:savingProvider', () => (false))
const deleteOpen = ref(false)
const deleteTarget = ref(null)

const deleting = useWorkspaceState('admin:upstream-providers:deleting', () => (false))


const providerColumns = computed(() => [
  { accessorKey: 'identity', header: t('upstream.providers.columnKey') },
  { accessorKey: 'endpoint', header: t('upstream.providers.baseUrl') },
  { accessorKey: 'prefix', header: t('upstream.providers.prefix') },
  { accessorKey: 'models', header: t('common.models') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'actions', header: t('common.actions'), meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])

const selectedProvider = computed(() => providerCategories.find(item => item.value === selectedProviderRoute.value) || providerCategories[0])
const selectedProviderLabel = computed(() => categoryLabel(selectedProvider.value))
const providerOptions = computed(() => providerCategories.map(item => ({ label: categoryLabel(item), value: item.value })))

const v8GroupFields = ['name', 'base-url', 'priority', 'disabled', 'prefix', 'proxy-url', 'headers', 'models', 'excluded-models', 'disable-cooling', 'request-retry', 'request-scoped-errors', 'support-prompt-cache-key']
const v8NativeKeyFields = ['id', 'uuid', 'api-key', 'weight', 'priority', 'prefix', 'proxy-url', 'headers', 'models', 'excluded-models', 'disable-cooling', 'request-retry', 'request-scoped-errors', 'websockets', 'alpha-search', 'disable-codex-cloaking', 'cloak', 'experimental-cch-signing', 'rebuild-mid-system-message', 'fingerprint-profile', 'native-tool-search']

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function providerApiPath(category = selectedProvider.value) {
  return category.path
}

function flattenV8Groups(groups, category) {
  if (!Array.isArray(groups)) return []
  const compat = category.value === 'openai-compatibility'
  return groups.flatMap((sourceGroup, groupIndex) => {
    const group = cloneValue(sourceGroup) || {}
    const keys = Array.isArray(group.keys) ? group.keys : []
    delete group.keys
    const groupEntries = keys.length ? keys : [null]
    return groupEntries.map((sourceKey, keyIndex) => {
      const key = cloneValue(sourceKey) || {}
      const entry = compat
        ? { ...group, id: key.id || key.uuid || key.auth_index || key['auth-index'] || group.id, uuid: key.uuid || group.uuid, auth_index: key.auth_index || key['auth-index'] || group.auth_index, weight: key.weight ?? 1, 'api-key-entries': sourceKey ? [key] : [] }
        : { ...group, ...key, weight: key.weight ?? 1 }
      if (compat) delete entry['excluded-models']
      entry.__v8Group = group
      entry.__v8GroupIndex = groupIndex
      entry.__v8KeyIndex = sourceKey ? keyIndex : -1
      entry.__v8Key = sourceKey ? key : null
      return entry
    })
  })
}

function entriesFromResponse(response, category) {
  return flattenV8Groups(response, category)
}

function copyFields(target, source, fields) {
  for (const field of fields) {
    if (Object.hasOwn(source, field)) target[field] = cloneValue(source[field])
    else delete target[field]
  }
}

function v8GroupFieldsChanged(entry, compat = isCompat.value) {
  const original = entry.__v8Group || {}
  return v8GroupFields.some(field => (compat || field !== 'disable-cooling') && JSON.stringify(entry[field]) !== JSON.stringify(original[field]))
}

function v8GroupsFromEntries(entries, category = selectedProvider.value) {
  const compat = category.value === 'openai-compatibility'
  const buckets = new Map()
  entries.forEach((entry, index) => {
    const key = Number.isInteger(entry.__v8GroupIndex) ? `existing:${entry.__v8GroupIndex}` : `new:${index}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(entry)
  })
  return [...buckets.values()].map((groupEntries) => {
    const editedEntry = groupEntries.find(entry => v8GroupFieldsChanged(entry, compat)) || groupEntries[0]
    const group = cloneValue(editedEntry.__v8Group) || {}
    // Native cooling is a key override; changing it must not replace the inherited group policy.
    copyFields(group, editedEntry, compat ? v8GroupFields : v8GroupFields.filter(field => field !== 'disable-cooling'))
    if (compat) delete group['excluded-models']
    if (!compat) {
      delete group.id
      delete group.uuid
      group.keys = groupEntries.map((entry) => {
        const key = cloneValue(entry.__v8Key) || {}
        copyFields(key, entry, v8NativeKeyFields)
        return key
      })
      return group
    }
    group.keys = groupEntries.flatMap(entry => cloneValue(entry['api-key-entries']) || [])
    if (group.keys.length) {
      delete group.id
      delete group.uuid
    }
    return group
  })
}

async function loadWorkspace() {
  const providerRoute = selectedProviderRoute.value
  pageError.value = ''
  try {
    const providerResponse = await fetchAPI(providerApiPath(providerCategories.find(category => category.value === providerRoute)))
    return { providerResponse, providerRoute }
  } catch (error) {
    pageError.value = error?.message || t('upstream.providers.loadFailed')
    return { providerResponse: null, providerRoute }
  }
}

const { data, pending, refresh: refreshWorkspace } = useStoreData('admin:upstream-providers:management-provider-credentials', loadWorkspace, { lazy: true, default: () => ({ providerResponse: null, providerRoute: selectedProviderRoute.value }), watch: [selectedProviderRoute] })
async function loadCategoryStats() {
  const results = await Promise.all(providerCategories.map(async category => {
    try {
      const response = await fetchAPI(providerApiPath(category))
      const entries = entriesFromResponse(response, category)
      return [category.value, { total: entries.length, active: entries.filter(entry => !entry.disabled).length, disabled: entries.filter(entry => entry.disabled).length }]
    } catch { return [category.value, null] }
  }))
  return Object.fromEntries(results)
}
const { data: statsData, refresh: refreshCategoryStats } = useStoreData('admin:upstream-providers:management-provider-stats', loadCategoryStats, { lazy: true, default: () => ({}) })
const { data: modelData } = useStoreData('admin:upstream-providers:management-provider-models', () => fetchAPI('/models?scope=static').catch(() => ({ models: {} })), { lazy: true, default: () => ({ models: {} }) })
watch(() => props.syncRequest, () => { void refreshWorkspace(); void refreshCategoryStats() })

const modelSuggestions = computed(() => {
  const source = modelData.value?.models
  const models = Array.isArray(source) ? source : source && typeof source === 'object' ? Object.values(source).flat() : []
  return [...new Set(models.flatMap(model => [model?.id, model?.name]).filter(Boolean))].sort()
})

const categoryStats = computed(() => statsData.value || {})
const providerEntries = computed(() => data.value?.providerRoute === selectedProviderRoute.value
  ? entriesFromResponse(data.value.providerResponse, selectedProvider.value)
  : [])

const filteredProviderEntries = computed(() => {
  const query = providerSearch.value.trim().toLowerCase()
  if (!query) return providerEntries.value
  return providerEntries.value.filter(entry => [entry.name, entry.prefix, entry.id, entry.uuid, entry.auth_index, entry['base-url'], ...(Array.isArray(entry.models) ? entry.models.flatMap(model => [model.name, model.alias]) : [])]
    .some(value => String(value || '').toLowerCase().includes(query)))
})
const deleteDescription = computed(() => deleteTarget.value ? t('upstream.providers.deleteDescription', { provider: selectedProviderLabel.value }) : '')
const providerDetailFields = computed(() => {
  const entry = editingProviderEntry.value || {}
  return [
    { label: t('upstream.providers.identifier'), value: providerEntryLabel(entry) },
    { label: t('upstream.providers.baseUrl'), value: safeEndpoint(entry['base-url'] || entry.base_url) },
    { label: t('upstream.providers.proxyUrl'), value: safeEndpoint(entry['proxy-url'] || entry.proxy_url) },
    { label: t('upstream.providers.prefix'), value: entry.prefix || t('common.none') },
    { label: t('common.models'), value: String(entry.models?.length || 0) },
    { label: t('upstream.providers.headers'), value: String(Object.keys(entry.headers || {}).length) }
  ]
})
const providerMetadataFields = computed(() => {
  const entry = editingProviderEntry.value || {}
  return [
    { label: t('upstream.providers.authIndex'), value: entry.auth_index || t('upstream.providers.notAvailable') },
    ...(isCompat.value ? [] : [{ label: t('upstream.providers.excludedModels'), value: String(entry['excluded-models']?.length || 0) }]),
    { label: t('upstream.providers.keyEntries'), value: String(entry['api-key-entries']?.length || 0) },
    { label: t('upstream.providers.priority'), value: entry.priority ?? t('upstream.providers.notSet') },
    { label: t('upstream.providers.weight'), value: entry.weight ?? t('upstream.providers.weightDefault') },
    { label: t('upstream.providers.requestRetry'), value: entry['request-retry'] ?? t('upstream.providers.inherited') },
    { label: t('upstream.providers.coolingDisabled'), value: entry['disable-cooling'] ? t('common.yes') : t('common.no') },
    ...(isCompat.value ? [{ label: t('upstream.providers.promptCacheKey'), value: entry['support-prompt-cache-key'] ? t('upstream.providers.supported') : t('upstream.providers.notEnabled') }] : []),
    ...(supportsWebsockets.value ? [{ label: 'WebSockets', value: entry.websockets ? t('common.enabled') : t('common.disabled') }] : [])
  ]
})

function openProviderCreate() {

  providerEditorMode.value = 'create'
  editingProviderEntry.value = null
  editingProviderIndex.value = -1
  loadGuidedEntry(selectedProvider.value.template)
  editorError.value = ''
  providerEditorOpen.value = true
}

function openProviderDetail(entry) {
  editingProviderEntry.value = entry
  providerEditorMode.value = 'detail'
  providerEditorOpen.value = true
}

function openProviderEdit(entry) {
  providerEditorMode.value = 'edit'
  editingProviderEntry.value = entry
  editingProviderIndex.value = providerEntries.value.indexOf(entry)
  loadGuidedEntry(entry)
  editorError.value = ''
  providerEditorOpen.value = true
}

function duplicateProvider(entry) {
  providerEditorMode.value = 'create'
  editingProviderEntry.value = null
  editingProviderIndex.value = -1
  const copy = JSON.parse(JSON.stringify(entry))
  delete copy.id
  delete copy.uuid
  delete copy.auth_index
  delete copy.disabled
  delete copy.__v8GroupIndex
  delete copy.__v8KeyIndex
  // Keep unexposed group/key properties, but never reuse credential identity or secrets.
  for (const source of [copy.__v8Group, copy.__v8Key]) {
    if (!source) continue
    delete source.id
    delete source.uuid
    delete source.auth_index
    delete source['api-key']
  }
  if (isCompat.value) {
    copy.name = ''
    copy['api-key-entries'] = providerEntries.value
      .filter(candidate => candidate.__v8GroupIndex === entry.__v8GroupIndex)
      .flatMap(candidate => candidate['api-key-entries'] || [])
      .map(key => ({ ...cloneValue(key), id: undefined, uuid: undefined, auth_index: undefined, 'api-key': '' }))
  } else copy['api-key'] = ''
  loadGuidedEntry(copy)
  editorError.value = ''
  providerEditorOpen.value = true
}

async function discoverModels() {
  discoveryVisible.value = true
  discoveryError.value = ''
  selectedDiscovered.value = []
  const route = selectedProviderRoute.value
  const key = primaryProviderKey.value
  const authIndex = discoveryAuthIndex.value
  let url
  try {
    url = new URL(defaultDiscoveryURL.value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.hash) throw new Error()
  } catch {
    discoveryError.value = t('upstream.providers.invalidBaseUrl')
    return
  }
  const header = { ...discoveryHeaders.value }
  const addHeader = (name, value) => {
    if (!Object.keys(header).some(item => item.toLowerCase() === name.toLowerCase()) && value) header[name] = value
  }
  if (['gemini-api-key', 'interactions-api-key'].includes(route)) addHeader('x-goog-api-key', key || (authIndex ? '$TOKEN$' : ''))
  else if (route === 'claude-api-key') {
    addHeader('x-api-key', key || (authIndex ? '$TOKEN$' : ''))
    addHeader('anthropic-version', '2023-06-01')
  } else addHeader('Authorization', key ? `Bearer ${key}` : authIndex ? 'Bearer $TOKEN$' : '')
  const generation = ++discoveryGeneration
  discovering.value = true
  try {
    const seen = new Set()
    const models = []
    let pageToken = ''
    for (let page = 0; page < (['gemini-api-key', 'interactions-api-key'].includes(route) ? 20 : 1); page++) {
      const pageURL = new URL(url)
      if (pageToken) pageURL.searchParams.set('pageToken', pageToken)
      const request = (requestHeader, index) => fetchAPI('/requests/api-call', { method: 'POST', body: { auth_index: index || undefined, method: 'GET', url: pageURL.href, header: requestHeader } })
      let response
      try {
        response = await request(header, authIndex)
        if (!response?.status_code || response.status_code < 200 || response.status_code >= 300) throw new Error(upstreamStatusError(response))
      } catch (error) {
        if (route !== 'openai-compatibility' || !(key || authIndex || Object.keys(header).length)) throw error
        response = await request({}, '')
      }
      if (generation !== discoveryGeneration || !providerEditorOpen.value) return
      if (!response?.status_code || response.status_code < 200 || response.status_code >= 300) throw new Error(upstreamStatusError(response))
      let payload
      try { payload = JSON.parse(response.body) } catch { throw new Error(t('upstream.providers.notJson')) }
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.models
      if (!Array.isArray(list)) throw new Error(t('upstream.providers.expectedArray'))
      for (const item of list) {
        const name = typeof item === 'string' ? item : item && typeof item === 'object' ? (item.id || item.name || item.model || item.value) : ''
        const normalized = typeof name === 'string' ? (['gemini-api-key', 'interactions-api-key'].includes(route) ? name.replace(/^\/?models\//i, '') : name).trim() : ''
        if (!normalized || seen.has(normalized.toLowerCase())) continue
        seen.add(normalized.toLowerCase())
        const displayName = item && typeof item === 'object' && typeof (item.display_name || item.displayName || item.alias) === 'string'
          ? (item.display_name || item.displayName || item.alias).trim()
          : ''
        models.push({ name: normalized, displayName: displayName && displayName !== normalized ? displayName : '', description: typeof item?.description === 'string' ? item.description : '' })
      }
      pageToken = typeof payload?.nextPageToken === 'string' ? payload.nextPageToken : ''
      if (!pageToken) break
    }
    discoveredModels.value = models
    discoveryLoaded.value = true
  } catch (error) {
    if (generation === discoveryGeneration) discoveryError.value = error?.message || t('upstream.providers.discoverFailed')
  } finally {
    if (generation === discoveryGeneration) discovering.value = false
  }
}

async function testProviderConnection() {
  testError.value = ''
  testSuccess.value = false
  const selectedTestModel = testModel.value === automaticTestModel ? '' : testModel.value.trim()
  const model = selectedTestModel || providerForm.value.models.find(item => String(item.name || '').trim())?.name.trim()
  const authIndex = discoveryAuthIndex.value
  const key = primaryProviderKey.value
  const headers = Object.fromEntries(headerRows.value.filter(row => row.name.trim()).map(row => [row.name.trim(), row.value]))
  const hasAuthHeader = Object.entries(headers).some(([name, value]) =>
    (selectedProviderRoute.value === 'claude-api-key' ? name.toLowerCase() === 'x-api-key' : name.toLowerCase() === 'authorization') && String(value).trim())
  if (!model) { testError.value = t('upstream.providers.selectTestModel'); return }
  if (!key && !authIndex && !hasAuthHeader) { testError.value = t('upstream.providers.needAuth'); return }
  const base = String(providerForm.value['base-url'] || '').trim().replace(/\/+$/, '')
  if (isCompat.value && !base) { testError.value = t('upstream.providers.baseUrlRequired'); return }
  const claude = selectedProviderRoute.value === 'claude-api-key'
  const endpoint = claude
    ? `${(base || 'https://api.anthropic.com').replace(/\/v1\/messages$/i, '').replace(/\/v1(?:\/.*)?$/i, '')}/v1/messages`
    : /\/chat\/completions$/i.test(base) ? base : /\/v1$/i.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`
  try {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error()
  } catch { testError.value = t('upstream.providers.invalidBaseUrl'); return }
  const header = { 'Content-Type': 'application/json', ...headers }
  const authHeader = claude ? 'x-api-key' : 'Authorization'
  if (!Object.keys(header).some(name => name.toLowerCase() === authHeader.toLowerCase())) header[authHeader] = key ? claude ? key : `Bearer ${key}` : '$TOKEN$'
  if (claude && !Object.keys(header).some(name => name.toLowerCase() === 'anthropic-version')) header['anthropic-version'] = '2023-06-01'
  const data = claude ? { model, max_tokens: 8, messages: [{ role: 'user', content: 'Hi' }] } : { model, messages: [{ role: 'user', content: 'Hi' }], stream: false, max_tokens: 5 }
  testingConnection.value = true
  try {
    const response = await fetchAPI('/requests/api-call', { method: 'POST', body: { auth_index: authIndex || undefined, method: 'POST', url: endpoint, header, data: JSON.stringify(data) } })
    if (!response?.status_code || response.status_code < 200 || response.status_code >= 300) throw new Error(upstreamStatusError(response))
    testSuccess.value = true
  } catch (error) {
    testError.value = error?.message || t('upstream.providers.connectionFailed')
  } finally {
    testingConnection.value = false
  }
}

function upstreamStatusError(response) {
  return response?.status_code ? t('upstream.providers.upstreamHttp', { status: response.status_code }) : t('upstream.providers.upstreamError')
}

function clearDiscoveryResults() {
  discoveryGeneration++
  discovering.value = false
  discoveredModels.value = []
  selectedDiscovered.value = []
  discoveryError.value = ''
  discoverySearch.value = ''
  discoveryVisible.value = false
  discoveryLoaded.value = false
}

function selectAllDiscoveredModels() {
  selectedDiscovered.value = [...new Set([...selectedDiscovered.value, ...filteredDiscoveredModels.value.filter(model => !existingModelNames.value.has(model.name.toLowerCase())).map(model => model.name)])]
}

function toggleDiscoveredModel(name, checked) {
  selectedDiscovered.value = checked
    ? [...selectedDiscovered.value, name]
    : selectedDiscovered.value.filter(item => item !== name)
}

function applyDiscoveredModels() {
  const existing = new Set(providerForm.value.models.map(model => String(model.name || '').trim().toLowerCase()))
  for (const model of discoveredModels.value) {
    if (!selectedDiscovered.value.includes(model.name) || existing.has(model.name.toLowerCase())) continue
    if (providerForm.value.models.length === 1 && !String(providerForm.value.models[0].name || '').trim() && !String(providerForm.value.models[0].alias || '').trim()) providerForm.value.models.splice(0, 1)
    providerForm.value.models.push({ name: model.name, alias: '', ...(model.displayName ? { 'display-name': model.displayName } : {}) })
    existing.add(model.name.toLowerCase())
  }
  selectedDiscovered.value = []
}

function splitModelList(value) { return String(value || '').split(/[,\n]/).map(item => item.trim()).filter(Boolean) }
function addProviderModel() { providerForm.value.models.push({ name: '', alias: '' }) }
function removeProviderModel(index) { providerForm.value.models.splice(index, 1) }

function loadGuidedEntry(entry) {
  clearDiscoveryResults()
  providerForm.value = JSON.parse(JSON.stringify(entry))
  compatKeyRows.value = []
  if (isCompat.value) {
    const siblings = providerEditorMode.value === 'edit'
      ? providerEntries.value.filter(candidate => candidate.__v8GroupIndex === entry.__v8GroupIndex)
      : [entry]
    for (const key of siblings.flatMap(candidate => candidate['api-key-entries'] || [])) addCompatKey(key)
    if (providerEditorMode.value === 'create' && !compatKeyRows.value.length) addCompatKey()
  } else if (providerEditorMode.value === 'edit') providerForm.value['api-key'] = ''
  if (!Array.isArray(providerForm.value.models)) providerForm.value.models = []
  if (isCompat.value && !Array.isArray(providerForm.value['api-key-entries'])) providerForm.value['api-key-entries'] = []
  providerForm.value.weight = entry.weight ?? entry['api-key-entries']?.[0]?.weight ?? 1
  providerKey.value = ''
  if (providerEditorMode.value === 'create' && !isCompat.value) providerKey.value = providerForm.value['api-key'] || ''
  if (providerEditorMode.value === 'create' && isCompat.value) providerKey.value = providerForm.value['api-key-entries']?.[0]?.['api-key'] || ''
  if (!providerForm.value.models.length) providerForm.value.models = [{ name: '', alias: '' }]
  excludedModelsText.value = !isCompat.value && Array.isArray(entry['excluded-models']) ? entry['excluded-models'].join('\n') : ''
  testModel.value = String(entry['test-model'] || automaticTestModel)
  testError.value = ''
  testSuccess.value = false
  requestRetryText.value = entry['request-retry'] == null ? '' : String(entry['request-retry'])
  const coolingOverride = !isCompat.value && entry.__v8Group ? entry.__v8Key?.['disable-cooling'] : entry['disable-cooling']
  coolingPolicy.value = coolingOverride == null ? 'inherit' : coolingOverride ? 'disabled' : 'enabled'
  codexCloakingPolicy.value = entry['disable-codex-cloaking'] == null ? 'inherit' : entry['disable-codex-cloaking'] ? 'disabled' : 'enabled'
  requestScopedErrorsText.value = entry['request-scoped-errors'] == null ? '' : JSON.stringify(entry['request-scoped-errors'], null, 2)
  headerRows.value = Object.entries(entry.headers || {}).map(([name, value]) => ({ name, value: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '' }))
  if (!headerRows.value.length) headerRows.value = [{ name: '', value: '' }]
  const cloak = entry.cloak && typeof entry.cloak === 'object' && !Array.isArray(entry.cloak) ? entry.cloak : null
  cloakMode.value = cloak?.mode || unsetCloakMode
  cloakStrictMode.value = cloak?.['strict-mode'] === true
  cloakSensitiveWordsText.value = Array.isArray(cloak?.['sensitive-words']) ? cloak['sensitive-words'].join('\n') : ''
  cloakCacheUserID.value = cloak?.['cache-user-id'] == null ? 'inherit' : cloak['cache-user-id'] ? 'enabled' : 'disabled'

}


function guidedEntry() {
  const value = JSON.parse(JSON.stringify(providerForm.value))
  const priority = value.priority === '' || value.priority == null ? 0 : Number(value.priority)
  if (!Number.isSafeInteger(priority)) {
    editorError.value = t('upstream.providers.priorityInvalid')
    return null
  }
  value.priority = priority
  const weight = value.weight === '' || value.weight == null ? 1 : Number(value.weight)
  if (!Number.isSafeInteger(weight)) {
    editorError.value = t('upstream.providers.weightInvalid')
    return null
  }
  value.weight = weight
  const retry = requestRetryText.value.trim()
  if (retry && (!/^-?\d+$/.test(retry) || !Number.isSafeInteger(Number(retry)))) { editorError.value = t('upstream.providers.retryInvalid'); return null }
  if (retry) value['request-retry'] = Number(retry)
  else if (providerEditorMode.value === 'edit') value['request-retry'] = null
  else delete value['request-retry']
  value['disable-cooling'] = coolingPolicy.value === 'inherit' ? null : coolingPolicy.value === 'disabled'
  if (selectedProviderRoute.value === 'codex-api-key') value['disable-codex-cloaking'] = codexCloakingPolicy.value === 'inherit' ? null : codexCloakingPolicy.value === 'disabled'
  if (supportsRequestScopedErrors.value) {
    try {
      const rules = requestScopedErrorsText.value.trim() ? JSON.parse(requestScopedErrorsText.value) : null
      if (rules !== null && (!Array.isArray(rules) || rules.some(rule => !rule || typeof rule !== 'object' || Array.isArray(rule)
        || (rule.status != null && (!Number.isInteger(rule.status) || rule.status < 100 || rule.status > 599))
        || ['match', 'match-regexr'].some(field => rule[field] != null && (!Array.isArray(rule[field]) || rule[field].some(pattern => typeof pattern !== 'string')))
        || !['stop', 'stop-and-cooldown', 'continue', 'continue-and-cooldown'].includes(rule.action)))) throw new Error()
      value['request-scoped-errors'] = rules
    } catch { editorError.value = t('upstream.providers.rulesInvalid'); return null }
  }
  for (const model of value.models) {
    if (!String(model.name || '').trim() && Object.entries(model).some(([field, setting]) => field !== 'name' && setting != null && setting !== false && setting !== '' && (!Array.isArray(setting) || setting.length))) {
      editorError.value = t('upstream.providers.modelIdRequired')
      return null
    }
  }
  for (const model of value.models) {
    for (const field of supportsContextLimit.value ? ['max-context-length'] : []) {
      if (model[field] === '' || model[field] == null) delete model[field]
      else if (!Number.isSafeInteger(Number(model[field])) || Number(model[field]) <= 0) { editorError.value = t('upstream.providers.contextLimitInvalid'); return null }
      else model[field] = Number(model[field])
    }
    if (model.thinking != null) {
      for (const field of ['min', 'max']) {
        if (model.thinking[field] === '' || model.thinking[field] == null) delete model.thinking[field]
        else if (!Number.isSafeInteger(Number(model.thinking[field])) || Number(model.thinking[field]) < 0) { editorError.value = t('upstream.providers.budgetInvalid'); return null }
        else model.thinking[field] = Number(model.thinking[field])
      }
      if (model.thinking.max > 0 && model.thinking.min > model.thinking.max) { editorError.value = t('upstream.providers.budgetRange'); return null }
    }
    if (isCompat.value) {
      for (const field of ['input-modalities', 'output-modalities']) {
        if (Array.isArray(model[field]) && !model[field].length) delete model[field]
      }
    }
  }
  value.models = value.models.filter(model => String(model.name || '').trim()).map(model => {
    const result = { ...model, name: model.name.trim() }
    if (!String(result.alias || '').trim() || result.alias.trim() === result.name) delete result.alias
    else result.alias = result.alias.trim()
    if (!String(result['display-name'] || '').trim()) delete result['display-name']
    else result['display-name'] = result['display-name'].trim()
    if (result['force-mapping'] == null) delete result['force-mapping']
    return result
  })
  value.headers = {}
  for (const header of headerRows.value) {
    const name = header.name.trim()
    if (!name && header.value.trim()) { editorError.value = t('upstream.providers.headerNameRequired'); return null }
    if (name) value.headers[name] = header.value
  }
  if (selectedProviderRoute.value === 'claude-api-key') {
    const selectedCloakMode = cloakMode.value === unsetCloakMode ? '' : cloakMode.value
    if (selectedCloakMode || cloakStrictMode.value || cloakCacheUserID.value !== 'inherit' || cloakSensitiveWordsText.value.trim()) {
      if (!cloakModeOptions.value.some(option => option.value === cloakMode.value)) {
        editorError.value = t('upstream.providers.cloakModeInvalid')
        return null
      }
      const cloak = value.cloak && typeof value.cloak === 'object' && !Array.isArray(value.cloak) ? value.cloak : {}
      value.cloak = { ...cloak, 'strict-mode': cloakStrictMode.value, 'cache-user-id': cloakCacheUserID.value === 'enabled', 'sensitive-words': cloakSensitiveWordsText.value.split(/[,\n]/).map(word => word.trim()).filter(Boolean) }
      if (cloakCacheUserID.value === 'inherit') delete value.cloak['cache-user-id']
      if (selectedCloakMode) value.cloak.mode = selectedCloakMode
      else delete value.cloak.mode
    } else {
      const remaining = { ...value.cloak }
      for (const field of ['mode', 'strict-mode', 'sensitive-words', 'cache-user-id']) delete remaining[field]
      if (Object.keys(remaining).length) value.cloak = remaining
      else delete value.cloak
    }
  }
  if (isCompat.value) delete value['excluded-models']
  else value['excluded-models'] = excludedModelsText.value.split(/[,\n]/).map(item => item.trim()).filter(Boolean)
  value['base-url'] = String(value['base-url'] || '').trim()
  value.prefix = String(value.prefix || '').trim()
  if (!isCompat.value) {
    value['proxy-url'] = String(value['proxy-url'] || '').trim()
    if (value['proxy-url']) {
      try {
        if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(new URL(value['proxy-url']).protocol)) throw new Error()
      } catch { editorError.value = t('upstream.providers.proxyInvalid'); return null }
    }
  }
  if (isCompat.value && !String(value.name || '').trim()) {
    editorError.value = t('upstream.providers.nameRequired')
    return null
  }
  if (requiresBaseURL.value && !String(value['base-url'] || '').trim()) {
    editorError.value = t('upstream.providers.baseUrlRequiredProvider')
    return null
  }
  if (!isCompat.value && providerEditorMode.value === 'create' && !providerKey.value.trim()) {
    editorError.value = t('upstream.providers.serviceKeyRequired')
    return null
  }
  if (isCompat.value) {
    value.name = value.name.trim()
    if (testModel.value !== automaticTestModel && testModel.value.trim()) value['test-model'] = testModel.value.trim()
    else delete value['test-model']
    delete value['proxy-url']
    value['api-key-entries'] = []
    for (const [index, row] of compatKeyRows.value.entries()) {
      const key = cloneValue(row.source)
      const secret = row.secret.trim() || key['api-key'] || ''
      if (!secret) { editorError.value = t('upstream.providers.keyApiKeyRequired', { n: index + 1 }); return null }
      key['api-key'] = secret
      const proxy = row.proxy.trim()
      if (proxy && proxy !== 'direct') {
        try {
          if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(new URL(proxy).protocol)) throw new Error()
        } catch { editorError.value = t('upstream.providers.keyProxyInvalid', { n: index + 1 }); return null }
      }
      if (proxy) key['proxy-url'] = proxy
      else delete key['proxy-url']
      if (row.weight === '' || row.weight == null) delete key.weight
      else {
        const keyWeight = Number(row.weight)
        if (!Number.isSafeInteger(keyWeight) || keyWeight > 1000000) { editorError.value = t('upstream.providers.keyWeightInvalid', { n: index + 1 }); return null }
        key.weight = keyWeight
      }
      value['api-key-entries'].push(key)
    }
  } else if (providerKey.value.trim()) value['api-key'] = providerKey.value.trim()
  else delete value['api-key']
  const payload = {
    ...value,
    priority: value.priority,
    headers: value.headers,
    models: value.models,
    'disable-cooling': value['disable-cooling']
  }
  if (!isCompat.value) payload['excluded-models'] = value['excluded-models']
  for (const field of ['name', 'base-url', 'proxy-url', 'prefix']) payload[field] = value[field]
  payload.weight = value.weight
  if (Object.hasOwn(value, 'request-retry')) payload['request-retry'] = value['request-retry']
  if (supportsWebsockets.value) payload.websockets = Boolean(value.websockets)
  if (isCompat.value) {
    payload.disabled = Boolean(value.disabled)
    if (value['test-model']) payload['test-model'] = value['test-model']
    if (value['api-key-entries']) payload['api-key-entries'] = value['api-key-entries']
  } else if (value['api-key']) payload['api-key'] = value['api-key']
  if (selectedProviderRoute.value === 'claude-api-key' && value.cloak) payload.cloak = value.cloak
  return payload
}


async function saveProviderEntry() {
  editorError.value = ''
  const value = guidedEntry()
  if (!value) return
  if (isCompat.value && !String(value.name || '').trim()) {
    editorError.value = t('upstream.providers.nameRequired')
    return
  }
  if (savingProvider.value) return
  if (!isCompat.value && providerEditorMode.value === 'edit' && !providerKey.value.trim()) delete value['api-key']

  savingProvider.value = true
  try {
    let entries = [...providerEntries.value]
    if (providerEditorMode.value === 'create') entries.push(value)
    else {
      const targetIndex = entries.findIndex(candidate => providerEntryMatches(candidate, editingProviderEntry.value))
      if (targetIndex < 0) throw new Error(t('upstream.providers.entryMissing'))
      if (isCompat.value) {
        // One edited row now owns the complete key list; remove its flattened siblings.
        const groupIndex = editingProviderEntry.value.__v8GroupIndex
        const firstIndex = entries.findIndex(candidate => candidate.__v8GroupIndex === groupIndex)
        entries = entries.filter(candidate => candidate.__v8GroupIndex !== groupIndex)
        entries.splice(firstIndex, 0, value)
      } else entries.splice(targetIndex, 1, { ...editingProviderEntry.value, ...value })
    }
    await fetchAPI(providerApiPath(), { method: 'PUT', body: v8GroupsFromEntries(entries) })
    providerEditorOpen.value = false
    await refreshWorkspace()
    void refreshCategoryStats()
    emit('changed')
    toast.add({ title: providerEditorMode.value === 'create' ? t('upstream.providers.created') : t('upstream.providers.updated'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) {
    editorError.value = error?.data?.message || error?.data?.error || error?.message || t('upstream.providers.saveFailed')
  } finally {
    savingProvider.value = false
  }
}

function providerEntryMatches(candidate, target) {
  if (!candidate || !target) return false
  return candidate.__v8GroupIndex === target.__v8GroupIndex && candidate.__v8KeyIndex === target.__v8KeyIndex
}

function confirmProviderDelete(entry) {
  deleteTarget.value = entry

  deleteOpen.value = true
}

async function performDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const targetIndex = providerEntries.value.findIndex(candidate => providerEntryMatches(candidate, deleteTarget.value))
    if (targetIndex < 0) throw new Error(t('upstream.providers.entryMissingList'))
    const remaining = providerEntries.value.filter((_, index) => index !== targetIndex)
    await fetchAPI(providerApiPath(), { method: 'PUT', body: remaining.length ? v8GroupsFromEntries(remaining) : [] })
    deleteOpen.value = false
    await refreshWorkspace()
    void refreshCategoryStats()
    emit('changed')
    toast.add({ title: t('upstream.providers.deletedToast'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error) {
    toast.add({ title: t('upstream.providers.deleteFailed'), description: error?.data?.message || error?.data?.error || error?.message || t('upstream.providers.deleteFailedDetail'), color: 'error' })
  } finally {
    deleting.value = false
  }
}


function providerEntryLabel(entry) {
  return entry?.name || entry?.identifier || entry?.auth_index || entry?.id || t('upstream.providers.entryLabel', { provider: selectedProviderLabel.value })
}

function safeEndpoint(value) {
  if (!value) return t('upstream.providers.defaultEndpoint')
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return t('upstream.providers.customEndpoint')
  }
}


</script>
