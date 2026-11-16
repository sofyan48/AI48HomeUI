<script setup lang="ts">
import AdminStatGrid from '~/components/admin/general/StatGrid.vue'
import { useUsagePage } from '~/composables/usage/useUsagePage'

const { t, overview: overviewState, presentation } = useUsagePage()
const { overview, loading } = overviewState
const { chartMetrics, tokenRibbon } = presentation
</script>

<template>
  <section class="meter" :aria-label="t('usage.summaryLabel')" :aria-busy="loading && !overview">
    <div class="meter__lead">
      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">{{ t('usage.tokensProcessed') }}</p>
      <p class="meter__total">{{ chartMetrics[0].value }}</p>
      <div v-if="tokenRibbon.length" class="meter__ribbon" role="img" :aria-label="tokenRibbon.map(part => `${part.label} ${part.percent}%`).join(', ')">
        <span v-for="part in tokenRibbon" :key="part.label" :style="{ flexGrow: part.value, background: part.color }" :title="`${part.label} · ${part.percent}%`" />
      </div>
      <div v-if="tokenRibbon.length" class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--ui-text-muted)]">
        <span v-for="part in tokenRibbon" :key="part.label" class="inline-flex items-center gap-1"><span class="size-2 rounded-sm" :style="{ background: part.color }" />{{ part.label }} {{ part.percent }}%</span>
      </div>
      <p v-else class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ chartMetrics[0].detail }}</p>
    </div>
    <AdminStatGrid class="meter__side" :label="t('usage.detailsLabel')" :items="chartMetrics.slice(1)" :columns="3" :loading="loading && !overview" />
  </section>
</template>

<style scoped>
/* Usage signature: token meter card with category ribbon, next to separate KPI cards. */
.meter { display: grid; gap: 0.75rem; }
@media (min-width: 64rem) { .meter { grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); align-items: stretch; } }
.meter__lead {
  padding: 1rem 1.125rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    radial-gradient(ellipse 90% 120% at 0% 0%, color-mix(in oklch, var(--page-accent) 14%, transparent), transparent 70%),
    var(--admin-panel-bg);
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
.meter__total { margin-top: 0.125rem; font-family: var(--admin-display-font); font-size: 1.75rem; line-height: 2.25rem; font-weight: 800; letter-spacing: -0.03em; color: var(--ui-text-highlighted); font-variant-numeric: tabular-nums; }
.meter__ribbon { display: flex; height: 0.5rem; gap: 2px; margin-top: 0.625rem; overflow: hidden; border-radius: 9999px; }
.meter__ribbon > span { flex-basis: 0; min-width: 3px; }
.meter__side { align-content: stretch; }
</style>
