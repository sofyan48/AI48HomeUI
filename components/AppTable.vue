<template>
  <div class="app-table-frame w-full min-w-0">
    <div v-if="searchable" class="app-table-search">
      <UInput
        v-model="query"
        icon="i-tabler-search"
        size="sm"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
        class="w-full sm:w-72"
      />
      <span class="text-xs tabular-nums text-[var(--ui-text-muted)]" role="status" aria-live="polite">
        {{ query ? `${visibleData.length} of ${sourceData.length}` : `${sourceData.length} rows` }}
      </span>
    </div>

    <div
      v-if="native"
      ref="nativeRoot"
      class="app-table app-table-viewport app-table-viewport--self w-full min-w-0"
      :class="{ 'app-table-viewport--free': !scroll }"
      v-bind="$attrs"
    >
      <slot />
    </div>
    <!-- Virtualized tables keep UTable's root as the scroll element; others scroll in the wrapper. -->
    <div
      v-else
      class="app-table-viewport w-full min-w-0 max-w-full"
      :class="{ 'app-table-viewport--root': rootScrolls, 'app-table-viewport--free': !scroll }"
    >
      <UTable class="app-table" v-bind="$attrs" :columns="tableColumns" :data="visibleData">
        <template v-if="showNumber" #__row_number-cell="{ row }">
          <span class="app-table-number">{{ rowNumber(row) }}</span>
        </template>
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps || {}" />
        </template>
        <template v-if="query && !$slots.empty" #empty>
          <div class="py-8 text-center text-sm text-[var(--ui-text-muted)]">No rows match “{{ query }}”.</div>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  data?: any[]
  columns?: any[]
  native?: boolean
  // Row numbering is on by default so every table reads the same way.
  numbered?: boolean
  // Offset of the first row on the current server page (e.g. (page - 1) * pageSize).
  numberOffset?: number
  // Bounded height with a sticky header; disable for tables that must grow with the page.
  scroll?: boolean
  // Client-side quick search over every row field; only for fully loaded data sets.
  searchable?: boolean
  searchPlaceholder?: string
}>(), { data: undefined, columns: undefined, native: false, numbered: true, numberOffset: 0, scroll: true, searchable: false, searchPlaceholder: 'Search rows…' })

const attrs = useAttrs()
const nativeRoot = ref<HTMLElement | null>(null)
const query = ref('')

const sourceData = computed<any[]>(() => Array.isArray(props.data) ? props.data : [])
const rootScrolls = computed(() => attrs.virtualize !== undefined && attrs.virtualize !== false)

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
const tableColumns = computed(() => {
  if (!showNumber.value) return sourceColumns.value
  const column = { id: NUMBER_COLUMN, header: 'No.', enableSorting: false, meta: { class: { th: 'app-table-number-head', td: 'app-table-number-cell' } } }
  // Keep selection checkboxes first, number right after.
  const selectIndex = sourceColumns.value.findIndex(item => String(item?.id ?? item?.accessorKey ?? '') === 'select')
  const next = [...sourceColumns.value]
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
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--ui-text-dimmed) 45%, transparent) transparent;
}
.app-table-viewport--free { max-height: none; }
/* Wrapper scrolls: neutralise UTable's own overflow so sticky headers attach to the wrapper. */
.app-table-viewport:not(.app-table-viewport--root, .app-table-viewport--self) > .app-table { overflow: visible !important; }
/* Virtualized tables: UTable root is the scroll element. */
.app-table-viewport--root { max-height: none; overflow: visible; }
.app-table-viewport--root > .app-table { max-height: var(--app-table-max-height); overflow: auto; overscroll-behavior: contain; }

.app-table-search {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--ui-border);
}

/* UTable renders a fragment root, so scoped selectors must start from the viewport wrapper. */
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
}
</style>
