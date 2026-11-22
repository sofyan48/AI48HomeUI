<template>
  <div class="flex flex-col gap-2 border-t border-[var(--ui-border)] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-xs tabular-nums text-[var(--ui-text-muted)]">{{ t('common.showing', { from: formatted(start), to: formatted(end), total: formatted(total) }) }}</p>
    <div class="flex items-center gap-2">
      <span class="text-xs text-[var(--ui-text-muted)]">{{ t('common.rowsPerPage') }}</span>
      <AdminSelect :model-value="pageSize" :items="sizeOptions" value-key="value" label-key="label" size="sm" :aria-label="t('common.rowsPerPage')" class="w-20" @update:model-value="emit('update:pageSize', Number($event))" />
      <span class="mx-1 h-4 w-px bg-[var(--ui-border)]" aria-hidden="true" />
      <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-chevron-left" :aria-label="t('common.previous')" :disabled="page <= 1 || loading" @click="emit('update:page', page - 1)" />
      <span class="min-w-16 text-center text-xs tabular-nums">{{ page }} / {{ pages }}</span>
      <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-chevron-right" :aria-label="t('common.next')" :disabled="page >= pages || loading" @click="emit('update:page', page + 1)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import { useAdminI18n } from '~/composables/useAdminI18n'

const props = withDefaults(defineProps<{ page: number; total: number; pageSize: number; pageSizes?: number[]; loading?: boolean }>(), {
  pageSizes: () => [20, 50, 100],
  loading: false
})
const emit = defineEmits<{ 'update:page': [value: number]; 'update:pageSize': [value: number] }>()
const { t, intlLocale } = useAdminI18n()

const sizeOptions = computed(() => [...new Set([...props.pageSizes, props.pageSize])].sort((a, b) => a - b).map(value => ({ label: String(value), value })))
const pages = computed(() => Math.max(1, Math.ceil((props.total || 0) / (props.pageSize || 1))))
const start = computed(() => props.total ? ((props.page - 1) * props.pageSize) + 1 : 0)
const end = computed(() => Math.min(props.page * props.pageSize, props.total || 0))
const formatted = (value: number) => new Intl.NumberFormat(intlLocale.value).format(value || 0)
</script>
