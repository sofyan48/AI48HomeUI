<template>
  <div class="admin-console admin-shell relative h-dvh w-full overflow-hidden text-[var(--ui-text)]" :data-page-tone="pageTone">
    <div v-if="mobileOpen" aria-hidden="true" class="admin-navigation-overlay fixed inset-0 z-40 lg:hidden" @click="closeMobile" />

    <aside
      id="management-sidebar"
      ref="sidebarElement"
      :role="mobileOpen ? 'dialog' : undefined"
      :aria-modal="mobileOpen ? true : undefined"
      :aria-label="tc('shell.management')"
      :inert="!desktopViewport && !mobileOpen"
      class="admin-sidebar admin-rail fixed inset-y-0 left-0 z-50 flex w-64 max-w-[calc(100vw-2rem)] flex-col transition-[transform,width] duration-200 motion-reduce:transition-none lg:inset-y-3 lg:left-3 lg:translate-x-0"
      @keydown="handleSidebarKeydown"
      :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', sidebarCollapsed ? 'lg:w-[4.25rem]' : 'lg:w-64']"
    >
      <div class="flex h-16 shrink-0 items-center gap-3 px-4" :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''">
        <NuxtLink to="/admin/dashboard" class="admin-brand flex min-w-0 flex-1 items-center gap-3 rounded-lg" :class="sidebarCollapsed ? 'lg:flex-none' : ''" title="AI48Hub" aria-label="AI48Hub" @click="closeMobile">
          <AppBrandMark />
          <div class="min-w-0 leading-tight" :class="sidebarCollapsed ? 'lg:hidden' : ''">
            <p class="admin-wordmark truncate">AI48<span class="admin-brand-accent">Hub</span></p>
            <p class="truncate text-[11px] text-[var(--ui-text-muted)]">{{ tc('shell.tagline') }}</p>
          </div>
        </NuxtLink>

        <AppButton class="lg:hidden" icon="i-tabler-x" color="neutral" variant="ghost" :aria-label="tc('shell.closeNavigation')" @click="closeMobile" />
      </div>

      <div class="admin-rail__divider" aria-hidden="true" />

      <nav :aria-label="tc('shell.management')" class="admin-rail__nav min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        <div v-for="section in visibleSections" :key="section.label" class="mb-4 last:mb-0">
          <p class="admin-rail__section" :class="sidebarCollapsed ? 'lg:sr-only' : ''">
            {{ section.label }}
          </p>
          <div class="space-y-0.5" :class="sidebarCollapsed && section.label !== tc('nav.operate') ? 'lg:border-t lg:border-[var(--ui-border)] lg:pt-2' : ''">
            <NuxtLink
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              class="admin-rail__item"
              :data-tone="section.tone"
              :class="[sidebarCollapsed ? 'lg:justify-center lg:px-0' : '', { 'admin-rail__item--active': isActive(item) }]"
              :aria-label="item.label"
              :aria-current="isActive(item) ? 'page' : undefined"
              :title="sidebarCollapsed ? item.label : undefined"
              @click="closeMobile"
            >
              <span class="admin-rail__glyph" aria-hidden="true"><UIcon :name="item.icon" class="size-[1.0625rem]" /></span>
              <span class="min-w-0 flex-1 truncate" :class="sidebarCollapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
              <UIcon v-if="isActive(item)" name="i-tabler-chevron-right" class="size-3.5 shrink-0 opacity-70" :class="sidebarCollapsed ? 'lg:hidden' : ''" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="admin-rail__footer" :class="sidebarCollapsed ? 'lg:flex-col lg:px-1.5' : ''">
        <button
          type="button"
          :aria-label="tc('shell.manageConnection')"
          class="admin-connection-status flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left"
          :class="sidebarCollapsed ? 'lg:w-full lg:justify-center lg:px-0' : ''"
          :title="connectionStatus.label"
          @click="openConnection"
        >
          <span class="admin-rail__avatar" aria-hidden="true">
            <UIcon name="i-tabler-shield-check" class="size-4" />
            <span class="admin-status-dot absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-[var(--admin-rail-bg)]" :class="connectionStatus.dot" />
          </span>
          <span class="min-w-0 leading-tight" :class="sidebarCollapsed ? 'lg:sr-only' : ''">
            <span class="block truncate text-xs font-semibold text-[var(--ui-text-highlighted)]">{{ tc('shell.management') }}</span>
            <span role="status" class="block truncate text-[11px] text-[var(--ui-text-muted)]">{{ connectionStatus.label }}</span>
          </span>
        </button>
        <AppButton icon="i-tabler-plug-off" color="neutral" variant="ghost" size="sm" :aria-label="tc('shell.disconnect')" :title="tc('shell.disconnect')" :disabled="!token" @click="handleDisconnect" />
      </div>
    </aside>

    <div :inert="mobileOpen" class="relative z-10 flex h-full min-h-0 min-w-0 flex-col transition-[padding] duration-200 motion-reduce:transition-none lg:py-3 lg:pr-3" :class="sidebarCollapsed ? 'lg:pl-[5.75rem]' : 'lg:pl-[17.5rem]'">
      <div class="admin-canvas flex min-h-0 min-w-0 flex-1 flex-col">
        <header class="admin-workspace-header z-30 flex h-[4.25rem] shrink-0 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <AppButton class="shrink-0 lg:hidden" icon="i-tabler-menu-2" color="neutral" variant="ghost" :aria-label="tc('shell.openNavigation')" aria-controls="management-sidebar" :aria-expanded="mobileOpen" @click="openMobile" />
            <AppButton
              class="hidden shrink-0 lg:inline-flex"
              :icon="sidebarCollapsed ? 'i-tabler-layout-sidebar-left-expand' : 'i-tabler-layout-sidebar-left-collapse'"
              color="neutral"
              variant="ghost"
              :aria-label="sidebarCollapsed ? tc('shell.expandSidebar') : tc('shell.collapseSidebar')"
              :title="sidebarCollapsed ? tc('shell.expandSidebar') : tc('shell.collapseSidebar')"
              :aria-expanded="!sidebarCollapsed"
              aria-controls="management-sidebar"
              @click="toggleSidebar"
            />
            <span v-if="currentNavigation" class="admin-page-glyph hidden sm:flex" aria-hidden="true"><UIcon :name="currentNavigation.icon" class="size-[1.125rem]" /></span>
            <div class="min-w-0 leading-tight">
              <nav :aria-label="t('shared.breadcrumb')" class="hidden items-center gap-1 text-[11px] font-medium text-[var(--ui-text-muted)] sm:flex">
                <span>AI48Hub</span>
                <template v-if="currentSection"><UIcon name="i-tabler-slash" class="size-3 text-[var(--ui-text-dimmed)]" aria-hidden="true" /><span class="truncate">{{ currentSection }}</span></template>
              </nav>
              <p class="admin-page-title truncate" :title="pageSubtitle || undefined" aria-current="page">{{ pageTitle }}</p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="admin-search hidden md:flex" :aria-label="tc('shell.search')" aria-haspopup="dialog" @click="openCommands">
              <UIcon name="i-tabler-search" class="size-4 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-left">{{ tc('shell.search') }}</span>
              <kbd>⌘K</kbd>
            </button>
            <div class="admin-dock">
              <AppButton class="md:hidden" icon="i-tabler-search" color="neutral" variant="ghost" size="sm" :aria-label="tc('shell.search')" :title="tc('shell.search')" aria-haspopup="dialog" @click="openCommands" />
              <ThemeSwitcher />
              <ConsoleLanguageSwitcher />
              <AppButton icon="i-tabler-plug" color="neutral" variant="ghost" size="sm" :aria-label="tc('shell.manageConnection')" :title="tc('shell.manageConnection')" aria-haspopup="dialog" @click="openConnection" />
              <AppButton
                icon="i-tabler-refresh"
                color="primary"
                variant="solid"
                size="sm"
                class="rounded-full"
                :loading="syncing"
                :disabled="syncing || !token"
                :aria-label="tc('shell.sync')"
                :title="tc('shell.sync')"
                @click="syncData"
              />
            </div>
          </div>
        </header>

        <main class="workbench-main admin-canvas__body min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto [scrollbar-gutter:stable] !px-3 !pb-6 !pt-1 sm:!px-6">
          <UAlert
            v-if="capabilitiesError"
            class="mx-auto mb-4 max-w-[96rem]"
            color="warning"
            variant="subtle"
            icon="i-tabler-alert-triangle"
            :title="tc('shell.capabilitiesError')"
            :description="capabilitiesError"
          />
          <div class="admin-page mx-auto w-full max-w-[96rem]">
            <slot />
          </div>
        </main>
      </div>
    </div>
    <AdminCommandPalette v-model:open="commandOpen" :groups="commandGroups" :disabled="connectionOpen || mobileOpen" />
    <AdminConnectionDialog v-model:open="connectionOpen" :status-label="connectionStatus.label" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import { useManagementSessionStore } from '~/stores/managementSession'
