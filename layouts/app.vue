<template>
  <div class="user-shell relative text-[var(--ui-text)]" :class="workspaceRoute ? 'user-shell--workspace h-dvh overflow-hidden' : 'user-shell--public min-h-screen'">
    <template v-if="workspaceRoute">
      <div v-if="mobileOpen" class="user-scrim fixed inset-0 z-40 lg:hidden" aria-hidden="true" @click="closeMobile" />
      <aside
        id="workspace-sidebar"
        class="user-sidebar fixed inset-y-0 left-0 z-50 flex w-64 max-w-[calc(100vw-2rem)] flex-col border-r transition-[width,transform] duration-200 motion-reduce:transition-none"
        :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', sidebarHidden ? 'lg:w-16' : 'lg:w-64', 'lg:translate-x-0']"
      >
        <div class="flex h-16 shrink-0 items-center justify-between gap-1 border-b border-[var(--ui-border)] px-3" :class="sidebarHidden ? 'lg:h-auto lg:flex-col lg:justify-center lg:px-1 lg:py-3 lg:gap-2' : ''">
          <NuxtLink to="/app" class="user-brand flex min-w-0 flex-1 items-center gap-2.5 rounded-lg" :class="sidebarHidden ? 'lg:flex-none' : ''" @click="closeMobile">
            <AppBrandMark />
            <span class="min-w-0 leading-tight" :class="sidebarHidden ? 'lg:hidden' : ''"><span class="block truncate text-[15px] font-bold tracking-tight text-[var(--ui-text-highlighted)]">AI48<span class="user-brand-accent">Hub</span></span><span class="block truncate text-[11px] text-[var(--ui-text-muted)]">{{ t('shell.userWorkspace') }}</span></span>
          </NuxtLink>
          <AppButton class="hidden shrink-0 lg:inline-flex" :icon="sidebarHidden ? 'i-tabler-layout-sidebar-left-expand' : 'i-tabler-layout-sidebar-left-collapse'" color="neutral" variant="ghost" :aria-label="sidebarHidden ? t('shell.expandSidebar') : t('shell.collapseSidebar')" :title="sidebarHidden ? t('shell.expandSidebar') : t('shell.collapseSidebar')" :aria-expanded="!sidebarHidden" aria-controls="workspace-sidebar" @click="sidebarHidden = !sidebarHidden" />
          <AppButton class="lg:hidden" icon="i-tabler-x" color="neutral" variant="ghost" :aria-label="t('shell.closeNavigation')" @click="closeMobile" />
        </div>

        <nav class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3" :aria-label="t('shell.userWorkspace')">
          <div v-for="group in navigationGroups" :key="group.key" class="mb-4 last:mb-0">
            <p class="mb-1.5 px-3 text-[11px] font-medium text-[var(--ui-text-dimmed)]" :class="sidebarHidden ? 'lg:sr-only' : ''">{{ group.label }}</p>
            <div class="space-y-0.5" :class="sidebarHidden ? 'lg:border-t lg:border-[var(--ui-border)] lg:pt-2' : ''">
              <NuxtLink
                v-for="item in group.items" :key="item.to" :to="item.to"
                class="user-nav-link"
                :class="[{ 'user-nav-link--active': isActive(item.to) }, sidebarHidden ? 'lg:justify-center lg:px-0' : '']"
                :aria-label="item.label" :title="sidebarHidden ? item.label : undefined"
                :aria-current="isActive(item.to) ? 'page' : undefined" @click="closeMobile"
              >
                <UIcon :name="item.icon" class="size-[18px] shrink-0" aria-hidden="true" />
                <span class="min-w-0 truncate" :class="sidebarHidden ? 'lg:hidden' : ''">{{ item.label }}</span>
              </NuxtLink>
            </div>
          </div>
        </nav>

        <div class="user-account shrink-0 border-t border-[var(--ui-border)] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" :class="sidebarHidden ? 'lg:flex lg:flex-col lg:items-center' : ''">
          <NuxtLink
            to="/app/profile"
            class="user-nav-link"
            :class="[{ 'user-nav-link--active': isActive('/app/profile') }, sidebarHidden ? 'lg:justify-center lg:px-0' : '']"
            :aria-label="t('shell.profile')" :title="sidebarHidden ? t('shell.profile') : undefined"
            :aria-current="isActive('/app/profile') ? 'page' : undefined" @click="closeMobile"
          >
            <span class="user-avatar" aria-hidden="true">{{ userInitial }}</span>
            <span class="min-w-0 flex-1 leading-tight" :class="sidebarHidden ? 'lg:hidden' : ''">
              <span class="block truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ currentUser?.username || t('shell.profile') }}</span>
              <span class="block truncate text-[11px] font-normal text-[var(--ui-text-muted)]">{{ t('shell.viewProfile') }}</span>
            </span>
          </NuxtLink>
          <div class="mt-2 flex w-full items-center gap-1 border-t border-[var(--ui-border)] pt-2" :class="sidebarHidden ? 'lg:flex-col' : ''">
            <ThemeSwitcher />
            <ConsoleLanguageSwitcher />

            <AppButton class="ml-auto" :class="sidebarHidden ? 'lg:ml-0' : ''" icon="i-tabler-logout" color="neutral" variant="ghost" :aria-label="t('shell.logout')" :title="t('shell.logout')" @click="logout" />
          </div>
        </div>
      </aside>

      <div class="relative flex h-full min-w-0 flex-col transition-[padding] duration-200 motion-reduce:transition-none" :class="sidebarHidden ? 'lg:pl-16' : 'lg:pl-64'">
        <header class="user-shell__header z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--ui-border)] px-3 sm:px-5 lg:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <AppButton class="lg:hidden" icon="i-tabler-menu-2" color="neutral" variant="ghost" :aria-label="t('shell.openNavigation')" aria-controls="workspace-sidebar" :aria-expanded="mobileOpen" @click="openMobile" />
            <span v-if="currentNavigation" class="user-page-icon hidden sm:flex" aria-hidden="true"><UIcon :name="currentNavigation.icon" class="size-4" /></span>
            <div class="min-w-0 leading-tight"><p class="truncate text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ pageTitle }}</p><p class="hidden truncate text-xs text-[var(--ui-text-muted)] sm:block">{{ pageSubtitle }}</p></div>
          </div>
          <NuxtLink
            to="/app/balance"
            class="user-credit ml-auto flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5"
            :aria-label="t('shell.creditAria', { value: creditBalance })"
            :title="t('shell.creditTitle')"
          >
            <span class="user-credit__icon"><UIcon name="i-tabler-wallet" class="size-4" /></span>
            <span class="text-left leading-tight">
              <span class="block text-[10px] font-medium text-[var(--ui-text-muted)]">{{ t('shell.totalCredit') }}</span>
              <span class="block text-sm font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ creditBalance }}</span>
            </span>
          </NuxtLink>
        </header>
        <main class="user-main min-h-0 w-full flex-1 overflow-y-auto px-4 py-5 [scrollbar-gutter:stable] sm:p-5 lg:p-6"><slot /></main>
      </div>
    </template>

    <template v-else>
      <header class="user-shell__header sticky top-0 z-30 border-b border-[var(--ui-border)]">
        <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NuxtLink :to="homeTarget" class="user-brand flex min-w-0 items-center gap-3 rounded-lg" :aria-label="t('shell.backHome')"><AppBrandMark /><span class="min-w-0 leading-tight"><span class="block truncate text-[15px] font-bold tracking-tight text-[var(--ui-text-highlighted)]">AI48<span class="user-brand-accent">Hub</span></span><span class="block truncate text-[11px] text-[var(--ui-text-muted)]">{{ pageSubtitle }}</span></span></NuxtLink>
          <div class="flex shrink-0 items-center gap-1 sm:gap-2"><AppButton v-if="route.path === '/app/login'" to="/app/models" color="neutral" variant="ghost" size="sm" icon="i-tabler-box-multiple">{{ t('shell.nav.models') }}</AppButton><ThemeSwitcher /><ConsoleLanguageSwitcher /><template v-if="route.path === '/app/models'"><AppButton :to="homeTarget" color="neutral" variant="ghost" size="sm" icon="i-tabler-home">{{ t('shell.home') }}</AppButton><AppButton v-if="!token" to="/app/login" color="primary" size="sm" class="rounded-full">{{ t('shell.signIn') }}</AppButton></template></div>
        </div>
      </header>
      <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6"><slot /></main>
    </template>
  </div>
