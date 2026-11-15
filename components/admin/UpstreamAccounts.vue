<template>
  <div class="space-y-4">
    <input ref="fileInput" type="file" accept="application/json,.json" multiple class="hidden" @change="uploadFiles">


    <UAlert v-if="pageError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('cred.loadFailed')" :description="pageError" />
    <UAlert v-if="flightError" color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('cred.flightUnavailable')" :description="flightError" />




    <section class="app-surface min-w-0 overflow-hidden" :aria-label="t('cred.title')">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-selected)] text-[var(--ui-primary)]" aria-hidden="true"><UIcon name="i-tabler-user-shield" class="size-4" /></span>
          <div class="min-w-0"><h2 class="text-sm font-semibold">{{ t('cred.title') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.subtitle') }}</p></div>
        </div>
        <div class="flex items-center gap-2">

          <AppButton size="sm" icon="i-tabler-plus" :disabled="busy" @click="createOpen = true">{{ t('cred.add') }}</AppButton>
        </div>
      </div>
      <div class="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--admin-control-bg)] px-4 py-2.5 lg:flex-row lg:items-center">
        <UInput v-model="search" type="search" icon="i-tabler-search" :placeholder="t('cred.searchPlaceholder')" :aria-label="t('cred.searchAria')" class="w-full lg:max-w-80 lg:flex-1" />
        <div class="grid w-full grid-cols-1 items-center gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap lg:flex-1">
          <USelect v-model="statusFilter" :aria-label="t('cred.filterStatus')" :items="statusOptions" value-key="value" label-key="label" class="w-full sm:w-40" />
          <USelectMenu v-model="providerFilter" :aria-label="t('cred.filterProvider')" :items="providerOptions" value-key="value" label-key="label" :search-input="{ placeholder: t('quota.searchProviders') }" class="w-full sm:w-52" />
          <div class="col-span-full flex flex-wrap gap-2 sm:col-span-1">
            <AppButton size="sm" :color="attentionOnly ? 'warning' : 'neutral'" :variant="attentionOnly ? 'soft' : 'outline'" :aria-pressed="attentionOnly" @click="attentionOnly = !attentionOnly">{{ t('cred.needsAttention') }}</AppButton>
            <AppButton size="sm" color="neutral" :variant="websocketsFilter === 'on' ? 'soft' : 'outline'" :aria-pressed="websocketsFilter === 'on'" @click="websocketsFilter = websocketsFilter === 'on' ? ALL_FILTER : 'on'">{{ t('cred.websockets') }}</AppButton>
            <USelect v-model="websocketsFilter" :aria-label="t('cred.filterWebsockets')" :items="websocketsOptions" value-key="value" label-key="label" class="w-36" />
          </div>
          <div class="col-span-full flex min-h-9 items-center justify-between gap-2 sm:ml-auto">
            <span role="status" aria-live="polite" class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('cred.results', { count: filteredCredentials.length, total: credentials.length }) }}</span>
            <AppButton v-if="hasActiveFilters" size="sm" color="neutral" variant="ghost" @click="clearFilters">{{ t('cred.clearFilters') }}</AppButton>
          </div>
        </div>
      </div>
      <div>
        <div v-if="selectedIDs.size" class="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--admin-selected)] px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div><p class="text-sm font-medium">{{ t('cred.selected', { count: selectedIDs.size }) }}</p><p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('cred.selectedBreakdown', { enabled: selectedEnabledCount, disabled: selectedDisabledCount }) }}</p></div>
          <div class="flex flex-wrap gap-2">
            <AppButton size="sm" color="neutral" variant="ghost" :disabled="bulkBusy" @click="selectedIDs = new Set()">{{ t('cred.clearSelection') }}</AppButton>
            <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-check" :disabled="!selectedDisabledCount || busy || pending" :loading="bulkBusy && bulkAction === 'Enable'" @click="bulkStatus(false)">{{ t('cred.enableSelected') }}</AppButton>
            <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-alert-triangle" :disabled="!selectedEnabledCount || busy || pending" :loading="bulkBusy && bulkAction === 'Disable'" @click="bulkStatus(true)">{{ t('cred.disableSelected') }}</AppButton>
            <AppButton size="sm" color="error" variant="ghost" icon="i-tabler-trash" :disabled="busy || pending" @click="bulkDeleteOpen = true">{{ t('cred.deleteSelected') }}</AppButton>
          </div>
        </div>
      <div class="min-w-0 overflow-x-auto">
      <AppTable :columns="columns" :data="filteredCredentials" :loading="pending" class="accounts-table min-w-0">
        <template #select-header><input type="checkbox" :aria-label="t('cred.selectAll')" :checked="allVisibleSelected" :indeterminate="someVisibleSelected && !allVisibleSelected" :disabled="bulkBusy || pending || !filteredCredentials.length" @change="toggleAllVisible($event.target.checked)"></template>
        <template #select-cell="{ row }"><input type="checkbox" :aria-label="t('cred.selectOne', { name: value(row).label || value(row).name || value(row).id })" :checked="selectedIDs.has(value(row).id)" :disabled="bulkBusy || pending" @change="toggleSelected(value(row).id, $event.target.checked)"></template>
        <template #identity-cell="{ row }"><div class="flex min-w-0 items-center gap-2.5"><span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-bg-elevated)] text-[var(--ui-primary)]"><UIcon name="i-tabler-key" class="size-4" /></span><div class="min-w-0"><p class="truncate font-medium">{{ value(row).label || value(row).name }}</p><p class="mt-1 truncate font-mono text-xs text-[var(--ui-text-muted)]" :title="credentialIdentifier(value(row))">{{ compactIdentifier(credentialIdentifier(value(row))) }}</p><p v-if="value(row).note" class="mt-0.5 truncate text-xs text-[var(--ui-text-muted)]">{{ value(row).note }}</p></div></div></template>
        <template #provider-cell="{ row }"><div class="flex flex-col items-start gap-1"><UBadge color="primary" variant="subtle">{{ value(row).provider || value(row).type || t('common.unknown') }}</UBadge><UBadge v-if="value(row).type && String(value(row).type).toLowerCase() !== String(value(row).provider || '').toLowerCase()" color="neutral" variant="subtle" class="font-mono text-xs">{{ value(row).type }}</UBadge></div></template>
        <template #status-cell="{ row }"><div class="flex items-center gap-2"><USwitch :model-value="!value(row).disabled" :disabled="busy" :loading="changing === value(row).id" :aria-label="value(row).disabled ? t('cred.enableOne', { name: value(row).label || value(row).id }) : t('cred.disableOne', { name: value(row).label || value(row).id })" @update:model-value="toggleStatus(value(row))" /><UBadge :color="credentialColor(value(row))" variant="subtle"><UIcon :name="value(row).disabled || value(row).unavailable ? 'i-tabler-alert-triangle' : 'i-tabler-circle-check'" class="mr-1 inline size-3" />{{ credentialStatusLabel(credentialStatus(value(row))) }}</UBadge></div></template>
        <template #concurrency-cell="{ row }"><div class="text-sm"><span class="font-semibold">{{ concurrency(value(row)).in_flight || value(row).in_flight || 0 }}</span><span class="text-[var(--ui-text-muted)]"> / {{ concurrency(value(row)).max_in_flight ?? value(row).max_in_flight ?? '∞' }}</span><p v-if="concurrency(value(row)).total_saturated || value(row).total_saturated" class="text-xs text-amber-500">{{ t('cred.saturated') }}</p></div></template>
        <template #quota-cell="{ row }">
          <button type="button" class="rounded-md p-1 -m-1 text-left hover:bg-[var(--ui-hover)]" :aria-label="t('cred.viewQuotaFor', { name: value(row).label || value(row).id })" @click="openAccountQuota(value(row))">
            <AdminCredentialQuotaPreview :quota="quotaByID.get(value(row).id)" :pending="quotaPending" :read-error="quotaError" />
          </button>
        </template>
        <template #websockets-cell="{ row }">
          <div v-if="['on', 'off'].includes(credentialWebsocketState(value(row)))" class="flex flex-col items-start gap-1" :title="t('cred.wsSettingTitle')">
            <USwitch :model-value="credentialWebsocketState(value(row)) === 'on'" :disabled="busy || !value(row).id" :loading="inlineChanging === value(row).id" :aria-label="t('cred.wsFor', { name: value(row).label || value(row).name || value(row).id })" @update:model-value="setInlineField(value(row), 'websockets', $event)" />
            <span class="text-xs text-[var(--ui-text-muted)]">{{ credentialWebsocketState(value(row)) === 'on' ? t('cred.wsEnabled') : t('cred.wsDisabled') }}</span>
          </div>
          <span v-else class="text-xs text-[var(--ui-text-muted)]" :title="supportsWebsockets(value(row)) ? t('cred.wsUnknownTitle') : t('cred.wsNotApplicable')">{{ supportsWebsockets(value(row)) ? t('common.unknown') : t('cred.na') }}</span>
        </template>
        <template #cooling-cell="{ row }"><USwitch :model-value="!value(row)['disable-cooling']" :disabled="busy || !value(row).id" :loading="inlineChanging === value(row).id" :aria-label="t('cred.coolingFor', { name: value(row).label || value(row).name || value(row).id })" @update:model-value="setInlineField(value(row), 'disable_cooling', !$event)" /></template>
        <template #priority-cell="{ row }"><span class="font-mono text-xs tabular-nums" :title="value(row).priority == null ? t('cred.notSet') : undefined">{{ value(row).priority ?? '—' }}</span></template>
        <template #actions-cell="{ row }">
          <AdminRowActions :actions="credentialRowActions(value(row))" :max-inline="1" :menu-label="t('cred.menuLabel', { name: value(row).label || value(row).name || value(row).id })" />
        </template>
        <template #empty><div class="py-8 text-center text-sm text-[var(--ui-text-muted)]"><p>{{ pending ? t('cred.loadingAccounts') : pageError ? t('cred.loadAccountsFailed') : hasActiveFilters ? t('cred.noMatching') : t('cred.none') }}</p><AppButton v-if="hasActiveFilters && !pending" class="mt-3" color="neutral" variant="outline" size="sm" @click="clearFilters">{{ t('cred.clearFilters') }}</AppButton></div></template>
      </AppTable>
      </div>
      </div>
    </section>

    <AppModal v-model:open="createOpen" :dismissible="false" :title="t('cred.add')" :description="t('cred.create.description')" :ui="{ content: 'sm:max-w-2xl' }" @update:open="handleCreateOpen">
      <template #body>
        <div class="space-y-5">
          <div class="grid grid-cols-3 gap-1 rounded-md bg-[var(--ui-bg-elevated)] p-1" role="tablist" :aria-label="t('cred.create.methodAria')">
            <AppButton v-for="mode in createModes" :key="mode.value" role="tab" :aria-selected="createMode === mode.value" color="neutral" :variant="createMode === mode.value ? 'solid' : 'ghost'" size="sm" class="justify-center" :disabled="uploading" @click="createMode = mode.value">{{ mode.label }}</AppButton>
          </div>
          <div v-if="createMode === 'oauth'" class="max-h-[65vh] space-y-3 overflow-y-auto"><p class="text-sm text-[var(--ui-text-muted)]">{{ t('cred.oauth.intro') }}</p><div v-for="provider in oauthProviders" :key="provider.value" class="rounded-lg border border-[var(--ui-border)] p-3"><div class="flex items-center justify-between gap-3"><strong>{{ provider.label }}</strong><AppButton size="sm" :loading="startingOAuth === provider.value" @click="startOAuth(provider.value)">{{ t('cred.oauth.start') }}</AppButton></div><template v-if="oauthSessions[provider.value]"><div class="mt-3 break-all rounded-md bg-[var(--ui-bg-elevated)] p-2 font-mono text-xs">{{ oauthSessions[provider.value].url }}</div><div class="mt-2 flex flex-wrap gap-2"><AppButton size="sm" color="neutral" variant="outline" @click="copyOAuthLink(provider.value)">{{ t('cred.oauth.copyLink') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" @click="openOAuthLink(provider.value)">{{ t('cred.oauth.openLink') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" :loading="checkingOAuth === provider.value" @click="checkOAuthStatus(provider.value)">{{ t('cred.oauth.checkStatus') }}</AppButton></div><p v-if="oauthSessions[provider.value].status" class="mt-2 text-sm">{{ oauthSessions[provider.value].status }} {{ oauthSessions[provider.value].error }}</p><form v-if="provider.value !== 'kimi'" class="mt-3 grid gap-2" @submit.prevent="submitCallback(provider.value)"><UInput v-model="oauthSessions[provider.value].redirect_url" :placeholder="t('cred.oauth.callbackUrl')" /><div class="grid gap-2 sm:grid-cols-2"><UInput v-model="oauthSessions[provider.value].code" :placeholder="t('cred.oauth.code')" /><UInput v-model="oauthSessions[provider.value].state" :placeholder="t('cred.oauth.state')" /></div><UInput v-model="oauthSessions[provider.value].callback_error" :placeholder="t('cred.oauth.providerError')" /><AppButton type="submit" size="sm" :loading="submittingCallback === provider.value">{{ t('cred.oauth.submitCallback') }}</AppButton></form></template></div><UAlert v-if="oauthError" color="error" variant="subtle" :description="oauthError" /></div>
          <div v-else-if="createMode === 'upload'" class="space-y-4"><button type="button" class="w-full rounded-lg border border-dashed border-[var(--ui-border)] p-6 text-center disabled:opacity-50" :disabled="uploadActive || busy" @click="fileInput?.click()" @dragenter.prevent @dragover.prevent @dragleave.prevent @drop.prevent.stop="uploadDroppedFiles"><UIcon name="i-tabler-upload" class="mx-auto mb-2 size-6" /><p class="text-sm">{{ t('cred.upload.drop') }}</p></button><p v-if="uploadResults.length" class="text-xs text-[var(--ui-text-muted)]">{{ uploadActive ? t('cred.upload.progress', { done: uploadResults.filter(item => ['success', 'error'].includes(item.status)).length, total: uploadResults.length }) : t('cred.upload.summary', { succeeded: uploadResults.filter(item => item.status === 'success').length, failed: failedUploads.length }) }}</p><div v-for="(result, index) in uploadResults" :key="result.id" class="rounded-md border border-[var(--ui-border)] p-3 text-sm"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate font-medium">{{ result.file.name }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ formatFileSize(result.file.size) }} · {{ uploadMessage(result) }}<span v-if="result.resultName"> · {{ result.resultName }}</span></p></div><div class="flex gap-1"><AppButton v-if="isRetryableUpload(result)" size="xs" variant="ghost" @click="retryUpload(result)">{{ t('common.retry') }}</AppButton><AppButton v-if="result.status !== 'uploading' && !uploadActive" size="xs" variant="ghost" color="error" @click="uploadResults.splice(index, 1)">{{ t('common.remove') }}</AppButton></div></div><div v-if="result.status === 'uploading'" class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"><div class="h-full bg-[var(--ui-primary)]" :style="{ width: `${result.progress}%` }" /></div></div><div v-if="!uploadActive" class="flex gap-2"><AppButton v-if="failedUploads.filter(isRetryableUpload).length > 1" size="sm" variant="outline" @click="retryFailedUploads">{{ t('cred.upload.retryFailed') }}</AppButton><AppButton v-if="uploadResults.length" size="sm" variant="ghost" @click="uploadResults = []">{{ t('cred.upload.clearResults') }}</AppButton></div></div>
          <form v-else class="space-y-4" @submit.prevent="importVertex"><div class="rounded-lg border border-dashed border-[var(--ui-border)] p-5" @dragover.prevent @drop.prevent="vertexFile = $event.dataTransfer.files?.[0] || null"><UFormField :label="t('cred.vertex.file')" required><input type="file" accept="application/json,.json" class="block w-full text-sm" @change="vertexFile = $event.target.files?.[0] || null" /></UFormField><p v-if="vertexFile" class="mt-2 text-xs">{{ vertexFile.name }} <AppButton size="xs" variant="ghost" @click="vertexFile = null">{{ t('common.remove') }}</AppButton></p></div><UFormField :label="t('cred.vertex.location')"><UInput v-model="vertexLocation" class="w-full" placeholder="us-central1" /></UFormField><UAlert v-if="vertexError" color="error" variant="subtle" :description="vertexError" /><div v-if="vertexResult" class="rounded-md border border-[var(--ui-border)] p-3 text-sm"><p>{{ t('cred.vertex.status', { value: vertexResult.status }) }}</p><p>{{ t('cred.vertex.project', { value: vertexResult.project_id }) }}</p><p>{{ t('cred.vertex.email', { value: vertexResult.email }) }}</p><p>{{ t('cred.vertex.locationValue', { value: vertexResult.location }) }}</p><p>{{ t('cred.vertex.authFile', { value: vertexResult['auth-file'] }) }}</p></div><div class="flex justify-end"><AppButton type="submit" :loading="importingVertex">{{ t('cred.vertex.import') }}</AppButton></div></form>
        </div>
      </template>
    </AppModal>




    <USlideover v-model:open="detailsOpen" :dismissible="!savingFields && !savingPolicy && !credentialAction" :title="detailsTarget?.label || detailsTarget?.name || t('cred.details.title')" :description="detailsTarget?.id || ''" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div v-if="detailsTarget" class="space-y-5">
          <div class="-mx-4 flex flex-wrap gap-1 border-b border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2" role="tablist" :aria-label="t('cred.details.title')"><AppButton v-for="section in detailSections" :key="section" role="tab" :aria-selected="detailsTab === section" size="sm" color="neutral" :variant="detailsTab === section ? 'soft' : 'ghost'" :disabled="savingFields || savingPolicy || Boolean(credentialAction)" @click="selectDetailSection(section)">{{ detailSectionLabel(section) }}</AppButton></div>
          <section v-if="detailsTab === 'Overview'" class="space-y-3"><div><h3 class="font-semibold">{{ t('cred.tab.overview') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.overview.description') }}</p></div><dl class="grid gap-3 text-sm"><div v-for="entry in overviewFields(detailsTarget)" :key="entry.label" class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"><dt class="text-xs text-[var(--ui-text-muted)]">{{ entry.label }}</dt><dd class="mt-1 break-words font-mono text-xs">{{ entry.value }}</dd></div></dl><UAlert v-if="detailsTarget.status_message" color="warning" variant="subtle" :description="detailsTarget.status_message" /></section>
          <form v-else-if="detailsTab === 'Metadata'" class="space-y-4 text-sm" @submit.prevent="saveFields"><div><h3 class="font-semibold">{{ t('cred.tab.metadata') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.description') }}</p></div>
            <fieldset :disabled="savingFields || savingPolicy || Boolean(credentialAction)" class="space-y-4">
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.hint') }}</p>
            <div class="grid gap-3 sm:grid-cols-2"><UFormField :label="t('cred.field.prefix')"><UInput v-model="fields.prefix" class="w-full" /></UFormField><UFormField :label="t('cred.field.proxyUrl')"><UInput v-model="fields.proxy_url" class="w-full" placeholder="socks5://..." /></UFormField><UFormField :label="t('cred.field.priority')"><UInput v-model="fields.priority" type="number" step="1" class="w-full" /></UFormField><UFormField :label="t('cred.field.requestRetries')"><UInput v-model="fields.request_retry" type="number" min="0" step="1" class="w-full" :placeholder="t('common.default')" /></UFormField></div>
            <UFormField :label="t('cred.field.weight')" :description="t('cred.meta.weightDescription')"><div class="flex gap-2"><UInput v-model="fields.weight" :disabled="!exclusionsLoaded" type="number" step="1" max="1000000" class="w-full" :placeholder="t('cred.weightUnset')" /><AppButton type="button" size="sm" color="neutral" variant="outline" :disabled="!exclusionsLoaded" @click="fields.weight = ''">{{ t('cred.meta.unset') }}</AppButton></div></UFormField>
            <UFormField :label="t('cred.field.note')"><UTextarea v-model="fields.note" class="w-full" /></UFormField>
            <AdminCredentialExcludedModels v-if="exclusionsLoaded" :key="detailsTarget.id" v-model="excludedModels" :credential-id="detailsTarget.id" :disabled="savingFields || savingPolicy || Boolean(credentialAction)" />
            <p v-if="exclusionsLoading" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.meta.readingExclusions') }}</p>
            <UAlert v-if="exclusionsError" color="warning" variant="subtle" :description="exclusionsError" />
            <AppButton v-if="!exclusionsLoaded && !exclusionsLoading" type="button" size="sm" variant="outline" @click="loadExclusions">{{ t('cred.meta.readExclusions') }}</AppButton>
            <UCheckbox v-if="['on', 'off'].includes(credentialWebsocketState(detailsTarget || {}))" v-model="fields.websockets" :label="t('cred.meta.wsTransport')" />
                        <div v-else class="flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3"><div><h4 class="font-semibold">{{ t('cred.meta.wsSupport') }}</h4><p class="text-xs text-[var(--ui-text-muted)]">{{ supportsWebsockets(detailsTarget) ? t('cred.meta.wsNotReturned') : t('cred.meta.wsNoToggle') }}</p></div><UBadge color="neutral" variant="subtle">{{ supportsWebsockets(detailsTarget) ? t('common.unknown') : t('cred.na') }}</UBadge></div>
            <UFormField v-if="supportsUsingAPI(detailsTarget)" :label="t('cred.field.xaiApiMode')" :description="t('cred.meta.xaiDescription')"><USwitch v-model="fields.using_api" :aria-label="t('cred.meta.xaiAria')" /></UFormField>
            <UFormField :label="t('cred.meta.coolingOverride')"><USelect v-model="fields.disable_cooling" :items="coolingOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
            <div class="flex items-center justify-between rounded-md border border-[var(--ui-border)] p-3"><span class="font-semibold">{{ t('cred.meta.enableCredential') }}</span><USwitch v-model="fields.enabled" :aria-label="t('cred.meta.enableCredential')" :disabled="savingFields" /></div>
            <AdminCredentialConcurrencyPolicy v-model:total="policyTotal" v-model:models="policyModels" class="border-t border-[var(--ui-border)] pt-4" :available="policySupported" :dirty="policyDirty" :policy="policy" :loading="loadingPolicy" :saving="savingFields || savingPolicy" :conflict="policyConflict" :error="policyError" @reload="loadPolicy" @add="addPolicyModel" @remove="policyModels.splice($event, 1)" />
            <UAlert v-if="fieldsError" color="error" variant="subtle" :description="fieldsError" />
            <div class="flex justify-end border-t border-[var(--ui-border)] pt-3"><AppButton type="submit" size="sm" :loading="savingFields" :disabled="savingFields || savingPolicy || Boolean(credentialAction) || (!policySupported && policyDirty) || (policySupported && (loadingPolicy || !policy || policyConflict))">{{ t('cred.meta.saveChanges') }}</AppButton></div>
            </fieldset>
          </form>
          <section v-else-if="detailsTab === 'Quota'" class="space-y-3 text-sm"><div><h3 class="font-semibold">{{ t('cred.tab.quota') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.quotaTab.description') }}</p></div>
            <UAlert v-if="accountQuotaError" color="error" variant="subtle" :description="accountQuotaError" />
            <p v-if="accountQuotaLoading" class="py-8 text-center text-[var(--ui-text-muted)]">{{ t('cred.quotaTab.loading') }}</p>
            <template v-else-if="accountQuotaDetail">
              <div class="flex flex-wrap items-center gap-2"><UBadge color="neutral" variant="subtle">{{ accountQuotaDetail.credential?.provider || detailsTarget?.provider || t('cred.quotaTab.unknownProvider') }}</UBadge><UBadge :color="quotaColor(accountQuotaDetail.credential?.quota_status)" variant="subtle">{{ quotaStatusLabel(accountQuotaDetail.credential?.quota_status || 'unknown') }}</UBadge><UBadge color="neutral" variant="subtle">{{ freshnessLabel(accountQuotaDetail.collection?.freshness || 'never') }}</UBadge><UBadge v-if="accountQuotaDetail.collection?.status" color="neutral" variant="subtle">{{ collectionLabel(accountQuotaDetail.collection.status) }}</UBadge></div>
              <p v-if="quotaHistorical(accountQuotaDetail.credential)" class="text-xs text-amber-500">{{ t('quota.historical') }}</p>
              <p v-if="accountQuotaDetail.credential?.source === 'response_header' && accountQuotaDetail.collection?.status === 'success'" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.passiveHeader') }}</p>
              <p v-if="accountQuotaDetail.credential?.plan?.name" class="font-medium">{{ accountQuotaDetail.credential.plan.name }}</p>
              <p v-if="accountQuotaDetail.credential?.plan?.expires_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.subscriptionEnds', { date: formatDateTime(accountQuotaDetail.credential.plan.expires_at) }) }}</p>
              <div v-if="['xai', 'grok'].includes(accountQuotaDetail.credential?.provider)" class="space-y-2">
                <p>{{ t('quota.onDemand', { state: onDemandLabel(xaiOnDemandState(accountQuotaDetail.credential)) }) }}</p>
                <div v-if="xaiProductWindows(accountQuotaDetail.credential).length" class="space-y-2 rounded-md border border-[var(--ui-border)] p-3">
                  <p class="font-medium">{{ t('cred.quotaTab.sharedUsage') }}</p>
                  <p class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.sharedAllowance') }}</p>
                  <div v-for="window in xaiProductWindows(accountQuotaDetail.credential)" :key="window.id">
                    <p>{{ window.label || window.id }}: {{ quotaProductUsed(window, t) }}</p>
                    <p v-if="isRetainedQuotaWindow(accountQuotaDetail.credential, window)" class="text-xs text-amber-500">{{ t('quota.retainedObserved', { date: formatDateTime(window.observed_at) }) }}</p>
                  </div>
                </div>
              </div>
              <div v-for="window in accountQuotaWindows" :key="window.id" class="rounded-md border border-[var(--ui-border)] p-3"><div class="flex items-start justify-between gap-3"><p class="font-medium">{{ quotaWindowLabel(window, accountQuotaDetail.credential?.provider, t) }}</p><UBadge :color="quotaColor(window.status)" variant="subtle">{{ quotaStatusLabel(window.status) }}</UBadge></div><p v-if="isRetainedQuotaWindow(accountQuotaDetail.credential, window)" class="text-xs text-amber-500">{{ t('quota.retainedObserved', { date: formatDateTime(window.observed_at) }) }}</p><p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ quotaWindowRemaining(window) }} · {{ t('quota.usedAmount', { amount: quotaWindowAmount(window.used, window, intlLocale) }) }} · {{ t('quota.resetLine', { date: window.reset_at ? formatDateTime(window.reset_at) : '—' }) }}</p><div v-if="quotaWindowRatio(window) !== null" class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]"><div class="h-full bg-[var(--ui-primary)]" :style="{ width: `${Math.round(quotaWindowRatio(window) * 100)}%` }" /></div></div>
              <p v-if="accountQuotaDetail.collection?.error" class="text-xs text-red-500">{{ quotaCollectionMessage(accountQuotaDetail.collection.error, t) }}</p><p v-if="!accountQuotaDetail.windows?.length" class="text-[var(--ui-text-muted)]">{{ t('quota.noWindowsRecorded') }}</p>
              <div v-if="accountQuotaDetail.reset_credits || resetCreditSupported" class="rounded-md border border-[var(--ui-border)] p-3"><p class="font-medium">{{ t('cred.quotaTab.resetCredits', { count: accountQuotaDetail.reset_credits?.available_count ?? '—' }) }}</p><p v-if="String(accountQuotaDetail.credential?.provider).toLowerCase() === 'claude'" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('cred.quotaTab.claudeNote') }}</p><p v-if="accountQuotaDetail.reset_credits?.observed_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('quota.observedAt', { date: formatDateTime(accountQuotaDetail.reset_credits.observed_at) }) }}</p><p v-for="(credit, index) in accountQuotaDetail.reset_credits?.credits || []" :key="index" class="mt-1 text-xs">{{ quotaStatusLabel(credit.status) }} · {{ t('quota.expiresAt', { date: credit.expires_at ? formatDateTime(credit.expires_at) : '—' }) }}</p><AppButton v-if="resetCreditSupported" size="sm" color="neutral" variant="outline" class="mt-3" :disabled="!canResetCredit || resetCreditSubmitting || Boolean(resetCreditAttempts[detailsTarget?.id])" @click="openResetCredit">{{ t('cred.quotaTab.resetCodex') }}</AppButton><p v-if="resetCreditDisabledReason" class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ resetCreditDisabledReason }}</p></div>
            </template>
            <UAlert v-if="resetCreditNotice && resetCreditNoticeCredential === detailsTarget?.id" :color="resetCreditNoticeColor" variant="subtle" :description="resetCreditNotice" />
            <p role="status" class="text-xs text-[var(--ui-text-muted)]">{{ accountQuotaCollecting ? t('cred.quotaTab.waiting') : accountQuotaNotice || t('cred.quotaTab.tracking') }}</p>
            <div class="flex flex-wrap justify-end gap-2 border-t border-[var(--ui-border)] pt-3"><AppButton size="sm" color="neutral" variant="outline" :loading="accountQuotaLoading" @click="refreshAccountQuota">{{ t('common.refresh') }}</AppButton><AppButton size="sm" color="neutral" variant="outline" :loading="accountQuotaCollecting" @click="collectAccountQuota">{{ t('cred.quotaTab.collectNow') }}</AppButton></div>
          </section>
          <section v-else-if="detailsTab === 'Concurrency'" class="space-y-5 text-sm"><div><h3 class="font-semibold">{{ t('cred.tab.concurrency') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.description') }}</p></div>
            <UAlert v-if="policyError || concurrencyError" color="error" variant="subtle" :description="policyError || concurrencyError" />
            <AdminCredentialConcurrencyPolicy v-model:total="policyTotal" v-model:models="policyModels" :available="policySupported" :dirty="policyDirty" :policy="policy" :loading="loadingPolicy" :saving="savingFields || savingPolicy" :conflict="policyConflict" :error="policyError" show-save @reload="loadPolicy" @save="savePolicy" @add="addPolicyModel" @remove="policyModels.splice($event, 1)" />
            <p v-if="!snapshotsSupported" class="text-[var(--ui-text-muted)]">{{ t('cred.conc.snapshotsUnavailable') }}</p>
            <section class="space-y-3 border-t border-[var(--ui-border)] pt-4"><div class="flex items-center justify-between gap-2"><div><h3 class="font-semibold">{{ t('cred.conc.current') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.currentDescription') }}</p></div><AppButton size="sm" color="neutral" variant="outline" :loading="loadingConcurrency" @click="loadConcurrency()">{{ t('common.refresh') }}</AppButton></div><div v-if="concurrencyState" class="space-y-2"><p>{{ t('cred.conc.admitted') }} <strong>{{ concurrencyState.admitted_in_flight }}</strong> / {{ concurrencyState.max_in_flight ?? '∞' }} <UBadge v-if="concurrencyState.total_saturated" color="warning" variant="subtle">{{ t('cred.saturated') }}</UBadge></p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.stateLine', { remaining: concurrencyState.remaining ?? t('cred.conc.unlimited'), version: concurrencyState.policy_version, enforced: concurrencyState.fully_enforced }) }}</p><div v-for="model in concurrencyState.models || []" :key="model.model" class="rounded-md border border-[var(--ui-border)] p-3"><span class="font-medium">{{ model.model }}</span> · {{ model.admitted_in_flight }} / {{ model.max_in_flight }} <UBadge v-if="model.saturated" color="warning" variant="subtle">{{ t('cred.saturated') }}</UBadge></div></div><p v-if="flightDetails?.stale || flightDetails?.details_truncated || flightDetails?.coverage_complete === false" class="text-xs text-amber-500">{{ t('cred.conc.stale') }}</p><p v-if="flightDetails?.observed_at" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.observed', { at: flightDetails.observed_at, total: flightDetails.total }) }}</p><div v-for="request in flightDetails?.items || []" :key="request.request_id" class="rounded-md border border-[var(--ui-border)] p-3"><p class="break-all font-mono text-xs">{{ request.request_id }}</p><p>{{ request.model || t('cred.conc.unknownModel') }} · {{ request.request_kind || t('cred.conc.requestKind') }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.conc.started', { at: request.started_at }) }}</p></div><p v-if="snapshotsSupported && !loadingConcurrency && !flightDetails?.items?.length" class="text-[var(--ui-text-muted)]">{{ t('cred.conc.noRequests') }}</p><AppButton v-if="flightDetails?.next_offset != null" color="neutral" variant="outline" :loading="loadingConcurrency" @click="loadConcurrency(flightDetails.next_offset)">{{ t('cred.conc.loadMore') }}</AppButton></section>
          </section>
          <section v-else-if="detailsTab === 'Models'" class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-2"><div><h3 class="font-semibold">{{ t('cred.tab.models') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.models.description') }}</p></div><AppButton size="sm" color="neutral" variant="outline" :loading="modelsLoading" @click="loadModels(detailsTarget, true)">{{ t('common.refresh') }}</AppButton></div>
            <UAlert v-if="modelsError" color="error" variant="subtle" :description="modelsError" />
            <UAlert v-if="modelStatesNotice" color="warning" variant="subtle" :description="modelStatesNotice" />
            <p v-if="modelsLoading" class="py-8 text-center text-[var(--ui-text-muted)]">{{ t('cred.models.loading') }}</p>
            <template v-else>
              <div v-if="modelStates?.credential" class="space-y-2"><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.models.runtime', { ip: modelStates.node?.ip, port: modelStates.node?.port, at: modelStates.observed_at, version: modelStates.credential.state_version }) }}</p><p>{{ t('cred.models.state', { status: modelStates.credential.status, unavailable: modelStates.credential.unavailable, blocked: modelStates.credential.refresh_blocked }) }}</p><p v-if="modelStates.credential.status_message">{{ modelStates.credential.status_message }}</p></div>
              <USelect v-model="modelScope" :aria-label="t('cred.models.scopeAria')" :items="modelScopeOptions" value-key="value" label-key="label" class="w-full" />
              <div v-for="model in scopedModelCards" :key="model.id" class="rounded-md border border-[var(--ui-border)] p-3">
                <p class="font-medium">{{ model.display_name || model.id }}</p>
                <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ model.id }}</p>
                <div v-for="state in model.diagnostics" :key="JSON.stringify([state.upstream_model, state.state_key])" class="mt-2 space-y-1">
                  <p class="font-mono text-xs">{{ t('cred.models.upstream', { upstream: state.upstream_model, state: state.state_key }) }}</p>
                  <p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.models.diag', { status: state.status, block: state.blocked ? state.block_reason : t('cred.models.notBlocked'), registered: state.registered }) }}</p>
                  <p v-if="state.remaining_cooldown || state.next_retry_after" class="text-xs">{{ t('cred.models.cooldown', { cooldown: state.remaining_cooldown || '—', retry: state.next_retry_after || '—' }) }}</p>
                  <p v-if="state.status_message || state.last_error?.message" class="text-xs">{{ state.status_message || state.last_error?.message }}</p>
                </div>
              </div>
              <p v-if="!scopedModelCards.length" class="py-6 text-center text-[var(--ui-text-muted)]">{{ t('cred.models.none') }}</p>
            </template>
          </section>
          <section v-else-if="detailsTab === 'Recovery'" class="space-y-3"><h3 class="font-semibold">{{ t('cred.recovery.title') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.recovery.description') }}</p><UAlert v-if="actionError" color="warning" variant="subtle" :description="actionError" /><div class="flex flex-wrap gap-2"><AppButton v-if="refreshAvailable" size="sm" variant="outline" :disabled="busy || Boolean(credentialAction)" :loading="credentialAction === 'refresh'" @click="runCredentialAction('refresh')">{{ t('cred.recovery.refresh') }}</AppButton><AppButton v-if="supports('credential_cooldown_reset', false) && cooldownAvailable" size="sm" color="warning" variant="outline" :disabled="busy || Boolean(credentialAction)" :loading="credentialAction === 'cooldown'" @click="runCredentialAction('cooldown')">{{ t('cred.recovery.cooldown') }}</AppButton></div><p v-if="!supports('credential_cooldown_reset', false) || !cooldownAvailable" class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.recovery.cooldownUnavailable') }}</p></section>
          <section v-else class="space-y-3"><div><h3 class="font-semibold text-red-600 dark:text-red-400">{{ t('cred.danger.title') }}</h3><p class="text-xs text-[var(--ui-text-muted)]">{{ t('cred.danger.description') }}</p></div><div class="flex flex-wrap gap-2"><AppButton size="sm" color="neutral" variant="outline" @click="downloadCredential(detailsTarget)">{{ t('cred.danger.download') }}</AppButton><AppButton size="sm" color="error" variant="outline" @click="confirmDelete(detailsTarget)">{{ t('cred.danger.delete') }}</AppButton></div></section>
        </div>
      </template>
    </USlideover>

    <AppModal v-model:open="resetCreditOpen" :dismissible="false" :title="t('cred.resetModal.title')" :description="t('cred.resetModal.description')" @update:open="handleResetCreditOpen">
      <template #body>
        <div class="space-y-4">
          <UAlert color="info" variant="subtle" :title="t('cred.resetModal.alertTitle')" :description="t('cred.resetModal.alert', { name: resetCreditTarget?.label || resetCreditTarget?.name || resetCreditTarget?.id || t('cred.resetModal.thisCredential') })" />
          <UAlert v-if="resetCreditError" color="error" variant="subtle" :description="resetCreditError" />
          <div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="resetCreditSubmitting" @click="resetCreditOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="primary" :loading="resetCreditSubmitting" :disabled="!canConfirmResetCredit" @click="redeemResetCredit">{{ t('cred.resetModal.consume') }}</AppButton></div>
        </div>
      </template>
    </AppModal>

    <AppModal v-model:open="connectivityOpen" :dismissible="false" :title="t('cred.conn.title')" :description="t('cred.conn.description')">
      <template #body>
        <form class="space-y-4" @submit.prevent="runConnectivity">
          <UAlert color="warning" variant="subtle" :title="t('cred.conn.trustedTitle')" :description="t('cred.conn.trusted')" />
          <UFormField :label="t('cred.conn.credential')"><UInput :model-value="connectivityTarget?.label || connectivityTarget?.name || connectivityTarget?.id" readonly class="w-full" /></UFormField>
          <UFormField :label="t('cred.conn.url')" required><UInput v-model="connectivityURL" type="url" class="w-full" placeholder="https://api.example.com/v1/models" /></UFormField>
          <UFormField :label="t('cred.conn.authHeader')"><UInput model-value="Bearer $TOKEN$" readonly class="w-full font-mono" /></UFormField>
          <UAlert v-if="connectivityError" color="error" variant="subtle" :description="connectivityError" />
          <div v-if="connectivityResult" class="rounded-lg bg-[var(--ui-bg-muted)] p-4 text-sm">
            <p><strong>HTTP {{ connectivityResult.status_code }}</strong></p>
            <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{{ connectivityBody }}</pre>
          </div>
          <div class="flex justify-end gap-2"><AppButton type="button" color="neutral" variant="ghost" @click="connectivityOpen = false">{{ t('common.close') }}</AppButton><AppButton type="submit" :loading="testingConnectivity">{{ t('cred.conn.run') }}</AppButton></div>
        </form>
      </template>
    </AppModal>



    <AppModal v-model:open="bulkDeleteOpen" :dismissible="false" :title="t('cred.bulkDelete.title')"><template #body><div class="space-y-5"><UAlert color="warning" variant="subtle" :title="t('cred.bulkDelete.confirm')" :description="t('cred.bulkDelete.description', { count: selectedIDs.size })"/><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" :disabled="bulkBusy" @click="bulkDeleteOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="bulkBusy" :disabled="!selectedIDs.size" @click="bulkDelete">{{ t('cred.bulkDelete.button', { count: selectedIDs.size }) }}</AppButton></div></div></template></AppModal>
    <AppModal v-model:open="deleteOpen" :dismissible="false" :title="t('cred.delete.title')"><template #body><div class="space-y-5"><UAlert color="warning" variant="subtle" :title="t('cred.delete.confirm')" :description="deleteTarget?.label || deleteTarget?.name || deleteTarget?.id"/><div class="flex justify-end gap-3"><AppButton color="neutral" variant="ghost" @click="deleteOpen = false">{{ t('common.cancel') }}</AppButton><AppButton color="error" :loading="deleting" :disabled="bulkBusy" @click="deleteCredential">{{ t('common.delete') }}</AppButton></div></div></template></AppModal>
  </div>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
