<template>
  <div class="app-table-frame w-full min-w-0">
    <div v-if="searchable" class="app-table-search">
      <Input
        v-model="query"
        type="search"
        :placeholder="searchPlaceholder || t('shared.table.search')"
        :aria-label="searchPlaceholder || t('shared.table.search')"
        class="w-full sm:w-72"
      />
      <span class="text-xs tabular-nums text-[var(--ui-text-muted)]" role="status" aria-live="polite">
        {{ query ? t('shared.table.matchCount', { shown: visibleData.length, total: sourceData.length }) : t('shared.table.rowCount', { count: sourceData.length }) }}
      </span>
    </div>

    <div class="app-table-scroller" :class="{ 'app-table-scroller--start': overflowStart, 'app-table-scroller--end': overflowEnd }">
    <div
      v-if="native"
      ref="nativeRoot"
      class="app-table app-table-viewport app-table-viewport--self w-full min-w-0"
      :class="{ 'app-table-viewport--free': !bounded }"
      v-bind="$attrs"
    >
      <slot />
    </div>
    <!-- Virtualized tables keep the table root as the scroll element; others scroll in the wrapper. -->
    <div
      v-else
      ref="viewport"
      class="app-table-viewport w-full min-w-0 max-w-full"
      :class="{ 'app-table-viewport--root': rootScrolls, 'app-table-viewport--free': !bounded }"
    >
      <AdminTable
        class="app-table"
        v-bind="$attrs"
        :columns="tableColumns"
        :data="visibleData"
        :loading="Boolean($attrs.loading)"
        :empty="query ? t('shared.table.noMatch', { query }) : undefined"
      >
        <template v-if="showNumber" #__row_number-cell="{ row }">
          <span class="app-table-number">{{ rowNumber(row) }}</span>
        </template>
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps || {}" />
        </template>
      </AdminTable>
    </div>
    <button v-if="overflowStart" type="button" class="app-table-shift app-table-shift--start" :aria-label="t('shared.table.previousColumns')" :title="t('shared.table.previousColumns')" @click="scrollColumns(-1)">
      <AppIcon name="i-tabler-chevron-left" class="size-3.5" aria-hidden="true" />
    </button>
    <button v-if="overflowEnd" type="button" class="app-table-shift app-table-shift--end" :aria-label="t('shared.table.moreColumns')" :title="t('shared.table.moreColumns')" @click="scrollColumns(1)">
      <span class="app-table-shift__label">{{ t('shared.table.moreColumns') }}</span>
      <AppIcon name="i-tabler-chevron-right" class="size-3.5" aria-hidden="true" />
    </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import Input from '~/components/ui/input/Input.vue'
import AdminTable from '~/components/admin/general/table/AdminTable.vue'
import { useTableOverflow } from '~/composables/admin-table/useTableOverflow'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  data?: any[]
  columns?: any[]
  native?: boolean
  // Row numbering is on by default so every table reads the same way.
  numbered?: boolean
  // Offset of the first row on the current server page (e.g. (page - 1) * pageSize).
  numberOffset?: number
  // Bounded height with a sticky header. 'auto' bounds only long or virtualized tables so short
  // tables follow the page scroll; true always bounds, false never does.
  scroll?: boolean | 'auto'
  // Client-side quick search over every row field; only for fully loaded data sets.
  searchable?: boolean
  searchPlaceholder?: string
}>(), { data: undefined, columns: undefined, native: false, numbered: true, numberOffset: 0, scroll: 'auto', searchable: false, searchPlaceholder: '' })

const { t } = useAdminI18n()

const attrs = useAttrs()
const nativeRoot = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const query = ref('')

const sourceData = computed<any[]>(() => Array.isArray(props.data) ? props.data : [])
const rootScrolls = computed(() => attrs.virtualize !== undefined && attrs.virtualize !== false)
// Above this many rows a bounded viewport keeps the header and pagination within reach.
const BOUNDED_ROW_THRESHOLD = 30
const bounded = computed(() => {
  if (props.scroll !== 'auto') return props.scroll
  // Native tables are paginated by their pages, and virtualization requires its own viewport.
  if (props.native) return false
  return rootScrolls.value || sourceData.value.length > BOUNDED_ROW_THRESHOLD
})
// Virtualized tables scroll inside the table root; every other table scrolls in its viewport.
const scrollElement = computed(() => props.native
  ? nativeRoot.value
  : rootScrolls.value ? viewport.value?.querySelector<HTMLElement>('.admin-table-root') : viewport.value)
const { overflowStart, overflowEnd, scrollColumns } = useTableOverflow(scrollElement)

function rowText(value: unknown, depth = 0): string {
  if (value == null || depth > 3) return ''
  if (typeof value !== 'object') return String(value)
  if (Array.isArray(value)) return value.map(item => rowText(item, depth + 1)).join(' ')
  return Object.values(value as Record<string, unknown>).map(item => rowText(item, depth + 1)).join(' ')
}
const visibleData = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!props.searchable || !needle) return sourceData.value
  return sourceData.value.filter(row => rowText(row).toLowerCase().includes(needle))
})

