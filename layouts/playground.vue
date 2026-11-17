<script setup lang="ts">
import PortalThemeSwitcher from '~/components/app/general/PortalThemeSwitcher.vue'
import PortalLanguageSwitcher from '~/components/app/general/PortalLanguageSwitcher.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalSessionGuard } from '~/composables/portal/usePortalSessionGuard'

provide(Symbol.for('cliproxy-user-card'), true)
usePortalSessionGuard()
const { t } = usePortalI18n()
</script>

<template>
  <div class="user-shell playground-shell flex h-dvh min-w-0 flex-col overflow-hidden text-foreground">
    <header class="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-2 sm:px-4">
      <div class="flex min-w-0 items-center gap-2 sm:gap-3">
        <AppButton to="/app" icon="i-tabler-chevron-left" color="neutral" variant="ghost" size="sm" :aria-label="t('shell.userWorkspace')" :title="t('shell.userWorkspace')">
          <span class="hidden sm:inline">{{ t('shell.userWorkspace') }}</span>
        </AppButton>
        <h1 class="truncate text-sm font-semibold">{{ t('shell.nav.playground') }}</h1>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <PortalThemeSwitcher />
        <PortalLanguageSwitcher />
      </div>
    </header>
    <main class="flex min-h-0 min-w-0 flex-1 overflow-hidden" :aria-label="t('shell.nav.playground')"><slot /></main>
  </div>
</template>

<style scoped>
.playground-shell { background: var(--user-workspace-bg); }
@media (prefers-reduced-motion: reduce) {
  .playground-shell :deep(*) { transition-duration: 0s !important; }
}
</style>
