import { expect, test } from 'bun:test'
import { resolveImportSelection } from './importSelection'

const rows = [
  { row_key: 'create', action: 'create', applicable: true },
  { row_key: 'sync', action: 'update_sync', applicable: true },
  { row_key: 'manual', action: 'overwrite', applicable: true },
  { row_key: 'review', action: 'review', applicable: false }
]
const selectable = (row: typeof rows[number]) => row.applicable

test('initial preview selects recommendations, not manual-price overwrites', () => {
  expect(resolveImportSelection(rows, undefined, selectable)).toEqual(['create', 'sync'])
})
test('refresh preserves cleared and partial selections and drops missing keys', () => {
  expect(resolveImportSelection(rows, [], selectable)).toEqual([])
  expect(resolveImportSelection(rows, ['sync', 'gone', 'review'], selectable)).toEqual(['sync'])
})
test('explicit overwrite and failed-row retry selections remain available', () => {
  expect(resolveImportSelection(rows, ['manual'], selectable)).toEqual(['manual'])
  expect(resolveImportSelection(rows, ['create'], selectable)).toEqual(['create'])
})