</template>

<script setup lang="ts">
provide(Symbol.for('cliproxy-user-card'), true)
const route = useRoute()
const { t, intlLocale } = usePortalI18n()
const router = useRouter()
const { token, currentUser, clearSession, loadCurrentUser, hydrateSession, capabilities, loadCapabilities } = useUserApi()
const creditBalance = computed(() => {
  if (!currentUser.value) return '—'
  const credits = Number(currentUser.value.credits)
  return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 0 }).format(Number.isFinite(credits) ? Math.ceil(credits) : 0)
})
const mobileOpen = ref(false)
const sidebarHidden = ref(false)
const openMobile = () => { mobileOpen.value = true }
const closeMobile = () => { mobileOpen.value = false }
const publicPaths = new Set(['/app/login', '/app/register', '/app/forgot-password', '/app/reset-password', '/app/verify-email', '/app/models'])
const workspaceNavigation = computed(() => [
  { label: t('shell.nav.dashboard'), to: '/app', icon: 'i-tabler-layout-dashboard' },
  { label: t('shell.nav.balance'), to: '/app/balance', icon: 'i-tabler-wallet' },
  { label: t('shell.nav.models'), to: '/app/models', icon: 'i-tabler-box-multiple' },
  { label: t('shell.nav.apiKeys'), to: '/app/api-keys', icon: 'i-tabler-key' },
  ...(capabilities.value.request_logs === true ? [{ label: t('shell.nav.logs'), to: '/app/logs', icon: 'i-tabler-list-details' }] : []),
  { label: t('shell.nav.settings'), to: '/app/settings', icon: 'i-tabler-settings' }
])
const navigationGroups = computed(() => [
  { key: 'overview', label: t('shell.group.overview'), items: workspaceNavigation.value.filter(item => ['/app', '/app/balance'].includes(item.to)) },
  { key: 'build', label: t('shell.group.build'), items: workspaceNavigation.value.filter(item => ['/app/models', '/app/api-keys', '/app/logs'].includes(item.to)) },
  { key: 'account', label: t('shell.group.account'), items: workspaceNavigation.value.filter(item => item.to === '/app/settings') }
].filter(group => group.items.length))
const currentNavigation = computed(() => [...workspaceNavigation.value, { label: t('shell.profile'), to: '/app/profile', icon: 'i-tabler-user-circle' }].find(item => isActive(item.to)))
const userInitial = computed(() => (currentUser.value?.username || '?').trim().charAt(0).toUpperCase() || '?')
const workspaceRoute = computed(() => ['/app', '/app/balance', '/app/api-keys', '/app/settings', '/app/profile', '/app/logs'].includes(route.path) || (route.path === '/app/models' && Boolean(token.value)))
const pageTitles = computed<Record<string, string>>(() => ({ '/app/logs': t('shell.nav.logs'), '/app': t('shell.nav.dashboard'), '/app/balance': t('shell.nav.balance'), '/app/models': t('shell.nav.models'), '/app/api-keys': t('shell.nav.apiKeys'), '/app/settings': t('shell.nav.settings'), '/app/profile': t('shell.profile') }))
const workspaceSubtitles = computed<Record<string, string>>(() => ({ '/app/logs': t('shell.sub.logs'), '/app': t('shell.sub.dashboard'), '/app/balance': t('shell.sub.balance'), '/app/models': t('shell.sub.models'), '/app/api-keys': t('shell.sub.apiKeys'), '/app/profile': t('shell.sub.profile') }))
const accessSubtitles = computed<Record<string, string>>(() => ({ '/app/login': t('shell.access.login'), '/app/register': t('shell.access.register'), '/app/models': t('shell.access.models'), '/app/forgot-password': t('shell.access.forgot'), '/app/reset-password': t('shell.access.reset'), '/app/verify-email': t('shell.access.verify') }))
const pageTitle = computed(() => pageTitles.value[route.path] || t('shell.userWorkspace'))
const pageSubtitle = computed(() => workspaceRoute.value
  ? workspaceSubtitles.value[route.path] || t('shell.sub.settings')
  : accessSubtitles.value[route.path] || t('shell.access.default'))
