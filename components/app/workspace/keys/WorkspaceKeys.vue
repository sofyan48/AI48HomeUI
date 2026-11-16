<script setup lang="ts">
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceKeys } from '~/composables/workspace/useWorkspaceKeys'
import { maskKey } from '~/composables/workspace/keys'
import { useWorkspaceFormat } from '~/composables/workspace/common'

const { t } = usePortalI18n()
const { formatDate } = useWorkspaceFormat()
const { keys, keySearch, filteredKeys, keysLoading, openKeyForm, confirmKeyDelete, copyKey } = useWorkspaceKeys()
</script>

<template>
  <section class="workspace-finance workspace-keys space-y-5" aria-labelledby="keys-title">
    <AppCard class="finance-panel keys-panel">
      <div class="flex flex-wrap items-end gap-4">
        <UFormField :label="t('ws.keys.search')" class="min-w-0 flex-1">
          <UInput v-model="keySearch" icon="i-tabler-search" :placeholder="t('ws.keys.searchPlaceholder')" :aria-label="t('ws.keys.searchAria')" size="lg" class="w-full" />
        </UFormField>
        <AppButton icon="i-tabler-plus" size="lg" class="shrink-0 rounded-full" @click="openKeyForm()">{{ t('ws.keys.create') }}</AppButton>
      </div>
      <p class="mt-4 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.keys.hint') }}</p>
    </AppCard>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="keys-title" class="flex items-center gap-2 text-sm font-semibold"><UIcon name="i-tabler-key" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('ws.keys.yourKeys') }}</h2>
      <span class="rounded-full bg-[var(--ui-bg-muted)] px-3 py-1 text-xs tabular-nums text-[var(--ui-text-muted)]">{{ keysLoading ? t('ws.keys.countLoading') : t('ws.keys.count', { shown: filteredKeys.length, total: keys.length }) }}</span>
    </div>
    <div v-if="keysLoading" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" :aria-label="t('ws.keys.loadingAria')" aria-busy="true">
      <USkeleton v-for="index in 3" :key="index" class="h-56 rounded-3xl" />
    </div>
    <div v-else-if="filteredKeys.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <AppCard v-for="key in filteredKeys" :key="key.api_key" class="finance-panel key-card min-w-0" :ui="{ body: 'flex h-full flex-col p-5 sm:p-6' }">
        <span class="finance-icon flex size-10 items-center justify-center rounded-full"><UIcon name="i-tabler-key" class="size-5" aria-hidden="true" /></span>
        <h3 class="mt-3 break-words text-base font-semibold tracking-tight text-[var(--ui-text-highlighted)]">{{ key.display_name || t('ws.keys.unnamed') }}</h3>
        <div class="mt-1 flex min-w-0 items-center gap-2">
          <code class="min-w-0 break-all text-xs text-[var(--ui-text-muted)]">{{ maskKey(key.api_key) }}</code>
          <AppButton type="button" size="xs" class="shrink-0" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('ws.keys.copyAria', { key: maskKey(key.api_key) })" @click="copyKey(key.api_key)" />
        </div>
        <dl class="my-4 space-y-2 text-xs">
          <div class="flex flex-wrap justify-between gap-2"><dt class="text-[var(--ui-text-muted)]">{{ t('ws.keys.created') }}</dt><dd>{{ formatDate(key.created_at) }}</dd></div>
          <div class="flex flex-wrap justify-between gap-2"><dt class="text-[var(--ui-text-muted)]">{{ t('ws.keys.updated') }}</dt><dd>{{ formatDate(key.updated_at || key.created_at) }}</dd></div>
        </dl>
        <div class="mt-auto flex items-center justify-between gap-3 border-t border-[var(--ui-border)] pt-3">
          <AppButton color="primary" variant="ghost" size="sm" class="rounded-full" icon="i-tabler-pencil" :aria-label="t('ws.keys.editAria', { name: key.display_name || t('ws.keys.keyFallback') })" @click="openKeyForm(key)">{{ t('ws.keys.edit') }}</AppButton>
          <AppButton color="error" variant="ghost" size="sm" class="rounded-full" icon="i-tabler-trash" :aria-label="t('ws.keys.deleteAria', { name: key.display_name || t('ws.keys.keyFallback') })" @click="confirmKeyDelete(key)">{{ t('ws.keys.delete') }}</AppButton>
        </div>
      </AppCard>
    </div>
    <div v-else class="flex flex-col items-center px-5 py-12 text-center">
      <span class="finance-icon mb-4 flex size-12 items-center justify-center rounded-2xl"><UIcon :name="keys.length ? 'i-tabler-search' : 'i-tabler-key'" class="size-6" aria-hidden="true" /></span>
      <h2 class="text-sm font-semibold">{{ keys.length ? t('ws.keys.noMatch') : t('ws.keys.emptyTitle') }}</h2>
      <p class="mt-2 max-w-sm text-sm text-[var(--ui-text-muted)]">{{ keys.length ? t('ws.keys.noMatchDetail') : t('ws.keys.emptyDetail') }}</p>
      <AppButton v-if="keys.length" class="mt-5 rounded-full" color="neutral" variant="soft" size="sm" @click="keySearch = ''">{{ t('ws.keys.clearSearch') }}</AppButton>
    </div>
  </section>
</template>

<style scoped>
.workspace-keys { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-keys .key-card {
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.workspace-keys .key-card:is(:hover, :focus-within) {
  border-color: color-mix(in oklch, var(--ui-primary) 35%, var(--ui-border)) !important;
  box-shadow: 0 12px 28px -14px color-mix(in oklch, var(--ui-primary) 40%, transparent) !important;
}
@media (prefers-reduced-motion: reduce) {
  .workspace-keys .key-card { transition: none; }
}
.workspace-finance .finance-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
</style>