const NUMBER_COLUMN = '__row_number'
const NUMBER_ALIASES = new Set(['number', 'no', 'index', 'rank', '#'])
const sourceColumns = computed<any[]>(() => Array.isArray(props.columns) ? props.columns : [])
// Skip when a page already renders its own number/rank column.
const showNumber = computed(() => props.numbered && !sourceColumns.value.some((column) => {
  const key = String(column?.accessorKey ?? column?.id ?? '').toLowerCase()
  const header = typeof column?.header === 'string' ? column.header.trim().toLowerCase() : ''
  return key === NUMBER_COLUMN || NUMBER_ALIASES.has(key) || header === 'no.' || header === '#'
}))
// Columns marked meta.priority = 'secondary' are hidden on phones; their rows must offer a detail view.
function withPriority(column: any): any {
  const nested = Array.isArray(column?.columns) ? { columns: column.columns.map(withPriority) } : {}
  if (column?.meta?.priority !== 'secondary') return { ...column, ...nested }
  const classes = column.meta.class || {}
  const join = (value: unknown) => [value, 'app-table-col--secondary'].filter(Boolean).join(' ')
  return { ...column, ...nested, meta: { ...column.meta, class: { ...classes, th: join(classes.th ?? classes.header), td: join(classes.td ?? classes.cell) } } }
}
const prioritizedColumns = computed(() => sourceColumns.value.map(withPriority))
const tableColumns = computed(() => {
  if (!showNumber.value) return prioritizedColumns.value
  const column = { id: NUMBER_COLUMN, header: t('shared.table.number'), enableSorting: false, meta: { class: { th: 'app-table-number-head', td: 'app-table-number-cell' } } }
  // Keep selection checkboxes first, number right after.
  const selectIndex = prioritizedColumns.value.findIndex(item => String(item?.id ?? item?.accessorKey ?? '') === 'select')
  const next = [...prioritizedColumns.value]
  next.splice(selectIndex >= 0 ? selectIndex + 1 : 0, 0, column)
  return next
})
const sourceIndex = computed(() => new Map(sourceData.value.map((item, index) => [item, index])))
function rowNumber(row: any) {
  const index = sourceIndex.value.get(row?.original) ?? Number(row?.index ?? 0)
  return (Number(props.numberOffset) || 0) + index + 1
}

defineExpose({ nativeRoot })
</script>

<style scoped>
/* One table behaviour everywhere: bounded height, sticky header, only rows scroll. */
.app-table-viewport {
  --app-table-max-height: min(70dvh, 46rem);
  contain: inline-size;
  max-height: var(--app-table-max-height);
  overflow: auto;
  /* Horizontal containment avoids trackpad back-navigation; vertical scroll hands off to the page. */
  overscroll-behavior-x: contain;
  overscroll-behavior-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--ui-text-dimmed) 45%, transparent) transparent;
}
.app-table-viewport--free { max-height: none; }
/* Wrapper scrolls: neutralise UTable's own overflow so sticky headers attach to the wrapper. */
.app-table-viewport:not(.app-table-viewport--root, .app-table-viewport--self) > .app-table { overflow: visible !important; }
/* Virtualized tables: UTable root is the scroll element. */
.app-table-viewport--root { max-height: none; overflow: visible; }
.app-table-viewport--root > .app-table { max-height: var(--app-table-max-height); overflow: auto; overscroll-behavior-x: contain; overscroll-behavior-y: auto; }

/* Edge fades and a column-shift control signal columns outside the horizontal viewport. */
.app-table-scroller { position: relative; min-width: 0; }
.app-table-scroller::before,
.app-table-scroller::after {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  width: 1.5rem;
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
}
.app-table-scroller::before { left: 0; background: linear-gradient(90deg, color-mix(in oklch, var(--ui-text-highlighted) 10%, transparent), transparent); }
.app-table-scroller::after { right: 0; background: linear-gradient(270deg, color-mix(in oklch, var(--ui-text-highlighted) 10%, transparent), transparent); }
.app-table-scroller--start::before,
.app-table-scroller--end::after { opacity: 1; }
.app-table-shift {
  position: absolute;
  top: 0.3125rem;
  z-index: 4;
  display: inline-flex;
  height: 1.625rem;
  min-height: 0;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 9999px !important;
  background: var(--ui-bg);
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
  font-weight: 500;
  box-shadow: 0 2px 8px -2px color-mix(in oklch, var(--ui-text) 22%, transparent);
}
.app-table-shift--start { left: 0.375rem; padding: 0 0.3125rem; }
.app-table-shift--end { right: 0.375rem; }
.app-table-shift:hover { border-color: var(--admin-hover-border, var(--ui-border-accented)); color: var(--ui-text-highlighted); }
.app-table-shift:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
@media (pointer: coarse) {
  .app-table-shift { height: 2.25rem; min-width: 2.25rem; justify-content: center; }
}
@media (width < 40rem) {
  .app-table-shift__label { display: none; }
  .app-table-shift--end { padding: 0 0.3125rem; }
  .app-table:deep(.app-table-col--secondary) { display: none; }
}

.app-table-search {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--ui-border);
}

/* The shadcn container must not become a second scroller; the viewport (or virtual root) scrolls. */
.app-table-viewport :deep([data-slot='table-container']) { overflow: visible; }

/* Scoped selectors start from the viewport wrapper. */
.app-table-viewport :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.app-table:deep(th) {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1rem;
  text-align: left;
  white-space: nowrap;
}

.app-table:deep(td) {
  padding: 0.75rem 1rem;
  color: var(--ui-text);
  font-size: 0.8125rem;
  line-height: 1.25rem;
  vertical-align: middle;
}

/* Number column shrinks to its digits. */
.app-table:deep(.app-table-number-head),
.app-table:deep(.app-table-number-cell) {
  width: 1px;
  white-space: nowrap;
  padding-inline-end: 0.25rem;
}

.app-table:deep(tbody tr:not(:first-child) td) {
  border-top: 1px solid var(--ui-border);
}

.app-table:deep(tbody tr) {
  transition: background-color 120ms ease;
}

.app-table:deep(tbody tr:hover) {
  background: var(--ui-hover);
}

@media (prefers-reduced-motion: reduce) {
  .app-table:deep(tbody tr) { transition: none; }
  .app-table-scroller::before, .app-table-scroller::after { transition: none; }
}
</style>
