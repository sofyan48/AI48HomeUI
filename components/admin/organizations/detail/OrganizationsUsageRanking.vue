<template>
  <ul v-if="items.length" class="grid gap-2">
    <li v-for="item in items" :key="String(item.id ?? item.label)" class="grid gap-1">
      <div class="flex items-center justify-between gap-2 text-sm">
        <span class="truncate">{{ item.label || '—' }}</span>
        <span class="shrink-0 font-medium tabular-nums">{{ formatAmount(item.amount) }}</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]">
        <div class="h-full rounded-full bg-primary" :style="{ width: `${share(item.amount)}%` }" />
      </div>
    </li>
  </ul>
  <p v-else class="text-sm text-[var(--ui-text-muted)]">{{ empty }}</p>
</template>

<script setup lang="ts">
import type { OrganizationUsageTopItem } from '~/composables/organizations/useOrganizationUsageSummary'

const props = defineProps<{
  items: OrganizationUsageTopItem[]
  total: number
  empty: string
  formatAmount: (value: number) => string
}>()

const share = (amount: number) => (props.total > 0 ? Math.min(100, Math.max(1, (amount / props.total) * 100)) : 0)
</script>
