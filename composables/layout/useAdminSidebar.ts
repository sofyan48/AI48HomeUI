import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Sidebar collapse, mobile drawer open/close with focus return, and the drawer focus trap. */
export function useAdminSidebar(sidebarElement: Readonly<Ref<HTMLElement | null>>) {
  const mobileOpen = ref(false)
  const sidebarCollapsed = ref(false)
  const desktopViewport = ref(false)
  let mobileTrigger: HTMLElement | null = null

  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }

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

  return { mobileOpen, sidebarCollapsed, desktopViewport, toggleSidebar, closeMobile, openMobile, handleSidebarKeydown }
}