import { credentialModelCards, normalizeCredentialModels } from '~/composables/credentialModelCards'
import { normalizeQuotaEntry, normalizeQuotaDetail, isQuotaAttention, quotaWindowAmount, quotaCollectionMessage, credentialWeightPatch, quotaHistorical, isRetainedQuotaWindow, quotaWindowLabel, xaiOnDemandState, xaiProductWindows, quotaProductUsed } from '~/composables/upstreamQuota'
import { credentialWebsocketState, supportsCredentialWebsockets, supportsCredentialUsingAPI, credentialUsingAPI, credentialInFlight } from '~/composables/credentialTransport'
import { useQuotaCollection } from '~/composables/useQuotaCollection'
const quotaCollection = useQuotaCollection()
const props = defineProps({ attentionRequest: { type: Number, default: 0 }, syncRequest: { type: Number, default: 0 } })
const { fetchAPI, resolveUrl, token } = useApi()
const { supports } = useCapabilities()
const toast = useToast()
const { t, intlLocale } = useAdminI18n()
const value = row => row?.original ?? row
const credentialIdentifier = item => String(item?.name || item?.auth_index || item?.id || '')
function compactIdentifier(value, maxLength = 42) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  const suffixLength = 18
  return `${text.slice(0, maxLength - suffixLength - 1)}…${text.slice(-suffixLength)}`
}
const fileInput = ref(null)
const route = useRoute()
const emit = defineEmits(['changed'])

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const ALL_FILTER = '__all__'
const providerFilter = ref(ALL_FILTER)
const statusFilter = ref(ALL_FILTER)
const websocketsFilter = ref(ALL_FILTER)
const attentionOnly = ref(false)
watch(() => props.attentionRequest, () => { attentionOnly.value = true })
const pageError = useWorkspaceState('admin:upstream-accounts:pageError', () => (''))
const uploading = useWorkspaceState('admin:upstream-accounts:uploading', () => (false))
const uploadResults = useWorkspaceState('admin:upstream-accounts:uploadResults', () => ([]))
const failedUploads = computed(() => uploadResults.value.filter(result => result.status === 'error'))
const uploadActive = computed(() => uploadResults.value.some(result => result.status === 'queued' || result.status === 'uploading'))
let uploadID = 0
const changing = useWorkspaceState('admin:upstream-accounts:changing', () => (''))
const inlineChanging = useWorkspaceState('admin:upstream-accounts:inlineChanging', () => (''))
const busy = computed(() => bulkBusy.value || deleting.value || Boolean(changing.value) || Boolean(inlineChanging.value) || savingFields.value || savingPolicy.value)
const detailsOpen = ref(false)
const detailsTarget = ref(null)
const detailsTab = ref('Overview')
const detailSections = ['Overview', 'Metadata', 'Quota', 'Concurrency', 'Models', 'Recovery', 'Danger']
// detailsTab keeps the English section IDs; only the displayed label is translated.
function detailSectionLabel(section) {
  const labels = { Overview: t('cred.tab.overview'), Metadata: t('cred.tab.metadata'), Quota: t('cred.tab.quota'), Concurrency: t('cred.tab.concurrency'), Models: t('cred.tab.models'), Recovery: t('cred.tab.recovery'), Danger: t('cred.tab.danger') }
  return labels[section] || section
}
function metadataFields(item) {
  return [
    [t('cred.field.prefix'), item.prefix || '—'], [t('cred.field.priority'), item.priority ?? '—'],
    [t('cred.field.proxyUrl'), item.proxy_url || t('cred.field.globalDefault')],
    [t('cred.field.inFlightLimit'), `${concurrency(item).in_flight || 0} / ${concurrency(item).max_in_flight ?? '∞'}`]
  ].map(([label, value]) => ({ label, value }))
}
function wsStateLabel(state) {
  const labels = { on: t('common.on'), off: t('common.off'), unknown: t('common.unknown'), unsupported: t('cred.na') }
  return labels[state] || state
}
function overviewFields(item) {
  const fallback = '—'
  const quotaStatus = quotaByID.value.get(item.id)?.quota_status
  return [
    [t('cred.field.provider'), item.provider], [t('cred.field.type'), item.type], [t('cred.field.source'), item.source],
    [t('cred.field.account'), item.account || item.email], [t('cred.field.authIndex'), item.auth_index || item.id],
    [t('cred.field.prefix'), item.prefix], [t('cred.field.proxyUrl'), item.proxy_url],
    [t('cred.field.priority'), item.priority], [t('cred.field.weight'), item.weight ?? t('cred.weightUnset')], [t('cred.field.requestRetries'), item['request-retry']],
    [t('cred.field.websockets'), wsStateLabel(credentialWebsocketState(item))],
        ...(supportsUsingAPI(item) ? [[t('cred.field.xaiApiMode'), credentialUsingAPI(item) ? t('common.enabled') : t('common.disabled')]] : []),
    [t('cred.field.cooling'), item['disable-cooling'] ? t('common.disabled') : t('common.enabled')],
    [t('cred.field.path'), item.path], [t('cred.field.size'), item.size], [t('cred.field.updatedAt'), item.mod_time || item.updated_at],
    [t('cred.field.lastRefresh'), item.last_refresh], [t('cred.field.note'), item.note],
    [t('cred.field.quotaStatus'), quotaStatus ? quotaStatusLabel(quotaStatus) : quotaStatus]
  ].map(([label, value]) => ({ label, value: value == null || value === '' ? fallback : String(value) }))
}
const accountQuotaTarget = computed(() => detailsTarget.value)
const accountQuotaDetail = useWorkspaceState('admin:upstream-accounts:accountQuotaDetail', () => (null))
const accountQuotaWindows = computed(() => {
  const quota = accountQuotaDetail.value?.credential
  const products = new Set(['xai', 'grok'].includes(quota?.provider) ? xaiProductWindows(quota).map(window => window.id) : [])
  return (accountQuotaDetail.value?.windows || []).filter(window => !products.has(window.id))
})
const accountQuotaError = useWorkspaceState('admin:upstream-accounts:accountQuotaError', () => (''))
const accountQuotaLoading = useWorkspaceState('admin:upstream-accounts:accountQuotaLoading', () => (false))
const accountQuotaCollecting = computed(() => quotaCollection.collectingAll.value || quotaCollection.collectingIDs.value.has(detailsTarget.value?.id))
const accountQuotaNotice = ref('')
const resetCreditOpen = ref(false)
const resetCreditTarget = ref(null)
const resetCreditAttempts = useWorkspaceState('admin:upstream-accounts:resetCreditAttempts', () => ({}))
const resetCreditAttempt = computed(() => resetCreditAttempts.value[resetCreditTarget.value?.id] || null)
const resetCreditSubmitting = useWorkspaceState('admin:upstream-accounts:resetCreditSubmitting', () => (false))
const resetCreditError = ref('')
const resetCreditNotice = ref('')
const resetCreditNoticeColor = ref('success')
const resetCreditNoticeCredential = ref('')
const resetCreditSupported = computed(() => supports('codex_reset_credit_consume', false) &&
  String(accountQuotaDetail.value?.credential?.provider || detailsTarget.value?.provider || '').toLowerCase() === 'codex')
