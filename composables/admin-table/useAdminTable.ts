import { computed } from 'vue'
import { useTable } from '@tanstack/vue-table'
import type { ColumnDef, TableOptions } from '@tanstack/vue-table'
import { adminTableFeatures, type AdminTableFeatures } from './features'

// These are the models previously forwarded to UTable, not DOM attributes.
export const tableStateKeys = [
  'globalFilter', 'columnFilters', 'columnOrder', 'columnVisibility', 'columnPinning',
  'columnSizing', 'rowSelection', 'sorting', 'expanded', 'pagination',
] as const
const optionGroups = [
  'globalFilterOptions', 'columnFiltersOptions', 'columnPinningOptions',
  'columnSizingOptions', 'visibilityOptions', 'sortingOptions',
  'expandedOptions', 'rowSelectionOptions', 'paginationOptions',
]
const optionKeys = [
  'meta', 'getRowId', 'getSubRows', 'initialState', 'defaultColumn',
  'renderFallbackValue', 'autoResetAll', 'debugAll', 'debugTable',
  'debugHeaders', 'debugColumns', 'debugRows', 'debugCells',
]
const camelize = (key: string) => key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
export function normalizeTableAttrs(attrs: Record<string, any>) {
  return Object.fromEntries(Object.entries(attrs).map(([key, value]) => [camelize(key), value]))
}
export function resolveTableValue(value: any, context: any) {
  return typeof value === 'function' ? value(context) : value
}
export function prepareTableColumns(columns: any[]): ColumnDef<AdminTableFeatures, any>[] {
  return columns.map(column => ({
    ...column,
    ...(column.columns && { columns: prepareTableColumns(column.columns) }),
    // v9 renamed sortingFn to sortFn; accept existing column definitions unchanged.
    ...(column.sortingFn !== undefined && { sortFn: column.sortFn ?? column.sortingFn }),
    cell: column.cell ?? (({ getValue }: any) => {
      const value = getValue()
      return value === '' || value == null ? '\u00a0' : String(value)
    }),
  }))
}

export function useAdminTable(
  data: () => any[], columns: () => any[], attrs: Record<string, any>,
) {
  const normalized = computed(() => normalizeTableAttrs(attrs))
  const prepared = computed(() => prepareTableColumns(columns()))
  const options = computed(() => {
    const values = normalized.value
    const result: Record<string, any> = {
      manualPagination: true,
      // TanStack v9 does not install a default when an explicit undefined option
      // is forwarded. Keep row identity stable for consumers that do not provide one.
      getRowId: values.getRowId ?? ((row: any, index: number, parent?: any) => parent ? `${parent.id}.${index}` : String(row?.id ?? index)),
      getSubRows: values.getSubRows ?? (() => undefined),
    }
    for (const key of optionKeys) if (values[key] !== undefined && key !== 'getRowId' && key !== 'getSubRows') result[key] = values[key]
    for (const group of optionGroups) Object.assign(result, values[group])
    const state: Record<string, any> = { ...values.state }
    for (const key of tableStateKeys) {
      const callback = `on${key[0]!.toUpperCase()}${key.slice(1)}Change`
      if (values[key] !== undefined) state[key] = values[key]
      if (state[key] !== undefined) {
        result[callback] = (updater: any) => {
          const next = typeof updater === 'function' ? updater(state[key]) : updater
          ;(values as Record<string, any>)[`onUpdate:${key}`]?.(next)
          values[callback]?.(updater)
          values.onStateChange?.((previous: any) => ({ ...previous, [key]: next }))
          // Options callbacks retain their original updater contract.
          for (const group of optionGroups) values[group]?.[callback]?.(updater)
        }
      }
    }
    return { ...result, state }
  })
  const tableApi = useTable<AdminTableFeatures, any>({
    features: adminTableFeatures,
    get data() { return data() },
    get columns() { return prepared.value },
    // useTable watches getters and synchronizes controlled state into its atoms.
    ...Object.fromEntries([...optionKeys, ...optionGroups.flatMap(group => []),
      'manualPagination', 'manualSorting', 'manualFiltering', 'enableRowSelection',
      'enableMultiRowSelection', 'enableSubRowSelection', 'enableSorting',
      'enableMultiSort', 'enableSortingRemoval', 'sortDescFirst', 'maxMultiSortColCount',
      'getRowCanExpand', 'autoResetExpanded', 'pageCount', 'rowCount', 'state',
      ...tableStateKeys.map(key => `on${key[0]!.toUpperCase()}${key.slice(1)}Change`),
    ].map(key => [key, computed(() => (options.value as Record<string, any>)[key])])), 
  } as TableOptions<AdminTableFeatures, any>)
  const domAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => {
    const name = camelize(key)
    return !tableStateKeys.includes(name as any) && !optionKeys.includes(name)
      && !optionGroups.includes(name) && !name.startsWith('onUpdate:')
      && !['state', 'onStateChange', 'ui', 'virtualize', 'loading', 'empty', 'caption',
        'sticky', 'loadingColor', 'loadingAnimation', 'watchOptions', 'onSelect',
        'onHover', 'onContextmenu'].includes(name)
  })))
  return { tableApi, normalized, domAttrs }
}
