import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolveThemeColor, themeColors, themeColorVariables } from './themeColors'

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('theme accent preference', () => {
  test('supports fuchsia and every advertised palette', () => {
    expect(themeColors).toContain('fuchsia')
    expect(new Set(themeColors).size).toBe(themeColors.length)
    for (const color of themeColors) expect(resolveThemeColor(color)).toBe(color)
  })

  test('invalid or unavailable stored preferences fall back to muted violet', () => {
    for (const value of [null, undefined, '', 'invalid', 'Fuchsia', 'var(--injected)', {}]) {
      expect(resolveThemeColor(value)).toBe('violet')
    }
  })

  test('updates every primary shade without overriding semantic status colors', () => {
    for (const color of themeColors) {
      const variables = themeColorVariables(color)
      expect(Object.keys(variables)).toHaveLength(11)
      expect(variables['--ui-color-primary-50']).toBe(`var(--color-${color}-50)`)
      expect(variables['--ui-color-primary-600']).toBe(`var(--color-${color}-600)`)
      expect(variables['--ui-color-primary-950']).toBe(`var(--color-${color}-950)`)
      expect(Object.keys(variables).every(key => key.startsWith('--ui-color-primary-'))).toBe(true)
    }
  })

  test('root initialization covers both workspaces and persists only the accent preference', () => {
    expect(source('app.vue')).toContain('useThemeColorHead()')
    const composable = source('composables/layout/useThemeColor.ts')
    expect(composable).toContain('window.localStorage.getItem(themeColorStorageKey)')
    expect(composable).toContain('window.localStorage.setItem(themeColorStorageKey, color.value)')
    expect(composable).not.toContain('useAppConfig')
    expect(composable).not.toContain('appConfig.ui')
    expect(composable).toContain('htmlAttrs: { style: themeColorVariables(color.value) }')
    expect(composable).not.toContain('colorMode.preference =')
    for (const file of ['assets/main.css', 'assets/admin.css']) {
      expect(source(file)).toContain('--ui-primary: var(--ui-color-primary-600,')
      expect(source(file)).toContain('--ui-primary: var(--ui-color-primary-400,')
    }
  })

  test('selector keeps labeled mode and accent controls together', () => {
    const selector = source('components/ThemeSwitcher.vue')
    expect(selector).toContain('v-for="option in options"')
    expect(selector).toContain('v-for="option in colors"')
    expect(selector).toContain(':model-value="colorMode.preference"')
    expect(selector).toContain(':model-value="color"')
    expect(selector).toContain("t('shared.theme.color', { name: colorName(option) })")
    expect(selector).toContain('@update:model-value="setTheme"')
    expect(selector).toContain('@update:model-value="selectColor"')
    expect(selector).toContain('setPreference(value as')
  })
})
