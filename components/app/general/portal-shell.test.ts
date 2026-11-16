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
    expect(shell).toContain('onMounted(ensureSession)')
    expect(shell).toContain("clearSession(); await router.replace('/app/login')")
    expect(navigation).toContain('to="/app/profile"')
    expect(navigation).toContain('@click="emit(\'logout\')"')
  })

  test('switchers use installed popovers and single-select toggle groups with shared preferences', () => {
    for (const source of [theme, language]) {
      expect(source).toContain('<PopoverTrigger as-child>')
      expect(source).toContain('<PopoverContent')
      expect(source).toContain('<ToggleGroup type="single"')
      expect(source).not.toContain('<UPopover')
    }
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
