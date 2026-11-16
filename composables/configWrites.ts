export type ConfigWrite = { keys: string[]; path: string; method: 'PUT' | 'PATCH' | 'DELETE'; body?: string }
export type ConfigWriteResult = { completed: ConfigWrite[]; failed?: ConfigWrite; error?: unknown }

export function planConfigWrites(
  changed: string[],
  paths: Record<string, string[]>,
  valueFor: (key: string) => unknown,
): ConfigWrite[] {
  const writes: ConfigWrite[] = []
  const email: Record<string, unknown> = {}
  const emailKeys: string[] = []
  const relayPorts: Record<string, unknown> = {}
  const relayPortKeys: string[] = []
  for (const key of changed) {
    const parts = paths[key]
    if (!parts?.length) throw new Error(`No targeted config path for ${key}`)
    const value = valueFor(key)
    if (['liveMediaRelayUdpPortMin', 'liveMediaRelayUdpPortMax'].includes(key) && value !== null) {
      relayPorts[parts[parts.length - 1]!] = value
      relayPortKeys.push(key)
      continue
    }
    // Email validation considers the complete submitted configuration. Merge all
    // changed email leaves together so intermediate settings cannot invalidate it.
    if (parts[0] === 'user-email' && value !== null) {
      let node = email
      for (const part of parts.slice(1, -1)) node = (node[part] ??= {}) as Record<string, unknown>
      node[parts[parts.length - 1]!] = value
      emailKeys.push(key)
      continue
    }
    writes.push({ keys: [key], path: `/config/${parts.map(encodeURIComponent).join('/')}`, method: value === null ? 'DELETE' : 'PUT', ...(value === null ? {} : { body: JSON.stringify(value) }) })
  }
  if (emailKeys.length) writes.push({ keys: emailKeys, path: '/config/user-email', method: 'PATCH', body: JSON.stringify(email) })
  if (relayPortKeys.length) writes.push({ keys: relayPortKeys, path: '/config/oauth/providers/codex/live-media-relay', method: 'PATCH', body: JSON.stringify(relayPorts) })
  // Apply settings that can revoke this connection after ordinary edits.
  const accessOrder = (write: ConfigWrite) => write.path === '/config/management/secret-key' ? 2 : write.path === '/config/management/allow-remote' ? 1 : 0
  return writes.sort((a, b) => accessOrder(a) - accessOrder(b))
}

export async function applyConfigWrites(
  writes: ConfigWrite[],
  request: (path: string, options: { method: 'PUT' | 'PATCH' | 'DELETE'; body?: string; headers?: Record<string, string> }) => Promise<unknown>,
): Promise<ConfigWriteResult> {
  const completed: ConfigWrite[] = []
  for (const write of writes) {
    try {
      await request(write.path, { method: write.method, ...(write.body === undefined ? {} : { body: write.body, headers: { 'Content-Type': 'application/json' } }) })
      completed.push(write)
    } catch (error) {
      // DELETE is idempotent only for a missing leaf, not a missing route.
      const failure = error as { statusCode?: number; data?: { error?: string } }
      if (write.method === 'DELETE' && failure.statusCode === 404 && failure.data?.error === 'not_found') {
        completed.push(write)
        continue
      }
      return { completed, failed: write, error }
    }
  }
  return { completed }
}

export function reconcileConfigDraft<T extends Record<string, unknown>>(previous: T, intended: T, fresh: T): T {
  // Refresh unedited fields; preserve intentions only where this editor changed
  // a value. Committed writes naturally become clean against the new baseline.
  return Object.fromEntries(Object.keys(fresh).map(key => [key,
    JSON.stringify(previous[key]) === JSON.stringify(intended[key]) ? fresh[key] : intended[key],
  ])) as T
}