const canResetCredit = computed(() => resetCreditSupported.value &&
  Number(accountQuotaDetail.value?.reset_credits?.available_count) > 0)
const resetCreditDisabledReason = computed(() => {
  if (!resetCreditSupported.value) return ''
  const detail = accountQuotaDetail.value
  if (resetCreditAttempts.value[detailsTarget.value?.id]) return t('cred.reset.previousAttempt')
  if (!detail?.reset_credits || detail.reset_credits.available_count == null) return t('cred.reset.notReported')
  if (Number(detail.reset_credits.available_count) <= 0) return t('cred.reset.noneAvailable')
  return ''
})
const canConfirmResetCredit = computed(() => !resetCreditSubmitting.value && !accountQuotaLoading.value &&
  !resetCreditAttempts.value[resetCreditTarget.value?.id] && resetCreditTarget.value?.id === detailsTarget.value?.id && canResetCredit.value)

const connectivityOpen = ref(false)
const connectivityTarget = ref(null)
const connectivityURL = ref('')
const connectivityError = useWorkspaceState('admin:upstream-accounts:connectivityError', () => (''))
const connectivityResult = useWorkspaceState('admin:upstream-accounts:connectivityResult', () => (null))
const testingConnectivity = useWorkspaceState('admin:upstream-accounts:testingConnectivity', () => (false))
const connectivityBody = computed(() => {
  const body = connectivityResult.value?.body || ''
  try { return JSON.stringify(JSON.parse(body), null, 2) } catch { return body }
})
const modelsError = ref('')
const modelsLoading = ref(false)
const credentialModels = ref([])

