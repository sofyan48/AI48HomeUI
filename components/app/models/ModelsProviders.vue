<template>
  <section v-if="catalogReady && !loading && !error && providers.length" class="catalog-providers flex min-w-0 flex-col gap-3" aria-labelledby="catalog-providers-title">
    <h2 id="catalog-providers-title" class="flex items-center justify-between gap-2 text-sm font-semibold">
      {{ t('models.providers.title') }}
      <PortalBadge color="neutral" variant="soft" size="sm">{{ providers.length }}</PortalBadge>
    </h2>
    <PortalInput v-model="search" type="search" icon="i-tabler-search" size="sm" :aria-label="t('models.providers.search')" :placeholder="t('models.providers.search')" />
    <AppButton block color="neutral" :variant="!provider ? 'soft' : 'ghost'" size="sm" class="justify-start gap-2" :aria-pressed="!provider" @click="provider = ''">
      <AppIcon name="i-tabler-grid-dots" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate text-left">{{ t('models.filter.anyProvider') }}</span>
      <PortalBadge color="neutral" variant="soft" size="xs">{{ models.length }}</PortalBadge>
    </AppButton>
    <ul tabindex="0" aria-labelledby="catalog-providers-title" class="flex max-h-60 lg:max-h-[min(36rem,calc(100dvh-20rem))] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md pr-1 focus-visible:outline-2 focus-visible:outline-ring">
      <li v-for="item in visibleProviders" :key="item.provider" class="min-w-0">
        <AppButton block color="neutral" :variant="provider === item.provider ? 'soft' : 'ghost'" size="sm" class="justify-start gap-2" :aria-label="providerDescription(item)" :title="providerDescription(item)" :aria-pressed="provider === item.provider" @click="provider = provider === item.provider ? '' : item.provider">
          <AppIcon :name="provider === item.provider ? 'i-tabler-square-check' : 'i-tabler-square'" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate text-left">{{ item.provider }}</span>
          <PortalBadge :color="accessLoaded && item.accessibleCount > 0 ? 'success' : 'neutral'" variant="soft" size="xs">{{ item.modelCount }}</PortalBadge>
        </AppButton>
      </li>
      <li v-if="!visibleProviders.length" class="px-2 py-4 text-center text-xs text-muted-foreground">{{ t('models.providers.empty') }}</li>
    </ul>

  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '~/components/AppButton.vue'

import AppIcon from '~/components/AppIcon.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { catalogProviders } from '~/composables/models/catalog'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'
import { usePortalI18n } from '~/composables/usePortalI18n'

const { t } = usePortalI18n()
const { models, provider, accessLoaded, catalogReady, loading, error } = useModelsWorkspace()
const search = ref('')
const providers = computed(() => catalogProviders(models.value))
const visibleProviders = computed(() => providers.value.filter(item => item.provider.toLowerCase().includes(search.value.trim().toLowerCase())))

function providerDescription(item: ReturnType<typeof catalogProviders>[number]) {
  const access = accessLoaded.value ? t('models.providers.access', { count: item.accessibleCount }) : t('models.providers.unknown')
  return `${t('models.providers.filter', { provider: item.provider })} · ${t('models.providers.models', { count: item.modelCount })} · ${access}`
}
</script>
