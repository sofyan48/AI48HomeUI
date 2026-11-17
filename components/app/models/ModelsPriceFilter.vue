<template>
  <section class="flex min-w-0 flex-col gap-3" aria-labelledby="catalog-price-filter-title">
    <div class="flex items-center justify-between gap-2">
      <h2 id="catalog-price-filter-title" class="text-xs font-semibold text-muted-foreground">{{ t('models.filter.priceRange') }}</h2>
      <AppButton type="button" color="neutral" variant="ghost" size="xs" :disabled="!minPrice && !maxPrice" @click="clearPrices">{{ t('models.filter.clearPrice') }}</AppButton>
    </div>
    <FieldGroup class="grid grid-cols-2 gap-3">
      <PortalField :label="t('models.filter.minPrice')" :error="invalidRange">
        <PortalInput v-model="minPrice" type="number" min="0" step="any" inputmode="decimal" size="sm" class="w-full" aria-describedby="catalog-price-filter-note" />
      </PortalField>
      <PortalField :label="t('models.filter.maxPrice')" :error="invalidRange ? t('models.filter.priceRangeError') : undefined">
        <PortalInput v-model="maxPrice" type="number" min="0" step="any" inputmode="decimal" size="sm" class="w-full" aria-describedby="catalog-price-filter-note" />
      </PortalField>
    </FieldGroup>
    <p id="catalog-price-filter-note" class="text-xs leading-relaxed text-muted-foreground">{{ t('models.filter.priceNote') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '~/components/AppButton.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { FieldGroup } from '~/components/ui/field'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'
import { usePortalI18n } from '~/composables/usePortalI18n'

const { t } = usePortalI18n()
const { minPrice, maxPrice } = useModelsWorkspace()
const invalidRange = computed(() => minPrice.value !== '' && maxPrice.value !== '' && Number(minPrice.value) > Number(maxPrice.value))

function clearPrices() {
  minPrice.value = ''
  maxPrice.value = ''
}
</script>
