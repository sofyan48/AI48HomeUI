import { configParitySections, type ConfigSection } from '~/composables/configParity'

export const sharedConfigSections: ConfigSection[] = [
  ...configParitySections,
  {
    id: "session-streaming", title: "Session routing and streaming", description: "Session-sticky routing and downstream response keepalives. Unset settings retain backend defaults.",
    fields: [
      { key: "sessionAffinity", path: ["routing", "session-affinity"], label: "Session affinity", type: "boolean", description: "Keep a session on its selected credential. Failover of an unavailable binding follows the rebind policy." },
      { key: "sessionAffinityTtl", path: ["routing", "session-affinity-ttl"], label: "Session affinity TTL", type: "session-duration", placeholder: "1h or 30m", description: "Session-to-credential binding duration, for example 1h or 30m. Backend default: 1h; empty uses the backend fallback." },
      { key: "sessionAffinityRebindOn", path: ["routing", "session-affinity-rebind-on"], label: "Session rebind policy", type: "choice", options: [{ value: "any", label: "any" }, { value: "quota", label: "quota" }, { value: "never", label: "never" }], description: "any (default): any credential failure rebinds on failover. quota: transient errors fail over for that request only; quota/auth/model-support errors rebind. never: never move an established session. Executed by Home; ignored when session affinity is off." },
      { key: "sessionAffinitySubagents", path: ["routing", "session-affinity-subagents"], label: "Subagent credential inheritance", type: "boolean", description: "Let unbound child sessions inherit the parent's credential; Guardian requests may inherit across models. Default: true. False uses normal selection and stops recording Guardian history. Upgrade every Home node first." },
      { key: "streamingKeepaliveSeconds", path: ["requests", "streaming", "keepalive-seconds"], label: "SSE keepalive interval (seconds)", type: "number", description: "SSE heartbeat interval; zero or negative values disable heartbeats." },
      { key: "streamingSendKeepaliveBeforeFt", path: ["requests", "streaming", "send-keepalive-before-ft"], label: "SSE keepalive before first token", type: "boolean", description: "Send heartbeats before the first token only when the SSE keepalive interval is greater than zero." },
      { key: "streamingBootstrapRetries", path: ["requests", "streaming", "bootstrap-retries"], label: "Streaming bootstrap retries", type: "number", description: "Retries before the first byte of a stream; zero or negative values disable retries." },
      { key: "nonstreamKeepaliveInterval", path: ["requests", "nonstream-keepalive-interval"], label: "Non-streaming keepalive interval (seconds)", type: "number", description: "Blank-line heartbeat interval for non-streaming responses; zero or negative values disable it." },
    ],
  },
  {
    id: "oauth-request-errors", title: "OAuth request-scoped errors", description: "Provider-keyed OAuth error overrides, separate from API-key group and credential rules. Custom provider IDs and additional rule fields are preserved.",
    fields: [
      { key: "oauthRequestScopedErrorsJson", path: ["oauth", "request-scoped-errors"], label: "Request-scoped error rules (JSON)", type: "json", description: 'Map provider IDs to rule arrays, e.g. {"codex":[{"status":429,"match-regexr":["rate.*limit"],"action":"continue-and-cooldown"}]}. Actions: stop, stop-and-cooldown, continue, continue-and-cooldown. Use the exact spelling match-regexr. An empty object is explicit; backend default removes the setting.' },
    ],
  },
  {
    id: "upstream-claude", title: "Claude shared upstream", description: "Applies to OAuth and API-key routes under their existing execution conditions. Explicit credential options keep precedence.",
    fields: [
      { key: "claudeToolSearch", path: ["upstream", "claude", "tool-search"], label: "Tool search", type: "boolean", description: "Enable Codex tool_search on Claude Responses routes. Native Anthropic tool search is used on api.anthropic.com or keys with native-tool-search; other credentials use plain translation. Default: false." },
      { key: "claudeModelLevelCooling", path: ["upstream", "claude", "model-level-cooling"], label: "Model-level cooling", type: "boolean", description: "Scope quota cooldowns to the requested model. CPA compatibility option: Home cooldown scheduling remains authoritative. Default: false." },
      { key: "claudeDisableCloakMode", path: ["upstream", "claude", "disable-claude-cloak-mode"], label: "Disable request cloaking", type: "boolean", description: "Pass through the original system prompt on OAuth and API-key CLI profiles. Credential attributes and explicit per-key cloak modes override this shared default. Default: false (per-client auto behavior)." },
      { key: "claudeDisableCloakingModelList", path: ["upstream", "claude", "disable-cloaking-model-list"], label: "Disable model-list cloaking", type: "boolean", description: "Return original model IDs in Anthropic model-list responses. Default: false." },
      ...[
        ["UserAgent", "user-agent", "User-Agent", "Unconfirmed clients use this Claude CLI baseline; update only after measuring a release."],
        ["PackageVersion", "package-version", "Package version", "Shared Claude CLI package baseline."],
        ["RuntimeVersion", "runtime-version", "Runtime version", "Shared Claude CLI runtime baseline."],
        ["Os", "os", "Operating system", "Verified native OS values are preserved unless device-profile stabilization is enabled."],
        ["Arch", "arch", "Architecture", "Verified native architecture is preserved unless device-profile stabilization is enabled."],
        ["Timeout", "timeout", "Timeout header", "Claude timeout header fallback, not a proxy request timeout."],
        ["Timezone", "timezone", "Timezone", "Fallback IANA timezone for cloaked currentDate; credential JSON timezone takes priority."],
      ].map(([suffix, name, label, description]) => ({ key: `claudeHeader${suffix}`, path: ["upstream", "claude", "header-defaults", name!], label: label!, description: description!, type: "text" })),

      { key: "claudeHeaderStabilizeDeviceProfile", path: ["upstream", "claude", "header-defaults", "stabilize-device-profile"], label: "Stabilize device profile", type: "boolean", description: "Pin OS/architecture and cached profiles to the configured software baseline. Unset retains the backend fallback; explicit false disables pinning." },
      { key: "claudeServerSideFallback", path: ["upstream", "claude", "server-side-fallback"], label: "Server-side refusal fallback", type: "boolean", description: "Inject Anthropic server-side refusal fallbacks on cloaked requests that do not specify fallbacks. Translated responses report the serving model. Default: false." },
      { key: "claudeSessionDatePinDays", path: ["upstream", "claude", "session-date-pin-days"], label: "Session date pin (days)", type: "number", description: "Days to keep the cloaked currentDate pin per session in CPA in-memory mode. Default 7; 0 uses the continuity-scoped pin. Ignored with Home KV." },
      { key: "claudeHeaderNativeEntrypointsJson", path: ["upstream", "claude", "header-defaults", "native-entrypoints"], label: "Native entrypoints (JSON)", type: "string-list", description: 'Extra Claude Code entrypoint labels treated as native for passthrough, e.g. ["t3-code"].' },
      { key: "claudeHeaderAnthropicBetaStripJson", path: ["upstream", "claude", "header-defaults", "anthropic-beta-strip"], label: "Anthropic-Beta strip (JSON)", type: "string-list", description: "Beta names removed from every Claude request. Advanced; api.anthropic.com may reject unusual beta sets." },
      { key: "claudeHeaderAnthropicBetaAppendJson", path: ["upstream", "claude", "header-defaults", "anthropic-beta-append"], label: "Anthropic-Beta append (JSON)", type: "string-list", description: "Beta names appended to every Claude request unless already present. Strip runs first." },
      { key: "claudeHeaderInjectDiagnostics", path: ["upstream", "claude", "header-defaults", "inject-diagnostics"], label: "Inject diagnostics", type: "boolean", description: "Add the Claude Code diagnostics body field on cloaked api.anthropic.com requests. Default: true." },
      { key: "claudeHeaderClientRequestId", path: ["upstream", "claude", "header-defaults", "client-request-id"], label: "x-client-request-id", type: "choice", options: [{ value: "on", label: "on" }, { value: "passthrough", label: "passthrough" }, { value: "off", label: "off" }], description: "on (default): synthesize a UUID per request; passthrough: forward only the caller's value; off: never send the header." },
    ],
  },
  {
    id: "upstream-codex", title: "Codex shared upstream", description: "Shared behavior for OAuth and API-key credentials; these are not OAuth-only settings.",
    fields: [
      { key: "codexResponseSteering", path: ["upstream", "codex", "response-steering"], label: "Response steering", type: "boolean", description: "Experimental full-duplex Responses WebSocket steering. One account/model per socket; accepted input is never replayed. Default: false." },
      { key: "codexDisableCloaking", path: ["upstream", "codex", "disable-codex-cloaking"], label: "Disable identity cloaking", type: "boolean", description: "Stop forcing official Codex User-Agent and Originator headers on HTTP/SSE and WebSocket requests. Explicit credential overrides retain precedence. Default: false." },
      { key: "codexStreamBootstrapBuffering", path: ["upstream", "codex", "stream-bootstrap-buffering"], label: "Stream bootstrap buffering", type: "boolean", description: "Hold handshake, heartbeat and early empty frames until generation to allow overload/rate-limit failover before stream commitment. Delays headers; review client and reverse-proxy timeouts. Default: false." },
      { key: "codexStreamBootstrapTimeout", path: ["upstream", "codex", "stream-bootstrap-timeout"], label: "Stream bootstrap timeout", type: "duration", description: "Optional buffering ceiling, e.g. 20s. Evaluated as upstream frames arrive; never aborts the upstream connection. Translators may still wait for generated text before committing headers. Empty, 0, 0s, none, unlimited, disabled, off or never means no time ceiling (frame/byte budgets only)." },
      { key: "codexOrphanDelegationCompatibility", path: ["upstream", "codex", "orphan-delegation-compatibility"], label: "Orphan delegation compatibility", type: "boolean", description: "Convert orphan codex_app/create_thread and send_message_to_thread outputs into user messages when X-Openai-Subagent is collab_spawn. Default: false." },
      { key: "codexModelLevelCooling", path: ["upstream", "codex", "model-level-cooling"], label: "Model-level cooling", type: "boolean", description: "Scope usage_limit_reached cooldowns to the requested model. CPA compatibility option: Home cooldown scheduling remains authoritative. Default: false." },
      { key: "codexUpstreamRequestCompression", path: ["upstream", "codex", "upstream-request-compression"], label: "Upstream request compression", type: "boolean", description: "Compress request bodies sent to the ChatGPT Codex backend with zstd (OAuth credentials only). A 400/415 rejection is retried uncompressed once. Default: false." },
      { key: "codexUpstreamRequestCompressionMinBytes", path: ["upstream", "codex", "upstream-request-compression-min-bytes"], label: "Compression minimum (bytes)", type: "number", description: "Request bodies smaller than this are sent uncompressed. Default: 1024." },
      { key: "codexWebsocketCompression", path: ["upstream", "codex", "websocket-compression"], label: "WebSocket compression", type: "boolean", description: "Negotiate permessage-deflate on upstream and downstream Codex WebSocket connections. Default: true." },
    ],
  },
  {
    id: "client-codex", title: "Codex client compatibility", description: "Client-facing compatibility across OAuth and API-key routes, including non-Codex upstream protocols.",
    fields: [
      { key: "codexOptimizeMultiAgentV2", path: ["client", "codex", "optimize-multi-agent-v2"], label: "Optimize multi-agent v2", type: "boolean", description: "Refresh spawn_agent model details, remove message parameter encryption, normalize encrypted agent_message content, and translate agent_message inputs for non-Codex protocols. Default: false." },
      { key: "codexEnableApplyPatch", path: ["client", "codex", "enable-apply-patch"], label: "Advertise freeform apply_patch", type: "boolean", description: "Also advertise freeform apply_patch on non-template and bridged models supported by every routing executor. Default: false (native models only)." },
      { key: "codexWebSearchCacheEnabled", path: ["client", "codex", "web-search-result-cache", "enabled"], label: "Web search result cache", type: "boolean", description: "Cache upstream web search results per session so replayed web_search_call items keep their results in later turns. Default: false." },
      { key: "codexWebSearchCacheTtl", path: ["client", "codex", "web-search-result-cache", "ttl"], label: "Web search cache TTL", type: "session-duration", placeholder: "24h", description: "Go duration such as 24h. Backend default: 24h." },
      { key: "codexWebSearchCacheLimit", path: ["client", "codex", "web-search-result-cache", "limit"], label: "Web search cache limit", type: "number", description: "Maximum cached entries; must not be negative. Backend default: 1024." },
    ],
  },
  {
    id: "client-claude", title: "Claude client compatibility", description: "Client-facing Claude behavior executed on CPA nodes.",
    fields: [
      { key: "claudeShowCodexCommentary", path: ["client", "claude", "show-codex-commentary"], label: "Show Codex commentary", type: "boolean", description: "Show public Codex commentary as visible Claude text; genuine reasoning summaries remain thinking blocks. Default: false." },
    ],
  },
  {
    id: "cpa-server", title: "CPA server execution", description: "Body-size, compression, shutdown and GitHub settings executed on CPA nodes, not on the Home listener.",
    fields: [
      { key: "serverMaxRequestBodyBytes", path: ["server", "max-request-body-bytes"], label: "Maximum request body (bytes)", type: "number", description: "Requests above this size are rejected with HTTP 413. Default 0 (no limit)." },
      { key: "serverResponseCompressionEnabled", path: ["server", "response-compression", "enabled"], label: "Response compression", type: "boolean", description: "Compress downstream responses (including SSE) with zstd or gzip when the client advertises it. Default: true." },
      { key: "serverResponseCompressionMinBytes", path: ["server", "response-compression", "min-bytes"], label: "Compression minimum (bytes)", type: "number", description: "Non-streaming responses smaller than this are sent uncompressed. Default: 1024." },
      { key: "serverShutdownTimeout", path: ["server", "shutdown-timeout"], label: "Shutdown drain (seconds)", type: "number", description: "Graceful drain budget for in-flight requests on SIGINT/SIGTERM. Default 0 closes immediately." },
      { key: "serverGithubToken", path: ["server", "github-token"], label: "GitHub token", type: "secret", description: "Token for GitHub release and asset downloads; overrides GITHUB_TOKEN. Treat as a secret: it is distributed to trusted CPA nodes." },
    ],
  },
  {
    id: "oauth-model-settings", title: "OAuth model settings", description: "Per-channel model settings for OAuth/file credentials; API-key models are not affected. Home publishes the resulting catalog.",
    fields: [
      { key: "oauthSettingsJson", path: ["oauth", "settings"], label: "Model settings (JSON)", type: "oauth-settings", description: 'Map channels to entries, e.g. {"codex":[{"name":"gpt-6-sol","max-context-length":524288}]}. An optional alias targets one public route and wins over name-only entries. Channels: vertex, aistudio, antigravity, claude, codex, kimi, xai, meta.' },
    ],
  },
  {
    id: "antigravity-policies", title: "Antigravity protection and prompt rewriting", description: "OAuth Antigravity pool pause and system-instruction rewriting.",
    fields: [
      { key: "antigravityTosPauseWindow", path: ["oauth", "providers", "antigravity", "tos-pause-window"], label: "TOS violation pause window", type: "pause-window", placeholder: "6h", description: "Pool-wide pause after a Google 403 TOS_VIOLATION. Default 0 (disabled); set a positive duration such as 6h to enable. 0/off/false/none/disabled disables it." },
      { key: "antigravitySensitiveWordsReplaceJson", path: ["oauth", "providers", "antigravity", "sensitive-words-replace"], label: "Sensitive word replacements (JSON)", type: "string-map", description: 'Literal target-to-replacement map applied to system instructions, e.g. {"Claude Code": "Claude"}. An empty replacement deletes the phrase.' },
      { key: "antigravitySensitivePatternsReplaceJson", path: ["oauth", "providers", "antigravity", "sensitive-patterns-replace"], label: "Sensitive pattern replacements (JSON)", type: "pattern-rules", description: 'Ordered Go RE2 rules, e.g. [{"pattern":"(?m)^RFC 2119[^\\n]*\\n?","replacement":""}]. Invalid regexes are saved but silently dropped by CPA; check them before saving.' },
    ],
  },
  {
    id: "devin-policies", title: "Devin prompt rewriting", description: "OAuth Devin system-prompt rewriting rules.",
    fields: [
      { key: "devinSensitiveWordsReplaceJson", path: ["oauth", "providers", "devin", "sensitive-words-replace"], label: "Sensitive word replacements (JSON)", type: "string-map", description: 'Literal target-to-replacement map applied to system prompts, e.g. {"Claude Code": "Devin"}.' },
      { key: "devinSensitivePatternsReplaceJson", path: ["oauth", "providers", "devin", "sensitive-patterns-replace"], label: "Sensitive pattern replacements (JSON)", type: "pattern-rules", description: 'Ordered Go RE2 rules, e.g. [{"pattern":"(?m)^You are omp[^\\n]*\\n?","replacement":""}].' },
    ],
  },
  {
    id: "upstream-xai", title: "xAI shared upstream", description: "Native xAI behavior shared by OAuth and API-key routes.",
    fields: [
      { key: "xaiInjectXSearch", path: ["upstream", "xai", "inject-x-search"], label: "Inject X search", type: "boolean", description: "Inject native x_search when absent, also adding it to tool_choice.allowed_tools when applicable. Default: false." },
    ],
  },
];
export const sharedConfigFields = sharedConfigSections.flatMap(section => section.fields);
