import { readonly } from 'vue'
import { useHead, useState } from '#imports'
import { resolveThemeColor, themeColors, themeColorStorageKey, themeColorVariables } from './themeColors'
import type { ThemeColor } from './themeColors'

export function useThemeColor() {
  const color = useState<ThemeColor>('appearance:color', () => 'violet')
  const initialized = useState('appearance:color-initialized', () => false)

  if (import.meta.client && !initialized.value) {
    try {
      color.value = resolveThemeColor(window.localStorage.getItem(themeColorStorageKey))
    } catch {
      // Storage can be disabled by browser privacy settings.
    }
    initialized.value = true
  }

  function setColor(value: ThemeColor) {
    color.value = resolveThemeColor(value)
    if (import.meta.client) {
      try {
        window.localStorage.setItem(themeColorStorageKey, color.value)
      } catch {
        // Keep the selection usable even when storage is unavailable.
      }
    }
  }

  return { color: readonly(color), colors: themeColors, setColor }
}

export function useThemeColorHead() {
  const { color } = useThemeColor()
  // Inline palette variables also cover overlays teleported outside either workspace.
  useHead(() => ({ htmlAttrs: { style: themeColorVariables(color.value) } }))
}
