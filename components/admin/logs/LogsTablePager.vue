<template>
  <div class="flex flex-col gap-3 border-t border-[var(--ui-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('common.showing', { from: start, to: end, total: formatted(total) }) }}</p>
    <div class="flex items-center gap-2">
      <AppButton size="sm" color="neutral" variant="outline" :disabled="page <= 1 || loading || disabled" @click="emit('previous')">{{ t('common.previous') }}</AppButton>
      <span class="min-w-20 text-center text-sm">{{ t('common.pageOf', { page, total: pages }) }}</span>
      <AppButton size="sm" color="neutral" variant="outline" :disabled="page >= pages || loading || disabled" @click="emit('next')">{{ t('common.next') }}</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminI18n } from '~/composables/useAdminI18n'

const props = defineProps<{ page: number; total: number; pageSize: number; loading?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ previous: []; next: [] }>()
const { t, intlLocale } = useAdminI18n()

const pages = computed(() => Math.max(1, Math.ceil((props.total || 0) / (props.pageSize || 1))))
const start = computed(() => props.total === 0 ? 0 : ((props.page - 1) * props.pageSize) + 1)
const end = computed(() => Math.min(props.page * props.pageSize, props.total || 0))
const formatted = (value: unknown) => new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0)
</script>