import { useManagementConfigStore } from '~/stores/managementConfig'
import { useWorkspaceStore } from '~/stores/workspace'

interface NavigationItem {
  label: string
  to: string
  icon: string
  capability?: string
  subtitle?: string
}

function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }

const { t: tc } = useConsoleLocale()
const { t } = useAdminI18n()
const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
const { token } = useApi()
const { rememberSession: managementRemember } = storeToRefs(useManagementSessionStore())
const {
  loading: capabilitiesLoading,
  loaded: capabilitiesLoaded,
  error: capabilitiesError,
  supports,
  refreshCapabilities,
  resetCapabilities
} = useCapabilities()

const workspace = useWorkspaceStore()
const managementConfig = useManagementConfigStore()
const commandOpen = ref(false)
const connectionOpen = ref(false)
const connectionStatus = computed(() => {
  if (!token.value) return { label: tc('connection.disconnected'), dot: 'bg-[var(--ui-text-dimmed)]' }
  if (capabilitiesLoading.value) return { label: tc('connection.checking'), dot: 'motion-safe:animate-pulse bg-[var(--ui-primary)]' }
  if (capabilitiesError.value) return { label: tc('connection.failed'), dot: 'bg-[var(--ui-warning)]' }
  if (capabilitiesLoaded.value) return { label: tc('connection.connected'), dot: 'bg-[var(--ui-success)]' }
  return { label: tc('connection.checking'), dot: 'motion-safe:animate-pulse bg-[var(--ui-primary)]' }
})
const openConnection = () => {
  commandOpen.value = false
  closeMobile()
  connectionOpen.value = true
}
const openCommands = () => {
  connectionOpen.value = false
  closeMobile()
  commandOpen.value = true
}
const syncing = ref(false)
const toast = useToast()
const syncData = async () => {
  if (syncing.value || !token.value) return
  syncing.value = true
  try {
    managementConfig.invalidate()
    const results = await Promise.allSettled([refreshCapabilities(true), workspace.sync('admin:')])
    const failed = results.find(result => result.status === 'rejected')
    if (failed?.status === 'rejected') throw failed.reason
    toast.add({ title: tc('shell.syncSuccess'), color: 'success' })
  } catch (cause: any) {
    toast.add({ title: tc('shell.syncFailed'), description: cause?.message || tc('shell.syncError'), color: 'error' })
  } finally {
    syncing.value = false
  }
}

