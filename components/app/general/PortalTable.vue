<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'

defineOptions({ inheritAttrs: false })
type Column = {
  accessorKey?: string
  id?: string
  header?: string
  meta?: { class?: { th?: string; td?: string } }
}
const props = withDefaults(defineProps<{
  data?: any[]
  columns?: Column[]
  loading?: boolean
  empty?: string
  numbered?: boolean
  numberOffset?: number
  scroll?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  class?: HTMLAttributes['class']
}>(), { data: () => [], columns: () => [], loading: false, numbered: true, numberOffset: 0, scroll: true, searchable: false })

// Shared table messages already live in the admin catalog, as in AppTable.
const { t: tableText } = useAdminI18n()
const query = ref('')
const numberKey = '__row_number'
const numberAliases = new Set(['number', 'no', 'index', 'rank', '#'])
const columnId = (column: Column) => column.id ?? column.accessorKey ?? ''
const showNumber = computed(() => props.numbered && !props.columns.some(column => {
  const key = String(column.accessorKey ?? column.id ?? '').toLowerCase()
  const header = column.header?.trim().toLowerCase()
  return key === numberKey || numberAliases.has(key) || header === 'no.' || header === '#'
}))
const tableColumns = computed(() => {
  const columns = [...props.columns]
  if (showNumber.value) {
    const selection = columns.findIndex(column => columnId(column) === 'select')
    columns.splice(selection < 0 ? 0 : selection + 1, 0, { id: numberKey, header: tableText('shared.table.number') })
  }
  return columns
})
function rowText(value: unknown, depth = 0): string {
  if (value == null || depth > 3) return ''
  if (typeof value !== 'object') return String(value)
  return Object.values(value).map(item => rowText(item, depth + 1)).join(' ')
}
const needle = computed(() => props.searchable ? query.value.trim().toLowerCase() : '')
// Keep the source index even after filtering, including duplicate row values.
const rows = computed(() => props.data.map((original, index) => ({
  original,
  index,
  getValue: (id: string): any => {
    const column = props.columns.find(item => columnId(item) === id)
    return (column?.accessorKey ?? id).split('.').reduce((value, key) => value?.[key], original)
  },
})).filter(row => !needle.value || rowText(row.original).toLowerCase().includes(needle.value)))
const colspan = computed(() => Math.max(1, tableColumns.value.length))
</script>

<template>
  <div class="portal-table-frame w-full min-w-0 max-w-full" :aria-busy="loading">
    <div v-if="searchable" class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
      <input :value="query" type="search" @input="query = ($event.target as HTMLInputElement).value" :placeholder="searchPlaceholder || tableText('shared.table.search')" :aria-label="searchPlaceholder || tableText('shared.table.search')" class="h-8 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72">
      <span class="text-xs tabular-nums text-muted-foreground" role="status" aria-live="polite">{{ needle ? tableText('shared.table.matchCount', { shown: rows.length, total: data.length }) : tableText('shared.table.rowCount', { count: data.length }) }}</span>
    </div>
    <Table
      v-bind="$attrs"
      :class="cn('portal-table', props.class)"
      :data-bounded="scroll"
    >
      <TableHeader>
        <TableRow>
          <TableHead v-for="column in tableColumns" :key="columnId(column)" scope="col" :class="cn(columnId(column) === numberKey && 'portal-table-number', column.meta?.class?.th)">
            <slot :name="`${columnId(column)}-header`" :column="column">{{ column.header }}</slot>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading && !rows.length">
          <TableCell :colspan="colspan" class="text-center">
            <div role="status" aria-live="polite" class="py-8 text-muted-foreground"><slot name="loading">{{ tableText('common.loading') }}</slot></div>
          </TableCell>
        </TableRow>
        <TableRow v-else-if="!rows.length">
          <TableCell :colspan="colspan" class="text-center">
            <div role="status" aria-live="polite" class="py-8 text-muted-foreground"><slot name="empty">{{ needle ? tableText('shared.table.noMatch', { query }) : empty || 'No data' }}</slot></div>
          </TableCell>
        </TableRow>
        <TableRow v-for="row in rows" :key="row.index">
          <TableCell v-for="column in tableColumns" :key="columnId(column)" :class="cn(columnId(column) === numberKey && 'portal-table-number', column.meta?.class?.td)">
            <slot :name="`${columnId(column)}-cell`" :row="row" :column="column" :get-value="() => row.getValue(columnId(column))">
              {{ columnId(column) === numberKey ? (Number(numberOffset) || 0) + row.index + 1 : row.getValue(columnId(column)) }}
            </slot>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <span v-if="loading && rows.length" role="status" aria-live="polite" class="sr-only">{{ tableText('common.loading') }}</span>
  </div>
</template>

<style scoped>
/* Table owns the only scroll viewport so sticky cells stay attached to it. */
.portal-table-frame :deep([data-slot='table-container']) {
  contain: inline-size;
  max-height: var(--app-table-max-height, min(70dvh, 46rem));
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.portal-table-frame :deep([data-slot='table-container'][data-bounded='false']) { max-height: none; }
.portal-table-frame :deep(table) { border-collapse: separate; border-spacing: 0; }
.portal-table-frame :deep(th) {
  position: sticky;
  top: 0;
  z-index: 2;
  height: auto;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
}
.portal-table-frame :deep(td) {
  padding: 0.75rem 1rem;
  color: var(--ui-text-highlighted);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  white-space: normal;
}
.portal-table-frame :deep(tbody tr:not(:first-child) td) { border-top: 1px solid var(--ui-border); }
.portal-table-frame :deep(.portal-table-number) { width: 1px; padding-inline-end: 0.25rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) {
  .portal-table-frame :deep(tr) { transition: none; }
}
</style>
