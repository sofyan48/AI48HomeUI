// Bound visible-row stored reads without triggering any upstream collection.
let active = 0
const waiting: Array<() => void> = []
export async function withQuotaPreviewSlot<T>(signal: AbortSignal, read: () => Promise<T>): Promise<T> {
  signal.throwIfAborted()
  if (active >= 3) await new Promise<void>((resolve, reject) => {
    const start = () => { signal.removeEventListener('abort', abort); active++; resolve() }
    const abort = () => {
      const index = waiting.indexOf(start)
      if (index >= 0) waiting.splice(index, 1)
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    waiting.push(start)
    signal.addEventListener('abort', abort, { once: true })
  })
  else active++
  try { signal.throwIfAborted(); return await read() }
  finally { active--; waiting.shift()?.() }
}
