<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalThemeSwitcher from './PortalThemeSwitcher.vue'
import PortalLanguageSwitcher from './PortalLanguageSwitcher.vue'

defineProps<{
  groups: Array<{ key: string; label: string; items: Array<{ to: string; label: string; icon: string }> }>
  collapsed: boolean
  mobile?: boolean
  username?: string
  userInitial: string
}>()
const emit = defineEmits<{ navigate: []; logout: []; toggleCollapse: [] }>()
const route = useRoute()
const { t } = usePortalI18n()
const isActive = (to: string) => route.path === to
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-16 shrink-0 items-center justify-between gap-1 px-3" :class="collapsed ? 'lg:h-auto lg:flex-col lg:justify-center lg:px-1 lg:py-3 lg:gap-2' : ''">
      <NuxtLink to="/app" class="user-brand flex min-w-0 flex-1 items-center gap-2.5 rounded-lg" :class="collapsed ? 'lg:flex-none' : ''" @click="emit('navigate')">
        <AppBrandMark />
        <span class="min-w-0 leading-tight" :class="collapsed ? 'lg:hidden' : ''"><span class="block truncate text-[15px] font-bold tracking-tight text-[var(--ui-text-highlighted)]">AI48<span class="user-brand-accent">Hub</span></span><span class="block truncate text-[11px] text-[var(--ui-text-muted)]">{{ t('shell.userWorkspace') }}</span></span>
      </NuxtLink>
      <AppButton v-if="!mobile" class="hidden shrink-0 lg:inline-flex" :icon="collapsed ? 'i-tabler-layout-sidebar-left-expand' : 'i-tabler-layout-sidebar-left-collapse'" color="neutral" variant="ghost" :aria-label="collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')" :title="collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')" :aria-expanded="!collapsed" aria-controls="workspace-sidebar" @click="emit('toggleCollapse')" />
      <AppButton v-else icon="i-tabler-x" color="neutral" variant="ghost" :aria-label="t('shell.closeNavigation')" @click="emit('navigate')" />
    </div>
    <div class="mx-4 h-px shrink-0 bg-[var(--ui-border)]" aria-hidden="true" />
    <nav class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" :aria-label="t('shell.userWorkspace')">
      <div v-for="group in groups" :key="group.key" class="mb-4 last:mb-0">
        <p class="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ui-text-dimmed)]" :class="collapsed ? 'lg:sr-only' : ''">{{ group.label }}</p>
        <div class="flex flex-col gap-0.5" :class="collapsed ? 'lg:border-t lg:border-[var(--ui-border)] lg:pt-2' : ''">
          <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to" class="user-nav-link" :class="[{ 'user-nav-link--active': isActive(item.to) }, collapsed ? 'lg:justify-center lg:px-0' : '']" :aria-label="item.label" :title="collapsed ? item.label : undefined" :aria-current="isActive(item.to) ? 'page' : undefined" @click="emit('navigate')">
            <span class="user-nav-glyph" aria-hidden="true"><AppIcon :name="item.icon" class="size-[18px]" /></span>
            <span class="min-w-0 flex-1 truncate" :class="collapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
            <AppIcon v-if="isActive(item.to) && !collapsed" name="i-tabler-chevron-right" class="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </nav>
    <div class="user-account shrink-0 border-t border-[var(--ui-border)] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" :class="collapsed ? 'lg:flex lg:flex-col lg:items-center' : ''">
      <NuxtLink to="/app/profile" class="user-nav-link" :class="[{ 'user-nav-link--active': isActive('/app/profile') }, collapsed ? 'lg:justify-center lg:px-0' : '']" :aria-label="t('shell.profile')" :title="collapsed ? t('shell.profile') : undefined" :aria-current="isActive('/app/profile') ? 'page' : undefined" @click="emit('navigate')">
        <span class="user-avatar" aria-hidden="true">{{ userInitial }}</span>
        <span class="min-w-0 flex-1 leading-tight" :class="collapsed ? 'lg:hidden' : ''">
          <span class="block truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ username || t('shell.profile') }}</span>
          <span class="block truncate text-[11px] font-normal text-[var(--ui-text-muted)]">{{ t('shell.viewProfile') }}</span>
        </span>
      </NuxtLink>
      <div class="mt-2 flex w-full items-center gap-1 border-t border-[var(--ui-border)] pt-2" :class="collapsed ? 'lg:flex-col' : ''">
        <PortalThemeSwitcher />
        <PortalLanguageSwitcher />
        <AppButton class="ml-auto" :class="collapsed ? 'lg:ml-0' : ''" icon="i-tabler-logout" color="neutral" variant="ghost" :aria-label="t('shell.logout')" :title="t('shell.logout')" @click="emit('logout')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-brand-accent {
  color: var(--ui-text-highlighted);
}
.user-nav-link {
  position: relative;
  display: flex;
  min-height: 2.5rem;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3125rem 0.625rem 0.3125rem 0.3125rem;
  border-radius: 0.875rem;
  color: var(--ui-text);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 120ms ease, color 120ms ease;
}
.user-nav-link:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.user-nav-link--active,
.user-nav-link--active:hover {
  background: linear-gradient(90deg, color-mix(in oklch, var(--color-violet-500) 30%, transparent), color-mix(in oklch, var(--color-fuchsia-500) 10%, transparent));
  color: var(--color-white);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 8%);
}
.user-nav-glyph {
  display: flex;
  width: 1.875rem;
  height: 1.875rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: rgb(255 255 255 / 5%);
  color: var(--ui-text-muted);
}
.user-nav-link--active .user-nav-glyph {
  background: linear-gradient(135deg, var(--color-violet-500), var(--color-fuchsia-500));
  color: var(--color-white);
  box-shadow: 0 6px 16px -6px color-mix(in oklch, var(--color-fuchsia-500) 70%, transparent);
}
.user-account .user-nav-link { padding-inline: 0.5rem; }
.user-account .user-nav-link--active { box-shadow: none; }
.user-avatar {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ui-bg-accented);
  color: var(--ui-text-toned);
  font-size: 0.8125rem;
  font-weight: 600;
}
.user-brand:focus-visible,
.user-nav-link:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .user-nav-link { transition: none; }
}
</style>
