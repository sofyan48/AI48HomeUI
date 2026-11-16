export type ConfigField = {
  key: string
  path: string[]
  label: string
  type: string
  description: string
  min?: number
  max?: number
  placeholder?: string
}
export type ConfigSection = { id: string; title: string; description: string; fields: ConfigField[] }

const field = (key: string, path: string, label: string, type = 'text', description = '', limits: { min?: number; max?: number } = {}): ConfigField =>
  ({ key, path: path.split('.'), label, type, description, ...limits })

export const configParitySections: ConfigSection[] = [
  {
    id: 'server-network', title: 'Server exposure', description: 'CPA listener settings distributed to nodes; these do not rebind the Home listener. Running CPA processes may need a restart.',
    fields: [
      field('serverHost', 'server.host', 'Bind host'),
      field('serverAllowHostJson', 'server.allow-host', 'Allowed hosts (JSON)', 'string-list'),
      field('serverTrustedProxiesJson', 'server.trusted-proxies', 'Trusted proxies (JSON)', 'string-list'),
      field('serverCommercialMode', 'server.commercial-mode', 'Commercial mode', 'boolean'),
      field('managementBaseUrl', 'management.base-url', 'Public management base URL'),
    ],
  },
  {
    id: 'discovery', title: 'Service discovery', description: 'CPA mDNS / DNS-SD advertising. Advertising management endpoints can expose their location on the local network.',
    fields: [
      field('discoveryEnabled', 'server.discovery.enabled', 'Enable discovery', 'boolean'),
      field('discoveryServiceName', 'server.discovery.service-name', 'Service name'),
      field('discoveryServiceType', 'server.discovery.service-type', 'Service type', 'text', 'Backend default: _ai-gateway._tcp.'),
      field('discoverySubtypesJson', 'server.discovery.subtypes', 'Protocol subtypes (JSON)', 'string-list'),
      field('discoveryInterfacesIncludeJson', 'server.discovery.interfaces.include', 'Include interfaces (JSON)', 'string-list'),
      field('discoveryInterfacesExcludeJson', 'server.discovery.interfaces.exclude', 'Exclude interfaces (JSON)', 'string-list'),
      field('discoveryAuthRequired', 'server.discovery.auth-required', 'Advertise authentication required', 'boolean', 'Unset defaults to true; this advertisement does not configure authentication.'),
      field('discoveryAdvertiseManagement', 'server.discovery.advertise-management', 'Advertise management endpoints', 'boolean'),
    ],
  },
  {
    id: 'response-diagnostics', title: 'Response headers and profiling', description: 'Response-header forwarding and the optional profiling listener. Restrict profiling to a trusted interface.',
    fields: [
      field('passthroughHeaders', 'requests.passthrough-headers', 'Pass through upstream response headers', 'boolean'),
      field('pprofEnable', 'observability.pprof.enable', 'Enable pprof', 'boolean'),
      field('pprofAddr', 'observability.pprof.addr', 'pprof listen address'),
    ],
  },
  {
    id: 'multimedia', title: 'Multimedia', description: 'Image generation policy and video-result credential association.',
    fields: [
      field('multimediaDisableImageGeneration', 'multimedia.disable-image-generation', 'Image generation policy', 'image-mode', 'false enables images; true disables globally; chat disables on non-image routes; passthrough keeps client tools unchanged on non-image routes.'),
      field('multimediaGptImage2BaseModel', 'multimedia.gpt-image-2-base-model', 'GPT Image 2 base model'),
      field('multimediaVideoResultAuthCacheTtl', 'multimedia.video-result-auth-cache-ttl', 'Video result auth cache TTL', 'go-duration'),
    ],
  },
  {
    id: 'oauth-defaults', title: 'OAuth import/export and Codex headers', description: 'Auth directory is an import/export path, not Home runtime credential storage. These Codex defaults apply to OAuth credentials.',
    fields: [
      field('oauthAuthDir', 'oauth.auth-dir', 'Auth directory'),
      field('oauthCodexHeaderUserAgent', 'oauth.providers.codex.header-defaults.user-agent', 'Codex User-Agent', 'header'),
      field('oauthCodexHeaderBetaFeatures', 'oauth.providers.codex.header-defaults.beta-features', 'Codex beta features', 'header'),
    ],
  },
  {
    id: 'live-media-relay', title: 'Codex Live media relay', description: 'OAuth WebRTC relay settings. ICE entries are loaded from YAML to preserve TURN secrets; do not share configuration exports.',
    fields: [
      field('liveMediaRelayEnabled', 'oauth.providers.codex.live-media-relay.enabled', 'Enable relay', 'boolean'),
      field('liveMediaRelayDisablePrivateRemoteIps', 'oauth.providers.codex.live-media-relay.disable-private-remote-ips', 'Reject private remote media addresses', 'boolean'),
      field('liveMediaRelayMaxSessions', 'oauth.providers.codex.live-media-relay.max-sessions', 'Maximum sessions', 'number', '', { min: 0 }),
      field('liveMediaRelayUdpPortMin', 'oauth.providers.codex.live-media-relay.udp-port-min', 'Minimum UDP port', 'number', '', { min: 0, max: 65535 }),
      field('liveMediaRelayUdpPortMax', 'oauth.providers.codex.live-media-relay.udp-port-max', 'Maximum UDP port', 'number', '', { min: 0, max: 65535 }),
      field('liveMediaRelayPublicIp', 'oauth.providers.codex.live-media-relay.public-ip', 'Public IP'),
      field('liveMediaRelayIceServersJson', 'oauth.providers.codex.live-media-relay.ice-servers', 'ICE servers (JSON)', 'ice-servers', 'Array of objects with urls (string array), optional username and credential. Changing URLs does not inherit omitted secrets.'),
    ],
  },
  {
    id: 'antigravity-runtime', title: 'Antigravity signatures and pooling', description: 'OAuth signature handling and per-credential upstream connection pools.',
    fields: [
      field('antigravityCredits', 'oauth.providers.antigravity.antigravity-credits', 'Use Antigravity credits', 'boolean'),
      field('antigravitySignatureCacheEnabled', 'oauth.providers.antigravity.signature-cache-enabled', 'Signature cache validation', 'boolean'),
      field('antigravitySignatureBypassStrict', 'oauth.providers.antigravity.signature-bypass-strict', 'Strict signature bypass', 'boolean'),
      field('antigravityConnPoolEnabled', 'oauth.providers.antigravity.connection-pool.enabled', 'Enable connection pool', 'boolean'),
      field('antigravityConnPoolIdleTimeout', 'oauth.providers.antigravity.connection-pool.idle-conn-timeout', 'Idle connection timeout', 'go-duration', 'Default 30s; backend caps at 210s.'),
      field('antigravityConnPoolMaxIdleConnsPerHost', 'oauth.providers.antigravity.connection-pool.max-idle-conns-per-host', 'Maximum idle connections per host', 'number', 'Backend default: 2.', { min: 0 }),
    ],
  },
]