const mobileOpen = ref(false)
const sidebarCollapsed = ref(false)
const sidebarElement = ref<HTMLElement | null>(null)
const desktopViewport = ref(false)
let mobileTrigger: HTMLElement | null = null
const closeMobile = () => {
  if (!mobileOpen.value) return
  mobileOpen.value = false
  nextTick(() => mobileTrigger?.focus())
}
const openMobile = () => {
  mobileTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  mobileOpen.value = true
  nextTick(() => sidebarElement.value?.querySelector<HTMLElement>('a, button')?.focus())
}
const handleSidebarKeydown = (event: KeyboardEvent) => {
  if (!mobileOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMobile()
    return
  }
  if (event.key !== 'Tab') return
  const controls = Array.from(sidebarElement.value?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]') || [])
    .filter(element => element.getClientRects().length > 0)
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

onMounted(() => {
  const desktopQuery = window.matchMedia('(min-width: 1024px)')
  const updateViewport = () => {
    desktopViewport.value = desktopQuery.matches
    if (desktopQuery.matches) closeMobile()
  }
  updateViewport()
  desktopQuery.addEventListener('change', updateViewport)
  onBeforeUnmount(() => desktopQuery.removeEventListener('change', updateViewport))
})

const navigationSections = computed<Array<{ label: string; tone: string; items: NavigationItem[] }>>(() => [
  {
    label: tc('nav.operate'), tone: 'violet',
    items: [{ label: tc('nav.dashboard'), to: '/admin/dashboard', icon: 'i-tabler-grid-dots', subtitle: tc('nav.dashboardDescription') }]
  },
  {
    label: tc('nav.gateway'), tone: 'violet',
    items: [
      { label: tc('nav.upstream'), to: '/admin/upstream', icon: 'i-tabler-cloud-upload', subtitle: tc('nav.upstreamDescription') },
      { label: tc('nav.models'), to: '/admin/routing/models', icon: 'i-tabler-box-multiple', subtitle: tc('nav.modelsDescription') },
      { label: tc('nav.accessKeys'), to: '/admin/access-keys', icon: 'i-tabler-key', subtitle: tc('nav.accessKeysDescription') },
      { label: tc('nav.users'), to: '/admin/users', icon: 'i-tabler-users', subtitle: tc('nav.usersDescription'), capability: 'users' }
    ]
  },
  {
    label: tc('nav.observe'), tone: 'blue',
    items: [
      { label: tc('nav.usage'), to: '/admin/usage', icon: 'i-tabler-chart-bar', subtitle: tc('nav.usageDescription'), capability: 'usage_records' },
      { label: tc('nav.diagnostics'), to: '/admin/diagnostics', icon: 'i-tabler-tools', subtitle: tc('nav.diagnosticsDescription') },
      { label: tc('nav.logs'), to: '/admin/logs', icon: 'i-tabler-file-text', subtitle: tc('nav.logsDescription'), capability: 'logs' }
    ]
  },
  {
    label: tc('nav.finance'), tone: 'emerald',
    items: [{ label: tc('nav.billing'), to: '/admin/billing', icon: 'i-tabler-cash-banknote', subtitle: tc('nav.billingDescription') }]
  },
  {
    label: tc('nav.control'), tone: 'amber',
    items: [
      { label: tc('nav.config'), to: '/admin/config', icon: 'i-tabler-adjustments-horizontal', subtitle: tc('nav.configDescription') },
      { label: tc('nav.plugins'), to: '/admin/plugins', icon: 'i-tabler-puzzle', subtitle: tc('nav.pluginsDescription') },
      { label: tc('nav.system'), to: '/admin/system-nodes', icon: 'i-tabler-server-2', subtitle: tc('nav.systemDescription'), capability: 'topology' }
    ]
  }
])

const visibleSections = computed(() => navigationSections.value
  .map(section => ({
    ...section,
    items: section.items.filter(item => !item.capability || supports(item.capability, true))
  }))
  .filter(section => section.items.length))

const isActive = (item: NavigationItem) => item.to === '/admin/upstream'
  ? ['/admin/upstream', '/admin/providers', '/admin/credentials', '/admin/quota'].includes(route.path)
  : item.to === '/admin/usage'
    ? ['/admin/usage', '/admin/request-events'].includes(route.path)
    : item.to === '/admin/config'
      ? route.path === '/admin/config' || (route.path.startsWith('/admin/routing/') && route.path !== '/admin/routing/models')
      : route.path === item.to

const currentNavigation = computed(() => navigationSections.value.flatMap(section => section.items).find(isActive))
const pageTitle = computed(() => currentNavigation.value?.label || tc('shell.management'))
const pageSubtitle = computed(() => currentNavigation.value?.subtitle || '')
const currentSectionEntry = computed(() => navigationSections.value.find(section => section.items.some(isActive)))
const currentSection = computed(() => currentSectionEntry.value?.label || '')
// Section tone drives --page-accent so every area of the console has its own colour.
const pageTone = computed(() => currentSectionEntry.value?.tone || 'violet')

const commandGroups = computed(() => [
  ...visibleSections.value.map(section => ({
    id: section.label,
    label: section.label,
    items: section.items.map(item => ({
      label: item.label,
      description: item.subtitle,
      icon: item.icon,
      onSelect: () => {
        commandOpen.value = false
        closeMobile()
        void router.push(item.to)
      }
    }))
  })),
  {
    id: 'actions',
    label: tc('shell.globalActions'),
    items: [
      { label: tc('shell.manageConnection'), description: tc('shell.connectionDescription'), icon: 'i-tabler-plug', onSelect: openConnection },
      { label: tc('shell.sync'), icon: 'i-tabler-refresh', disabled: syncing.value || !token.value, onSelect: () => { commandOpen.value = false; void syncData() } },
      { label: sidebarCollapsed.value ? tc('shell.expandSidebar') : tc('shell.collapseSidebar'), icon: 'i-tabler-layout-sidebar', onSelect: () => { commandOpen.value = false; toggleSidebar() } },
      ...[
        { label: tc('shell.lightTheme'), value: 'light', icon: 'i-tabler-sun' },
        { label: tc('shell.darkTheme'), value: 'dark', icon: 'i-tabler-moon' },
        { label: tc('shell.systemTheme'), value: 'system', icon: 'i-tabler-device-desktop' }
      ].map(theme => ({ label: theme.label, icon: theme.icon, onSelect: () => { colorMode.preference = theme.value; commandOpen.value = false } })),
      { label: tc('shell.disconnect'), icon: 'i-tabler-plug-off', disabled: !token.value, onSelect: () => { commandOpen.value = false; handleDisconnect() } }
    ]
  }
])

watch(() => route.fullPath, () => { closeMobile(); commandOpen.value = false })

onMounted(async () => {
  if (!token.value) {
    openConnection()
    return
  }
  try {
    await refreshCapabilities()
  } catch {
    // Keep the workspace in place; the connection dialog can repair the session.
  }
})

const handleDisconnect = () => {
  token.value = null
  managementRemember.value = false
  resetCapabilities()
  openConnection()
}
</script>

<style scoped>
/* AI48Hub shell: floating ink rail + rounded canvas. */
.admin-shell {
  background:
    radial-gradient(60rem 40rem at 0% 0%, color-mix(in oklch, var(--color-violet-500) 14%, transparent), transparent 60%),
    radial-gradient(50rem 30rem at 100% 100%, color-mix(in oklch, var(--color-fuchsia-500) 10%, transparent), transparent 60%),
    var(--admin-shell-bg);
}

.admin-navigation-overlay { background: var(--admin-scrim); }

/* Rail always uses a dark ink palette, in light and dark themes. */
.admin-rail {
  --ui-primary: var(--color-violet-300);
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
  background:
    radial-gradient(18rem 14rem at 0% 0%, color-mix(in oklch, var(--color-violet-500) 28%, transparent), transparent 70%),
    radial-gradient(16rem 12rem at 100% 100%, color-mix(in oklch, var(--color-fuchsia-500) 16%, transparent), transparent 70%),
    var(--admin-rail-bg) !important;
  border: 1px solid rgb(255 255 255 / 6%) !important;
  color-scheme: dark;
}
@media (min-width: 64rem) {
  .admin-rail {
    border-radius: 1.375rem !important;
    box-shadow: 0 24px 48px -24px rgb(24 12 48 / 55%) !important;
  }
}
.admin-rail__divider {
  height: 1px;
  margin-inline: 1rem;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 12%), transparent);
}
.admin-wordmark {
  font-size: 1.0625rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--ui-text-highlighted);
}
.admin-brand-accent {
  background: linear-gradient(90deg, var(--color-violet-300), var(--color-fuchsia-300));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.admin-rail__section {
  margin-bottom: 0.375rem;
  padding-inline: 0.75rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
}
.admin-rail__item {
  position: relative;
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3125rem 0.625rem 0.3125rem 0.3125rem;
  border-radius: 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ui-text);
  transition: background-color 140ms ease, color 140ms ease;
}
.admin-rail__glyph {
  display: flex;
  width: 1.875rem;
  height: 1.875rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: rgb(255 255 255 / 5%);
  color: var(--ui-text-muted);
  transition: background-color 140ms ease, color 140ms ease;
}
.admin-rail__item:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.admin-rail__item:hover .admin-rail__glyph { color: var(--ui-text-highlighted); }
.admin-rail__item:focus-visible { outline: 2px solid var(--color-violet-300); outline-offset: 1px; }
.admin-rail__item--active,
.admin-rail__item--active:hover {
  background: linear-gradient(90deg, color-mix(in oklch, var(--item-a) 30%, transparent), color-mix(in oklch, var(--item-b) 10%, transparent)) !important;
  color: var(--color-white) !important;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 8%);
}
.admin-rail__item--active .admin-rail__glyph {
  background: linear-gradient(135deg, var(--item-a), var(--item-b));
  color: var(--color-white);
  box-shadow: 0 6px 16px -6px color-mix(in oklch, var(--item-b) 70%, transparent);
}
.admin-rail__footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  margin: 0.625rem;
  padding: 0.25rem;
  border: 1px solid rgb(255 255 255 / 7%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 4%);
}
.admin-rail__avatar {
  position: relative;
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: rgb(255 255 255 / 8%);
  color: var(--color-violet-200);
}
.admin-brand:focus-visible,
.admin-connection-status:focus-visible {
  outline: 2px solid var(--color-violet-300);
  outline-offset: 2px;
}
.admin-connection-status:hover { background: var(--ui-hover); }

