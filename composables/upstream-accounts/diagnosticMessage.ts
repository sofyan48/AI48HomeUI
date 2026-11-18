export function diagnosticMessage(value: unknown): string {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (!text.startsWith('{') && !text.startsWith('[')) return text
  try {
    const payload = JSON.parse(text)
    const message = payload?.error?.message ?? payload?.message
    if (typeof message === 'string') return message.trim()
    const status = payload?.error?.status ?? payload?.status
    return typeof status === 'string' ? status : ''
  } catch {
    // Health summaries may contain truncated response bodies, but the message
    // field is often still complete and can be decoded independently.
    const message = text.match(/"message"\s*:\s*("(?:[^"\\]|\\.)*")/)
    if (message?.[1]) {
      try { return String(JSON.parse(message[1])).trim() } catch {}
    }
    return text
  }
}