const homeTarget = computed(() => token.value ? '/app' : '/')
const isActive = (to: string) => route.path === to

const ensureSession = async () => {
  hydrateSession()
  if (publicPaths.has(route.path)) return
  if (!token.value) { await router.replace({ path: '/app/login', query: { redirect: route.fullPath } }); return }
  try { await loadCurrentUser(); await loadCapabilities().catch(() => {}) }
  catch (cause: any) {
    if (cause?.statusCode !== 401 && cause?.code !== 'approval_pending' && token.value) return
    clearSession()
    await router.replace({ path: '/app/login', query: { redirect: route.fullPath } })
  }
}
const logout = async () => { clearSession(); await router.replace('/app/login') }
watch(() => route.fullPath, () => { closeMobile(); void ensureSession() })
onMounted(ensureSession)
</script>

<style scoped>
.user-shell--public {
  background:
    radial-gradient(ellipse 60rem 28rem at 50% -8rem, color-mix(in oklch, var(--brand-from) 12%, transparent), transparent 70%),
    var(--user-workspace-bg);
}
.user-shell--workspace { background: var(--user-workspace-bg); }
.user-scrim { background: color-mix(in oklch, var(--color-zinc-950) 45%, transparent); }
.user-sidebar { border-color: var(--ui-border); background: var(--user-panel-bg); }
.user-shell__header {
  background: color-mix(in oklch, var(--user-panel-bg) 82%, transparent);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  backdrop-filter: blur(12px) saturate(140%);
}

.user-brand-accent {
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.user-nav-link {
  position: relative;
  display: flex;
  min-height: 2.25rem;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.625rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 120ms ease, color 120ms ease;
}
.user-nav-link:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.user-nav-link--active,
.user-nav-link--active:hover {
  background: var(--user-selected);
  color: var(--ui-primary);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--ui-primary) 16%, transparent);
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

.user-page-icon {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: var(--user-selected);
  color: var(--ui-primary);
}

.user-credit {
  border: 1px solid color-mix(in oklch, var(--ui-success) 24%, var(--ui-border));
  background: color-mix(in oklch, var(--ui-success) 6%, var(--user-panel-bg));
  transition: border-color 120ms ease, background-color 120ms ease;
}
.user-credit:hover {
  border-color: color-mix(in oklch, var(--ui-success) 45%, var(--ui-border));
  background: color-mix(in oklch, var(--ui-success) 11%, var(--user-panel-bg));
}
.user-credit__icon {
  display: flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--ui-success) 16%, transparent);
  color: var(--ui-success);
}

.user-brand:focus-visible,
.user-credit:focus-visible,
.user-nav-link:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .user-shell :deep(*) { transition-duration: 0s !important; }
}
</style>
