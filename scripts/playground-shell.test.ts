import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

describe('dedicated playground shell', () => {
  test('chat uses a viewport shell without dashboard navigation or padding compensation', () => {
    const shell = read('layouts/playground.vue')
    const page = read('pages/app/playground/index.vue')
    expect(page).toContain("definePageMeta({ layout: 'playground' })")
    expect(shell).toContain('h-dvh')
    expect(shell).toContain('min-h-0 min-w-0 flex-1 overflow-hidden')
    expect(shell).not.toContain('PortalNavigation')
    expect(page).not.toMatch(/margin:\s*-/)
    expect(page).not.toContain('calc(100dvh')
    expect(shell).toContain('to="/app"')
    expect(shell).toContain('<PortalThemeSwitcher />')
    expect(shell).toContain('<PortalLanguageSwitcher />')
    expect(shell).toContain("provide(Symbol.for('cliproxy-user-card'), true)")
  })

  test('history and settings retain responsive sheets and a single workspace owner', () => {
    const page = read('pages/app/playground/index.vue')
    expect(page.match(/providePlaygroundWorkspace\(\)/g)).toHaveLength(1)
    expect(page).toContain('v-if="isDesktop && historyOpen"')
    expect(page).toContain('v-model:open="historySheetOpen"')
    expect(page).toContain('v-model:open="settingsOpen"')
    expect(page).toContain('<SheetTitle class="sr-only">')
  })

  test('model dropdown lives inside the composer beside the send action', () => {
    const chat = read('components/app/playground/PlaygroundChat.vue')
    const header = chat.slice(chat.indexOf('<header'), chat.indexOf('</header>'))
    const composer = chat.slice(chat.indexOf('<form'), chat.indexOf('</form>'))
    expect(header).not.toContain('PortalSelect')
    expect(composer).toContain('v-model="selectedModel"')
    expect(composer).toContain('v-for="model in modelOptions"')
    expect(composer).toContain('<DropdownMenuContent side="top"')
    expect(composer).toContain('<DropdownMenuRadioGroup')
    expect(composer.indexOf('<DropdownMenu>')).toBeGreaterThan(composer.indexOf('class="playground-composer"'))
    expect(composer).toContain(':disabled="!ready || sending"')
    expect(composer).toContain(':aria-label="`${t(\'playground.model\')}: ${modelLabel}`"')
    expect(composer.indexOf('<DropdownMenu>')).toBeGreaterThan(composer.indexOf('<Textarea'))
    expect(composer.indexOf('<DropdownMenu>')).toBeLessThan(composer.indexOf('v-if="sending"'))
  })

  test('both layouts register the shared session guard', () => {
    for (const file of ['layouts/app.vue', 'layouts/playground.vue']) {
      expect(read(file)).toContain('usePortalSessionGuard()')
      expect(read(file)).not.toContain('const ensureSession =')
    }
  })
})
