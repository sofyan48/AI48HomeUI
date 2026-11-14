<template>
  <section :aria-label="label" :aria-busy="loading || undefined" class="grid grid-cols-1 gap-3" :class="columnClass">
    <component
      :is="item.to ? NuxtLink : item.action ? 'button' : 'div'"
      v-for="item in items"
      :key="item.key || item.label"
      :to="item.to"
      :type="item.action && !item.to ? 'button' : undefined"
      :aria-label="item.action || item.to ? item.ariaLabel || `${item.label}: ${item.value}` : undefined"
      class="admin-stat"
      :class="[`admin-stat--${item.tone || 'violet'}`, { 'admin-stat--interactive': item.to || item.action, 'admin-stat--warning': item.warning }]"
      @click="item.action && !item.to ? emit('select', item.key || item.label) : undefined"
    >
      <span class="admin-stat__icon" aria-hidden="true"><UIcon :name="item.icon || 'i-tabler-chart-dots'" class="size-4" /></span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center justify-between gap-2">
          <span class="truncate text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</span>
          <UIcon v-if="item.to || item.action" name="i-tabler-arrow-up-right" class="admin-stat__arrow size-3.5 shrink-0" aria-hidden="true" />
        </span>
        <span class="admin-stat__value block truncate" :title="String(item.value)">{{ loading ? '—' : item.value }}</span>
        <span v-if="item.detail" class="block truncate text-[11px] text-[var(--ui-text-muted)]" :title="item.detail">{{ item.detail }}</span>
        <span v-if="item.ratio != null" class="mt-2 block h-1 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]" aria-hidden="true">
          <span class="admin-stat__bar block h-full rounded-full" :style="{ width: `${Math.max(0, Math.min(100, item.ratio * 100))}%` }" />
        </span>
      </span>
      <AdminUsageSparkline v-if="item.points?.length" :values="item.points" :label="`${item.label} trend`" class="admin-stat__spark" />
    </component>
  </section>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'

export interface AdminStatItem {
  key?: string
  label: string
  value: string | number
  detail?: string
  icon?: string
  tone?: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'neutral'
  to?: string
  action?: boolean
  ariaLabel?: string
  warning?: boolean
  ratio?: number | null
  points?: number[]
}

const props = withDefaults(defineProps<{
  items: AdminStatItem[]
  label?: string
  loading?: boolean
  columns?: number
}>(), {
  label: 'Summary',
  loading: false,
  columns: 0
})
const emit = defineEmits<{ select: [key: string] }>()

// Static class names so Tailwind can detect them.
const columnClass = computed(() => {
  const count = props.columns || props.items.length
  if (count <= 2) return 'sm:grid-cols-2'
  if (count === 3) return 'sm:grid-cols-3'
  if (count === 4) return 'sm:grid-cols-2 xl:grid-cols-4'
  if (count === 5) return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
  if (count === 6) return 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'
  return 'sm:grid-cols-2 lg:grid-cols-4'
})
</script>

<style scoped>
.admin-stat {
  --stat-accent: var(--color-violet-500);
  position: relative;
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
  overflow: hidden;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--admin-panel-border, var(--ui-border));
  border-radius: var(--admin-panel-radius, 0.875rem);
  background: var(--admin-panel-bg, var(--ui-bg));
  box-shadow: var(--admin-panel-shadow, none);
  text-align: left;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.admin-stat--blue { --stat-accent: var(--color-blue-500); }
.admin-stat--emerald { --stat-accent: var(--color-emerald-500); }
.admin-stat--amber { --stat-accent: var(--color-amber-500); }
.admin-stat--rose { --stat-accent: var(--color-rose-500); }
.admin-stat--neutral { --stat-accent: var(--color-zinc-500); }

.admin-stat__icon {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5625rem;
  background: color-mix(in oklch, var(--stat-accent) 13%, transparent);
  color: var(--stat-accent);
}
.admin-stat__value {
  margin-top: 0.125rem;
  font-size: 1.125rem;
  line-height: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-highlighted);
}
.admin-stat--warning .admin-stat__value { color: var(--color-amber-600); }
:global(.dark) .admin-stat--warning .admin-stat__value { color: var(--color-amber-400); }
.admin-stat__bar { background: var(--stat-accent); }
.admin-stat__arrow { color: var(--ui-text-dimmed); opacity: 0; transition: opacity 120ms ease; }
.admin-stat__spark {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 45%;
  height: 2rem;
  color: var(--stat-accent);
  opacity: 0.7;
  pointer-events: none;
}

.admin-stat--interactive { cursor: pointer; }
.admin-stat--interactive:hover {
  border-color: color-mix(in oklch, var(--stat-accent) 40%, var(--ui-border));
  box-shadow: 0 10px 24px -16px color-mix(in oklch, var(--stat-accent) 55%, transparent);
}
.admin-stat--interactive:is(:hover, :focus-visible) .admin-stat__arrow { opacity: 1; }
.admin-stat--interactive:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .admin-stat, .admin-stat__arrow { transition: none; } }
</style>