const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleting = useWorkspaceState('admin:upstream-accounts:deleting', () => (false))
const selectedIDs = ref(new Set())
const bulkBusy = useWorkspaceState('admin:upstream-accounts:bulkBusy', () => (false))
const bulkAction = ref('')
const bulkDeleteOpen = ref(false)
const fieldsTarget = computed(() => detailsTarget.value)
const fields = reactive({ prefix: '', proxy_url: '', priority: '', weight: '', request_retry: '', note: '', websockets: false, using_api: false, disable_cooling: 'inherit', enabled: true })
const excludedModels = ref('')
const originalExcludedModels = ref('')
const exclusionsLoaded = ref(false)
const exclusionsLoading = ref(false)
const exclusionsError = ref('')
const policyAvailable = ref(true)
const snapshotsAvailable = ref(true)
const policySupported = computed(() => supports('credential_concurrency_limits_v2', false) && policyAvailable.value)
const snapshotsSupported = computed(() => supports('credential_in_flight_snapshots', false) && snapshotsAvailable.value)
const modelStates = ref(null)
const modelStatesNotice = ref('')
const modelCards = computed(() => credentialModelCards(credentialModels.value, modelStates.value?.credential?.models || []))
const modelScope = ref('all')
const modelScopeOptions = computed(() => [{ label: t('cred.models.scopeAll'), value: 'all' }, { label: t('cred.models.scopeRegistered'), value: 'registered' }, { label: t('cred.models.scopeHistory'), value: 'history' }])
const scopedModelCards = computed(() => {
  const registered = new Set(credentialModels.value.map(model => model.id))
  return modelCards.value.filter(model => modelScope.value === 'all' || (modelScope.value === 'registered' ? registered.has(model.id) : !registered.has(model.id)))
})
const credentialAction = ref('')
const actionError = ref('')
const refreshAvailable = ref(true)
const cooldownAvailable = ref(true)
let detailGeneration = 0
let modelsRequest = 0
watch(detailsOpen, open => {
  if (!open) { detailGeneration++; policyRequest++; concurrencyRequest++; modelsRequest++; loadingPolicy.value = false; loadingConcurrency.value = false; modelsLoading.value = false; exclusionsLoading.value = false; policy.value = null }
})
onBeforeUnmount(() => { detailGeneration++; policyRequest++; concurrencyRequest++; modelsRequest++ })
watch(token, () => { detailGeneration++; detailsOpen.value = false; accountQuotaNotice.value = '' }, { flush: 'sync' })
const unavailable = error => [404, 405, 501].includes(error?.statusCode)
const ownsDetails = (id, generation) => detailsOpen.value && detailsTarget.value?.id === id && detailGeneration === generation
const coolingOptions = computed(() => [
  { label: t('cred.meta.coolingInherit'), value: 'inherit' },
  { label: t('cred.meta.coolingEnable'), value: 'enable' },
  { label: t('cred.meta.coolingDisable'), value: 'disable' }
])
const originalFields = ref({})
const fieldsError = ref('')
const savingFields = ref(false)
const policyTarget = computed(() => detailsTarget.value)
const policy = ref(null)
const policyTotal = ref('')
const policyModels = ref([])
const policyDraft = () => JSON.stringify([String(policyTotal.value), policyModels.value.map(({ model, limit }) => [model, String(limit)])])
const originalPolicyDraft = ref(policyDraft())
const policyDirty = computed(() => policyDraft() !== originalPolicyDraft.value)
const policyError = ref('')
const policyConflict = ref(false)
const loadingPolicy = ref(false)
const savingPolicy = ref(false)
let policyRequest = 0
let modelKey = 0
const concurrencyTarget = computed(() => detailsTarget.value)
const concurrencyState = ref(null)
const flightDetails = ref(null)
const concurrencyError = ref('')
const loadingConcurrency = ref(false)
let concurrencyRequest = 0
const createOpen = ref(false)
const createMode = ref('oauth')
const createModes = computed(() => [{ value: 'oauth', label: 'OAuth' }, { value: 'upload', label: t('cred.create.upload') }, { value: 'vertex', label: 'Vertex' }])
const vertexFile = ref(null)
const vertexResult = useWorkspaceState('admin:upstream-accounts:vertexResult', () => (null))
const vertexLocation = ref('us-central1')
const vertexError = ref('')
const importingVertex = useWorkspaceState('admin:upstream-accounts:importingVertex', () => (false))

