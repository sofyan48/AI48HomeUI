<template>
  <section :aria-label="label || t('shared.stats.summary')" :aria-busy="loading || undefined" class="grid grid-cols-1 items-stretch gap-3" :class="columnClass">
    <component
      :is="item.to ? NuxtLink : item.action ? 'button' : 'div'"
      v-for="item in items"
      :key="item.key || item.label"
      :to="item.to"
      :type="item.action && !item.to ? 'button' : undefined"
      :aria-label="item.action || item.to ? item.ariaLabel || `${item.label}: ${item.value}` : undefined"
      class="kpi"
      :class="[`kpi--${item.tone || 'violet'}`, { 'kpi--interactive': item.to || item.action, 'kpi--warning': item.warning }]"
      @click="item.action && !item.to ? emit('select', item.key || item.label) : undefined"
    >
      <span class="kpi__icon" aria-hidden="true"><AppIcon :name="item.icon || 'i-tabler-chart-dots'" class="size-4" /></span>

      <span class="min-w-0 flex-1">
        <span class="kpi__label">{{ item.label }}</span>
        <PortalSkeleton v-if="loading" class="mt-1 h-5 w-16 rounded" />
        <span v-else class="kpi__value" :class="isTextValue(item.value) ? 'kpi__value--text' : ''" :title="String(item.value)">{{ item.value }}</span>
        <span v-if="item.detail" class="kpi__detail" :title="item.detail">
          <span v-if="item.warning" class="kpi__pulse" aria-hidden="true" />{{ item.detail }}
        </span>
        <span v-if="item.ratio != null && !item.points?.length" class="kpi__bar" aria-hidden="true">
          <span class="kpi__track"><span class="kpi__fill" :style="{ width: `${ratioPercent(item.ratio)}%` }" /></span>
          <span class="kpi__ratio">{{ ratioPercent(item.ratio) }}%</span>
        </span>
      </span>

      <!-- Trend sits beside the value so it never adds height. -->
      <AdminUsageSparkline v-if="item.points?.length" :values="item.points" :label="t('shared.stats.trend', { label: item.label })" class="kpi__spark" />
      <AppIcon v-else-if="item.to || item.action" name="i-tabler-chevron-right" class="kpi__go size-4" aria-hidden="true" />
    </component>
  </section>
</template>

<script setup lang="ts">
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import AppIcon from '~/components/AppIcon.vue'
import AdminUsageSparkline from '~/components/admin/general/UsageSparkline.vue'
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
  label: '',
  loading: false,
  columns: 0
})
const emit = defineEmits<{ select: [key: string] }>()
const { t } = useAdminI18n()

const ratioPercent = (ratio: number) => Math.round(Math.max(0, Math.min(1, Number(ratio) || 0)) * 100)

// Words, URLs and long strings render smaller than plain figures.
function isTextValue(value: string | number) {
  const text = String(value ?? '')
  return text.length > 14 || !/\d/.test(text)
}

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
/* Compact KPI card: height follows its content (label, value, optional detail/bar). */
.kpi {
  --kpi-accent: var(--color-violet-500);
  --kpi-soft: color-mix(in oklch, var(--kpi-accent) 12%, transparent);
  position: relative;
  display: flex;
  min-width: 0;
  height: 100%;
  align-items: flex-start;
  gap: 0.75rem;
  overflow: hidden;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--admin-panel-border, var(--ui-border));
  border-radius: 0.875rem;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--kpi-accent) 5%, transparent), transparent 55%),
    var(--admin-panel-bg, var(--ui-bg));
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
:global(.dark) .kpi { box-shadow: none; }

.kpi--blue { --kpi-accent: var(--color-blue-500); }
.kpi--emerald { --kpi-accent: var(--color-emerald-500); }
.kpi--amber { --kpi-accent: var(--color-amber-500); }
.kpi--rose { --kpi-accent: var(--color-rose-500); }
.kpi--neutral { --kpi-accent: var(--color-zinc-400); }

.kpi__icon {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: var(--kpi-soft);
  color: var(--kpi-accent);
}

.kpi__label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  color: var(--ui-text-muted);
}
.kpi__value {
  display: block;
  margin-top: 0.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.1875rem;
  line-height: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-highlighted);
}
.kpi__value--text {
  font-size: 0.875rem;
  line-height: 1.5rem;
  font-weight: 600;
  letter-spacing: normal;
}
.kpi--warning .kpi__value { color: var(--color-amber-600); }
:global(.dark) .kpi--warning .kpi__value { color: var(--color-amber-400); }

.kpi__detail {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.6875rem;
  line-height: 1rem;
  color: var(--ui-text-muted);
}
.kpi__pulse {
  width: 0.375rem;
  height: 0.375rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: var(--color-amber-500);
}

.kpi__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.kpi__track {
  display: block;
  height: 0.25rem;
  flex: 1;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--kpi-accent) 12%, var(--ui-bg-muted));
}
.kpi__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--kpi-accent);
}
.kpi__ratio {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}

.kpi__spark {
  width: 4.5rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-self: center;
  color: var(--kpi-accent);
}
.kpi__go {
  flex-shrink: 0;
  align-self: center;
  color: var(--ui-text-dimmed);
  transition: transform 160ms ease, color 160ms ease;
}

.kpi--interactive { cursor: pointer; }
@media (hover: hover) {
  .kpi--interactive:hover {
    border-color: color-mix(in oklch, var(--kpi-accent) 35%, var(--admin-panel-border, var(--ui-border)));
    box-shadow: 0 8px 20px -14px color-mix(in oklch, var(--kpi-accent) 55%, transparent);
  }
  .kpi--interactive:hover .kpi__go { color: var(--kpi-accent); transform: translateX(2px); }
}
.kpi--interactive:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .kpi, .kpi__go { transition: none; }
  .kpi--interactive:hover .kpi__go { transform: none; }
}
</style>
