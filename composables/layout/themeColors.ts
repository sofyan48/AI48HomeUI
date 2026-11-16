export const themeColors = [
  'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange',
  'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo',
] as const

export type ThemeColor = typeof themeColors[number]
export const themeColorStorageKey = 'cpahome:theme-color'

export function resolveThemeColor(value: unknown): ThemeColor {
  return themeColors.includes(value as ThemeColor) ? value as ThemeColor : 'violet'
}

export function themeColorVariables(color: ThemeColor) {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  return Object.fromEntries(shades.map(shade => [
    `--ui-color-primary-${shade}`, `var(--color-${color}-${shade})`,
  ]))
}
