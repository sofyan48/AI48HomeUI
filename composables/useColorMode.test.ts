import { describe, expect, test } from 'bun:test'

describe('source-owned color mode', () => {
  test('keeps a shared preference and applies explicit root dark mode', async () => {
    const source = await Bun.file(new URL('./useColorMode.ts', import.meta.url)).text()
    expect(source).toContain("useState<ColorModePreference>('appearance:color-mode'")
    expect(source).toContain("useState<boolean>('appearance:system-dark'")
    expect(source).toContain("classList.toggle('dark', value.value === 'dark')")
    expect(source).toContain('watch(preference')
    expect(source).toContain('watch(value, apply')
    expect(source).toContain('function setPreference')
    expect(source).toContain("dataset.colorMode = value.value")
  })
})
