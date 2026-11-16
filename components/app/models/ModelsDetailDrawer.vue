<template>
  <AppModal v-model:open="detailOpen" @after:enter="focusPricing" :title="selectedModel?.display_name || selectedModel?.id || t('models.detailTitle')" :description="selectedModel?.id" :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div v-if="selectedModel" class="catalog-details space-y-5 text-sm">
        <div class="flex items-center gap-3">
          <div class="catalog-icon flex size-12 shrink-0 items-center justify-center rounded-xl">
            <AppIcon :name="modelLogoIcon(selectedModel)" class="size-7" aria-hidden="true" />
          </div>
          <div class="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2">
            <code class="min-w-0 flex-1 break-all text-xs">{{ selectedModel.id }}</code>
            <AppButton color="neutral" variant="outline" size="xs" icon="i-tabler-copy" @click="copyModelId(selectedModel.id)">{{ t('models.copyId') }}</AppButton>
          </div>
        </div>
        <div v-if="capabilityLabels(selectedModel).length" class="flex flex-wrap gap-2"><PortalBadge v-for="label in capabilityLabels(selectedModel)" :key="label" color="primary" variant="subtle" class="rounded-full">{{ label }}</PortalBadge></div>
        <p class="leading-relaxed text-[var(--ui-text-muted)]">{{ selectedModel.description || t('models.noDescription') }}</p>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div v-for="item in modelFacts(selectedModel)" :key="item.label" class="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-3"><dt class="text-xs text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-words font-medium">{{ item.value }}</dd></div>
        </dl>

        <section v-if="selectedModel.provider_limits?.length" class="space-y-3">
          <h3 class="font-semibold">{{ t('models.providerLimits') }}</h3>
          <div v-for="(limit, index) in selectedModel.provider_limits" :key="`${limit.provider}:${index}`" class="rounded-lg border border-[var(--ui-border)] p-3">
            <p class="break-words font-medium">{{ limit.provider }}</p>
            <dl class="mt-2 grid gap-3 sm:grid-cols-2">
              <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('models.contextTokens') }}</dt><dd class="font-mono tabular-nums">{{ providerLimit(limit.context_length) }}</dd></div>
              <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('models.maxOutputTokens') }}</dt><dd class="font-mono tabular-nums">{{ providerLimit(limit.max_output_tokens) }}</dd></div>
            </dl>
          </div>
        </section>

        <section><h3 class="font-semibold">{{ t('models.modalities') }}</h3><p class="mt-1">{{ t('models.modalityInput', { value: modalityText(selectedModel, 'input') }) }}</p><p>{{ t('models.modalityOutput', { value: modalityText(selectedModel, 'output') }) }}</p></section>
        <section class="space-y-1"><h3 class="font-semibold">{{ t('models.capabilities') }}</h3>
          <p>{{ t('models.cap.reasoning', { value: capabilityText(selectedModel.capabilities?.reasoning?.status) }) }}</p>
          <p v-if="selectedModel.capabilities?.reasoning?.levels?.length">{{ t('models.cap.levels', { value: selectedModel.capabilities.reasoning.levels.join(', ') }) }}</p>
          <p v-if="selectedModel.capabilities?.reasoning?.budget && Object.keys(selectedModel.capabilities.reasoning.budget).length">{{ t('models.cap.thinkingBudget', { value: budgetText(selectedModel.capabilities.reasoning.budget) }) }}</p>
          <p>{{ t('models.cap.toolCalling', { value: capabilityText(selectedModel.capabilities?.tool_calling?.status) }) }}</p>
          <p>{{ t('models.cap.structuredOutput', { value: capabilityText(selectedModel.capabilities?.structured_output?.status) }) }}</p>
          <p>{{ t('models.cap.parameters', { value: selectedModel.capabilities?.parameters?.length ? selectedModel.capabilities.parameters.join(', ') : t('models.status.notPublished') }) }}</p>
          <p>{{ t('models.cap.generationMethods', { value: selectedModel.capabilities?.generation_methods?.length ? selectedModel.capabilities.generation_methods.join(', ') : t('models.status.notPublished') }) }}</p>
        </section>
        <section v-if="selectedModel.availability" class="space-y-1"><h3 class="font-semibold">{{ t('models.availability.title') }}</h3>
          <p>{{ availabilityLabel(selectedModel) }} · {{ t('models.availability.samples', { count: selectedModel.availability.sample_count }) }}{{ selectedModel.availability.window ? ` ${t('models.availability.window', { min: selectedModel.availability.window.min_samples, hours: selectedModel.availability.window.hours })}` : '' }}</p>
          <template v-if="selectedModel.availability.status === 'observed'">
            <p>{{ t('models.availability.successesFailures', { successes: selectedModel.availability.success_count ?? t('models.status.notPublished'), failures: selectedModel.availability.failed_count ?? t('models.status.notPublished') }) }}</p>
            <p>{{ t('models.availability.latency', { latency: duration(selectedModel.availability.avg_latency_ms), ttft: duration(selectedModel.availability.avg_ttft_ms) }) }}</p>
            <p>{{ t('models.availability.throughput', { value: selectedModel.availability.output_tokens_per_second == null ? t('models.status.notPublished') : t('models.availability.tokensPerSecond', { value: selectedModel.availability.output_tokens_per_second }) }) }}</p>
          </template>
          <p v-if="selectedModel.availability.window">{{ t('models.availability.windowRange', { from: dateText(selectedModel.availability.window.from), to: dateText(selectedModel.availability.window.to) }) }}</p>
          <p>{{ t('models.availability.lastObserved', { value: dateText(selectedModel.availability.last_observed_at) }) }}</p>
        </section>
        <section class="space-y-3" aria-labelledby="model-pricing-heading">
          <h3 id="model-pricing-heading" ref="pricingHeading" tabindex="-1" class="font-semibold">{{ t('models.pricing.title') }}</h3>
          <template v-if="selectedModel.pricing?.status === 'published' && selectedModel.pricing.providers?.length">
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.pricing.noteRungs') }}</p>
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.pricing.noteFormula') }}</p>
            <div v-for="offer in selectedModel.pricing.providers" :key="offer.provider" class="min-w-0 space-y-3">
              <h4 class="break-all font-mono font-semibold">{{ offer.provider }}</h4>
              <div v-for="tier in offer.tiers" :key="tier.service_tier" class="min-w-0 space-y-2">
                <p class="flex flex-wrap items-center gap-2">{{ t('models.pricing.serviceTier') }} <code>{{ tier.service_tier }}</code><PortalBadge v-if="tier.is_default" color="neutral" variant="subtle" size="sm">{{ t('models.pricing.default') }}</PortalBadge></p>
                <p v-if="!tier.rungs.length" class="text-[var(--ui-text-muted)]">{{ t('models.pricing.noRungs') }}</p>
                <div v-for="(rung, rungIndex) in tier.rungs" :key="`${rung.min_input_tokens}:${rungIndex}`" class="min-w-0 rounded-lg border border-[var(--ui-border)] p-3">
                  <p class="mb-3 text-xs font-medium">{{ rung.min_input_tokens > 0 ? t('models.pricing.fromInputTokens', { count: rung.min_input_tokens.toLocaleString(intlLocale) }) : t('models.pricing.baseRung') }}</p>
                  <dl class="grid grid-cols-2 gap-3">
                    <div v-for="component in rungPriceComponents(rung)" :key="component.label" class="min-w-0">
                      <dt class="text-xs text-[var(--ui-text-muted)]">{{ componentLabel(component.label) }}</dt>
                      <dd class="break-words tabular-nums">{{ price(component.value) }} <span class="text-xs text-[var(--ui-text-muted)]">{{ unitLabel(component.unit) }}</span></dd>
                    </div>
                  </dl>
                  <div v-if="rung.pricing_expr" class="mt-3 min-w-0 border-t border-[var(--ui-border)] pt-2">
                    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('models.pricing.formulaNote') }}</p>
                    <div role="region" :aria-label="t('models.pricing.formulaAria')" tabindex="0" class="mt-1 max-w-full overflow-x-auto"><code class="block w-max whitespace-pre text-xs">{{ rung.pricing_expr }}</code></div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <p v-else>{{ pricingText(selectedModel) }}</p>
        </section>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import AppModal from '~/components/AppModal.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { nextTick, ref, watch } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { rungPriceComponents } from '~/composables/userModelCatalog'
import { budgetText, modelLogoIcon } from '~/composables/models/catalog'
import { useModelFormat } from '~/composables/models/useModelFormat'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { t, intlLocale } = usePortalI18n()
const { selectedModel, detailOpen, detailsSection } = useModelsWorkspace()
const {
  copyModelId, capabilityLabels, availabilityLabel, modalityText, capabilityText, duration, dateText,
  providerLimit, modelFacts, price, pricingText, componentLabel, unitLabel
} = useModelFormat()

const pricingHeading = ref<HTMLElement | null>(null)

function focusPricing() {
  if (detailsSection.value !== 'pricing') return
  pricingHeading.value?.focus({ preventScroll: true })
  pricingHeading.value?.scrollIntoView({ block: 'start' })
}
watch(pricingHeading, () => { void nextTick(focusPricing) })
</script>

<style scoped>
.catalog-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
.catalog-details section {
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
  overflow-wrap: anywhere;
}
.catalog-details section h3 {
  margin-bottom: 0.75rem;
  color: var(--ui-text-highlighted);
}
.catalog-details section p {
  line-height: 1.75;
}
</style>
