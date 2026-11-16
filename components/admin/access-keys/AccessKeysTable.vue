<template>
  <AdminTablePanel :title="t('keys.title')" :description="t('keys.countOf', { shown: filteredResources.length, total: resources.length })">
    <template #actions>
      <AdminInput v-model="search" icon="i-tabler-search" :placeholder="t('keys.searchPlaceholder')" :aria-label="t('keys.searchAria')" class="w-full sm:w-72" />
      <AccessKeyReplaceList @replaced="emit('replaced')" />
      <AppButton icon="i-tabler-plus" @click="emit('create')">{{ t('keys.new') }}</AppButton>
    </template>
    <template v-if="selectedIDs.size" #bulk>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span class="text-sm font-medium">{{ t('keys.selectedCount', { count: selectedIDs.size }) }}</span>
        <div class="flex flex-wrap gap-2">
          <AppButton color="neutral" variant="ghost" size="sm" :disabled="bulkDeleting" @click="clearSelection">{{ t('keys.clearSelection') }}</AppButton>
          <AppButton color="error" variant="ghost" size="sm" icon="i-tabler-trash" :disabled="bulkDeleting" @click="emit('bulk-delete')">{{ t('keys.deleteSelected') }}</AppButton>
        </div>
      </div>
    </template>
    <AppTable :columns="columns" :data="filteredResources" :loading="loading" class="access-keys-table min-w-[980px]">
      <template #select-header>
        <AdminCheckbox :model-value="allFilteredSelected" :indeterminate="someFilteredSelected" :disabled="loading || bulkDeleting || !filteredResources.length" :aria-label="t('keys.selectAllAria')" @update:model-value="toggleAllFiltered(Boolean($event))" />
      </template>
      <template #select-cell="{ row }">
        <AdminCheckbox :model-value="selectedIDs.has(rowValue(row).id)" :disabled="bulkDeleting" :aria-label="t('keys.selectOneAria', { name: resourceSummary(rowValue(row)) })" @update:model-value="toggleSelected(rowValue(row), Boolean($event))" />
      </template>
      <template #number-cell="{ row }">
        <span class="app-table-number">{{ rowValue(row).index + 1 }}</span>
      </template>
      <template #identity-header>
        <div class="flex items-center gap-1.5">
          <span>{{ t('keys.colIdentity') }}</span>
          <Tooltip>
            <TooltipTrigger as-child>
              <AppIcon name="i-tabler-info-circle" class="size-4 text-[var(--ui-text-muted)]" />
            </TooltipTrigger>
            <TooltipContent>{{ t('keys.identityTooltip') }}</TooltipContent>
          </Tooltip>
        </div>
      </template>
      <template #identity-cell="{ row }">
        <div class="min-w-0">
          <p v-if="rowValue(row).displayName" class="truncate text-sm font-medium">{{ rowValue(row).displayName }}</p>
          <div v-if="rowValue(row).identifier" class="flex min-w-0 items-center gap-1.5">
            <p class="min-w-0 truncate font-mono text-xs font-medium">{{ rowValue(row).identifier }}</p>
            <AppButton color="neutral" variant="ghost" size="xs" icon="i-tabler-clipboard"
              :aria-label="t('keys.copyIdentifierAria', { id: rowValue(row).identifier })"
              :title="t('keys.copyIdentifierAria', { id: rowValue(row).identifier })"
              @click.stop="copyText(rowValue(row).identifier!, t('keys.identifierCopied'))" />
          </div>
          <p v-else class="truncate text-xs text-[var(--ui-text-muted)]">{{ t('keys.noIdentifier') }}</p>
          <div class="mt-1 flex min-w-0 items-center gap-1.5">
            <p class="min-w-0 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).maskedValue }}</p>
            <AppButton color="neutral" variant="ghost" size="xs" icon="i-tabler-clipboard"
              :aria-label="t('keys.copyKeyAria', { key: rowValue(row).maskedValue })"
              @click="copyText(rowValue(row).value, t('keys.keyCopied'))" />
          </div>
        </div>
      </template>
      <template #owner-cell="{ row }">
        <span :class="{ 'text-[var(--ui-text-muted)]': rowValue(row).userId == null || rowValue(row).userId === 0 }">{{ ownerName(rowValue(row)) }}</span>
      </template>
      <template #credential-scope-cell="{ row }">
        <span class="block max-w-[220px] truncate">{{ credentialScope(rowValue(row)) }}</span>
      </template>
      <template #model-scope-cell="{ row }">
        <span class="block max-w-[220px] truncate">{{ modelScope(rowValue(row)) }}</span>
      </template>
      <template #length-cell="{ row }">{{ rowValue(row).length }}</template>
      <template #status-cell>
        <PortalBadge color="success" variant="subtle"><AppIcon name="i-tabler-circle-check" class="mr-1 size-3" />{{ t('keys.accepted') }}</PortalBadge>
      </template>
      <template #actions-cell="{ row }">
        <AdminRowActions :actions="rowActions(rowValue(row))" :menu-label="t('keys.menuLabel', { name: resourceSummary(rowValue(row)) })" />
      </template>
      <template #empty>
        <div class="px-6 py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('keys.emptyFiltered') }}</div>
      </template>
    </AppTable>
  </AdminTablePanel>
</template>

<script setup lang="ts">
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AppIcon from '~/components/AppIcon.vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import AdminTablePanel from '~/components/admin/general/TablePanel.vue'
import AdminRowActions from '~/components/admin/general/RowActions.vue'
import AccessKeyReplaceList from './ReplaceList.vue'
import { useAccessKeys } from '~/composables/access-keys/useAccessKeys'
import type { AccessKeyResource } from '~/composables/access-keys/normalize'
import type { useAccessKeyTable } from '~/composables/access-keys/useAccessKeyTable'

const props = defineProps<{ table: ReturnType<typeof useAccessKeyTable> }>()
const emit = defineEmits<{ create: []; detail: [resource: AccessKeyResource]; edit: [resource: AccessKeyResource]; delete: [resource: AccessKeyResource]; 'bulk-delete': []; replaced: [] }>()
const { t, search, resources, filteredResources, selectedIDs, bulkDeleting, loading,
  clearSelection, toggleAllFiltered, toggleSelected, resourceSummary, copyText, ownerName, credentialScope, modelScope } = useAccessKeys()
// Table state is owned by the page so media-query lifecycle does not depend on load/error rendering.
const { columns, allFilteredSelected, someFilteredSelected, rowActions, rowValue } = props.table
</script>

<style scoped>
.access-keys-table :deep(th:first-child),
.access-keys-table :deep(td:first-child) {
  width: 2.75rem;
  min-width: 2.75rem;
}
.access-keys-table :deep(th:nth-child(2)),
.access-keys-table :deep(td:nth-child(2)) {
  min-width: 12rem;
}
.access-keys-table :deep(th:nth-last-child(2)),
.access-keys-table :deep(td:nth-last-child(2)) {
  white-space: nowrap;
}
</style>
