import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AccessKeysState } from './useAccessKeys'
import type { AccessKeyResource } from './normalize'

export function useAccessKeyTable(state: AccessKeysState, actions: {
  openDetail: (resource: AccessKeyResource) => void
  openEdit: (resource: AccessKeyResource) => void
  openDelete: (resource: AccessKeyResource) => void
}) {
  const { t, filteredResources, selectedIDs, copyText } = state
  const wideTable = ref(false)
  const actionColumn = computed(() => ({ id: 'actions', header: t('common.actions'),
    meta: { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } } }))
  const compactColumns = computed(() => [
    { accessorKey: 'select', header: '' },
    { accessorKey: 'identity', header: t('keys.colIdentity') },
    { accessorKey: 'status', header: t('common.status') },
    actionColumn.value,
  ])
  const fullColumns = computed(() => [
    { accessorKey: 'select', header: '' },
    { accessorKey: 'number', header: t('keys.colNumber'), meta: { class: { th: 'app-table-number-head', td: 'app-table-number-cell' } } },
    { accessorKey: 'identity', header: t('keys.colIdentity') },
    { accessorKey: 'owner', header: t('keys.owner') },
    { accessorKey: 'credential-scope', header: t('keys.credentialScope') },
    { accessorKey: 'model-scope', header: t('keys.modelScope') },
    { accessorKey: 'length', header: t('keys.length') },
    { accessorKey: 'status', header: t('common.status') },
    actionColumn.value,
  ])
  const columns = computed(() => wideTable.value ? fullColumns.value : compactColumns.value)
  const selectedFilteredResources = computed(() => filteredResources.value.filter(resource => selectedIDs.value.has(resource.id)))
  const allFilteredSelected = computed(() => filteredResources.value.length > 0 && selectedFilteredResources.value.length === filteredResources.value.length)
  const someFilteredSelected = computed(() => selectedFilteredResources.value.length > 0 && !allFilteredSelected.value)
  let mediaQuery: MediaQueryList | undefined
  const mediaQueryListener = (event: MediaQueryListEvent) => { wideTable.value = event.matches }
  onMounted(() => {
    mediaQuery = window.matchMedia('(min-width: 640px)')
    wideTable.value = mediaQuery.matches
    mediaQuery.addEventListener?.('change', mediaQueryListener)
  })
  onBeforeUnmount(() => { mediaQuery?.removeEventListener?.('change', mediaQueryListener) })
  function rowActions(resource: AccessKeyResource) {
    return [
      { id: 'view', label: t('common.view'), ariaLabel: t('keys.viewAria'), icon: 'i-tabler-eye', onSelect: () => actions.openDetail(resource) },
      { id: 'edit', label: t('common.edit'), ariaLabel: t('keys.editAria'), icon: 'i-tabler-pencil', onSelect: () => actions.openEdit(resource) },
      resource.identifier && { id: 'copy', label: t('keys.copyIdentifier'), icon: 'i-tabler-copy', onSelect: () => copyText(resource.identifier!, t('keys.identifierCopiedShort')) },
      { id: 'delete', label: t('common.delete'), ariaLabel: t('keys.deleteAria'), icon: 'i-tabler-trash', destructive: true, onSelect: () => actions.openDelete(resource) },
    ]
  }
  const rowValue = (row: { original: AccessKeyResource } | AccessKeyResource): AccessKeyResource => 'original' in row ? row.original : row
  return { columns, allFilteredSelected, someFilteredSelected, rowActions, rowValue }
}
