import { describe, expect, test } from 'bun:test'
import { normalizeTableAttrs } from './useAdminTable'

describe('admin table row identity', () => {
  test('normalizes getRowId without relying on an undefined TanStack option', async () => {
    const source = await Bun.file(new URL('./useAdminTable.ts', import.meta.url)).text()
    expect(source).toContain('values.getRowId ??')
    expect(source).toContain("String(row?.id ?? index)")
  })

  test('keeps dashed table option names compatible with Vue attrs', () => {
    expect(normalizeTableAttrs({ 'get-row-id': undefined, 'row-selection': {} })).toEqual({ getRowId: undefined, rowSelection: {} })
  })
})
