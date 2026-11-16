import { configParitySections } from '~/composables/configParity'

export const sharedConfigSections = [
  ...configParitySections,
  {
    id: "session-streaming", title: "Session routing and streaming", description: "Session-sticky routing and downstream response keepalives. Unset settings retain backend defaults.",
    fields: [
      { key: "sessionAffinity", path: ["routing", "session-affinity"], label: "Session affinity", type: "boolean", description: "Keep a session on its selected credential, with automatic failover when unavailable." },
      { key: "sessionAffinityTtl", path: ["routing", "session-affinity-ttl"], label: "Session affinity TTL", type: "session-duration", placeholder: "1h or 30m", description: "Session-to-credential binding duration, for example 1h or 30m. Backend default: 1h; empty uses the backend fallback." },
      { key: "sessionAffinitySubagents", path: ["routing", "session-affinity-subagents"], label: "Subagent credential inheritance", type: "boolean", description: "Optional CPA compatibility setting for inheriting a parent session's credential. Home continues to manage its own session hierarchy." },
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
      ].map(([suffix, name, label, description]) => ({ key: `claudeHeader${suffix}`, path: ["upstream", "claude", "header-defaults", name], label, description, type: "text" })),
      { key: "claudeHeaderStabilizeDeviceProfile", path: ["upstream", "claude", "header-defaults", "stabilize-device-profile"], label: "Stabilize device profile", type: "boolean", description: "Pin OS/architecture and cached profiles to the configured software baseline. Unset retains the backend fallback; explicit false disables pinning." },
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
    ],
  },
  {
    id: "client-codex", title: "Codex client compatibility", description: "Client-facing compatibility across OAuth and API-key routes, including non-Codex upstream protocols.",
    fields: [
      { key: "codexOptimizeMultiAgentV2", path: ["client", "codex", "optimize-multi-agent-v2"], label: "Optimize multi-agent v2", type: "boolean", description: "Refresh spawn_agent model details, remove message parameter encryption, normalize encrypted agent_message content, and translate agent_message inputs for non-Codex protocols. Default: false." },
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
