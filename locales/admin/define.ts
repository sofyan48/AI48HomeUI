// Each admin area declares English messages plus an Indonesian translation with exactly the same keys.
export function defineAdminMessages<const E extends Record<string, string>>(en: E, id: { [K in keyof E]: string }) {
  return { en, id }
}

/** Full translation of one admin area for an additional locale (zh-CN, zh-TW, ru). */
export type AdminAreaTranslation<A extends { en: Record<string, string> }> = { [K in keyof A['en']]: string }
