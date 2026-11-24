import { computed } from 'vue'
import { useRoute } from '#imports'
import { useCapabilities } from '~/composables/useCapabilities'
import { useConsoleLocale } from '~/composables/useConsoleLocale'

export interface NavigationItem {
  label: string
  to: string
  icon: string
  capability?: string
  subtitle?: string
}

export interface NavigationSection {
  label: string
  tone: string
  items: NavigationItem[]
}

/** Admin navigation sections, capability filtering and the entry matching the current route. */
export function useAdminNavigation() {
  const { t: tc } = useConsoleLocale()
  const route = useRoute()
  const { supports } = useCapabilities()

  const navigationSections = computed<NavigationSection[]>(() => [
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
        { label: tc('nav.users'), to: '/admin/users', icon: 'i-tabler-users', subtitle: tc('nav.usersDescription'), capability: 'users' },
        { label: tc('nav.organizations'), to: '/admin/organizations', icon: 'i-tabler-building', subtitle: tc('nav.organizationsDescription'), capability: 'organizations' }
      ]
    },
    {
      label: tc('nav.observe'), tone: 'blue',
      items: [
        { label: tc('nav.usage'), to: '/admin/usage', icon: 'i-tabler-chart-bar', subtitle: tc('nav.usageDescription'), capability: 'usage_records' },
        { label: tc('nav.diagnostics'), to: '/admin/diagnostics', icon: 'i-tabler-tools', subtitle: tc('nav.diagnosticsDescription') },
        { label: tc('nav.logs'), to: '/admin/logs', icon: 'i-tabler-file-text', subtitle: tc('nav.logsDescription'), capability: 'logs' },
        { label: tc('nav.alerting'), to: '/admin/alerting', icon: 'i-tabler-bell', subtitle: tc('nav.alertingDescription') }
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

  // Some entries own several routes, e.g. upstream also covers providers, credentials and quota.
  const isActive = (item: NavigationItem) => item.to === '/admin/upstream'
    ? ['/admin/upstream', '/admin/providers', '/admin/credentials', '/admin/quota'].includes(route.path)
    : item.to === '/admin/usage'
      ? ['/admin/usage', '/admin/request-events'].includes(route.path)
      : item.to === '/admin/organizations'
        ? route.path === '/admin/organizations' || route.path.startsWith('/admin/organizations/')
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

  return { visibleSections, isActive, currentNavigation, pageTitle, pageSubtitle, currentSection, pageTone }
}
