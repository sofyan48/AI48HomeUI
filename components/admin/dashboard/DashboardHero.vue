<template>
  <section :aria-label="t('dashboard.serviceReadiness')" class="dashboard-hero" :class="`dashboard-hero--${health.color}`">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <span class="dashboard-hero-icon" aria-hidden="true"><AppIcon :name="healthIcon" class="size-5" /></span>
        <PortalBadge :color="health.color" variant="subtle" class="rounded-full">{{ health.label }}</PortalBadge>
      </div>
      <AppSyncButton :loading="loading" size="sm" @click="refreshDashboard" />
    </div>
    <h1 class="mt-4 text-xl font-bold tracking-tight text-[var(--ui-text-highlighted)]">{{ health.title }}</h1>
    <p class="mt-1.5 text-sm leading-relaxed text-[var(--ui-text-muted)]">{{ health.description }}</p>

    <div class="mt-4 flex flex-wrap gap-1.5 text-xs">
      <span class="dashboard-chip"><AppIcon name="i-tabler-server" class="size-3.5" aria-hidden="true" />{{ runtimeMode || 'Home' }}</span>
      <span class="dashboard-chip"><AppIcon name="i-tabler-tag" class="size-3.5" aria-hidden="true" />{{ latestVersion || t('dashboard.versionUnavailable') }}</span>
      <span class="dashboard-chip"><AppIcon name="i-tabler-clock" class="size-3.5" aria-hidden="true" />{{ lastUpdated ? lastUpdated.toLocaleTimeString(intlLocale) : t('dashboard.notSynced') }}</span>
    </div>

    <div v-if="statusItems.length" class="dashboard-issues mt-4">
      <p class="mb-1.5 text-xs font-medium text-[var(--ui-text-muted)]">{{ t('dashboard.dataStatus', { count: statusItems.length }) }}</p>
      <NuxtLink v-for="item in statusItems.slice(0, 4)" :key="item.label" :to="item.to" class="dashboard-issue">
        <AppIcon name="i-tabler-point-filled" class="size-3 shrink-0 text-[var(--ui-warning)]" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate"><span class="font-medium text-[var(--ui-text-highlighted)]">{{ item.label }}</span> · {{ item.detail }}</span>
        <span class="shrink-0 text-xs font-medium text-[var(--ui-primary)]">{{ t('dashboard.review') }}</span>
      </NuxtLink>
    </div>

    <div v-if="suggestedActions.length" class="mt-auto flex flex-wrap gap-2 pt-5">
      <AppButton
        v-for="(action, index) in suggestedActions"
        :key="action.label"
        :to="action.to"
        size="sm"
        class="rounded-full"
        :color="index === 0 ? 'primary' : 'neutral'"
        :variant="index === 0 ? 'solid' : 'outline'"
        :trailing-icon="index === 0 ? 'i-tabler-arrow-right' : undefined"
      >
        {{ action.label }}
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useDashboard } from '~/composables/dashboard/useDashboard'

const { t, intlLocale } = useAdminI18n()
const { loading, runtimeMode, latestVersion, lastUpdated, statusItems, health, healthIcon, suggestedActions, refreshDashboard } = useDashboard()
</script>

<style scoped>
/* Readiness spotlight: accent follows the health verdict. */
.dashboard-hero {
  --hero-accent: var(--ui-primary);
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem 1.25rem 1.375rem;
  border: 1px solid var(--admin-panel-border, var(--ui-border));
  border-radius: 0.875rem;
  background:
    linear-gradient(180deg, color-mix(in oklch, var(--hero-accent) 7%, transparent), transparent 9rem),
    var(--admin-panel-bg, var(--ui-bg));
  box-shadow: inset 0 3px 0 var(--hero-accent), var(--admin-panel-shadow);
}
.dashboard-hero--success { --hero-accent: var(--ui-success); }
.dashboard-hero--warning { --hero-accent: var(--ui-warning); }
.dashboard-hero--info { --hero-accent: var(--ui-info); }
.dashboard-hero-icon {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--hero-accent) 15%, transparent);
  color: var(--hero-accent);
}
.dashboard-issues {
  padding: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--ui-bg-elevated) 80%, transparent);
}
.dashboard-issue {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.dashboard-issue:hover { background: var(--ui-hover); }
.dashboard-issue:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
</style>
