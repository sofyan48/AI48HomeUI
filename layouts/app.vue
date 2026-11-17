<template>
  <div class="user-shell relative text-[var(--ui-text)]" :class="[workspaceRoute ? 'user-shell--workspace h-dvh overflow-hidden' : 'user-shell--public min-h-screen', { 'user-shell--login': route.path === '/app/login' }]">
    <template v-if="workspaceRoute">
      <Sheet v-if="!isDesktop" v-model:open="mobileOpen">
        <SheetContent id="workspace-mobile-sidebar" side="left" :show-close="false" :aria-describedby="undefined" class="user-sidebar w-64 max-w-[calc(100vw-2rem)] gap-0 p-0" @close-auto-focus="restoreMobileFocus">
          <SheetTitle class="sr-only">{{ t('shell.userWorkspace') }}</SheetTitle>
          <PortalNavigation :groups="navigationGroups" :collapsed="false" mobile :username="currentUser?.username" :user-initial="userInitial" @navigate="closeMobile" @logout="logout" />
        </SheetContent>
      </Sheet>
      <aside
        v-if="isDesktop"
        id="workspace-sidebar"
        class="user-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-[width] duration-200 motion-reduce:transition-none lg:inset-y-3 lg:left-3"
        :class="sidebarHidden ? 'w-[4.25rem]' : 'w-64'"
      >
        <PortalNavigation :groups="navigationGroups" :collapsed="sidebarHidden" :username="currentUser?.username" :user-initial="userInitial" @navigate="closeMobile" @logout="logout" @toggle-collapse="sidebarHidden = !sidebarHidden" />
      </aside>

      <div class="relative flex h-full min-h-0 min-w-0 flex-col transition-[padding] duration-200 motion-reduce:transition-none lg:py-3 lg:pr-3" :class="sidebarHidden ? 'lg:pl-[5.75rem]' : 'lg:pl-[17.5rem]'">
        <div class="user-canvas flex min-h-0 min-w-0 flex-1 flex-col">
        <header class="user-shell__header user-workspace-header z-30 flex h-[4.25rem] shrink-0 items-center px-3 [scrollbar-gutter:stable] sm:px-6">
          <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <AppButton class="lg:hidden" icon="i-tabler-menu-2" color="neutral" variant="ghost" :aria-label="t('shell.openNavigation')" aria-controls="workspace-mobile-sidebar" aria-haspopup="dialog" :aria-expanded="mobileOpen" @click="openMobile" />
            <span v-if="currentNavigation" class="user-page-icon hidden sm:flex" aria-hidden="true"><AppIcon :name="currentNavigation.icon" class="size-4" /></span>
            <div class="min-w-0 leading-tight">
                          <p class="hidden items-center gap-1 text-[11px] font-medium text-muted-foreground sm:flex"><span>AI48Hub</span><AppIcon name="i-tabler-slash" class="size-3" aria-hidden="true" /><span class="truncate">{{ t('shell.userWorkspace') }}</span></p>
                          <p class="user-page-title truncate" :title="pageSubtitle">{{ pageTitle }}</p>
                        </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">

          <NuxtLink
            to="/app/balance"
            class="user-credit ml-auto flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5"
            :aria-label="t('shell.creditAria', { value: creditBalance })"
            :title="t('shell.creditTitle')"
          >
            <span class="user-credit__icon"><AppIcon name="i-tabler-wallet" class="size-4" /></span>
            <span class="text-left leading-tight">
              <span class="block text-[10px] font-medium text-[var(--ui-text-muted)]">{{ t('shell.totalCredit') }}</span>
              <span class="block text-sm font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ creditBalance }}</span>
            </span>
          </NuxtLink>
          </div>
          </div>
        </header>
        <main class="user-main min-h-0 w-full flex-1 overflow-y-auto px-3 pb-6 pt-1 [scrollbar-gutter:stable] sm:px-6"><slot /></main>
        </div>
      </div>
    </template>

    <template v-else>
      <header v-if="route.path !== '/app/login'" class="user-shell__header sticky top-0 z-30 border-b border-[var(--ui-border)]">
        <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NuxtLink :to="homeTarget" class="user-brand flex min-w-0 items-center gap-3 rounded-lg" :aria-label="t('shell.backHome')"><AppBrandMark /><span class="min-w-0 leading-tight"><span class="block truncate text-[15px] font-bold tracking-tight text-[var(--ui-text-highlighted)]">AI48<span class="user-brand-accent">Hub</span></span><span class="block truncate text-[11px] text-[var(--ui-text-muted)]">{{ pageSubtitle }}</span></span></NuxtLink>
          <div class="flex shrink-0 items-center gap-1 sm:gap-2"><AppButton v-if="route.path === '/app/login'" to="/app/models" color="neutral" variant="ghost" size="sm" icon="i-tabler-box-multiple">{{ t('shell.nav.models') }}</AppButton><PortalThemeSwitcher /><PortalLanguageSwitcher /><template v-if="route.path === '/app/models'"><AppButton :to="homeTarget" color="neutral" variant="ghost" size="sm" icon="i-tabler-home">{{ t('shell.home') }}</AppButton><AppButton v-if="!token" to="/app/login" color="primary" size="sm" class="rounded-full">{{ t('shell.signIn') }}</AppButton></template></div>
        </div>
      </header>
      <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6"><slot /></main>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { useMediaQuery } from '@vueuse/core'
