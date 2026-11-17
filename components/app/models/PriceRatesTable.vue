<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { rungPriceComponents, type CatalogModel } from '~/composables/userModelCatalog'
import { useModelFormat } from '~/composables/models/useModelFormat'

const props = defineProps<{ models: CatalogModel[] }>()
const emit = defineEmits<{ details: [model: CatalogModel] }>()
const { t, intlLocale } = usePortalI18n()
const { price, componentLabel, unitLabel, pricingText } = useModelFormat()
const sort = ref('')
const descending = ref(false)
const rows = computed(() => props.models.flatMap(model => {
  const rates = model.pricing?.status === 'published' ? (model.pricing.providers || []).flatMap(offer =>
    offer.tiers.flatMap(tier => tier.rungs.map((rung, index) => ({
      model, provider: offer.provider, tier: tier.service_tier, isDefault: tier.is_default,
      threshold: rung.min_input_tokens, formula: rung.pricing_expr,
      key: JSON.stringify([model.id, offer.provider, tier.service_tier, index]),
      components: rungPriceComponents(rung)
    })))) : []
  return rates.length ? rates : [{ model, provider: '', tier: '', isDefault: false, threshold: 0, formula: '', key: model.id, components: [] }]
}))
const columns = computed(() => {
  const columns = new Map<string, string>()
  for (const row of rows.value) for (const component of row.components) columns.set(component.label, component.unit)
  return [...columns].map(([label, unit]) => ({ label, unit }))
})
function value(row: typeof rows.value[number], label: string) {
  const result = row.components.find(component => component.label === label)?.value
  return typeof result === 'number' && Number.isFinite(result) && result >= 0 ? result : null
}
const sortedRows = computed(() => [...rows.value].sort((a, b) => {
  if (!sort.value) return 0
  const left = value(a, sort.value)
  const right = value(b, sort.value)
  if (left === null) return right === null ? 0 : 1
  if (right === null) return -1
  return descending.value ? right - left : left - right
}))
function toggleSort(label: string) {
  descending.value = sort.value === label ? !descending.value : false
  sort.value = label
}
const tableColumns = computed(() => [
  { id: 'model', header: t('models.fact.modelId') },
  { id: 'tier', header: t('models.pricing.serviceTier') },
  { id: 'context', header: t('models.contextTokens') },
  ...columns.value.map((column, index) => ({ id: `rate-${index}`, header: componentLabel(column.label), meta: { class: { th: 'text-right', td: 'text-right tabular-nums whitespace-nowrap' } } })),
  { id: 'formula', header: t('models.pricing.formulaAria') },
  { id: 'actions', header: t('models.details'), meta: { class: { th: 'text-right', td: 'text-right' } } }
])
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <PortalTable :data="sortedRows" :columns="tableColumns" :aria-label="t('shell.nav.price')">
      <template #model-cell="{ row }">
        <div class="flex min-w-48 flex-col gap-1">
          <span class="font-medium">{{ row.original.model.display_name || row.original.model.id }}</span>
          <code class="text-xs text-muted-foreground">{{ row.original.model.id }}</code>
          <p v-if="!row.original.components.length" class="max-w-64 text-xs text-muted-foreground">{{ pricingText(row.original.model) }}</p>
        </div>
      </template>
      <template #tier-cell="{ row }">
        <div class="flex items-center gap-2 whitespace-nowrap">
          <code>{{ row.original.tier || '—' }}</code>
          <PortalBadge v-if="row.original.isDefault" color="neutral" variant="subtle" size="sm">{{ t('models.pricing.default') }}</PortalBadge>
        </div>
      </template>
      <template #context-cell="{ row }">
        <span class="whitespace-nowrap text-xs">{{ row.original.components.length ? row.original.threshold > 0 ? t('models.pricing.fromInputTokens', { count: row.original.threshold.toLocaleString(intlLocale) }) : t('models.pricing.baseRung') : '—' }}</span>
      </template>
      <template v-for="(column, index) in columns" :key="column.label" #[`rate-${index}-header`]>
        <button type="button" class="inline-flex items-center justify-end gap-1.5 rounded-sm text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" :aria-label="`${componentLabel(column.label)} ${sort === column.label ? descending ? '↓' : '↑' : '↕'}`" @click="toggleSort(column.label)">
          {{ componentLabel(column.label) }}
          <AppIcon :name="sort === column.label ? descending ? 'i-tabler-arrow-down' : 'i-tabler-arrow-up' : 'i-tabler-arrows-sort'" class="size-3.5" aria-hidden="true" />
          <span v-if="sort === column.label" class="sr-only">{{ descending ? '↓' : '↑' }}</span>
        </button>
        <span class="mt-0.5 block whitespace-nowrap text-[10px] font-normal">{{ t('balance.creditsUnit') }} {{ unitLabel(column.unit) }}</span>
      </template>
      <template v-for="(column, index) in columns" :key="column.label" #[`rate-${index}-cell`]="{ row }">
        {{ price(value(row.original, column.label)) }}
      </template>
      <template #formula-cell="{ row }">
        <div v-if="row.original.formula" class="flex w-64 flex-col gap-1">
          <span class="text-xs text-muted-foreground">{{ t('models.pricing.formulaNote') }}</span>
          <div role="region" :aria-label="t('models.pricing.formulaAria')" tabindex="0" class="max-w-full overflow-x-auto"><code class="whitespace-pre text-xs">{{ row.original.formula }}</code></div>
        </div>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #actions-cell="{ row }">
        <AppButton color="neutral" variant="ghost" size="xs" icon="i-tabler-receipt" :aria-label="`${t('models.price.complete')} — ${row.original.model.id}`" :title="t('models.price.complete')" aria-haspopup="dialog" @click="emit('details', row.original.model)" />
      </template>
    </PortalTable>
    <div class="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
      <p>{{ t('models.pricing.noteRungs') }}</p>
      <p>{{ t('models.pricing.noteFormula') }}</p>
    </div>
  </div>
</template>