/* Section tones: one accent per console area. */
.admin-shell { --page-accent: var(--color-violet-500); --page-accent-2: var(--color-fuchsia-500); }
.admin-shell[data-page-tone="blue"] { --page-accent: var(--color-blue-500); --page-accent-2: var(--color-cyan-400); }
.admin-shell[data-page-tone="emerald"] { --page-accent: var(--color-emerald-500); --page-accent-2: var(--color-teal-400); }
.admin-shell[data-page-tone="amber"] { --page-accent: var(--color-amber-500); --page-accent-2: var(--color-orange-500); }
.admin-rail__item[data-tone="blue"] { --item-a: var(--color-blue-500); --item-b: var(--color-cyan-400); }
.admin-rail__item[data-tone="emerald"] { --item-a: var(--color-emerald-500); --item-b: var(--color-teal-400); }
.admin-rail__item[data-tone="amber"] { --item-a: var(--color-amber-500); --item-b: var(--color-orange-500); }
.admin-rail__item { --item-a: var(--color-violet-500); --item-b: var(--color-fuchsia-500); }
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

/* Canvas: one rounded sheet holding header and content. */
.admin-canvas { background: var(--admin-workspace-bg); }
@media (min-width: 64rem) {
  .admin-canvas {
    overflow: hidden;
    border: 1px solid var(--admin-panel-border);
    border-radius: 1.375rem;
    box-shadow: 0 1px 2px rgb(24 24 27 / 4%), 0 30px 60px -40px rgb(76 29 149 / 30%);
  }
}
.admin-canvas__body {
  background:
    radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--ui-text-dimmed) 22%, transparent) 1px, transparent 0) 0 0 / 22px 22px,
    var(--admin-workspace-bg) !important;
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
  .admin-rail__item, .admin-rail__glyph, .admin-search { transition: none; }
}
</style>
