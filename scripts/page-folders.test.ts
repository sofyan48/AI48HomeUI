import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'

const root = join(import.meta.dir, '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const pages = (folder = 'pages'): string[] => readdirSync(join(root, folder), { withFileTypes: true }).flatMap(entry => {
  const path = `${folder}/${entry.name}`
  return entry.isDirectory() ? pages(path) : path.endsWith('.vue') ? [path] : []
})

// Public URLs before the feature-directory migration, including redirect routes.
const adminFeatures = [
  'access-keys', 'alerting', 'billing', 'config', 'connect', 'credentials', 'dashboard',
  'diagnostics', 'logs', 'organizations', 'organizations/[id]', 'plugins', 'providers', 'proxy-network', 'quota',
  'request-events', 'routing/channels', 'routing/model-groups', 'routing/models',
  'system-nodes', 'upstream', 'usage', 'users',
]
const appFeatures = [
  'analytics', 'api-keys', 'balance', 'forgot-password', 'login', 'logs', 'models', 'models/price', 'organizations',
  'playground', 'profile', 'register', 'reset-password', 'settings', 'verify-email',
]
const expectedRoutes = [
  '/admin', ...adminFeatures.map(feature => `/admin/${feature}`),
  '/app', ...appFeatures.map(feature => `/app/${feature}`),
].sort()

const routeFor = (file: string) => file.replace(/^pages/, '').replace(/\/index\.vue$/, '').replace(/\.vue$/, '')

describe('feature page folders', () => {
  test('all 40 public URLs remain unique and match the expected routes', () => {
    const routes = pages().map(routeFor)
    expect(routes.sort()).toEqual(expectedRoutes)
    expect(new Set(routes).size).toBe(40)
  })

  test('every feature uses index.vue without inventing general pages', () => {
    for (const file of pages()) {
      expect(file.endsWith('/index.vue')).toBe(true)
      expect(file.split('/')).not.toContain('general')
      expect(read(file).split('\n').length).toBeLessThan(500)
    }
    expect(readdirSync(join(root, 'pages/admin')).filter(name => name.endsWith('.vue'))).toEqual(['index.vue'])
    expect(readdirSync(join(root, 'pages/app')).filter(name => name.endsWith('.vue'))).toEqual(['index.vue'])
    for (const feature of adminFeatures) expect(existsSync(join(root, `pages/admin/${feature}.vue`))).toBe(false)
  })

  test('layout metadata and legacy redirect destinations remain intact', () => {
    for (const file of pages()) {
      const metadata = [...read(file).matchAll(/definePageMeta\(([^\n]+)\)/g)].map(match => match[1])
      const expected = file === 'pages/app/playground/index.vue' ? ["{ layout: 'playground' }"]
              : file.startsWith('pages/app/') ? ["{ layout: 'app' }"]
        : ['pages/admin/index.vue', 'pages/admin/connect/index.vue'].includes(file) ? ['{ layout: false }']
          : file === 'pages/admin/quota/index.vue' ? ["{ layout: 'default' }"] : []
      expect(metadata).toEqual(expected)
    }
    const redirects = {
      'index': "await navigateTo('/admin/dashboard', { replace: true })",
      'providers/index': "await navigateTo({ path: '/admin/upstream', query: { tab: 'providers' } }, { replace: true })",
      'request-events/index': "await navigateTo({ path: '/admin/usage', query: { view: 'requests' } }, { replace: true })",
      'quota/index': "await navigateTo({ path: '/admin/upstream', query: { tab: 'accounts', q: useRoute().query.q } }, { replace: true })",
      'credentials/index': "await navigateTo({ path: '/admin/upstream', query: { tab: 'accounts', q: route.query.q, credential: route.query.credential } }, { replace: true })",
    }
    for (const [file, redirect] of Object.entries(redirects)) expect(read(`pages/admin/${file}.vue`)).toContain(redirect)
    expect(read('pages/admin/upstream/index.vue').match(/navigateTo\("\/admin\/proxy-network", \{ replace: true \}\)/g)).toHaveLength(2)
  })

  test('page imports resolve from real source files after relocation', () => {
    for (const file of pages()) {
      const { descriptor } = parse(read(file), { filename: file })
      const script = compileScript(descriptor, { id: file })
      for (const binding of Object.values(script.imports || {})) {
        if (!binding.source.startsWith('~/') && !binding.source.startsWith('.')) continue
        const target = binding.source.startsWith('~/') ? join(root, binding.source.slice(2))
          : resolve(root, dirname(file), binding.source)
        expect(['', '.ts', '.js', '/index.ts', '/index.js'].some(suffix => existsSync(target + suffix))).toBe(true)
      }
    }
  })
})
