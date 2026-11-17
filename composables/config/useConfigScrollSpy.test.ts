import { describe, expect, test } from 'bun:test'
import { sectionAtPosition } from './useConfigScrollSpy'

describe('config scroll position', () => {
  const sections = [
    { id: 'server', top: -400 },
    { id: 'tls', top: 20 },
    { id: 'oauth-rules', top: 500 },
  ]

  test('selects the section at the viewport marker, including tall sections', () => {
    expect(sectionAtPosition(sections, 32)).toBe('tls')
    expect(sectionAtPosition(sections, 499)).toBe('tls')
    expect(sectionAtPosition(sections, 500)).toBe('oauth-rules')
  })

  test('handles the start of the page and absent sections', () => {
    expect(sectionAtPosition([{ id: 'server', top: 100 }], 32)).toBe('server')
    expect(sectionAtPosition([], 32)).toBe('')
  })
})
