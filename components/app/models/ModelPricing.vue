<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { rungPriceComponents, type CatalogModel } from '~/composables/userModelCatalog'
import { useModelFormat } from '~/composables/models/useModelFormat'

defineProps<{ model: CatalogModel; hideProvider?: boolean }>()
const { t, intlLocale } = usePortalI18n()
const { price, pricingText, componentLabel, unitLabel } = useModelFormat()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <template v-if="model.pricing?.status === 'published' && model.pricing.providers?.length">
      <div v-for="offer in model.pricing.providers" :key="offer.provider" class="flex min-w-0 flex-col gap-3">
        <h4 v-if="!hideProvider" class="break-all text-xs font-medium text-muted-foreground">{{ offer.provider }}</h4>
        <div v-for="tier in offer.tiers" :key="tier.service_tier" class="flex min-w-0 flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p class="flex items-center gap-2"><span class="text-muted-foreground">{{ t('models.pricing.serviceTier') }}</span><code class="font-medium">{{ tier.service_tier }}</code></p>
            <PortalBadge v-if="tier.is_default" color="neutral" variant="subtle" size="sm">{{ t('models.pricing.default') }}</PortalBadge>
          </div>
          <p v-if="!tier.rungs.length" class="text-muted-foreground">{{ t('models.pricing.noRungs') }}</p>
          <div v-for="(rung, rungIndex) in tier.rungs" :key="`${rung.min_input_tokens}:${rungIndex}`" class="min-w-0 overflow-hidden rounded-lg border border-border">
            <p class="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">{{ rung.min_input_tokens > 0 ? t('models.pricing.fromInputTokens', { count: rung.min_input_tokens.toLocaleString(intlLocale) }) : t('models.pricing.baseRung') }}</p>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              <div v-for="component in rungPriceComponents(rung).slice(0, 2)" :key="component.label" class="flex min-w-0 flex-col gap-1">
                <dt class="text-xs text-muted-foreground">{{ componentLabel(component.label) }}</dt>
                <dd class="flex flex-col gap-0.5">
                  <span class="break-words text-lg font-semibold tracking-tight tabular-nums">{{ price(component.value) }}</span>
                  <span class="text-[11px] text-muted-foreground">{{ unitLabel(component.unit) }}</span>
                </dd>
              </div>
              <div v-for="component in rungPriceComponents(rung).slice(2)" :key="component.label" class="col-span-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
                <dt class="text-muted-foreground">{{ componentLabel(component.label) }}</dt>
                <dd class="ml-auto flex flex-wrap justify-end gap-x-1.5 tabular-nums"><span class="font-medium">{{ price(component.value) }}</span><span class="text-muted-foreground">{{ unitLabel(component.unit) }}</span></dd>
              </div>
            </dl>
            <div v-if="rung.pricing_expr" class="min-w-0 bg-muted/40 px-4 py-3">
              <p class="text-xs text-muted-foreground">{{ t('models.pricing.formulaNote') }}</p>
              <div role="region" :aria-label="t('models.pricing.formulaAria')" tabindex="0" class="mt-1 max-w-full overflow-x-auto"><code class="block w-max whitespace-pre text-xs">{{ rung.pricing_expr }}</code></div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="py-3 text-sm leading-relaxed text-muted-foreground">{{ pricingText(model) }}</p>
  </div>
</template>
