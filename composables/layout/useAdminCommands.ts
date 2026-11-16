import { computed, type Ref } from 'vue'
import { useRouter } from '#imports'
import { useColorMode } from '~/composables/useColorMode'
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import type { NavigationSection } from '~/composables/layout/useAdminNavigation'

interface AdminCommandOptions {
  commandOpen: Ref<boolean>
  visibleSections: Readonly<Ref<NavigationSection[]>>
  syncing: Readonly<Ref<boolean>>
  token: Readonly<Ref<string | null | undefined>>
  sidebarCollapsed: Readonly<Ref<boolean>>
  closeMobile: () => void
  openConnection: () => void
  syncData: () => Promise<void>
  toggleSidebar: () => void
  disconnect: () => void
}

/** Command palette groups: one group per visible navigation section plus global actions. */
export function useAdminCommands(options: AdminCommandOptions) {
  const { t: tc } = useConsoleLocale()
  const router = useRouter()
  const colorMode = useColorMode()
  const { setPreference } = colorMode
  const { commandOpen } = options

  return computed(() => [
    ...options.visibleSections.value.map(section => ({
      id: section.label,
      label: section.label,
      items: section.items.map(item => ({
        label: item.label,
        description: item.subtitle,
        icon: item.icon,
        onSelect: () => {
          commandOpen.value = false
          options.closeMobile()
          void router.push(item.to)
        }
      }))
    })),
    {
      id: 'actions',
      label: tc('shell.globalActions'),
      items: [
        { label: tc('shell.manageConnection'), description: tc('shell.connectionDescription'), icon: 'i-tabler-plug', onSelect: options.openConnection },
        { label: tc('shell.sync'), icon: 'i-tabler-refresh', disabled: options.syncing.value || !options.token.value, onSelect: () => { commandOpen.value = false; void options.syncData() } },
        { label: options.sidebarCollapsed.value ? tc('shell.expandSidebar') : tc('shell.collapseSidebar'), icon: 'i-tabler-layout-sidebar', onSelect: () => { commandOpen.value = false; options.toggleSidebar() } },
        ...[
          { label: tc('shell.lightTheme'), value: 'light', icon: 'i-tabler-sun' },
          { label: tc('shell.darkTheme'), value: 'dark', icon: 'i-tabler-moon' },
          { label: tc('shell.systemTheme'), value: 'system', icon: 'i-tabler-device-desktop' }
        ].map(theme => ({ label: theme.label, icon: theme.icon, onSelect: () => { setPreference(theme.value as 'light' | 'dark' | 'system'); commandOpen.value = false } })),
        { label: tc('shell.disconnect'), icon: 'i-tabler-plug-off', disabled: !options.token.value, onSelect: () => { commandOpen.value = false; options.disconnect() } }
      ]
    }
  ])
}
