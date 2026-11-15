import { useConsoleLocale } from '~/composables/useConsoleLocale'
import { adminMessages, type AdminMessageKey } from '~/locales/admin'

export type AdminParams = Record<string, string | number | null | undefined>

/** Translation helper for the admin console (/admin) and shared App* primitives. Placeholders use `{name}` syntax. */
export function useAdminI18n() {
  const { locale } = useConsoleLocale()

  function t(key: AdminMessageKey, params?: AdminParams): string {
    const template = adminMessages[locale.value]?.[key] ?? adminMessages.en[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name]
      return value === undefined || value === null ? match : String(value)
    })
  }

  /** BCP 47 tag for Intl formatters, so dates and numbers follow the selected language. */
  const intlLocale = computed(() => locale.value === 'id' ? 'id-ID' : locale.value)

  return { t, locale, intlLocale }
}
