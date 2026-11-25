export type ImportSelectionRow = { row_key: string; action: string }

// A refresh must not silently reselect a row the administrator cleared.
// Newly discovered overwrites always require an explicit selection.
export function resolveImportSelection<T extends ImportSelectionRow>(
  rows: readonly T[],
  previous: readonly string[] | undefined,
  selectable: (row: T) => boolean
): string[] {
  const keys = previous === undefined ? null : new Set(previous)
  return rows.filter(row => selectable(row) && (keys ? keys.has(row.row_key) : row.action !== 'overwrite')).map(row => row.row_key)
}
