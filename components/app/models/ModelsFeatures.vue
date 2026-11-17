<template>
  <section class="flex min-w-0 flex-col gap-4">
    <fieldset class="flex min-w-0 flex-col gap-3">
      <legend class="mb-3 text-xs font-semibold text-muted-foreground">{{ t('models.filter.features') }}</legend>
      <PortalCheckbox v-for="option in capabilityOptions" :key="option.value" :model-value="selectedCapabilities.includes(option.value)" :label="option.label" @update:model-value="setCapability(option.value, $event === true)" />
    </fieldset>
    <PortalCheckbox v-if="token" v-model="mineOnly" :label="t('models.filter.mineOnly')" :disabled="!accessLoaded" />

  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import PortalCheckbox from '~/components/app/general/PortalCheckbox.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import type { CapabilityFilter } from '~/composables/models/catalog'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { t } = usePortalI18n()
const { token, accessLoaded, selectedCapabilities, mineOnly, setCapability } = useModelsWorkspace()
const capabilityOptions = computed<{ label: string; value: CapabilityFilter }[]>(() => [
  { label: t('models.capability.tools'), value: 'tools' },
  { label: t('models.capability.structuredOutput'), value: 'structuredOutput' },
  { label: t('models.capability.reasoning'), value: 'reasoning' }
])
</script>
