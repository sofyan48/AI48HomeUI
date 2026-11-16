import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useState } from '#imports'

type ColorModePreference = 'light' | 'dark' | 'system'

const storageKey = 'cpahome:color-mode'

function validPreference(value: unknown): ColorModePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function useColorMode() {
  const preference = useState<ColorModePreference>('appearance:color-mode', () => 'system')
  const initialized = useState('appearance:color-mode-initialized', () => false)
  const systemDark = useState<boolean>('appearance:system-dark', () => false)
  const value = computed(() => preference.value === 'system'
    ? systemDark.value ? 'dark' : 'light'
    : preference.value)

  function apply() {
    if (!import.meta.client) return
    const root = document.documentElement
    root.classList.toggle('dark', value.value === 'dark')
    root.style.colorScheme = value.value
    root.dataset.colorMode = value.value
  }

  function setPreference(next: ColorModePreference) {
    preference.value = validPreference(next)
    if (import.meta.client) {
      try { window.localStorage.setItem(storageKey, preference.value) } catch { /* Keep theme usable without storage. */ }
      apply()
    }
  }

  let media: MediaQueryList | undefined
  const onSystemChange = (event: MediaQueryListEvent) => {
    systemDark.value = event.matches
    apply()
  }

  onMounted(() => {
    if (!initialized.value) {
      try { preference.value = validPreference(window.localStorage.getItem(storageKey)) } catch { /* Storage may be unavailable. */ }
      initialized.value = true
    }
    media = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = media.matches
    media.addEventListener?.('change', onSystemChange)
    apply()
  })

  watch(preference, () => {
    if (!import.meta.client) return
    try { window.localStorage.setItem(storageKey, preference.value) } catch { /* Keep theme usable without storage. */ }
    apply()
  }, { flush: 'post' })
  watch(value, apply, { flush: 'post' })

  onBeforeUnmount(() => media?.removeEventListener?.('change', onSystemChange))

  return { preference, value, setPreference }
}
