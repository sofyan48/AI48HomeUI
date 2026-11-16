<template>
  <USlideover v-model:open="detailOpen" :title="detailTitle" :description="detailDescription" :ui="{ content: 'sm:max-w-xl' }" @update:open="handleDetailOpen">
    <template #body>
      <form v-if="sheetMode === 'create' || sheetMode === 'edit'" class="grid gap-4" @submit.prevent="submitKey">
        <p v-if="sheetMode === 'create'" class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">{{ t('keys.createHeading') }}</p>
        <UFormField v-if="supportsDisplayNames" :label="t('keys.displayName')" :hint="t('keys.displayNameHint')" :error="displayNameError">
          <UInput v-model="form.displayName" class="w-full" :placeholder="t('keys.displayNamePlaceholder')" :disabled="submitting" @input="displayNameError = ''" />
        </UFormField>
        <UFormField :label="t('keys.keyValue')" required :error="keyValueError">
          <div class="flex gap-2">
            <UInput v-model="form.value" :type="formSecretVisible ? 'text' : 'password'" class="min-w-0 flex-1 font-mono" autocomplete="off" :disabled="submitting" @input="keyValueError = ''" />
            <AppButton type="button" color="neutral" variant="outline" :icon="formSecretVisible ? 'i-tabler-eye-off' : 'i-tabler-eye'" :aria-label="formSecretVisible ? t('keys.hide') : t('keys.reveal')" @click="formSecretVisible = !formSecretVisible" />
          </div>
        </UFormField>
        <AppButton type="button" color="neutral" variant="outline" icon="i-tabler-sparkles" :disabled="submitting" @click="generateKey">{{ t('keys.generate') }}</AppButton>
        <UFormField v-if="supports('users', true)" :label="t('keys.owner')" :hint="ownerUnavailable ? t('keys.ownerUnavailableHint') : undefined">
          <USelect :model-value="form.userId == null ? 'unassigned' : String(form.userId)" :items="ownerOptions" class="w-full" :disabled="submitting" @update:model-value="setFormOwner" />
        </UFormField>
        <template v-if="supports('access_groups', true)">
          <p v-if="supplementalError" role="status" class="text-sm text-[var(--ui-text-muted)]">{{ t('keys.supplementalError') }}</p>
          <UFormField :label="t('keys.credentialScope')" :hint="t('keys.credentialScopeHint')">
            <div class="grid gap-2">
              <UCheckbox v-for="group in scopeOptions(channelGroups, form.channelGroupIds)" :key="group.id" :model-value="form.channelGroupIds.includes(group.id)" :label="group.label" :disabled="submitting" @update:model-value="toggleFormGroup('channelGroupIds', group.id, $event)" />
              <p v-if="!scopeOptions(channelGroups, form.channelGroupIds).length" class="text-sm text-[var(--ui-text-muted)]">{{ t('keys.noCredentialGroups') }}</p>
            </div>
          </UFormField>
          <UFormField :label="t('keys.modelScope')" :hint="t('keys.modelScopeHint')">
            <div class="grid gap-2">
              <UCheckbox v-for="group in scopeOptions(modelGroups, form.modelGroupIds)" :key="group.id" :model-value="form.modelGroupIds.includes(group.id)" :label="group.label" :disabled="submitting" @update:model-value="toggleFormGroup('modelGroupIds', group.id, $event)" />
              <p v-if="!scopeOptions(modelGroups, form.modelGroupIds).length" class="text-sm text-[var(--ui-text-muted)]">{{ t('keys.noModelGroups') }}</p>
            </div>
          </UFormField>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.scopeNote') }}</p>
        </template>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AppButton type="button" color="neutral" variant="outline" :disabled="submitting" @click="cancelForm">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" :loading="submitting">{{ sheetMode === 'edit' ? t('keys.saveKey') : t('keys.createKey') }}</AppButton>
        </div>
      </form>
      <div v-else-if="selectedResource" class="space-y-5">
        <div class="rounded-md border border-[var(--ui-border)] p-3">
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.secretValue') }}</p>
          <p class="mt-2 break-all font-mono text-sm">{{ detailSecretVisible ? selectedResource.value : selectedResource.maskedValue }}</p>
          <div class="mt-3 flex gap-2">
            <AppButton color="neutral" variant="outline" size="sm" :icon="detailSecretVisible ? 'i-tabler-eye-off' : 'i-tabler-eye'" @click="detailSecretVisible = !detailSecretVisible">{{ detailSecretVisible ? t('keys.hide') : t('keys.reveal') }}</AppButton>
            <AppButton color="neutral" variant="outline" size="sm" icon="i-tabler-clipboard" @click="copyText(selectedResource.value, t('keys.keyCopied'))">{{ t('common.copy') }}</AppButton>
          </div>
        </div>
        <dl class="grid gap-3 text-sm">
          <div v-if="supportsDisplayNames" class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.displayName') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ selectedResource.displayName || t('keys.noDisplayName') }}</dd>
          </div>
          <div class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.prefix') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ selectedResource.prefix }}</dd>
          </div>
          <div class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.suffix') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ selectedResource.suffix }}</dd>
          </div>
          <div class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.length') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ selectedResource.length }}</dd>
          </div>
          <div class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.owner') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ ownerName(selectedResource) }}</dd>
          </div>
          <div class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.credentialScope') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ credentialScope(selectedResource) }}</dd>
          </div>
          <div class="rounded-md border border-[var(--ui-border)] px-3 py-2.5">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.modelScope') }}</dt>
            <dd class="mt-1 break-words font-mono text-xs">{{ modelScope(selectedResource) }}</dd>
          </div>
        </dl>
        <div class="grid gap-2">
          <AppButton icon="i-tabler-pencil" @click="openEdit(selectedResource)">{{ t('common.edit') }}</AppButton>
          <AppButton color="error" variant="outline" icon="i-tabler-trash" @click="emit('delete', selectedResource)">{{ t('common.delete') }}</AppButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { useAccessKeys } from '~/composables/access-keys/useAccessKeys'
import type { useAccessKeySheet } from '~/composables/access-keys/useAccessKeySheet'
import type { AccessKeyResource } from '~/composables/access-keys/normalize'

const props = defineProps<{ sheet: ReturnType<typeof useAccessKeySheet> }>()
const emit = defineEmits<{ delete: [resource: AccessKeyResource] }>()
const { t, supports, detailOpen, sheetMode, selectedResource, supportsDisplayNames, submitting,
  supplementalError, channelGroups, modelGroups, copyText, ownerName, credentialScope, modelScope } = useAccessKeys()
// Keep the shared detail/edit slideover and its original footer rather than changing close/cancel semantics.
const { detailTitle, detailDescription, handleDetailOpen, form, formSecretVisible, detailSecretVisible,
  displayNameError, keyValueError, submitKey, generateKey, ownerUnavailable, ownerOptions,
  setFormOwner, scopeOptions, toggleFormGroup, cancelForm, openEdit } = props.sheet
</script>