const oauthError = useWorkspaceState('admin:upstream-accounts:oauthError', () => (''))
const startingOAuth = useWorkspaceState('admin:upstream-accounts:startingOAuth', () => (''))
const oauthSessions = useWorkspaceState('admin:upstream-accounts:oauthSessions', () => ({}))
const checkingOAuth = useWorkspaceState('admin:upstream-accounts:checkingOAuth', () => (''))
let oauthGeneration = 0
function stopOAuthPolling() { oauthGeneration++ }
onBeforeUnmount(stopOAuthPolling)

const submittingCallback = useWorkspaceState('admin:upstream-accounts:submittingCallback', () => (''))
const oauthProviders = [
  { label: 'Claude', value: 'claude' }, { label: 'Codex', value: 'codex' },
  { label: 'Antigravity', value: 'antigravity' }, { label: 'Kimi', value: 'kimi' },
  { label: 'xAI', value: 'xai' }, { label: 'Devin', value: 'devin' }, { label: 'Meta', value: 'meta' }
]
const credentialRoute = suffix => `/credentials${suffix}`
function handleCreateOpen(open) {
  if (!open && uploadActive.value) { nextTick(() => { createOpen.value = true }); return }
  if (!open) { stopOAuthPolling(); oauthSessions.value = {}; uploadResults.value = []; if (fileInput.value) fileInput.value.value = '' }
}

const columns = computed(() => [{ id: 'select', header: '' }, { accessorKey: 'identity', header: t('cred.col.credential') }, { accessorKey: 'provider', header: t('common.provider') }, { accessorKey: 'status', header: t('cred.col.enabled') }, { accessorKey: 'quota', header: t('cred.col.quota') }, { accessorKey: 'websockets', header: t('cred.col.ws') }, { accessorKey: 'cooling', header: t('cred.col.cooling') }, { accessorKey: 'priority', header: t('cred.col.priority') }, { id: 'actions', header: t('common.actions'), meta: { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } } }])

const flightError = useWorkspaceState('admin:upstream-accounts:flightError', () => (''))
async function loadData() {
  pageError.value = ''
  try {
    return await fetchAPI(credentialRoute(''))
  } catch (error) {
    pageError.value = message(error)
    return { files: [] }
  }
}
const { data: authData, pending, refresh: refreshCredentialsData } = useStoreData('admin:upstream-accounts:management-credentials', loadData, { lazy: true, default: () => ({ files: [] }) })
let flightRequest = 0
onBeforeUnmount(() => { flightRequest++ })
async function loadFlight() {
  const requestID = ++flightRequest
  const requestToken = token.value
  flightError.value = ''
  if (!snapshotsSupported.value) return { items: [] }
  try { return await fetchAPI('/credentials/in-flight/summary') }
  catch (error) {
    if (requestID === flightRequest && requestToken === token.value && snapshotsSupported.value) {
      if (unavailable(error)) snapshotsAvailable.value = false
      flightError.value = unavailable(error) ? t('cred.conc.snapshotsUnavailable') : message(error)
    }
    return { items: [] }
  }
}
const { data: flightData, refresh: refreshFlightData } = useStoreData('admin:upstream-accounts:management-credentials-flight', loadFlight, { lazy: true, default: () => ({ items: [] }), watch: [snapshotsSupported] })
async function refreshData(notify = true) {
  try {
    await refreshCredentialsData()
    void refreshFlightData()
    void refreshQuotaSummary()
    if (notify) emit('changed')
  } finally { selectedIDs.value = new Set() }
}
watch(() => props.syncRequest, () => { void refreshData(false) })
const credentials = computed(() => {
  const data = authData.value
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.files)) return data.files
  if (Array.isArray(data?.credentials)) return data.credentials
  return Array.isArray(data?.items) ? data.items : []
})
const credentialIDs = computed(() => credentials.value.map(item => item.id).filter(Boolean).join(','))
const quotaError = useWorkspaceState('admin:upstream-accounts:quotaError', () => (''))
async function loadQuotaSummary() {
  quotaError.value = ''
  const ids = credentialIDs.value.split(',').filter(Boolean)
  if (!ids.length) return []
  try {
    const batches = []
    for (let start = 0; start < ids.length; start += 200) {
      const result = await fetchAPI('/quota/credentials', { query: { ids: ids.slice(start, start + 200).join(','), limit: 200 } })
      batches.push(...(result.items || []).map(normalizeQuotaEntry))
    }
    return batches.map(normalizeQuotaEntry)
  } catch (error) { quotaError.value = message(error); return [] }
}
const { data: quotaSummary, pending: quotaPending, refresh: refreshQuotaSummary } = useStoreData('admin:upstream-accounts:management-account-quota', loadQuotaSummary, { lazy: true, default: () => [], watch: [credentialIDs] })
const quotaByID = computed(() => new Map((quotaSummary.value || []).map(item => [item.credential_id, item])))

