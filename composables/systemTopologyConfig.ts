type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}

export function normalizeTopologyConfig(value: unknown) {
  const config = record(value)
  const observability = record(config.observability)
  const logs = record(observability.logs)
  const usage = record(observability.usage)
  const routing = record(config.routing)
  const rawStrategy = routing.strategy
  const strategies: Record<string, string> = {
    '': 'round-robin', 'round-robin': 'round-robin', roundrobin: 'round-robin', rr: 'round-robin',
    'weighted-round-robin': 'weighted-round-robin', weightedroundrobin: 'weighted-round-robin', wrr: 'weighted-round-robin',
    'fill-first': 'fill-first', fillfirst: 'fill-first', ff: 'fill-first'
  }
  return {
    debug: logs.debug === true,
    requestLog: logs['request-log'] === true,
    usageStatistics: usage['usage-statistics-enabled'] === true,
    loggingToFile: logs['logging-to-file'] === true,
    proxyConfigured: typeof record(config.requests)['proxy-url'] === 'string' && Boolean(String(record(config.requests)['proxy-url']).trim()),
    routingStrategy: config.routing !== undefined && (config.routing === null || typeof config.routing !== 'object' || Array.isArray(config.routing))
      ? 'unknown'
      : rawStrategy === undefined ? 'round-robin' : typeof rawStrategy === 'string' ? strategies[rawStrategy.trim().toLowerCase()] || 'unknown' : 'unknown'
  }
}
