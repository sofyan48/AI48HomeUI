import {
  columnFilteringFeature, columnOrderingFeature, columnPinningFeature,
  columnSizingFeature, columnVisibilityFeature, globalFilteringFeature,
  rowExpandingFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  createExpandedRowModel, createFilteredRowModel, createPaginatedRowModel,
  createSortedRowModel, filterFns, sortFns, tableFeatures,
} from '@tanstack/vue-table'

export const adminTableFeatures = tableFeatures({
  columnFilteringFeature, columnOrderingFeature, columnPinningFeature,
  columnSizingFeature, columnVisibilityFeature, globalFilteringFeature,
  rowExpandingFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns, sortFns,
})

export type AdminTableFeatures = typeof adminTableFeatures
export type { ColumnDef, Row, SortingState, RowSelectionState } from '@tanstack/vue-table'