function quotaStatusLabel(status) {
  const labels = { healthy: t('quota.status.healthy'), low: t('quota.status.low'), exhausted: t('quota.status.exhausted'), unknown: t('quota.status.unknown'), error: t('quota.status.error'), unsupported: t('quota.status.unsupported'), available: t('quota.status.available') }
  return labels[status] || status
}
function collectionLabel(status) {
  const labels = { success: t('quota.collection.success'), partial: t('quota.collection.partial'), failed: t('quota.collection.failed'), collecting: t('quota.collection.collecting'), never: t('quota.collection.never') }
  return labels[status] || status
}
function freshnessLabel(value) {
  const labels = { fresh: t('quota.freshness.fresh'), stale: t('quota.freshness.stale'), never: t('quota.freshness.never'), expired: t('quota.freshness.expired') }
  return labels[value] || value
}
function onDemandLabel(value) { return value === 'enabled' ? t('common.enabled') : value === 'disabled' ? t('common.disabled') : t('common.unknown') }
function formatDateTime(value) { return new Date(value).toLocaleString(intlLocale.value) }
function quotaColor(status) { return status === 'healthy' || status === 'available' ? 'success' : status === 'low' ? 'warning' : status === 'exhausted' || status === 'error' ? 'error' : 'neutral' }
function quotaWindowRatio(window) {
  const ratio = Number(window.remaining_ratio)
  return window.remaining_ratio == null || !Number.isFinite(ratio) ? null : Math.max(0, Math.min(1, ratio))
}
function quotaWindowRemaining(window) {
  if (window.is_unlimited) return t('quota.unlimited')
  if (window.remaining != null) return t('quota.remainingAmount', { amount: `${quotaWindowAmount(window.remaining, window, intlLocale.value)}${window.limit != null ? ` / ${quotaWindowAmount(window.limit, window, intlLocale.value)}` : ''}` })
  const ratio = quotaWindowRatio(window)
  return ratio == null ? '—' : t('quota.remainingAmount', { amount: `${Math.round(ratio * 100)}%` })
}
async function openAccountQuota(item) {
  await showDetails(item, 'Quota')
}
async function refreshAccountQuota() {
  if (!accountQuotaTarget.value) return
  const id = accountQuotaTarget.value.id
  const generation = detailGeneration
  const session = token.value
  const current = () => token.value === session && ownsDetails(id, generation)
  accountQuotaLoading.value = true
  accountQuotaError.value = ''
  try {
    const detail = await fetchAPI(`/quota/credentials/${encodeURIComponent(id)}`)
    if (current()) accountQuotaDetail.value = normalizeQuotaDetail(detail)
    await refreshQuotaSummary()
  } catch (error) { if (current()) accountQuotaError.value = message(error) }
  finally { if (current()) accountQuotaLoading.value = false }
}
function openResetCredit() {
  if (!canResetCredit.value || !detailsTarget.value?.id || resetCreditSubmitting.value || resetCreditAttempts.value[detailsTarget.value.id]) return
  resetCreditTarget.value = detailsTarget.value
  resetCreditError.value = ''
  resetCreditOpen.value = true
}
function handleResetCreditOpen(open) {
  if (!open && resetCreditSubmitting.value) nextTick(() => { resetCreditOpen.value = true })
}
async function redeemResetCredit() {
  if (!canConfirmResetCredit.value) return
  const id = resetCreditTarget.value.id
  resetCreditSubmitting.value = true
  resetCreditError.value = ''
  resetCreditNotice.value = ''
  try {
    if (!resetCreditAttempt.value) {
      resetCreditAttempts.value = { ...resetCreditAttempts.value, [id]: { credentialId: id, id: crypto.randomUUID() } }
    }
    const result = await fetchAPI(`/quota/credentials/${encodeURIComponent(id)}/reset-credits/consume`, {
      method: 'POST', body: { idempotency_key: resetCreditAttempt.value.id }
    })
    resetCreditAttempts.value = Object.fromEntries(Object.entries(resetCreditAttempts.value).filter(([credentialId]) => credentialId !== id))
    resetCreditOpen.value = false
    resetCreditNoticeCredential.value = id
    resetCreditNoticeColor.value = 'success'
    resetCreditNotice.value = result?.outcome === 'alreadyRedeemed' ? t('cred.resetModal.alreadyRedeemed') : t('cred.resetModal.accepted')
    toast.add({ title: t('cred.resetModal.completed'), description: resetCreditNotice.value, color: 'success' })
    if (detailsTarget.value?.id === id) accountQuotaDetail.value = null
    await collectAccountQuota()
    if (detailsTarget.value?.id === id) await refreshAccountQuota()
  } catch (error) {
    resetCreditError.value = resetCreditAttempt.value
      ? t('cred.resetModal.mayHaveConsumed', { error: message(error) })
      : message(error)
  } finally { resetCreditSubmitting.value = false }
}
watch(quotaCollection.revision, () => { void refreshQuotaSummary() })
watch(() => quotaCollection.details.value[detailsTarget.value?.id], detail => {
  if (detailsOpen.value && detail) accountQuotaDetail.value = detail
})
async function collectAccountQuota() {
  if (!accountQuotaTarget.value || accountQuotaCollecting.value) return
  const id = accountQuotaTarget.value.id
  const generation = detailGeneration
  const session = token.value
  accountQuotaError.value = ''; accountQuotaNotice.value = ''
  const result = await quotaCollection.collect(id)
  if (session !== token.value || !ownsDetails(id, generation) || !result) return
  accountQuotaNotice.value = result.completion === 'pending' ? t('quota.notice.pending') : result.completion === 'settled' ? t('quota.notice.settledOne') : t('quota.notice.none')
}
const flightItems = computed(() => Array.isArray(flightData.value?.items) ? flightData.value.items : [])
const flightByID = computed(() => new Map(flightItems.value.map(item => [item.credential_id, item])))
const concurrency = item => flightByID.value.get(item.id) || {}
const enabledCount = computed(() => credentials.value.filter(item => !item.disabled && !item.unavailable).length)
const totalInFlight = computed(() => flightItems.value.reduce((sum, item) => sum + Number(item.in_flight || 0), 0))
const saturatedCount = computed(() => flightItems.value.filter(item => item.total_saturated || item.saturated_model_count).length)
const providerOptions = computed(() => [{ label: t('quota.allProviders'), value: ALL_FILTER }, ...[...new Set(credentials.value.map(item => item.provider).filter(Boolean))].sort().map(value => ({ label: value, value }))])
const statusOptions = computed(() => [
  { label: t('cred.status.all'), value: ALL_FILTER }, { label: t('cred.status.active'), value: 'active' },
  { label: t('cred.status.disabled'), value: 'disabled' }, { label: t('cred.status.unavailable'), value: 'unavailable' },
  { label: t('cred.status.error'), value: 'error' }
])
const websocketsOptions = computed(() => [
  { label: t('cred.ws.all'), value: ALL_FILTER }, { label: t('cred.ws.on'), value: 'on' }, { label: t('cred.ws.off'), value: 'off' }, { label: t('cred.ws.unknown'), value: 'unknown' }, { label: t('cred.ws.unsupported'), value: 'unsupported' }
])
const needsAttention = item => isQuotaAttention(quotaByID.value.get(item.id))
const filteredCredentials = computed(() => {
  const q = search.value.trim().toLowerCase()
  return credentials.value.filter(item =>
    (!q || [item.id, item.name, item.label, item.email, item.provider].some(v => String(v || '').toLowerCase().includes(q))) &&
    (providerFilter.value === ALL_FILTER || item.provider === providerFilter.value) &&
    (statusFilter.value === ALL_FILTER || credentialStatus(item) === statusFilter.value) &&
    (websocketsFilter.value === ALL_FILTER || credentialWebsocketState(item) === websocketsFilter.value) &&
    (!attentionOnly.value || needsAttention(item))
  )
})
const hasActiveFilters = computed(() => Boolean(search.value.trim()) || providerFilter.value !== ALL_FILTER || statusFilter.value !== ALL_FILTER || websocketsFilter.value !== ALL_FILTER || attentionOnly.value)
const selectedEnabledCount = computed(() => credentials.value.filter(item => selectedIDs.value.has(item.id) && !item.disabled).length)
const selectedDisabledCount = computed(() => credentials.value.filter(item => selectedIDs.value.has(item.id) && item.disabled).length)
function clearFilters() {
  search.value = ''
  providerFilter.value = ALL_FILTER
  statusFilter.value = ALL_FILTER
  websocketsFilter.value = ALL_FILTER
  attentionOnly.value = false
}
const allVisibleSelected = computed(() => filteredCredentials.value.length > 0 && filteredCredentials.value.every(item => selectedIDs.value.has(item.id)))
const someVisibleSelected = computed(() => filteredCredentials.value.some(item => selectedIDs.value.has(item.id)))
watch([search, providerFilter, statusFilter, websocketsFilter, attentionOnly], () => { selectedIDs.value = new Set() })
watch(() => route.query.q, q => { search.value = typeof q === 'string' ? q : '' })
let openedDeepLink = ''
watch([() => route.query.credential, credentials], ([id, items]) => {
  if (id !== openedDeepLink && typeof id !== 'string') openedDeepLink = ''
  if (typeof id !== 'string' || !id || !items.length || id === openedDeepLink) return
  const item = items.find(entry => entry.id === id)
  if (item) { openedDeepLink = id; void showDetails(item, 'Concurrency') }
}, { immediate: true })
function toggleSelected(id, checked) {
  const next = new Set(selectedIDs.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIDs.value = next
}
function toggleAllVisible(checked) {
  const next = new Set(selectedIDs.value)
  for (const item of filteredCredentials.value) {
    if (checked) next.add(item.id)
    else next.delete(item.id)
  }
  selectedIDs.value = next
}
async function runBulk(action, items, request) {
  if (bulkBusy.value || pending.value || changing.value || deleting.value || !items.length) return
  bulkBusy.value = true
  bulkAction.value = action
  let succeeded = 0
  let failed = 0
  try {
    for (const item of items) {
      try { await request(item); succeeded++ } catch { failed++ }
    }
    try { await refreshData() } catch { pageError.value = t('cred.bulk.refreshFailed') }
    const counts = { succeeded, failed }
    toast.add({
      title: action === 'Enable' ? t('cred.bulk.enableDone', counts) : action === 'Disable' ? t('cred.bulk.disableDone', counts) : t('cred.bulk.deleteDone', counts),
      description: pageError.value ? t('cred.bulk.refreshHint') : undefined,
      color: failed || pageError.value ? 'warning' : 'success'
    })
  } finally {
    bulkBusy.value = false
    bulkAction.value = ''
  }
}
async function bulkStatus(disabled) {
  const items = credentials.value.filter(item => selectedIDs.value.has(item.id) && item.disabled !== disabled)
  if (!items.length) { selectedIDs.value = new Set(); return }
  await runBulk(disabled ? 'Disable' : 'Enable', items, item => fetchAPI(credentialRoute('/status'), { method: 'PATCH', body: { name: item.id, disabled } }))
}
async function bulkDelete() {
  if (!selectedIDs.value.size || bulkBusy.value) return
  const items = credentials.value.filter(item => selectedIDs.value.has(item.id))
  bulkDeleteOpen.value = false
  await runBulk('Delete', items, item => fetchAPI(`${credentialRoute('')}?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' }))
}

const supportsWebsockets = supportsCredentialWebsockets
const supportsUsingAPI = supportsCredentialUsingAPI
async function setInlineField(item, field, nextValue) {
  if (!item.id || busy.value) return
  inlineChanging.value = item.id
  try {
    await fetchAPI(credentialRoute('/fields'), { method: 'PATCH', body: { id: item.id, [field]: nextValue } })
    await refreshData()
    toast.add({ title: t('cred.toast.updated'), color: 'success' })
  } catch (error) { toast.add({ title: t('cred.toast.updateFailed'), description: message(error), color: 'error' }) }
  finally { inlineChanging.value = '' }
}
function credentialStatus(item) { return item.disabled ? 'disabled' : item.unavailable ? 'unavailable' : item.status || 'active' }
function credentialStatusLabel(status) {
  const labels = { active: t('cred.status.active'), disabled: t('cred.status.disabled'), unavailable: t('cred.status.unavailable'), error: t('cred.status.error') }
  return labels[status] || status
}
function credentialColor(item) { return item.disabled ? 'neutral' : item.unavailable ? 'warning' : item.status === 'error' ? 'error' : 'success' }
function uploadErrorCode(error) {
  const text = message(error).toLowerCase()
  if ([401, 403].includes(error?.statusCode) || error?.code === 'auth') return 'unauthorized'
  if (error?.code === 'network') return 'network'
  if (error?.statusCode === 400 || text.includes('unsupported credential json')) return 'unsupported'
  return 'server'
}
function isRetryableUpload(item) { return item.status === 'error' && ['network', 'server'].includes(item.errorCode) }
function uploadMessage(item) {
  const labels = { queued: t('cred.upload.queued'), uploading: t('cred.upload.uploading', { progress: item.progress }), success: t('cred.upload.uploaded'), notJson: t('cred.upload.notJson'), emptyFile: t('cred.upload.emptyFile'), invalidJson: t('cred.upload.invalidJson'), unauthorized: t('cred.upload.unauthorized'), network: t('cred.upload.network'), unsupported: t('cred.upload.unsupported'), server: t('cred.upload.server') }
  return labels[item.status === 'error' ? item.errorCode : item.status] || item.status
}
function formatFileSize(size) { return size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB` }
function uploadFile(item) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', resolveUrl(credentialRoute('')))
    xhr.setRequestHeader('Authorization', `Bearer ${token.value}`)
    xhr.upload.onprogress = event => { const ratio = event.lengthComputable && event.total > 0 ? event.loaded / event.total : 0; item.progress = Math.min(99, Math.max(0, Math.round(100 * ratio))) }
    xhr.onerror = () => reject(Object.assign(new Error('Network error'), { code: 'network' }))
    xhr.onload = () => {
      let response = {}
      try { response = JSON.parse(xhr.responseText || '{}') } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(response)
      else reject(Object.assign(new Error(response?.message || response?.error || xhr.statusText || 'Upload failed'), { statusCode: xhr.status }))
    }
    const body = new FormData(); body.append('file', item.file); xhr.send(body)
  })
}
async function validateUpload(item) {
  if (!/\.json$/i.test(item.file.name)) { item.status = 'error'; item.errorCode = 'notJson'; return false }
  if (!item.file.size) { item.status = 'error'; item.errorCode = 'emptyFile'; return false }
  try { JSON.parse(await item.file.text()) } catch { item.status = 'error'; item.errorCode = 'invalidJson'; return false }
  return true
}
async function runUploadItems(items, validate = true) {
  if (!items.length || uploading.value) return
  uploading.value = true
  if (validate) await Promise.all(items.map(validateUpload))
  const queue = items.filter(item => item.status === 'queued' || (!validate && isRetryableUpload(item)))
  let cursor = 0; let succeeded = 0
  async function worker() {
    while (cursor < queue.length) {
      const item = queue[cursor++]
      item.status = 'uploading'; item.progress = 0; item.resultName = null; item.errorCode = null
      try {
        const result = await uploadFile(item)
        item.status = 'success'; item.progress = 100; item.resultName = result?.files?.[0] || result?.name || item.file.name; succeeded++
      } catch (error) { item.status = 'error'; item.progress = 0; item.errorCode = uploadErrorCode(error) }
    }
  }
  try { await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker)); if (succeeded) await refreshData() }
  finally { uploading.value = false }
}
async function addUploadFiles(files) {
  const items = files.map(file => ({ id: `${Date.now()}-${++uploadID}`, file, status: 'queued', progress: 0, resultName: null, errorCode: null }))
  uploadResults.value.push(...items)
  await runUploadItems(items)
}
async function uploadFiles(event) { const files = Array.from(event.target.files || []); event.target.value = ''; await addUploadFiles(files) }
async function retryUpload(item) { await runUploadItems([item], false) }
async function retryFailedUploads() { await runUploadItems(failedUploads.value.filter(isRetryableUpload), false) }
async function uploadDroppedFiles(event) { if (!uploadActive.value && !busy.value) await addUploadFiles(Array.from(event.dataTransfer?.files || [])) }
async function toggleStatus(item) { changing.value = item.id; try { await fetchAPI(credentialRoute('/status'), { method: 'PATCH', body: { name: item.id, disabled: !item.disabled } }); await refreshData() } catch (error) { toast.add({ title: t('cred.toast.statusFailed'), description: message(error), color: 'error' }) } finally { changing.value = '' } }
async function showDetails(item, section = 'Overview') {
  if (savingFields.value || savingPolicy.value || credentialAction.value) return
  detailGeneration++
  policyRequest++; concurrencyRequest++; modelsRequest++
  loadingPolicy.value = false; loadingConcurrency.value = false; modelsLoading.value = false
  exclusionsLoaded.value = false; exclusionsLoading.value = false; exclusionsError.value = ''
  excludedModels.value = ''; originalExcludedModels.value = ''
  policyConflict.value = false; policyTotal.value = ''; policyModels.value = []
  originalPolicyDraft.value = policyDraft()
  modelStates.value = null; modelStatesNotice.value = ''; actionError.value = ''
  detailsTarget.value = item

  initializeFields(item)
  detailsTab.value = section
  accountQuotaDetail.value = null
  accountQuotaError.value = ''; accountQuotaNotice.value = ''
  policy.value = null
  policyError.value = ''
  concurrencyState.value = null
  flightDetails.value = null
  credentialModels.value = []
  modelScope.value = 'all'
  modelsError.value = ''
  detailsOpen.value = true
  await selectDetailSection(section)
}
async function selectDetailSection(section) {
  if (savingFields.value || savingPolicy.value || credentialAction.value) return
  detailsTab.value = section
  if (section === 'Metadata') await Promise.all([loadExclusions(), policy.value ? Promise.resolve() : loadPolicy()])
  if (section === 'Quota') await refreshAccountQuota()
  if (section === 'Concurrency') {
    concurrencyError.value = ''
    await Promise.all([policy.value ? Promise.resolve() : loadPolicy(), loadConcurrency()])
  }
  if (section === 'Models') await loadModels(detailsTarget.value)
}

