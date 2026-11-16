<template>
  <div class="grid gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2.5">
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-medium">{{ window.label }}</span>
      <PortalBadge :color="window.status === 'Exhausted' ? 'error' : window.status === 'Active' ? 'success' : window.status === 'Not started' ? 'info' : 'neutral'" variant="subtle">{{ window.statusLabel || window.status }}</PortalBadge>
    </div>
    <template v-if="window.enabled">
      <div v-if="window.progress != null" class="h-1.5 overflow-hidden rounded-full bg-[var(--ui-bg-muted)]" role="progressbar" :aria-label="t('users.windowUsageAria', { window: window.label })" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="window.progress">
        <div class="h-full rounded-full" :class="window.status === 'Exhausted' ? 'bg-[var(--ui-error)]' : window.progress >= 80 ? 'bg-[var(--ui-warning)]' : 'bg-[var(--ui-success)]'" :style="{ width: window.progress + '%' }" />
      </div>
      <p class="text-xs tabular-nums">{{ t('users.windowUsage', { used: window.used, limit: window.limit, remaining: window.remaining }) }}</p>
      <p class="text-xs text-[var(--ui-text-muted)]">{{ window.description }}</p>
    </template>
    <p v-else class="text-xs text-[var(--ui-text-muted)]">{{ t('users.noWindowLimit') }}</p>
  </div>
</template>

<script>
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useAdminI18n } from '~/composables/useAdminI18n'

export default {
  props: ['window'],
  setup() {
    const { t } = useAdminI18n()
    return { t }
  }
}
</script>
