import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { resolveAppIcon, tablerIcons } from './tabler'

const root = resolve(import.meta.dir, '../..')
function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(vue|[cm]?[jt]s|json|css)$/.test(path) && !path.endsWith('.test.ts') ? [path] : []
  })
}
const files = [
  ...['pages', 'components', 'composables', 'layouts', 'stores', 'middleware', 'assets', 'locales'].flatMap(folder => sourceFiles(join(root, folder))),
  ...['app.vue', 'app.config.ts', 'nuxt.config.ts'].map(file => join(root, file)),
].filter(file => !file.startsWith(join(root, 'composables/icons/')))

// Evaluate the real SFC with its sole local dependency injected, without Nuxt or a browser.
const filename = join(root, 'components/AppIcon.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'app-icon-test', inlineTemplate: true })
const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(script.content)
  .replace(/import\s+\{[^}]+\}\s+from\s+["']~\/composables\/icons\/tabler["'];?/, '')
  .replace('export default', 'const AppIcon =')
const AppIcon = (await import(URL.createObjectURL(new Blob([
  `import { resolveAppIcon } from ${JSON.stringify(new URL('./tabler.ts', import.meta.url).href)};\n`,
  js,
  '\nexport default AppIcon;',
], { type: 'application/javascript' })))).default
const render = (props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(AppIcon, props) }))

describe('static AppIcon registry', () => {
  test('covers all repository icon literals, including shared buttons and dynamic composable branches', () => {
    const missing = files.flatMap(file => {
      const names = [...readFileSync(file, 'utf8').matchAll(/i-tabler-[a-z0-9-]+/g)].map(match => match[0])
      return names.filter(name => !Object.hasOwn(tablerIcons, name)).map(name => `${file.slice(root.length + 1)}: ${name}`)
    })
    expect([...new Set(missing)]).toEqual([])
    expect(Object.values(tablerIcons).every(Boolean)).toBe(true)
  })

  test('portal tags use explicit AppIcon imports', () => {
    for (const file of files.filter(file => /\/(pages\/app|components\/app)\//.test(file) || file === join(root, 'layouts/app.vue'))) {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toMatch(/<\/?UIcon\b/)
      if (source.includes('<AppIcon')) expect(source).toContain("import AppIcon from '~/components/AppIcon.vue'")
    }
  })

  test('renders a decorative SVG at 1em with classes and attributes forwarded', async () => {
    const svg = await render({ name: 'i-tabler-wallet', class: 'size-5 text-primary', 'data-icon': 'inline-start' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="1em"')
    expect(svg).toContain('height="1em"')
    expect(svg).toContain('size-5 text-primary')
    expect(svg).toContain('data-icon="inline-start"')
    expect(svg).toContain('aria-hidden="true"')
    expect(svg).toContain('focusable="false"')
  })

  test('labeled icons expose an image role rather than hiding the accessible name', async () => {
    const svg = await render({ name: 'i-tabler-check', 'aria-label': 'Complete', 'aria-hidden': true })
    expect(svg).toContain('aria-label="Complete"')
    expect(svg).toContain('role="img"')
    expect(svg).not.toContain('aria-hidden=')
  })

  test('unknown and prototype names resolve locally, and name changes select another SVG', async () => {
    expect(resolveAppIcon('unknown')).toBe(resolveAppIcon())
    expect(resolveAppIcon('toString')).toBe(resolveAppIcon())
    expect(await render({ name: 'i-tabler-check' })).not.toBe(await render({ name: 'i-tabler-x' }))
    expect(await render({ name: 'unknown' })).toContain('<svg')
  })
})
