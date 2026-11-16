<template>
  <AppCard :ui="{ body: 'p-2 sm:p-2' }">
    <template #header><h2 class="font-semibold">{{ t('dashboard.serviceInventory') }}</h2></template>
    <nav :aria-label="t('dashboard.serviceInventory')" class="space-y-0.5">
      <NuxtLink v-for="card in cards" :key="card.label" :to="card.to" class="dashboard-inventory" :class="`dashboard-tone--${card.tone}`">
        <span class="dashboard-metric-icon dashboard-metric-icon--sm" aria-hidden="true"><AppIcon :name="card.icon" class="size-4" /></span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ card.label }}</span>
          <span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ card.detail }}</span>
        </span>
        <span class="text-lg font-bold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatNumber(card.value) }}</span>
        <AppIcon name="i-tabler-chevron-right" class="inventory-chevron" aria-hidden="true" />
      </NuxtLink>
    </nav>
    <div class="mx-2 mt-2 border-t border-[var(--ui-border)] px-1 pb-1 pt-3">
      <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('dashboard.credentialSources') }}</p>
      <div v-if="credentialSources.length" class="flex flex-wrap gap-1.5">
        <span v-for="source in credentialSources" :key="source.label" class="dashboard-chip">
          {{ source.label }} <strong class="text-[var(--ui-text-highlighted)]">{{ source.count }}</strong>
        </span>
      </div>
      <p v-else class="text-xs text-[var(--ui-text-dimmed)]">{{ t('dashboard.noCredentialSources') }}</p>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed } from 'vue'
import { useDashboard } from '~/composables/dashboard/useDashboard'
import { useDashboardFormat } from '~/composables/dashboard/format'

const { t } = useAdminI18n()
const { supports } = useCapabilities()
const { providerRows, accountFiles, clientKeys, topology, nodes, availableProviders, activeAccounts } = useDashboard()
const { formatNumber } = useDashboardFormat()

const homeCount = computed(() => topology.value?.summary?.home_count
  ?? new Set(nodes.value.filter(node => node.home_ip).map(node => `${node.home_ip}:${node.home_port || 0}`)).size)
const cpaCount = computed(() => topology.value?.summary?.cpa_count ?? nodes.value.length)

const cards = computed(() => [
  {
    label: t('dashboard.inventory.modelServiceKeys'),
    value: availableProviders.value,
    detail: t('dashboard.inventory.serviceTypes', { count: providerRows.value.filter(item => item.total > 0).length }),
    to: '/admin/providers',
    icon: 'i-tabler-cloud-computing',
    tone: 'violet'
  },
  {
    label: t('dashboard.inventory.accountCredentials'),
    value: activeAccounts.value,
    detail: t('dashboard.inventory.totalRecords', { count: accountFiles.value.length }),
    to: '/admin/credentials',
    icon: 'i-tabler-id-badge-2',
    tone: 'blue'
  },
  {
    label: t('dashboard.inventory.clientKeys'),
    value: clientKeys.value.length,
    detail: t('dashboard.inventory.keysCanCall', { count: clientKeys.value.length }),
    to: '/admin/access-keys',
    icon: 'i-tabler-key',
    tone: 'amber'
  },
  ...(supports('topology', false) || supports('nodes', false)
    ? [{
        label: t('dashboard.inventory.runtimeNodes'),
        value: cpaCount.value,
        detail: t('dashboard.inventory.homeInstances', { count: homeCount.value }),
        to: '/admin/system-nodes',
        icon: 'i-tabler-server-2',
        tone: 'emerald'
      }]
    : [])
])

const credentialSources = computed(() => {
  const kinds: Record<string, string> = {
    db: t('dashboard.sourceKind.database'),
    database: t('dashboard.sourceKind.database'),
    file: t('dashboard.sourceKind.file'),
    memory: t('dashboard.sourceKind.memory'),
    unknown: t('common.unknown')
  }
  const counts = new Map<string, number>()
  for (const item of accountFiles.value) {
    const source = String(item.source || 'unknown').toLowerCase()
    const label = kinds[source] || source
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
})
</script>

<style scoped>
.dashboard-inventory {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.625rem;
  transition: background-color 120ms ease;
}
.dashboard-inventory:hover { background: var(--ui-hover); }
.dashboard-inventory:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
.inventory-chevron {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: var(--ui-text-dimmed);
  transition: color 160ms ease, transform 160ms ease;
}
@media (hover: hover) {
  .dashboard-inventory:hover .inventory-chevron { color: var(--dashboard-accent); transform: translateX(2px); }
}
@media (prefers-reduced-motion: reduce) { .inventory-chevron { transition: none; } }
</style>