function openConnectivity(item) {
  connectivityTarget.value = item
  connectivityURL.value = ''
  connectivityError.value = ''
  connectivityResult.value = null
  connectivityOpen.value = true
}
async function runConnectivity() {
  const authIndex = connectivityTarget.value?.auth_index || connectivityTarget.value?.id
  const url = connectivityURL.value.trim()
  if (!authIndex || !/^https?:\/\/[^\s/]+/i.test(url)) {
    connectivityError.value = t('cred.conn.invalid')
    return
  }
  testingConnectivity.value = true
  connectivityError.value = ''
  connectivityResult.value = null
  try {
    connectivityResult.value = await fetchAPI('/requests/api-call', {
      method: 'POST',
      body: { auth_index: authIndex, method: 'GET', url, header: { Authorization: 'Bearer $TOKEN$', Accept: 'application/json' }, data: '' }
    })
    if (connectivityResult.value.status_code < 200 || connectivityResult.value.status_code >= 300) {
      connectivityError.value = t('cred.conn.httpStatus', { status: connectivityResult.value.status_code ?? t('common.unknown') })
    }
  } catch (error) { connectivityError.value = message(error) }
  finally { testingConnectivity.value = false }
}
function initializeFields(item) {
  if (!item) return
  fieldsError.value = ''
  Object.assign(fields, {
    prefix: item.prefix || '', proxy_url: item.proxy_url || '',
    weight: item.weight == null ? '' : String(item.weight),
        priority: item.priority == null ? '' : String(item.priority), request_retry: item['request-retry'] == null ? '' : String(item['request-retry']),
    note: item.note || '', websockets: credentialWebsocketState(item) === 'on', using_api: credentialUsingAPI(item), disable_cooling: item['disable-cooling'] == null ? 'inherit' : item['disable-cooling'] ? 'disable' : 'enable', enabled: !item.disabled
  })
  originalFields.value = { ...fields }
}
async function loadExclusions() {
  if (!detailsTarget.value || exclusionsLoaded.value || exclusionsLoading.value) return
  const id = detailsTarget.value.id
  const generation = detailGeneration
  exclusionsLoading.value = true; exclusionsError.value = ''
  try {
    // The list response omits exclusions; read metadata without displaying or retaining tokens.
    const metadata = await fetchAPI(credentialRoute('/download'), { query: { id } })
    if (!ownsDetails(id, generation)) return
    if (fields.weight === originalFields.value.weight) {
      fields.weight = metadata.weight == null ? '' : String(metadata.weight)
      originalFields.value.weight = fields.weight
    }
    const models = metadata.excluded_models ?? metadata['excluded-models'] ?? []
    if (!Array.isArray(models) || models.some(model => typeof model !== 'string')) throw new Error(t('cred.err.exclusionsShape'))
    excludedModels.value = JSON.stringify(models, null, 2)
    originalExcludedModels.value = excludedModels.value
    exclusionsLoaded.value = true
  } catch (error) { if (ownsDetails(id, generation)) exclusionsError.value = message(error) }
  finally { if (ownsDetails(id, generation)) exclusionsLoading.value = false }
}
function addPolicyModel() {
  if (!savingFields.value && !savingPolicy.value && !policyConflict.value) policyModels.value.push({ key: ++modelKey, model: '', limit: '' })
}
function canonicalPolicyModel(raw) {
  // Match Home's limiter key normalization, including recognized reasoning suffixes.
  const trim = value => value.replace(/^[ \t\r\n\v\f]+|[ \t\r\n\v\f]+$/g, '')
  let model = trim(raw).toLowerCase()
  const suffix = model.match(/\(([^()]*)\)$/)
  if (suffix && (['-1', 'none', 'auto', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(suffix[1]) || (/^\d{1,10}$/.test(suffix[1]) && Number(suffix[1]) <= 2147483647))) {
    const base = trim(model.slice(0, suffix.index))
    if (base) model = base
  }
  if (!model || new TextEncoder().encode(model).length > 256 || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(model)) throw new Error(t('cred.policy.invalidModel'))
  return model
}
function policyPatch() {
  if (!policySupported.value) {
    if (policyDirty.value) throw new Error(t('cred.policy.unavailableRetained'))
    return {}
  }
  if (loadingPolicy.value || !policy.value || policy.value.credential_id !== detailsTarget.value?.id) throw new Error(t('cred.policy.loadFirst'))
  if (policyConflict.value) throw new Error(t('cred.policy.conflict'))
  const total = policyLimit(policyTotal.value)
  const models = Object.create(null)
  const seen = new Set()
  for (const entry of policyModels.value) {
    if (!entry.model.trim()) throw new Error(t('cred.policy.emptyModel'))
    const model = canonicalPolicyModel(entry.model)
    if (seen.has(model)) throw new Error(t('cred.policy.duplicate', { model }))
    seen.add(model)
    const limit = policyLimit(entry.limit)
    if (limit) models[model] = limit
  }
  const body = {}
  if (total !== (policy.value.max_in_flight ?? null)) body.max_in_flight = total
  if (JSON.stringify(Object.entries(models).sort()) !== JSON.stringify(Object.entries(policy.value.max_in_flight_by_model || {}).sort())) body.max_in_flight_by_model = models
  if (Object.keys(body).length) body.version = policy.value.version
  return body
}
async function saveFields() {
  if (!fieldsTarget.value || savingFields.value || savingPolicy.value || credentialAction.value) return
  const generation = detailGeneration
  const body = { id: fieldsTarget.value.id }
  for (const key of Object.keys(fields)) {
    if (fields[key] === originalFields.value[key]) continue
    if (key === 'weight') {
      try {
        body.weight = credentialWeightPatch(fields.weight, String(fields.weight).trim() === '')

      } catch { fieldsError.value = t('cred.err.weight'); return }
    } else if (key === 'priority' || key === 'request_retry') {
      const raw = String(fields[key]).trim()
      if (raw && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))) { fieldsError.value = key === 'priority' ? t('cred.err.priorityInt') : t('cred.err.retryInt'); return }
      body[key] = raw ? Number(raw) : null
    } else if (key === 'disable_cooling') body['disable-cooling'] = fields[key] === 'inherit' ? null : fields[key] === 'disable'
    else if (key === 'using_api') body.using_api = Boolean(fields[key])
    else if (key === 'enabled') body.disabled = !fields.enabled
    else body[key] = fields[key]
  }
  try {
    if (exclusionsLoaded.value && excludedModels.value !== originalExcludedModels.value) {
      const models = excludedModels.value.trim() ? JSON.parse(excludedModels.value) : []
      if (!Array.isArray(models) || models.some(model => typeof model !== 'string')) throw new Error(t('cred.err.excludedShape'))
      body.excluded_models = models
    }
    Object.assign(body, policyPatch())
  } catch (error) { fieldsError.value = message(error); return }
  if (Object.keys(body).length === 1) return
  savingFields.value = true; fieldsError.value = ''
  try {
    await fetchAPI(credentialRoute('/fields'), { method: 'PATCH', body })
    await refreshData()
    const updated = credentials.value.find(item => item.id === body.id)
    if (ownsDetails(body.id, generation)) {
      if (updated) {
        detailsTarget.value = updated; initializeFields(updated)
        // Older list responses omit weight; retain the value just persisted by this form.
        if (body.weight != null && updated.weight == null) { fields.weight = String(body.weight); originalFields.value.weight = fields.weight }
      }
      if (body.excluded_models) { excludedModels.value = JSON.stringify(body.excluded_models, null, 2); originalExcludedModels.value = excludedModels.value }
      if (body.version != null) { policy.value = null; await loadPolicy(true) }
    }
    toast.add({ title: t('cred.toast.fieldsUpdated'), color: 'success' })
  } catch (error) {
    if (ownsDetails(body.id, generation)) {
      policyConflict.value = error?.statusCode === 409
      fieldsError.value = policyConflict.value ? t('cred.policy.conflictSaveFields') : message(error)
    }
  }
  finally { savingFields.value = false }
}

async function loadPolicy(internal = false) {
  if (!policyTarget.value || !policySupported.value || savingPolicy.value || (savingFields.value && internal !== true)) return
  const requestID = ++policyRequest
  const id = policyTarget.value.id
  const generation = detailGeneration
  loadingPolicy.value = true
  policyError.value = ''
  try {
    const result = await fetchAPI(`/credentials/${encodeURIComponent(id)}/concurrency-policy`)
    if (requestID !== policyRequest || !ownsDetails(id, generation)) return
    if (result.credential_id !== id) throw new Error(t('cred.policy.wrongCredential'))
    policy.value = result
    policyTotal.value = result.max_in_flight == null ? '' : String(result.max_in_flight)
    policyModels.value = Object.entries(result.max_in_flight_by_model || {}).sort(([a], [b]) => a.localeCompare(b)).map(([model, limit]) => ({ key: ++modelKey, model, limit: String(limit) }))
    originalPolicyDraft.value = policyDraft()
    policyConflict.value = false
  } catch (error) {
    if (requestID === policyRequest && ownsDetails(id, generation)) {
      if (unavailable(error)) policyAvailable.value = false
      policyError.value = unavailable(error) ? t('cred.policy.unavailable') : message(error)
    }
  }
  finally { if (requestID === policyRequest) loadingPolicy.value = false }
}
function policyLimit(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error(t('cred.policy.invalidLimit'))
  return Number(text) || null
}
async function savePolicy() {
  if (!policyTarget.value || !policySupported.value || savingFields.value || savingPolicy.value || loadingPolicy.value || credentialAction.value) return
  const id = policyTarget.value.id
  const generation = detailGeneration
  const requestID = ++policyRequest
  let body
  try {
    body = policyPatch()
    if (!Object.keys(body).length) return
  } catch (error) { policyError.value = message(error); return }
  savingPolicy.value = true
  policyError.value = ''
  try {
    const result = await fetchAPI(`/credentials/${encodeURIComponent(id)}/concurrency-policy`, { method: 'PATCH', body })
    if (requestID !== policyRequest || !ownsDetails(id, generation)) return
    policy.value = result
    policyTotal.value = result.max_in_flight == null ? '' : String(result.max_in_flight)
    policyModels.value = Object.entries(result.max_in_flight_by_model || {}).sort(([a], [b]) => a.localeCompare(b)).map(([model, limit]) => ({ key: ++modelKey, model, limit: String(limit) }))
    originalPolicyDraft.value = policyDraft()
    await refreshData()
    toast.add({ title: t('cred.policy.updated'), color: 'success' })
  } catch (error) {
    if (requestID !== policyRequest || !ownsDetails(id, generation)) return
    if (unavailable(error)) policyAvailable.value = false
    policyConflict.value = error?.statusCode === 409
    policyError.value = policyConflict.value ? t('cred.policy.conflictSave') : message(error)
  } finally { savingPolicy.value = false }
}

