type Credential = { provider?: string; type?: string; websockets?: unknown; using_api?: unknown }

export function supportsCredentialWebsockets(item: Credential): boolean {
  return [item.provider, item.type].some(value => ['codex', 'codex-api-key', 'xai', 'xai-api-key'].includes(String(value || '').trim().toLowerCase()))
}
export function credentialWebsocketState(item: Credential): 'on' | 'off' | 'unknown' | 'unsupported' {
  if (!supportsCredentialWebsockets(item)) return 'unsupported'
  if (item.websockets === true || item.websockets === 'true') return 'on'
  if (item.websockets === false || item.websockets === 'false') return 'off'
  return 'unknown'
}
export function supportsCredentialUsingAPI(item: Credential): boolean {
  return [item.provider, item.type].some(value => String(value || '').trim().toLowerCase() === 'xai')
}
export function credentialUsingAPI(item: Credential): boolean {
  return item.using_api === true || item.using_api === 'true'
}
export function credentialInFlight(item: any, observation?: any): { value: string; state: string } {
  const count = item?.in_flight
  if (count == null) return { value: '—', state: 'Unknown observation' }
  return { value: String(count), state: observation?.stale ? 'Stale observation' : observation?.coverage_complete === false ? 'Incomplete observation' : 'Observed requests' }
}
