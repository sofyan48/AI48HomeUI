<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  points: Array<{ date: string, amount: number, requests: number }>
  loading: boolean
  loadingText: string
  emptyText: string
  formatAmount: (value: number) => string
  formatCount: (value: number) => string
}>()
const maximum = computed(() => Math.max(0, ...props.points.map(point => point.amount)))
const barHeight = (value: number) => maximum.value > 0 ? Math.max(2, (value / maximum.value) * 100) : 2
</script>

<template>
  <div class="rounded-lg border border-[var(--ui-border)] p-3" :aria-busy="loading || undefined">
    <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ title }}</p>
    <div v-if="points.length" class="flex h-32 items-end gap-1" role="list" :aria-label="title">
      <div
        v-for="point in points" :key="point.date" role="listitem"
        class="min-w-0 flex-1 rounded-t bg-primary/70 hover:bg-primary"
        :style="{ height: `${barHeight(point.amount)}%` }"
        :title="`${point.date} · ${formatAmount(point.amount)} · ${formatCount(point.requests)} req`"
        :aria-label="`${point.date}: ${formatAmount(point.amount)}`"
      />
    </div>
    <p v-else class="py-10 text-center text-sm text-[var(--ui-text-muted)]">{{ loading ? loadingText : emptyText }}</p>
    <div v-if="points.length" class="mt-1 flex justify-between text-[10px] text-[var(--ui-text-muted)]">
      <span>{{ points[0]?.date }}</span><span>{{ points[points.length - 1]?.date }}</span>
    </div>
  </div>
</template>
