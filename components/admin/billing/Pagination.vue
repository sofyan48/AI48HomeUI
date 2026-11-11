<template>
  <div class="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ start }}–{{ end }} of {{ formatted(total) }}</p>
    <div class="flex items-center gap-2">
      <span class="text-xs text-[var(--ui-text-muted)]">Rows</span>
      <USelect :model-value="pageSize" :items="pageSizeOptions" value-key="value" label-key="label" size="sm" aria-label="Rows per page" class="w-20" @update:model-value="emit('update:pageSize', Number($event))" />
      <span class="mx-1 h-4 w-px bg-[var(--ui-border)]" aria-hidden="true" />
      <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-chevron-left" aria-label="Previous page" :disabled="page <= 1 || loading" @click="emit('previous')" />
      <span class="min-w-16 text-center text-xs tabular-nums">{{ page }} / {{ pages }}</span>
      <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-chevron-right" aria-label="Next page" :disabled="page >= pages || loading" @click="emit('next')" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ page: number; total: number; pageSize: number; loading?: boolean }>()
const emit = defineEmits<{ previous: []; next: []; 'update:pageSize': [value: number] }>()
const pageSizeOptions = [50, 100, 200].map(value => ({ label: String(value), value }))
const pages = computed(() => Math.max(1, Math.ceil((props.total || 0) / props.pageSize)))
const start = computed(() => props.total ? ((props.page - 1) * props.pageSize) + 1 : 0)
const end = computed(() => Math.min(props.page * props.pageSize, props.total || 0))
const formatted = (value: number) => new Intl.NumberFormat().format(value || 0)
</script>