export const isConfigJsonField = (type: string) => ['json', 'string-list', 'ice-servers'].includes(type)

export function validateConfigParityField(field: ConfigField, value: unknown): string | undefined {
  if (value == null) return
  if (field.type === 'image-mode') {
    if (![false, true, 'chat', 'passthrough'].includes(value as boolean | string)) return 'Select a supported image generation policy.'
  } else if (field.type === 'string-list' || field.type === 'ice-servers') {
    try {
      const parsed = JSON.parse(String(value))
      if (!Array.isArray(parsed)) throw new Error()
      if (field.type === 'string-list') {
        if (parsed.some(item => typeof item !== 'string')) throw new Error()
      } else if (parsed.some(item => !item || typeof item !== 'object' || Array.isArray(item) ||
        !Array.isArray(item.urls) || !item.urls.length || item.urls.some((url: unknown) => typeof url !== 'string' || !url.trim()) ||
        ['username', 'credential'].some(key => item[key] != null && typeof item[key] !== 'string'))) throw new Error()
    } catch {
      return field.type === 'string-list' ? 'Enter a JSON array of strings.' : 'Enter ICE server objects with a non-empty urls string array and optional username / credential strings.'
    }
  } else if (field.type === 'go-duration') {
    if (typeof value !== 'string' || (value.trim() !== '' && value.trim() !== '0' && !/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value.trim()))) return 'Enter a non-negative Go duration, for example 30s or 1h.'
  } else if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) return `Enter an integer from ${field.min ?? 'the minimum'} to ${field.max ?? 'the backend limit'}.`
  } else if (field.type === 'header' && (typeof value !== 'string' || /[\r\n\u0000]/.test(value))) {
    return 'Header defaults must not contain line breaks or NUL characters.'
  }
}
