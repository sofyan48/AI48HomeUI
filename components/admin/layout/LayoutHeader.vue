<template>
  <header class="admin-workspace-header z-30 flex h-[4.25rem] shrink-0 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <AppButton class="shrink-0 lg:hidden" icon="i-tabler-menu-2" color="neutral" variant="ghost" :aria-label="tc('shell.openNavigation')" aria-controls="management-sidebar" :aria-expanded="mobileOpen" @click="emit('openMobile')" />

      <span v-if="pageIcon" class="admin-page-glyph hidden sm:flex" aria-hidden="true"><AppIcon :name="pageIcon" /></span>
      <div class="min-w-0 leading-tight">
        <nav :aria-label="t('shared.breadcrumb')" class="hidden items-center gap-1 text-[11px] font-medium text-[var(--ui-text-muted)] sm:flex">
          <span>AI48Home</span>
          <template v-if="section"><AppIcon name="i-tabler-slash" class="size-3 text-[var(--ui-text-dimmed)]" aria-hidden="true" /><span class="truncate">{{ section }}</span></template>
        </nav>
        <p class="admin-page-title truncate" :title="subtitle || undefined" aria-current="page">{{ title }}</p>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <button type="button" class="admin-search hidden md:flex" :aria-label="tc('shell.search')" aria-haspopup="dialog" @click="emit('openCommands')">
        <AppIcon name="i-tabler-search" class="size-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-left">{{ tc('shell.search') }}</span>
        <kbd>⌘K</kbd>
      </button>
      <div class="admin-dock">
        <AppButton class="md:hidden" icon="i-tabler-search" color="neutral" variant="ghost" size="sm" :aria-label="tc('shell.search')" :title="tc('shell.search')" aria-haspopup="dialog" @click="emit('openCommands')" />
        <ThemeSwitcher />
        <ConsoleLanguageSwitcher />
        <AppButton icon="i-tabler-plug" color="neutral" variant="ghost" size="sm" :aria-label="tc('shell.manageConnection')" :title="tc('shell.manageConnection')" aria-haspopup="dialog" @click="emit('openConnection')" />
        <AppButton
          icon="i-tabler-refresh"
          color="primary"
          variant="solid"
          size="sm"
          class="rounded-full"
          :loading="syncing"
          :disabled="syncing || !connected"
          :aria-label="tc('shell.sync')"
          :title="tc('shell.sync')"
          @click="emit('sync')"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useConsoleLocale } from '~/composables/useConsoleLocale'

defineProps<{
  title: string
  subtitle: string
  section: string
  pageIcon?: string

  mobileOpen: boolean
  syncing: boolean
  connected: boolean
}>()
const emit = defineEmits<{ openMobile: []; openCommands: []; openConnection: []; sync: [] }>()

const { t: tc } = useConsoleLocale()
const { t } = useAdminI18n()
</script>

<style scoped>
.admin-page-glyph {
  width: 2.375rem;
  height: 2.375rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, var(--page-accent), var(--page-accent-2));
  color: white;
  box-shadow: 0 8px 18px -8px color-mix(in oklch, var(--page-accent) 70%, transparent);
}
.admin-page-title {
  font-size: 1.125rem;
  line-height: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ui-text-highlighted);
}
.admin-search {
  width: 15rem;
  height: 2.375rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem 0 0.875rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 9999px;
  background: var(--admin-panel-bg);
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.admin-search:hover { border-color: var(--admin-hover-border); }
.admin-search:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
.admin-search kbd {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: var(--ui-bg-muted);
  font-family: ui-monospace, monospace;
  font-size: 0.625rem;
  color: var(--ui-text-muted);
}
.admin-dock {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.1875rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 9999px;
  background: var(--admin-panel-bg);
}
.admin-dock :deep(button),
.admin-dock :deep(a) { border-radius: 9999px; }

@media (prefers-reduced-motion: reduce) {
  .admin-search { transition: none; }
}
</style>