async function loadConcurrency(offset = 0) {
  if (!concurrencyTarget.value || loadingConcurrency.value) return
  const id = concurrencyTarget.value.id
  const generation = detailGeneration
  const requestID = ++concurrencyRequest
  loadingConcurrency.value = true; concurrencyError.value = ''
  try {
    const query = { credential_id: id, limit: 25, offset }
    if (supports('credential_in_flight_snapshot_cursor', false)) {
      if (offset && flightDetails.value?.snapshot_cursor) query.snapshot_cursor = flightDetails.value.snapshot_cursor
      else query.stable_snapshot = true
    }
    const [states, details] = await Promise.all([
      policySupported.value ? fetchAPI('/credentials/concurrency').catch(error => {
        if (unavailable(error)) {
          if (requestID === concurrencyRequest && ownsDetails(id, generation)) policyAvailable.value = false
          return { items: [] }
        }
        throw error
      }) : Promise.resolve({ items: [] }),
      snapshotsSupported.value ? fetchAPI('/credentials/in-flight', { query }) : Promise.resolve(null)
    ])
    if (requestID !== concurrencyRequest || !ownsDetails(id, generation)) return
    concurrencyState.value = (states.items || []).find(item => item.credential_id === id) || null
    flightDetails.value = offset && details ? { ...details, items: [...(flightDetails.value?.items || []), ...(details.items || [])] } : details
  } catch (error) {
    if (requestID === concurrencyRequest && ownsDetails(id, generation)) {
      if (unavailable(error)) snapshotsAvailable.value = false
      concurrencyError.value = unavailable(error) ? t('cred.err.concurrencyUnavailable') : error?.statusCode === 409 ? t('cred.err.snapshotExpired') : message(error)
    }
  } finally { if (requestID === concurrencyRequest) loadingConcurrency.value = false }
}
async function importVertex() {
  if (importingVertex.value) return
  if (!vertexFile.value) { vertexError.value = t('cred.err.vertexFile'); return }
  importingVertex.value = true; vertexError.value = ''
  try {
    const body = new FormData()
    body.append('file', vertexFile.value)
    if (vertexLocation.value.trim()) body.append('location', vertexLocation.value.trim())
    vertexResult.value = await fetchAPI('/oauth/import', { method: 'POST', query: { provider: 'vertex' }, body })
    vertexFile.value = null
    await refreshData()
    toast.add({ title: t('cred.toast.vertexImported'), color: 'success' })
  } catch (error) { vertexError.value = message(error) }
  finally { importingVertex.value = false }
}
async function loadModels(item, refresh = false) {
  if (!item?.id || modelsLoading.value) return
  const generation = detailGeneration
  const requestID = ++modelsRequest
  const current = () => requestID === modelsRequest && ownsDetails(item.id, generation)
  modelsLoading.value = true; modelsError.value = ''; modelStatesNotice.value = ''
  credentialModels.value = []; modelStates.value = null
  try {
    const [models, states] = await Promise.all([
      fetchAPI(credentialRoute('/models'), { query: { name: item.id }, refresh }),
      fetchAPI(`/credentials/${encodeURIComponent(item.id)}/model-states`).catch(async error => {
        if (error?.statusCode === 404) {
          try {
            const result = await fetchAPI('/credentials/model-states', { query: { credential_id: item.id } })
            return { ...result, credential: (result.credentials || []).find(entry => entry.credential_id === item.id) }
          } catch (fallbackError) {
            if (current()) modelStatesNotice.value = unavailable(fallbackError) ? t('cred.err.modelStatesUnavailable') : message(fallbackError)
            return null
          }
        }
        if (current()) modelStatesNotice.value = unavailable(error) ? t('cred.err.modelStatesUnavailable') : message(error)
        return null
      })
    ])
    if (!current()) return
    credentialModels.value = normalizeCredentialModels(models.models)
    modelStates.value = states
    if (states && !states.credential) modelStatesNotice.value = t('cred.err.noRuntimeState')
  } catch (error) { if (current()) modelsError.value = message(error) }
  finally { if (requestID === modelsRequest) modelsLoading.value = false }
}
async function runCredentialAction(action) {
  if (!detailsTarget.value || credentialAction.value || savingFields.value || savingPolicy.value || busy.value) return
  if (action === 'refresh' ? !refreshAvailable.value : !supports('credential_cooldown_reset', false) || !cooldownAvailable.value) return
  const item = detailsTarget.value
  const generation = detailGeneration
  credentialAction.value = action; actionError.value = ''
  try {
    const result = action === 'refresh'
      ? await fetchAPI('/credentials/refresh', { method: 'POST', body: { auth_index: item.id } })
      : await fetchAPI(`/credentials/${encodeURIComponent(item.id)}/cooldown`, { method: 'DELETE' })
    if (action === 'refresh' && !result.auth) throw new Error(t('cred.err.noOAuthRefresh'))
    await refreshData()
    if (ownsDetails(item.id, generation)) {
      const updated = credentials.value.find(entry => entry.id === item.id)
      if (updated) { detailsTarget.value = updated; initializeFields(updated) }
      if (detailsTab.value === 'Models') await loadModels(detailsTarget.value)
    }
    toast.add({ title: action === 'refresh' ? t('cred.toast.refreshed') : result.cleared ? t('cred.toast.cooldownCleared') : t('cred.toast.noCooldown'), color: 'success' })
  } catch (error) {
    if (ownsDetails(item.id, generation)) {
      if (unavailable(error)) { if (action === 'refresh') refreshAvailable.value = false; else cooldownAvailable.value = false }
      actionError.value = unavailable(error) ? t('cred.err.actionUnavailable') : message(error)
    }
  } finally { credentialAction.value = '' }
}
async function downloadCredential(item) {
  try {
    const blob = await fetchAPI(credentialRoute('/download'), { query: { id: item.id }, responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = item.name || `${item.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) { toast.add({ title: t('cred.toast.downloadFailed'), description: message(error), color: 'error' }) }
}

function credentialRowActions(item) {
  return [
    { id: 'view', label: t('common.view'), ariaLabel: t('cred.action.view'), icon: 'i-tabler-eye', onSelect: () => showDetails(item) },
    { id: 'test', label: t('cred.action.test'), ariaLabel: t('cred.action.testAria'), icon: 'i-tabler-plug-connected', onSelect: () => openConnectivity(item) },
    { id: 'download', label: t('cred.action.download'), ariaLabel: t('cred.action.downloadAria'), icon: 'i-tabler-download', disabled: busy.value, onSelect: () => downloadCredential(item) },
    { id: 'delete', label: t('common.delete'), ariaLabel: t('cred.action.deleteAria'), icon: 'i-tabler-trash', destructive: true, disabled: busy.value, onSelect: () => confirmDelete(item) }
  ]
}
function confirmDelete(item) { deleteTarget.value = item; deleteOpen.value = true }
async function deleteCredential() { if (!deleteTarget.value) return; deleting.value = true; try { await fetchAPI(`${credentialRoute('')}?id=${encodeURIComponent(deleteTarget.value.id)}`, { method: 'DELETE' }); deleteOpen.value = false; await refreshData(); toast.add({ title: t('cred.toast.deleted'), color: 'success' }) } catch (error) { toast.add({ title: t('cred.toast.deleteFailed'), description: message(error), color: 'error' }) } finally { deleting.value = false } }
async function startOAuth(provider) {
  if (startingOAuth.value) return
  startingOAuth.value = provider; oauthError.value = ''
  try {
    const result = await fetchAPI('/oauth/auth-url', { query: { provider, is_webui: true } })
    const url = result?.url || result?.auth_url
    if (!url) throw new Error(t('cred.err.noAuthUrl'))
    stopOAuthPolling()
    const sessions = { ...oauthSessions.value, [provider]: { url, state: result.state || '', status: '', code: '', redirect_url: '', callback_error: '' } }
    oauthSessions.value = sessions
  } catch (error) { oauthError.value = message(error) }
  finally { startingOAuth.value = '' }
}
async function copyOAuthLink(provider) {
  try { await navigator.clipboard.writeText(oauthSessions.value[provider].url); toast.add({ title: t('cred.toast.linkCopied'), color: 'success' }) }
  catch (error) { oauthError.value = message(error) }
}
function openOAuthLink(provider) { window.open(oauthSessions.value[provider].url, '_blank', 'noopener,noreferrer') }
async function completeOAuth() {
  stopOAuthPolling()
  await refreshData()
  toast.add({ title: t('cred.toast.oauthCompleted'), color: 'success' })
  createOpen.value = false
  oauthSessions.value = {}
}
async function checkOAuthStatus(provider, notify = true) {
  const session = oauthSessions.value[provider]
  if (!session?.state || checkingOAuth.value === provider) return
  checkingOAuth.value = provider
  try {
    const result = await fetchAPI('/oauth/status', { query: { state: session.state.trim() || undefined } })
    session.status = result.status || 'unknown'; session.error = result.error || ''
    if (String(session.status).trim().toLowerCase() === 'ok') await completeOAuth()
    else if (notify) toast.add({ title: t('cred.toast.oauthChecked'), color: 'neutral' })
  } catch (error) { if (notify) oauthError.value = message(error) }
  finally { checkingOAuth.value = '' }
}
async function pollOAuth(provider, state) {
  const generation = ++oauthGeneration
  let failures = 0
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const result = await fetchAPI('/oauth/status', { query: { state } })
      if (generation !== oauthGeneration) return
      failures = 0
      const session = oauthSessions.value[provider]
      if (session) { session.status = result.status || 'unknown'; session.error = result.error || '' }
      const status = String(result.status || 'unknown').trim().toLowerCase()
      if (status === 'ok') { await completeOAuth(); return }
      if (status === 'error') { toast.add({ title: t('cred.toast.oauthFailed'), description: result.error || result.status, color: 'error' }); return }
    } catch (error) {
      if (generation !== oauthGeneration) return
      failures++
      if (failures >= 3) { toast.add({ title: t('cred.toast.oauthStatusFailed'), description: message(error), color: 'error' }); return }
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  if (generation === oauthGeneration) toast.add({ title: t('cred.toast.oauthStopped'), color: 'neutral' })
}
function extractOAuthCode(text) { const value = String(text || '').trim(); return value.match(/\bcode\s*[:=]\s*([^\s&]+)/i)?.[1]?.trim() || value }
function normalizeXaiCallback(source, fallbackState) {
  const value = String(source || '').trim()
  if (!value) return ''
  try { return new URL(value).toString() } catch {}
  const query = value.includes('?') ? value.slice(value.indexOf('?') + 1) : value.includes('#') ? value.slice(value.indexOf('#') + 1) : value
  if (/(^|[&#?])(code|state|error)=/i.test(query)) {
    const params = new URLSearchParams(query.replace(/^[?#]/, ''))
    const state = (params.get('state') || fallbackState || '').trim()
    if (!state) return ''
    const url = new URL('http://127.0.0.1:56121/callback'); url.searchParams.set('state', state)
    for (const key of ['code', 'error', 'error_description']) if (params.get(key)?.trim()) url.searchParams.set(key, params.get(key).trim())
    return url.toString()
  }
  const code = extractOAuthCode(value)
  if (!code || !fallbackState) return ''
  const url = new URL('http://127.0.0.1:56121/callback'); url.searchParams.set('code', code); url.searchParams.set('state', fallbackState); return url.toString()
}
async function submitCallback(provider) {
  const session = oauthSessions.value[provider]
  if (!session || provider === 'kimi') return
  oauthError.value = ''
  let redirectURL = session.redirect_url.trim()
  let code = session.code.trim()
  const state = session.state.trim()
  const errorText = session.callback_error.trim()
  try {
    if (provider === 'xai' && !state && !/(?:^|[?&#])state=/i.test(redirectURL)) throw new Error(t('cred.err.xaiState'))
    if ((!state && !redirectURL) || (!code && !errorText && !redirectURL)) throw new Error(t('cred.err.callbackInput'))
    if (provider === 'xai') {
      const normalized = normalizeXaiCallback(redirectURL || code, state)
      code = normalized ? '' : extractOAuthCode(code)
      redirectURL = normalized || redirectURL
    }
    submittingCallback.value = provider
    await fetchAPI('/oauth/callback', { method: 'POST', body: { provider, redirect_url: redirectURL, code, state, error: errorText } })
    toast.add({ title: t('cred.toast.callbackSubmitted'), color: 'success' })
    let pollState = state
    if (!pollState) { const match = session.redirect_url.match(/(?:^|[?&#])state=([^&]+)/i); if (match) { try { pollState = decodeURIComponent(match[1]) } catch { pollState = match[1] } } }
    if (pollState) { session.status = 'wait'; void pollOAuth(provider, pollState) }
  } catch (error) { oauthError.value = message(error) }
  finally { submittingCallback.value = '' }
}
function message(error) { return error?.data?.message || error?.data?.error || error?.message || t('cred.err.unexpected') }
</script>

<style scoped>
.accounts-table :deep(th:first-child),
.accounts-table :deep(td:first-child) { width: 2.75rem; }

</style>
