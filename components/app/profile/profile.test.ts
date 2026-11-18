import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'

test('profile editing is capability gated and submits only generic fields', () => {
  const filename = new URL('./ProfileEditDialog.vue', import.meta.url).pathname
  const source = readFileSync(filename, 'utf8')
  expect(source).toContain('capabilities.value.profile_edit === true')
  expect(source).toContain('updateProfile({ username: username.value.trim(), timezone: timezone.value.trim() })')
  expect(source).toContain('if (saving.value || !supported.value) return')
  expect(source).toContain(':locked="saving"')
  for (const field of ['credits', 'password', 'role', 'limit', 'email']) {
    expect(source).not.toContain(`v-model="${field}`)
  }
  const { descriptor } = parse(source, { filename })
  const script = compileScript(descriptor, { id: 'profile-edit' })
  const result = compileTemplate({ filename, id: 'profile-edit', source: descriptor.template!.content, compilerOptions: { bindingMetadata: script.bindings } })
  expect(result.errors).toEqual([])
})

test('profile mutation adopts the response only for the owning session', () => {
  const source = readFileSync(new URL('../../../stores/userSession.ts', import.meta.url), 'utf8')
  const method = source.slice(source.indexOf('  const updateProfile ='), source.indexOf('  const login ='))
  expect(method).toContain('body: { username: profile.username, timezone: profile.timezone }')
  expect(method).toContain('if (generation !== sessionGeneration) return null')
  expect(method).toContain('currentUser.value = normalizeUser(response.user)')
  expect(method).not.toContain('saveSession(')
})
