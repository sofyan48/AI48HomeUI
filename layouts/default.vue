<template>
  <div class="admin-console admin-shell relative h-dvh w-full overflow-hidden text-[var(--ui-text)]" :data-page-tone="pageTone" :class="{ 'admin-shell--locked': !token }">
      <template v-if="token">
    <div v-if="mobileOpen" aria-hidden="true" class="admin-navigation-overlay fixed inset-0 z-40 lg:hidden" @click="closeMobile" />
    <LayoutSidebar
      ref="sidebar"
      :sections="visibleSections"
      :is-active="isActive"
      :status="connectionStatus"
      :connected="!!token"
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileOpen"
      :desktop-viewport="desktopViewport"
      @close="closeMobile"
      @toggle-sidebar="toggleSidebar"
      @keydown="handleSidebarKeydown"
      @manage="openConnection"
      @disconnect="handleDisconnect"
    />
    <div :inert="mobileOpen" class="relative z-10 flex h-full min-h-0 min-w-0 flex-col transition-[padding] duration-200 motion-reduce:transition-none lg:py-3 lg:pr-3" :class="sidebarCollapsed ? 'lg:pl-[5.75rem]' : 'lg:pl-[17.5rem]'">
      <div class="admin-canvas flex min-h-0 min-w-0 flex-1 flex-col">
        <LayoutHeader
          :title="pageTitle"
          :subtitle="pageSubtitle"
          :section="currentSection"
          :page-icon="currentNavigation?.icon"

          :mobile-open="mobileOpen"
          :syncing="syncing"
          :connected="!!token"
          @open-mobile="openMobile"

          @open-commands="openCommands"
          @open-connection="openConnection"
          @sync="syncData"
        />
        <main class="workbench-main admin-canvas__body min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto [scrollbar-gutter:stable] !px-3 !pb-6 !pt-1 sm:!px-6">
          <PortalAlert
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
    </template>
    <AdminConnectionDialog v-model:open="connectionOpen" :status-label="connectionStatus.label" />
  </div>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AdminCommandPalette from '~/components/admin/layout/CommandPalette.vue'
import AdminConnectionDialog from '~/components/admin/layout/ConnectionDialog.vue'
import LayoutSidebar from '~/components/admin/layout/LayoutSidebar.vue'
import LayoutHeader from '~/components/admin/layout/LayoutHeader.vue'
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import { useAdminNavigation } from '~/composables/layout/useAdminNavigation'
import { useAdminConnection } from '~/composables/layout/useAdminConnection'
import { useAdminSidebar } from '~/composables/layout/useAdminSidebar'
import { useAdminCommands } from '~/composables/layout/useAdminCommands'

const { t: tc } = useConsoleLocale()
const route = useRoute()
const { visibleSections, isActive, currentNavigation, pageTitle, pageSubtitle, currentSection, pageTone } = useAdminNavigation()
const { token, capabilitiesError, connectionStatus, syncing, syncData, refreshCapabilities, clearSession } = useAdminConnection()
const sidebar = ref<InstanceType<typeof LayoutSidebar> | null>(null)
const sidebarElement = computed(() => sidebar.value?.element ?? null)
const { mobileOpen, sidebarCollapsed, desktopViewport, toggleSidebar, closeMobile, openMobile, handleSidebarKeydown } = useAdminSidebar(sidebarElement)
const commandOpen = ref(false)
const connectionOpen = ref(!token.value)
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
const handleDisconnect = () => {
  clearSession()
  openConnection()
}
const commandGroups = useAdminCommands({
  commandOpen, visibleSections, syncing, token, sidebarCollapsed,
  closeMobile, openConnection, syncData, toggleSidebar, disconnect: handleDisconnect
})

watch(token, (value) => {
  if (!value) openConnection()
})
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
</script>

<style scoped>
/* AI48Hub shell: floating ink rail + rounded canvas. */
.admin-shell {
  background:
    radial-gradient(60rem 40rem at 0% 0%, color-mix(in oklch, var(--color-violet-500) 14%, transparent), transparent 60%),
    radial-gradient(50rem 30rem at 100% 100%, color-mix(in oklch, var(--color-fuchsia-500) 10%, transparent), transparent 60%),
    var(--admin-shell-bg);
}
.admin-shell--locked { background: #000; }
.admin-navigation-overlay { background: var(--admin-scrim); }

/* Section tones: one accent per console area. */
.admin-shell { --page-accent: var(--color-violet-500); --page-accent-2: var(--color-fuchsia-500); }
.admin-shell[data-page-tone="blue"] { --page-accent: var(--color-blue-500); --page-accent-2: var(--color-cyan-400); }
.admin-shell[data-page-tone="emerald"] { --page-accent: var(--color-emerald-500); --page-accent-2: var(--color-teal-400); }
.admin-shell[data-page-tone="amber"] { --page-accent: var(--color-amber-500); --page-accent-2: var(--color-orange-500); }

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
</style>