import { Sheet, SheetContent, SheetTitle } from '~/components/ui/sheet'
import PortalNavigation from '~/components/app/general/PortalNavigation.vue'
import PortalThemeSwitcher from '~/components/app/general/PortalThemeSwitcher.vue'
import PortalLanguageSwitcher from '~/components/app/general/PortalLanguageSwitcher.vue'
import { usePortalSessionGuard } from '~/composables/portal/usePortalSessionGuard'
provide(Symbol.for('cliproxy-user-card'), true)
const route = useRoute()
const { t, intlLocale } = usePortalI18n()
const router = useRouter()
const { token, currentUser, clearSession, capabilities } = useUserApi()
usePortalSessionGuard()
const creditBalance = computed(() => {
  if (!currentUser.value) return '—'
  const credits = Number(currentUser.value.credits)
  return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 0 }).format(Number.isFinite(credits) ? Math.ceil(credits) : 0)
})
const mobileOpen = ref(false)
const sidebarHidden = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')
let mobileTrigger: HTMLElement | null = null
const openMobile = (event: MouseEvent) => {
  mobileTrigger = event.currentTarget as HTMLElement
  mobileOpen.value = true
}
const closeMobile = () => { mobileOpen.value = false }
const restoreMobileFocus = (event: Event) => {
  event.preventDefault()
  if (!isDesktop.value && mobileTrigger?.isConnected) mobileTrigger.focus({ preventScroll: true })
}
watch(isDesktop, closeMobile)

const workspaceNavigation = computed(() => [
  { label: t('shell.nav.dashboard'), to: '/app', icon: 'i-tabler-layout-dashboard' },
  { label: t('shell.nav.balance'), to: '/app/balance', icon: 'i-tabler-wallet' },
  { label: t('shell.nav.playground'), to: '/app/playground', icon: 'i-tabler-message-chatbot' },
  { label: t('shell.nav.catalog'), to: '/app/models', icon: 'i-tabler-box-multiple' },
  { label: t('shell.nav.price'), to: '/app/models/price', icon: 'i-tabler-tag' },
  { label: t('shell.nav.apiKeys'), to: '/app/api-keys', icon: 'i-tabler-key' },
  ...(capabilities.value.request_logs === true ? [{ label: t('shell.nav.logs'), to: '/app/logs', icon: 'i-tabler-list-details' }] : []),
  { label: t('shell.nav.settings'), to: '/app/settings', icon: 'i-tabler-settings' }
])
const navigationGroups = computed(() => [
  { key: 'overview', label: t('shell.group.overview'), items: workspaceNavigation.value.filter(item => ['/app', '/app/balance'].includes(item.to)) },
  { key: 'playground', label: t('shell.group.playground'), items: workspaceNavigation.value.filter(item => item.to === '/app/playground') },
  { key: 'model', label: t('shell.group.model'), items: workspaceNavigation.value.filter(item => ['/app/models', '/app/models/price'].includes(item.to)) },
  { key: 'build', label: t('shell.group.build'), items: workspaceNavigation.value.filter(item => ['/app/api-keys', '/app/logs'].includes(item.to)) },
  { key: 'account', label: t('shell.group.account'), items: workspaceNavigation.value.filter(item => item.to === '/app/settings') }
].filter(group => group.items.length))
const currentNavigation = computed(() => [...workspaceNavigation.value, { label: t('shell.profile'), to: '/app/profile', icon: 'i-tabler-user-circle' }].find(item => isActive(item.to)))
const userInitial = computed(() => (currentUser.value?.username || '?').trim().charAt(0).toUpperCase() || '?')
const workspaceRoute = computed(() => ['/app', '/app/balance', '/app/playground', '/app/models/price', '/app/api-keys', '/app/settings', '/app/profile', '/app/logs'].includes(route.path) || (route.path === '/app/models' && Boolean(token.value)))
const pageTitles = computed<Record<string, string>>(() => ({ '/app/playground': t('shell.nav.playground'), '/app/logs': t('shell.nav.logs'), '/app': t('shell.nav.dashboard'), '/app/balance': t('shell.nav.balance'), '/app/models': t(workspaceRoute.value ? 'shell.nav.catalog' : 'shell.nav.models'), '/app/models/price': t('shell.nav.price'), '/app/api-keys': t('shell.nav.apiKeys'), '/app/settings': t('shell.nav.settings'), '/app/profile': t('shell.profile') }))
const workspaceSubtitles = computed<Record<string, string>>(() => ({ '/app/playground': t('shell.sub.playground'), '/app/logs': t('shell.sub.logs'), '/app': t('shell.sub.dashboard'), '/app/balance': t('shell.sub.balance'), '/app/models': t('shell.sub.models'), '/app/models/price': t('shell.sub.price'), '/app/api-keys': t('shell.sub.apiKeys'), '/app/profile': t('shell.sub.profile') }))
const accessSubtitles = computed<Record<string, string>>(() => ({ '/app/login': t('shell.access.login'), '/app/register': t('shell.access.register'), '/app/models': t('shell.access.models'), '/app/forgot-password': t('shell.access.forgot'), '/app/reset-password': t('shell.access.reset'), '/app/verify-email': t('shell.access.verify') }))
const pageTitle = computed(() => pageTitles.value[route.path] || t('shell.userWorkspace'))
const pageSubtitle = computed(() => workspaceRoute.value
  ? workspaceSubtitles.value[route.path] || t('shell.sub.settings')
  : accessSubtitles.value[route.path] || t('shell.access.default'))
