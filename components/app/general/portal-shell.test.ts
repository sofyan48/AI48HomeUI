import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
const shell = read('layouts/app.vue')
const navigation = read('components/app/general/PortalNavigation.vue')
const theme = read('components/app/general/PortalThemeSwitcher.vue')
const language = read('components/app/general/PortalLanguageSwitcher.vue')
const provider = read('components/app/general/PortalProvider.vue')

describe('portal shell composition', () => {
  test('mobile navigation uses an accessible modal Sheet instead of the raw scrim', () => {
    expect(shell).toContain('<Sheet v-if="!isDesktop" v-model:open="mobileOpen">')
    expect(shell).toContain('<SheetTitle class="sr-only">')
    expect(shell).toContain('@close-auto-focus="restoreMobileFocus"')
    expect(shell).toContain('mobileTrigger.focus({ preventScroll: true })')
    expect(shell).not.toContain('user-scrim')
    expect(shell).not.toContain(':modal="false"')
  })

  test('responsive branches share a presentational navigation without a second session owner', () => {
    expect(shell).toContain('v-if="isDesktop"')
    expect(shell).toContain("useMediaQuery('(min-width: 1024px)')")
    expect(shell).toContain('watch(isDesktop, closeMobile)')
    expect(shell.match(/<PortalNavigation\b/g)).toHaveLength(2)
    expect(navigation).not.toContain('useUserApi(')
    expect(navigation).not.toContain('useWorkspaceState(')
    expect(shell).toContain('capabilities.value.request_logs === true')
    expect(shell).toContain('usePortalSessionGuard()')
        expect(read('composables/portal/usePortalSessionGuard.ts')).toContain('onMounted(ensureSession)')
    expect(shell).toContain("clearSession(); await router.replace('/app/login')")
    expect(navigation).toContain('to="/app/profile"')
    expect(navigation).toContain('@click="emit(\'logout\')"')
  })

  test('workspace mirrors the admin floating rail and rounded canvas without sharing admin sessions', () => {
    expect(shell).toContain('lg:inset-y-3 lg:left-3')
    expect(shell).toContain("'lg:pl-[5.75rem]' : 'lg:pl-[17.5rem]'")
    expect(shell).toContain('class="user-canvas')
    expect(shell).toContain('var(--user-rail-bg)')
        expect(shell).not.toContain('var(--admin-')
        const tokens = read('assets/main.css')
        expect(tokens).toContain('--user-rail-bg: oklch(0.17 0.01 292)')
        expect(tokens).toContain('--user-shell-bg: var(--color-zinc-950)')
    expect(shell).toContain('border-radius: 1.375rem')
    expect(shell).not.toContain('user-header-dock')
        expect(navigation).toContain('<PortalThemeSwitcher />')
        expect(navigation).toContain('<PortalLanguageSwitcher />')
    expect(shell).not.toContain('useAdminConnection(')
    expect(navigation).toContain('user-nav-glyph')
    expect(navigation).toContain('i-tabler-chevron-right')
  })

  test('switchers use installed popovers and single-select toggle groups with shared preferences', () => {
    for (const source of [theme, language]) {
      expect(source).toContain('<PopoverTrigger as-child>')
      expect(source).toContain('<PopoverContent')
      expect(source).toContain('<ToggleGroup type="single"')
      expect(source).not.toContain('<UPopover')
    }
    const styles = read('assets/main.css')
    expect(styles).toContain('--ui-overlay: var(--ui-bg)')
    expect(styles).toContain(':root:not([data-admin-console]) :is([data-reka-popper-content-wrapper] > *, [role="menu"], [role="listbox"])')
    expect(theme).toContain('useThemeColor()')
    expect(theme).toContain('useColorMode()')
    expect(language).toContain('useConsoleLocale()')
    expect(language).toContain('setLocale(selected.value)')
    expect(language).toContain('open.value = false')
    expect(shell).not.toContain('<ThemeSwitcher')
    expect(shell).not.toContain('<ConsoleLanguageSwitcher')
  })

  test('root-ready provider owns a single themed Sonner and keeps body locking enabled', () => {
    expect(provider).toContain("import 'vue-sonner/style.css'")
    expect(provider).toContain('<ConfigProvider dir="ltr">')
    expect(provider.match(/<Toaster\b/g)).toHaveLength(1)
    expect(provider).toContain(':theme="toastTheme"')
    expect(provider).not.toContain('scroll-body="false"')
  })
})
