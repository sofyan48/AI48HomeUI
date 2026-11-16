import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Source files should stay under this many lines so contributors can read them in one sitting.
const MAX_LINES = 500
const root = join(import.meta.dir, '..')
const sourceDirs = ['pages', 'components', 'layouts', 'composables', 'stores', 'middleware']
const sourceExtensions = /\.(vue|ts|js|mjs)$/

// Files that are allowed to exceed the limit. Each entry is a ceiling, not a target:
// shrink it (or delete it) when the file gets smaller, never raise it.
// Data-only files (translations) are exempt because they are flat key/value lists.
const allowlist: Record<string, number> = {



  'components/app/UserWorkspace.vue': 1259,
  'components/admin/UpstreamAccounts.vue': 1257,

  'components/admin/UpstreamProviders.vue': 1101,
  'pages/admin/logs.vue': 1022,
  'pages/admin/billing.vue': 789,
  'pages/admin/usage.vue': 673,

  'components/admin/BillingPriceImport.vue': 593,
  'pages/app/models/index.vue': 533
}
const exempt = (file: string) => file.startsWith('locales/') || /\.test\.(ts|mjs)$/.test(file)

function walk(dir: string): string[] {
  const absolute = join(root, dir)
  let names: string[]
  try {
    names = readdirSync(absolute)
  } catch {
    return []
  }
  return names.flatMap((name) => {
    const path = join(absolute, name)
    if (statSync(path).isDirectory()) return walk(relative(root, path))
    return sourceExtensions.test(name) ? [relative(root, path)] : []
  })
}

const countLines = (file: string) => readFileSync(join(root, file), 'utf8').split('\n').length

describe('source file size', () => {
  const files = sourceDirs.flatMap(walk).filter(file => !exempt(file))

  for (const file of files) {
    const ceiling = allowlist[file] ?? MAX_LINES
    test(`${file} stays within ${ceiling} lines`, () => {
      const lines = countLines(file)
      if (lines > ceiling) {
        throw new Error(`${file} has ${lines} lines (limit ${ceiling}). Split it into feature components or composables; see CONTRIBUTING.md.`)
      }
      expect(lines).toBeLessThanOrEqual(ceiling)
    })
  }

  test('allowlist only lists files that still need it', () => {
    const stale = Object.entries(allowlist).filter(([file, ceiling]) => {
      try {
        return countLines(file) <= MAX_LINES || countLines(file) < ceiling - 50
      } catch {
        return true
      }
    })
    expect(stale.map(([file]) => file)).toEqual([])
  })
})