const homeTarget = computed(() => token.value ? '/app' : '/')
const isActive = (to: string) => route.path === to

const logout = async () => { clearSession(); await router.replace('/app/login') }
watch(() => route.fullPath, closeMobile)
</script>

<style scoped>
.user-shell--public {
  background:
    radial-gradient(ellipse 60rem 28rem at 50% -8rem, color-mix(in oklch, var(--brand-from) 12%, transparent), transparent 70%),
    var(--user-workspace-bg);
}
.user-shell--workspace {
  background:
    radial-gradient(60rem 40rem at 0% 0%, color-mix(in oklch, var(--color-violet-500) 14%, transparent), transparent 60%),
    radial-gradient(50rem 30rem at 100% 100%, color-mix(in oklch, var(--color-fuchsia-500) 10%, transparent), transparent 60%),
    var(--user-shell-bg);
}
.user-canvas { background: var(--user-workspace-bg); }
@media (min-width: 64rem) {
  .user-canvas {
    overflow: hidden;
    border: 1px solid var(--user-panel-border);
    border-radius: 1.375rem;
    box-shadow: 0 1px 2px rgb(24 24 27 / 4%), 0 30px 60px -40px rgb(76 29 149 / 30%);
  }
  .user-sidebar { border-radius: 0.5rem; }
}
.user-shell--login,
.user-shell--workspace .user-main {
  background:
    radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--ui-text-dimmed) 22%, transparent) 1px, transparent 0) 0 0 / 22px 22px,
    var(--user-workspace-bg);
}
.user-sidebar {
  --ui-primary: var(--ui-color-primary-300, var(--color-violet-300));
  --ui-bg: var(--user-rail-bg);
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
  background: var(--user-rail-bg);
  border: 1px solid rgb(255 255 255 / 6%);
  color-scheme: dark;
}
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

.user-page-title { font-size: 1.125rem; line-height: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: var(--ui-text-highlighted); }

.user-workspace-header {
  background: var(--user-workspace-bg);
  backdrop-filter: none;
  /* Reserve the same scrollbar gutter as the content so their right edges align. */
  overflow-y: hidden;
}
.user-page-icon {
  width: 2.375rem;
  height: 2.375rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, var(--color-violet-500), var(--color-fuchsia-500));
  color: var(--color-white);
  box-shadow: 0 8px 18px -8px color-mix(in oklch, var(--color-violet-500) 70%, transparent);
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
.user-credit:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .user-shell :deep(*) { transition-duration: 0s !important; }
}
</style>
