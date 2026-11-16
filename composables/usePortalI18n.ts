import { useConsoleLocale } from '~/composables/useConsoleLocale'
import { portalMessages, type PortalMessageKey } from '~/locales/portal'

export type PortalParams = Record<string, string | number | null | undefined>

/** Translation helper for the user portal (/app). Placeholders use `{name}` syntax. */
export function usePortalI18n() {
  const { locale, languages, setLocale } = useConsoleLocale()

  function t(key: PortalMessageKey, params?: PortalParams): string {
    const table = portalMessages[locale.value] as Partial<Record<PortalMessageKey, string>> | undefined
    const template = table?.[key] ?? portalMessages.en[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name]
      return value === undefined || value === null ? match : String(value)
    })
  }

  /** BCP 47 tag for Intl formatters, so dates and numbers follow the selected language. */
  const intlLocale = computed(() => locale.value === 'id' ? 'id-ID' : locale.value)

  return { t, locale, languages, setLocale, intlLocale }
}
