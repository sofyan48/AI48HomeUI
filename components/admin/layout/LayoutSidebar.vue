<template>
  <aside
    id="management-sidebar"
    ref="element"
    :role="mobileOpen ? 'dialog' : undefined"
    :aria-modal="mobileOpen ? true : undefined"
    :aria-label="tc('shell.management')"
    :inert="!desktopViewport && !mobileOpen"
    class="admin-sidebar admin-rail fixed inset-y-0 left-0 z-50 flex w-64 max-w-[calc(100vw-2rem)] flex-col transition-[transform,width] duration-200 motion-reduce:transition-none lg:inset-y-3 lg:left-3 lg:translate-x-0"
    @keydown="emit('keydown', $event)"
    :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-[4.25rem]' : 'lg:w-64']"
  >
    <div class="flex h-16 shrink-0 items-center gap-2 px-3" :class="collapsed ? 'lg:h-auto lg:flex-col lg:justify-center lg:gap-2 lg:px-1 lg:py-3' : ''">
      <NuxtLink to="/admin/dashboard" class="admin-brand flex min-w-0 flex-1 items-center gap-3 rounded-lg" :class="collapsed ? 'lg:flex-none' : ''" title="AI48Home" aria-label="AI48Home" @click="emit('close')">
        <AppBrandMark />
        <div class="min-w-0 leading-tight" :class="collapsed ? 'lg:hidden' : ''">
          <p class="admin-wordmark truncate">AI48<span class="admin-brand-accent">Hub</span></p>
          <p class="truncate text-[11px] text-[var(--ui-text-muted)]">{{ tc('shell.tagline') }}</p>
        </div>
      </NuxtLink>

      <AppButton class="hidden shrink-0 lg:inline-flex" :icon="collapsed ? 'i-tabler-layout-sidebar-left-expand' : 'i-tabler-layout-sidebar-left-collapse'" color="neutral" variant="ghost" :aria-label="collapsed ? tc('shell.expandSidebar') : tc('shell.collapseSidebar')" :title="collapsed ? tc('shell.expandSidebar') : tc('shell.collapseSidebar')" :aria-expanded="!collapsed" aria-controls="management-sidebar" @click="emit('toggleSidebar')" />
      <AppButton class="lg:hidden" icon="i-tabler-x" color="neutral" variant="ghost" :aria-label="tc('shell.closeNavigation')" @click="emit('close')" />
    </div>

    <div class="admin-rail__divider" aria-hidden="true" />

    <LayoutNavigation :sections="sections" :collapsed="collapsed" :is-active="isActive" @navigate="emit('close')" />

    <LayoutConnectionStatus :status="status" :collapsed="collapsed" :connected="connected" @manage="emit('manage')" @disconnect="emit('disconnect')" />
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import type { NavigationItem, NavigationSection } from '~/composables/layout/useAdminNavigation'
import type { ConnectionStatus } from '~/composables/layout/useAdminConnection'
import LayoutConnectionStatus from '~/components/admin/layout/LayoutConnectionStatus.vue'
import LayoutNavigation from '~/components/admin/layout/LayoutNavigation.vue'

defineProps<{
  sections: NavigationSection[]
  isActive: (item: NavigationItem) => boolean
  status: ConnectionStatus
  connected: boolean
  collapsed: boolean
  mobileOpen: boolean
  desktopViewport: boolean
}>()
const emit = defineEmits<{ close: []; toggleSidebar: []; keydown: [event: KeyboardEvent]; manage: []; disconnect: [] }>()

const { t: tc } = useConsoleLocale()
// The layout reads this element to move focus into, and trap focus inside, the mobile drawer.
const element = ref<HTMLElement | null>(null)
defineExpose({ element })
</script>

<style scoped>
/* Rail always uses a dark ink palette, in light and dark themes. */
.admin-rail {
  --ui-primary: var(--ui-color-primary-300, var(--color-violet-300));
  --ui-bg: var(--admin-rail-bg);
  --ui-bg-elevated: rgb(255 255 255 / 6%);
  --ui-bg-muted: rgb(255 255 255 / 4%);
  --ui-bg-accented: rgb(255 255 255 / 10%);
  --ui-text: var(--color-zinc-300);
  --ui-text-toned: var(--color-zinc-300);
  --ui-text-muted: var(--color-zinc-400);
  --ui-text-dimmed: var(--color-zinc-500);
  --ui-text-highlighted: var(--color-white);
  --ui-border: rgb(255 255 255 / 8%);
  --ui-hover: rgb(255 255 255 / 7%);
  color: var(--ui-text);
  background: var(--admin-rail-bg) !important;
  border: 1px solid rgb(255 255 255 / 6%) !important;
  color-scheme: dark;
}
@media (min-width: 64rem) {
  .admin-rail {
    border-radius: 0.5rem !important;
    box-shadow: none !important;
  }
}
.admin-rail__divider {
  height: 1px;
  margin-inline: 1rem;
  background: var(--ui-border);
}
.admin-wordmark {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ui-text-highlighted);
}
.admin-brand-accent {
  color: var(--ui-text-highlighted);
}
.admin-brand:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
</style>
