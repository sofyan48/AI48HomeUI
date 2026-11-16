<script setup lang="ts">
import { computed, ref } from 'vue'
import { FlexRender } from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { useAdminTable, resolveTableValue } from '~/composables/admin-table/useAdminTable'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  data?: any[]
  columns?: any[]
  loading?: boolean
  empty?: string
}>(), { data: () => [], columns: () => [], loading: false, empty: '' })

const attrs = useAttrs()
const tableAttrs = attrs as Record<string, any>
const root = ref<HTMLElement | null>(null)
const { tableApi, domAttrs } = useAdminTable(() => props.data, () => props.columns, attrs)
const table = tableApi
const rows = computed(() => table.getRowModel().rows)
const virtualOptions = computed<Record<string, any>>(() => ({
  ...(attrs.virtualize && typeof attrs.virtualize === 'object' ? attrs.virtualize : {}),
}))
const virtualized = computed(() => attrs.virtualize !== undefined && attrs.virtualize !== false)
const rowVirtualizer = useVirtualizer(computed(() => ({
  count: rows.value.length,
  getScrollElement: () => root.value,
  estimateSize: () => Number(virtualOptions.value.estimateSize) || 44,
  overscan: Number(virtualOptions.value.overscan) || 5,
  getItemKey: (index: number) => rows.value[index]?.id ?? index,
})))
const virtualRows = computed(() => virtualized.value ? rowVirtualizer.value.getVirtualItems() : [])
const totalSize = computed(() => virtualized.value ? rowVirtualizer.value.getTotalSize() : 0)
// Table rows cannot be absolutely positioned; pad above and below the rendered window instead.
const paddingTop = computed(() => virtualRows.value[0]?.start ?? 0)
const paddingBottom = computed(() => {
  const last = virtualRows.value[virtualRows.value.length - 1]
  return last ? Math.max(0, totalSize.value - last.end) : 0
})
const visibleColumns = computed(() => table.getVisibleLeafColumns())
const colspan = computed(() => Math.max(1, visibleColumns.value.length))

function columnId(column: any) {
  return String(column?.id ?? column?.accessorKey ?? '')
}
function slotName(column: any, suffix: string) {
  return `${columnId(column)}-${suffix}`
}
function columnClass(column: any, side: 'th' | 'td') {
  return column.columnDef?.meta?.class?.[side] ?? column.columnDef?.meta?.class?.[side === 'th' ? 'header' : 'cell']
}
function columnStyle(column: any, side: 'th' | 'td') {
  return column.columnDef?.meta?.style?.[side] ?? column.columnDef?.meta?.style?.[side === 'th' ? 'header' : 'cell']
}
function rowProps(row: any) {
  return {
    'data-state': row.getIsSelected?.() ? 'selected' : undefined,
    onMouseenter: () => tableAttrs.onHover?.(row),
    onContextmenu: (event: MouseEvent) => tableAttrs.onContextmenu?.(event, row),
  }
}

</script>

<template>
  <div ref="root" class="admin-table-root w-full min-w-0" v-bind="domAttrs">
    <Table class="app-table" :class="attrs.class">
      <TableHeader>
        <TableRow v-for="group in table.getHeaderGroups()" :key="group.id">
          <TableHead
            v-for="header in group.headers"
            :key="header.id"
            scope="col"
            :colspan="header.colSpan"
            :rowspan="header.rowSpan"
            :class="columnClass(header.column, 'th')"
            :style="columnStyle(header.column, 'th')"
          >
            <slot v-if="!header.isPlaceholder && $slots[slotName(header.column.columnDef, 'header')]" :name="slotName(header.column.columnDef, 'header')" :column="header.column.columnDef" :header="header" :table="table" />
            <FlexRender v-else-if="!header.isPlaceholder" :header="header" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading && !rows.length">
          <TableCell :colspan="colspan" class="text-center">
            <div role="status" aria-live="polite" class="py-8 text-muted-foreground"><slot name="loading">{{ resolveTableValue(tableAttrs.loadingText, {}) || 'Loading…' }}</slot></div>
          </TableCell>
        </TableRow>
        <TableRow v-else-if="!rows.length">
          <TableCell :colspan="colspan" class="text-center">
            <div role="status" aria-live="polite" class="py-8 text-muted-foreground"><slot name="empty">{{ empty || 'No data' }}</slot></div>
          </TableCell>
        </TableRow>
        <template v-else-if="virtualized">
          <tr v-if="paddingTop > 0" aria-hidden="true"><td :colspan="colspan" :style="{ height: `${paddingTop}px`, padding: 0, border: 0 }" /></tr>
          <template v-for="item in virtualRows" :key="String(item.key)">
            <TableRow
              v-if="rows[item.index]"
              v-bind="rowProps(rows[item.index]!)"
              :data-index="item.index"
              :ref="(element: any) => element && rowVirtualizer.measureElement(element.$el || element)"
            >
              <TableCell
                v-for="cell in rows[item.index]!.getVisibleCells()"
                :key="cell.id"
                :class="columnClass(cell.column, 'td')"
                :style="columnStyle(cell.column, 'td')"
              >
                <slot v-if="$slots[slotName(cell.column.columnDef, 'cell')]" :name="slotName(cell.column.columnDef, 'cell')" :row="rows[item.index]" :column="cell.column.columnDef" :cell="cell" :get-value="cell.getValue" :table="table" />
                <FlexRender v-else :cell="cell" />
              </TableCell>
            </TableRow>
          </template>
          <tr v-if="paddingBottom > 0" aria-hidden="true"><td :colspan="colspan" :style="{ height: `${paddingBottom}px`, padding: 0, border: 0 }" /></tr>
        </template>
        <TableRow v-for="row in rows" v-else :key="row.id" v-bind="rowProps(row)">
          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" :class="columnClass(cell.column, 'td')" :style="columnStyle(cell.column, 'td')">
            <slot v-if="$slots[slotName(cell.column.columnDef, 'cell')]" :name="slotName(cell.column.columnDef, 'cell')" :row="row" :column="cell.column.columnDef" :cell="cell" :get-value="cell.getValue" :table="table" />
            <FlexRender v-else :cell="cell" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
