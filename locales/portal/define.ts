// Each portal area declares English messages plus an Indonesian translation with exactly the same keys.
export function definePortalMessages<const E extends Record<string, string>>(en: E, id: { [K in keyof E]: string }) {
  return { en, id }
}

/** Full translation of one portal area for an additional locale (zh-CN, zh-TW, ru). */
export type PortalAreaTranslation<A extends { en: Record<string, string> }> = { [K in keyof A['en']]: string }
