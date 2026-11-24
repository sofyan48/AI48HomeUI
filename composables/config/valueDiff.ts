export type DiffKind = 'context' | 'removed' | 'added'
export type DiffWord = { value: string; changed: boolean }
export type DiffLine = { kind: DiffKind; value: string; oldLine?: number; newLine?: number; words?: DiffWord[] }
export type ValueDiff = { lines: DiffLine[]; fallback: boolean; numbered: boolean }

const maxCharacters = 200_000
const maxLines = 800
const maxCells = 160_000

// A deterministic work budget avoids quadratic work on large or unrelated values.
function compare<T>(before: T[], after: T[], budget: number): Array<{ kind: DiffKind; value: T }> | null {
  if ((before.length + 1) * (after.length + 1) > budget) return null
  const width = after.length + 1
  const table = new Uint16Array((before.length + 1) * width)
  for (let old = before.length - 1; old >= 0; old--) {
    for (let next = after.length - 1; next >= 0; next--) {
      table[old * width + next] = before[old] === after[next]
        ? table[(old + 1) * width + next + 1]! + 1
        : Math.max(table[(old + 1) * width + next]!, table[old * width + next + 1]!)
    }
  }
  const result: Array<{ kind: DiffKind; value: T }> = []
  let old = 0
  let next = 0
  while (old < before.length || next < after.length) {
    if (old < before.length && next < after.length && before[old] === after[next]) {
      result.push({ kind: 'context', value: before[old++]! })
      next++
    } else if (old < before.length && (next === after.length || table[(old + 1) * width + next]! >= table[old * width + next + 1]!)) {
      result.push({ kind: 'removed', value: before[old++]! })
    } else result.push({ kind: 'added', value: after[next++]! })
  }
  return result
}

function canonicalJson(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed === null || typeof parsed !== 'object') return value
    // Sorting keys prevents object key order alone from looking like a config edit.
    return JSON.stringify(parsed, (_key, item: unknown) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
      }
      return item
    }, 2)
  } catch {
    return value
  }
}

export function buildValueDiff(before: string, after: string, format: 'text' | 'json' = 'text'): ValueDiff {
  const fallback = (): ValueDiff => ({ lines: [], fallback: true, numbered: false })
  if (before.length + after.length > maxCharacters) return fallback()
  if (format === 'json') {
    before = canonicalJson(before)
    after = canonicalJson(after)
  }
  if (before.length + after.length > maxCharacters) return fallback()
  const oldLines = before.split(/\r?\n/)
  const newLines = after.split(/\r?\n/)
  if (oldLines.length + newLines.length > maxLines) return fallback()
  const compared = compare(oldLines, newLines, maxCells)
  if (!compared) return fallback()
  let oldLine = 1
  let newLine = 1
  const lines: DiffLine[] = compared.map(line => ({
    ...line,
    ...(line.kind !== 'added' ? { oldLine: oldLine++ } : {}),
    ...(line.kind !== 'removed' ? { newLine: newLine++ } : {}),
  }))
  for (let index = 0; index < lines.length - 1; index++) {
    const old = lines[index]!
    const next = lines[index + 1]!
    if (old.kind !== 'removed' || next.kind !== 'added' || lines[index - 1]?.kind === 'removed' || lines[index + 2]?.kind === 'added') continue
    // Tokenization is bounded too, including very long single-line settings.
    if (old.value.length + next.value.length > 8_000) continue
    const words = compare(old.value.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [], next.value.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [], 16_000)
    if (!words?.some(word => word.kind === 'context' && word.value.trim())) continue
    old.words = words.filter(word => word.kind !== 'added').map(word => ({ value: word.value, changed: word.kind === 'removed' }))
    next.words = words.filter(word => word.kind !== 'removed').map(word => ({ value: word.value, changed: word.kind === 'added' }))
  }
  return { lines, fallback: false, numbered: oldLines.length > 1 || newLines.length > 1 }
}

export type DiffBlock = { start: number; lines: DiffLine[]; hidden: DiffLine[]; tail: DiffLine[] }
export function diffBlocks(lines: DiffLine[]): DiffBlock[] {
  const blocks: DiffBlock[] = []
  for (let start = 0; start < lines.length;) {
    let end = start + 1
    while (end < lines.length && lines[end]!.kind === lines[start]!.kind) end++
    const group = lines.slice(start, end)
    const head = start === 0 ? 0 : 3
    const tail = end === lines.length ? 0 : 3
    const collapse = lines[start]!.kind === 'context' && group.length - head - tail > 3
    blocks.push({ start, lines: collapse ? group.slice(0, head) : group, hidden: collapse ? group.slice(head, group.length - tail) : [], tail: collapse && tail ? group.slice(-tail) : [] })
    start = end
  }
  return blocks
}
