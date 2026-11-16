<template>
  <section class="grid gap-5">
    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      :title="t('config.page.attention')"
      :description="pageError"
    />

    <div v-if="loading && !loaded" class="grid gap-4">
      <USkeleton class="h-28 w-full" />
      <USkeleton class="h-64 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else class="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside
        class="hidden min-w-0 self-start xl:sticky xl:top-0 xl:block xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:overscroll-contain"
      >
        <AppCard :ui="{ body: 'p-2 sm:p-2' }">
          <p
            class="px-2 pb-2 text-xs font-semibold uppercase text-[var(--ui-text-muted)]"
          >
            {{ t('config.page.outlineTitle') }}
          </p>
          <button
            v-for="section in outline"
            :key="section.id"
            type="button"
            class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--ui-bg-elevated)]"
            @click="scrollToSection(section.id)"
          >
            <span>{{ section.short }}</span
            ><span
              v-if="sectionDirty(section.keys)"
              class="size-2 rounded-full bg-[var(--ui-primary)]"
            />
          </button>
        </AppCard>
      </aside>

      <div class="min-w-0">
        <AppCard
          class="sticky top-24 z-20 mb-4 xl:hidden"
          :ui="{ body: 'flex gap-1 overflow-x-auto p-2' }"
        >
          <AppButton
            v-for="section in outline"
            :key="section.id"
            size="sm"
            color="neutral"
            variant="ghost"
            class="shrink-0"
            @click="scrollToSection(section.id)"
            >{{ section.short }}</AppButton
          >
        </AppCard>

        <AdminConfigVisualSections
          v-model:draft="draft"
          :validation-errors="validationErrors"
          :loading="loading || saving"
        >
          <template #oauth-rules>
            <AppCard
              id="config-oauth-rules"
            >
              <template #header
                ><div>
                  <h2 class="font-semibold">{{ t('config.oauthRules.title') }}</h2>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ t('config.oauthRules.description') }}
                  </p>
                </div></template
              >
              <div class="space-y-6">
                <section class="space-y-3">
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <UFormField :label="t('config.oauthRules.channel')" class="lg:w-64"
                      ><USelect
                        v-model="exclusionChannel"
                        :items="channelOptions"
                        value-key="value"
                        label-key="label"
                        class="w-full"
                        @update:model-value="loadChannelModels" /></UFormField
                    ><UInput
                      v-model="modelSearch"
                      icon="i-tabler-search"
                      :placeholder="t('config.oauthRules.searchPlaceholder')"
                      class="flex-1"
                    /><AppButton
                      color="neutral"
                      variant="outline"
                      :loading="modelsLoading"
                      @click="loadChannelModels"
                      >{{ t('config.oauthRules.reloadModels') }}</AppButton
                    >
                  </div>
                  <UAlert
                    v-if="modelsError"
                    color="warning"
                    variant="subtle"
                    :title="t('config.oauthRules.modelsUnavailable')"
                    :description="modelsError"
                  />
                  <div
                    class="max-h-80 overflow-y-auto rounded-md border border-[var(--ui-border)]"
                  >
                    <label
                      v-for="model in filteredChannelModels"
                      :key="model.id"
                      class="flex items-start gap-3 border-b border-[var(--ui-border)] px-3 py-2 last:border-b-0"
                      ><UCheckbox
                        :model-value="excludedForChannel.includes(model.id)"
                        :disabled="loading || saving || Boolean(validationErrors.oauthExcludedModelsJson)"
                        @update:model-value="toggleExcluded(model.id, $event)"
                      /><span
                        ><span class="block text-sm font-medium">{{
                          model.display_name || model.name || model.id
                        }}</span
                        ><span
                          class="font-mono text-xs text-[var(--ui-text-muted)]"
                          >{{ model.id }}</span
                        ></span
                      ></label
                    >
                    <p
                      v-if="modelsLoading || !filteredChannelModels.length"
                      class="p-6 text-center text-sm text-[var(--ui-text-muted)]"
                    >
                      {{ modelsLoading ? t('config.oauthRules.loadingModels') : t('config.oauthRules.noModels') }}
                    </p>
                  </div>
                  <div class="flex items-center justify-between">
                    <UBadge color="neutral" variant="subtle"
                      >{{ t('config.oauthRules.disabledCount', { count: excludedForChannel.length }) }}</UBadge
                    ><AppButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      :disabled="!excludedForChannel.length || loading || saving || Boolean(validationErrors.oauthExcludedModelsJson)"
                      @click="clearExcludedChannel"
                      >{{ t('config.oauthRules.clearChannel') }}</AppButton
                    >
                  </div>
                  <UFormField :label="t('config.oauthRules.manualLabel')" :hint="t('config.oauthRules.manualHint')" :error="validationErrors.oauthExcludedModelsJson">
                    <UTextarea v-model="draft.oauthExcludedModelsJson" :disabled="loading || saving" :rows="6" class="w-full font-mono text-xs" spellcheck="false" />
                  </UFormField>
                </section>

                <section
                  class="space-y-3 border-t border-[var(--ui-border)] pt-5"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-semibold">{{ t('config.aliases.title') }}</h3>
                      <p class="text-xs text-[var(--ui-text-muted)]">
                        {{ t('config.aliases.description') }}
                      </p>
                    </div>
                    <AppButton
                      size="sm"
                      color="neutral"
                      variant="outline"
                      @click="addAlias"
                      >{{ t('config.aliases.add') }}</AppButton
                    >
                  </div>
                  <AppCard
                    v-for="(row, index) in aliasRows"
                    :key="row.key"
                    :ui="{
                      body: 'grid gap-3 p-3 lg:grid-cols-2 lg:items-end',
                    }"
                    ><UFormField :label="t('config.oauthRules.channel')"
                      ><UInput v-model="row.channel" /></UFormField
                    ><UFormField :label="t('config.aliases.upstreamModel')"
                      ><UInput v-model="row.name" /></UFormField
                    ><UFormField :label="t('config.aliases.clientAlias')"
                      ><UInput v-model="row.alias" /></UFormField
                    ><UFormField :label="t('config.aliases.displayName')"
                      ><UInput v-model="row.displayName" /></UFormField
                    ><UCheckbox v-model="row.fork" :label="t('config.aliases.fork')" /><UCheckbox
                      v-model="row.forceMapping"
                      :label="t('config.aliases.forceMapping')" /><AppButton
                      color="error"
                      variant="ghost"
                      icon="i-tabler-trash"
                      :aria-label="t('config.aliases.remove')"
                      @click="aliasRows.splice(index, 1)"
                  /></AppCard>
                  <p
                    v-if="!aliasRows.length"
                    class="py-6 text-center text-sm text-[var(--ui-text-muted)]"
                  >
                    {{ t('config.aliases.empty') }}
                  </p>
                </section>
              </div>
            </AppCard>
          </template>

          <template #proxy-pool
            ><div id="config-proxy-pool"><AdminConfigProxyPool /></div
          ></template>

          <template #payload>
            <AdminConfigSharedUpstream
              v-model:draft="draft"
              :sections="displaySharedSections"
              :validation-errors="validationErrors"
              :loading="loading || saving"
              class="mb-6"
            />
            <AppCard
              id="config-payload"
            >
              <template #header
                ><div>
                  <h2 class="font-semibold">{{ t('config.payload.title') }}</h2>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ t('config.payload.description') }}
                  </p>
                </div></template
              >
              <div class="space-y-4">
                <div class="flex flex-wrap gap-2" :aria-label="t('config.payload.ruleCounts')">
                  <span
                    v-for="mode in payloadModes"
                    :key="mode.value"
                    class="inline-flex items-center gap-1.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-2.5 py-1 text-xs"
                    ><span class="text-[var(--ui-text-muted)]">{{ payloadModeLabel(mode.value) }}</span
                    ><strong class="tabular-nums text-[var(--ui-text-highlighted)]">{{
                      payloadDraft[mode.value]?.length || 0
                    }}</strong></span
                  >
                </div>
                <div
                  v-for="mode in payloadModes"
                  :key="mode.value"
                  class="space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <h3 class="font-semibold">{{ payloadModeLabel(mode.value) }}</h3>
                    <AppButton
                      size="sm"
                      color="neutral"
                      variant="outline"
                      @click="addPayloadRule(mode.value)"
                      >{{ t('config.payload.addRule') }}</AppButton
                    >
                  </div>
                  <AppCard
                    v-for="(rule, index) in payloadDraft[mode.value] || []"
                    :key="index"
                    :ui="{ body: 'p-3' }"
                    ><div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-sm font-medium">
                          {{ payloadRuleSummary(rule) }}
                        </p>
                        <p class="text-xs text-[var(--ui-text-muted)]">
                          {{ payloadRulePaths(rule, mode.value) }}
                        </p>
                      </div>
                      <div class="flex gap-1">
                        <AppButton
                          size="sm"
                          color="neutral"
                          variant="ghost"
                          @click="editPayload(mode.value, index)"
                          >{{ t('common.edit') }}</AppButton
                        ><AppButton
                          size="sm"
                          color="neutral"
                          variant="ghost"
                          @click="duplicatePayload(mode.value, index)"
                          >{{ t('config.payload.duplicate') }}</AppButton
                        ><AppButton
                          size="sm"
                          color="error"
                          variant="ghost"
                          @click="removePayload(mode.value, index)"
                          >{{ t('common.remove') }}</AppButton
                        >
                      </div>
                    </div></AppCard
                  >
                </div>
                <details>
                  <summary class="cursor-pointer text-sm">
                    {{ t('config.payload.viewJson') }}
                  </summary>
                  <pre
                    class="mt-2 max-h-80 overflow-auto rounded-md bg-[var(--ui-bg-muted)] p-3 text-xs"
                    >{{ JSON.stringify(payloadDraft, null, 2) }}</pre
                  >
                </details>
              </div>
            </AppCard>
          </template>
        </AdminConfigVisualSections>
      </div>
    </div>

    <AppCard
      v-if="loaded"
      :ui="{
        body: 'flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between',
      }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="subtle"
          >{{ t('config.footer.runtime', { mode: runtimeMode }) }}</UBadge
        >
        <UBadge color="neutral" variant="subtle"
          >{{ t('config.footer.updated', { time: updatedLabel }) }}</UBadge
        >
        <UBadge :color="dirtyCount ? 'warning' : 'neutral'" variant="subtle">{{
          dirtyCount ? t('config.footer.changes', { count: dirtyCount }) : t('config.footer.noChanges')
        }}</UBadge>
        <UBadge v-if="validationCount" color="warning" variant="subtle"
          >{{ t('config.footer.attention', { count: validationCount }) }}</UBadge
        >
      </div>
      <div class="flex flex-wrap gap-2">
        <AdminConfigYamlReplacement :disabled="loading || saving || dirtyCount > 0" @saved="loadWorkspace()" />
        <AppButton
          color="neutral"
          variant="outline"
          :disabled="!dirtyCount"
          @click="changesOpen = true"
          >{{ t('config.footer.viewChanges') }}</AppButton
        >
        <AppButton
          color="neutral"
          variant="outline"
          icon="i-tabler-refresh"
          :loading="loading"
          :disabled="saving"
          @click="reloadWorkspace"
          >{{ t('common.reload') }}</AppButton
        >
        <AppButton
          icon="i-tabler-check"
          :loading="saving"
          :disabled="!dirtyCount || validationCount > 0 || loading || saveNeedsReload"
          @click="saveWorkspace"
          >{{ t('common.save') }}</AppButton
        >
      </div>
    </AppCard>

    <USlideover
      v-model:open="changesOpen"
      :title="t('config.changes.title')"
      :description="t('config.changes.description')"
      :ui="{ content: 'sm:max-w-xl' }"
      ><template #body
        ><div class="space-y-2">
          <AppCard
            v-for="change in changes"
            :key="change.key"
            :ui="{ body: 'p-0' }"
            ><button
              type="button"
              class="w-full p-3 text-left transition-colors hover:bg-[var(--ui-bg-elevated)]"
              @click="
                changesOpen = false;
                scrollToSection(change.section);
              "
            >
              <p class="font-medium">{{ change.label }}</p>
              <p class="mt-1 break-all text-xs text-[var(--ui-text-muted)]">
                {{ change.before }} → {{ change.after }}
              </p>
            </button></AppCard
          >
        </div></template
      ></USlideover
    >

    <AppModal
      v-model:open="reloadConfirmOpen"
      :title="t('config.reload.title')"
      :description="t('config.reload.description')"
      ><template #body
        ><div class="flex justify-end gap-2">
          <AppButton
            color="neutral"
            variant="ghost"
            @click="reloadConfirmOpen = false"
            >{{ t('common.cancel') }}</AppButton
          ><AppButton
            color="error"
            @click="
              reloadConfirmOpen = false;
              loadWorkspace();
            "
            >{{ t('config.reload.confirm') }}</AppButton
          >
        </div></template
      ></AppModal
    >

    <AppModal
      v-model:open="payloadEditorOpen"
      :title="payloadEditIndex < 0 ? t('config.payload.addTitle') : t('config.payload.editTitle')"
      :ui="{ content: 'sm:max-w-3xl' }"
      ><template #body
        ><form class="space-y-4" @submit.prevent="savePayloadEditor">
          <UFormField :label="t('config.payload.models')" required
            ><UTextarea
              v-model="payloadEditor.models"
              :rows="8"
              class="font-mono text-xs" /></UFormField
          ><UFormField
            :label="
              payloadEditMode === 'filter'
                ? t('config.payload.filterParams')
                : t('config.payload.params')
            "
            required
            ><UTextarea
              v-model="payloadEditor.params"
              :rows="10"
              class="font-mono text-xs" /></UFormField
          ><UAlert
            v-if="payloadEditorError"
            color="error"
            variant="subtle"
            :description="payloadEditorError"
          />
          <div class="flex justify-end gap-2">
            <AppButton
              type="button"
              color="neutral"
              variant="ghost"
              @click="payloadEditorOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton type="submit">{{ t('config.payload.saveRule') }}</AppButton>
          </div>
        </form></template
      ></AppModal
    >
  </section>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { parseDocument } from "yaml";
import { configParitySections, isConfigJsonField, validateConfigParityField } from '~/composables/configParity'
import { planConfigWrites, applyConfigWrites, reconcileConfigDraft } from '~/composables/configWrites'

const { fetchAPI } = useApi();
const toast = useToast();
const { t, intlLocale } = useAdminI18n();
const loading = useWorkspaceState('admin:config:loading', () => (false));
const loaded = useWorkspaceState('admin:config:loaded', () => (false));
const saving = useWorkspaceState('admin:config:saving', () => (false));
const pageError = useWorkspaceState('admin:config:pageError', () => (""));
const updatedAt = useWorkspaceState('admin:config:updatedAt', () => (null));
const runtimeMode = useWorkspaceState('admin:config:runtimeMode', () => ("home"));
const draft = ref({});
const baseline = useWorkspaceState('admin:config:baseline', () => ({}));
const yamlText = useWorkspaceState('admin:config:yamlText', () => (""));
const configSnapshot = useWorkspaceState('admin:config:configSnapshot', () => ({}));
const changesOpen = ref(false);
const reloadConfirmOpen = ref(false);
const modelSearch = ref("");
const exclusionChannel = ref("claude");
const channelModels = useWorkspaceState('admin:config:channelModels', () => ([]));
const modelsLoading = useWorkspaceState('admin:config:modelsLoading', () => (false));
const modelsError = ref("");
let modelRequestVersion = 0;
const aliasRows = ref([]);
let aliasKey = 0;
let aliasEditorBaseline = "";
let aliasEditorSource = "{}";
const payloadDraft = reactive({
  default: [],
  "default-raw": [],
  override: [],
  "override-raw": [],
  filter: [],
});
let payloadEditorBaseline = "";
let payloadEditorSource = "{}";
const payloadModes = [
  { value: "default" },
  { value: "default-raw" },
  { value: "override" },
  { value: "override-raw" },
  { value: "filter" },
];
function payloadModeLabel(mode) {
  return {
    default: t('config.payload.mode.default'),
    "default-raw": t('config.payload.mode.defaultRaw'),
    override: t('config.payload.mode.override'),
    "override-raw": t('config.payload.mode.overrideRaw'),
    filter: t('config.payload.mode.filter'),
  }[mode] || mode;
}
const payloadEditorOpen = ref(false);
const payloadEditMode = ref("default");
const payloadEditIndex = ref(-1);
const payloadEditor = reactive({ models: "[]", params: "{}" });
const payloadEditorError = ref("");
const saveNeedsReload = ref(false);

const channelOptions = [
  ["claude", "Claude"],
  ["gemini", "Gemini"],
  ["gemini-interactions", "Google Interactions"],
  ["vertex", "Vertex"],
  ["aistudio", "AI Studio"],
  ["codex", "Codex"],
  ["codex-free", "Codex Free"],
  ["codex-team", "Codex Team"],
  ["codex-plus", "Codex Plus"],
  ["codex-pro", "Codex Pro"],
  ["kimi", "Kimi"],
  ["kimi-ai", "Kimi AI"],
  ["antigravity", "Antigravity"],
  ["xai", "xAI"],
  ["devin", "Devin"],
  ["meta", "Meta"],
].map(([value, label]) => ({ value, label }));
const sharedConfigSections = [
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
const sharedConfigFields = sharedConfigSections.flatMap(section => section.fields);
// Display text for shared sections, keyed by section id (`<id>.title`/`<id>.description`) and field key (`<key>`/`<key>.desc`).
function sharedText() {
  return {
    "server-network.title": t('config.shared.server-network.title'), "server-network.description": t('config.shared.server-network.description'),
    serverHost: t('config.shared.serverHost'), serverAllowHostJson: t('config.shared.serverAllowHostJson'), serverTrustedProxiesJson: t('config.shared.serverTrustedProxiesJson'),
    serverCommercialMode: t('config.shared.serverCommercialMode'), managementBaseUrl: t('config.shared.managementBaseUrl'),
    "discovery.title": t('config.shared.discovery.title'), "discovery.description": t('config.shared.discovery.description'),
    discoveryEnabled: t('config.shared.discoveryEnabled'), discoveryServiceName: t('config.shared.discoveryServiceName'),
    discoveryServiceType: t('config.shared.discoveryServiceType'), "discoveryServiceType.desc": t('config.shared.discoveryServiceType.desc'),
    discoverySubtypesJson: t('config.shared.discoverySubtypesJson'), discoveryInterfacesIncludeJson: t('config.shared.discoveryInterfacesIncludeJson'),
    discoveryInterfacesExcludeJson: t('config.shared.discoveryInterfacesExcludeJson'), discoveryAuthRequired: t('config.shared.discoveryAuthRequired'),
    "discoveryAuthRequired.desc": t('config.shared.discoveryAuthRequired.desc'), discoveryAdvertiseManagement: t('config.shared.discoveryAdvertiseManagement'),
    "response-diagnostics.title": t('config.shared.response-diagnostics.title'), "response-diagnostics.description": t('config.shared.response-diagnostics.description'),
    passthroughHeaders: t('config.shared.passthroughHeaders'), pprofEnable: t('config.shared.pprofEnable'), pprofAddr: t('config.shared.pprofAddr'),
    "multimedia.title": t('config.shared.multimedia.title'), "multimedia.description": t('config.shared.multimedia.description'),
    multimediaDisableImageGeneration: t('config.shared.multimediaDisableImageGeneration'), "multimediaDisableImageGeneration.desc": t('config.shared.multimediaDisableImageGeneration.desc'),
    multimediaGptImage2BaseModel: t('config.shared.multimediaGptImage2BaseModel'), multimediaVideoResultAuthCacheTtl: t('config.shared.multimediaVideoResultAuthCacheTtl'),
    "oauth-defaults.title": t('config.shared.oauth-defaults.title'), "oauth-defaults.description": t('config.shared.oauth-defaults.description'),
    oauthAuthDir: t('config.shared.oauthAuthDir'), oauthCodexHeaderUserAgent: t('config.shared.oauthCodexHeaderUserAgent'), oauthCodexHeaderBetaFeatures: t('config.shared.oauthCodexHeaderBetaFeatures'),
    "live-media-relay.title": t('config.shared.live-media-relay.title'), "live-media-relay.description": t('config.shared.live-media-relay.description'),
    liveMediaRelayEnabled: t('config.shared.liveMediaRelayEnabled'), liveMediaRelayDisablePrivateRemoteIps: t('config.shared.liveMediaRelayDisablePrivateRemoteIps'),
    liveMediaRelayMaxSessions: t('config.shared.liveMediaRelayMaxSessions'), liveMediaRelayUdpPortMin: t('config.shared.liveMediaRelayUdpPortMin'),
    liveMediaRelayUdpPortMax: t('config.shared.liveMediaRelayUdpPortMax'), liveMediaRelayPublicIp: t('config.shared.liveMediaRelayPublicIp'),
    liveMediaRelayIceServersJson: t('config.shared.liveMediaRelayIceServersJson'), "liveMediaRelayIceServersJson.desc": t('config.shared.liveMediaRelayIceServersJson.desc'),
    "antigravity-runtime.title": t('config.shared.antigravity-runtime.title'), "antigravity-runtime.description": t('config.shared.antigravity-runtime.description'),
    antigravityCredits: t('config.shared.antigravityCredits'), antigravitySignatureCacheEnabled: t('config.shared.antigravitySignatureCacheEnabled'),
    antigravitySignatureBypassStrict: t('config.shared.antigravitySignatureBypassStrict'), antigravityConnPoolEnabled: t('config.shared.antigravityConnPoolEnabled'),
    antigravityConnPoolIdleTimeout: t('config.shared.antigravityConnPoolIdleTimeout'), "antigravityConnPoolIdleTimeout.desc": t('config.shared.antigravityConnPoolIdleTimeout.desc'),
    antigravityConnPoolMaxIdleConnsPerHost: t('config.shared.antigravityConnPoolMaxIdleConnsPerHost'), "antigravityConnPoolMaxIdleConnsPerHost.desc": t('config.shared.antigravityConnPoolMaxIdleConnsPerHost.desc'),
    "session-streaming.title": t('config.shared.session-streaming.title'), "session-streaming.description": t('config.shared.session-streaming.description'),
    sessionAffinity: t('config.shared.sessionAffinity'), "sessionAffinity.desc": t('config.shared.sessionAffinity.desc'),
    sessionAffinityTtl: t('config.shared.sessionAffinityTtl'), "sessionAffinityTtl.desc": t('config.shared.sessionAffinityTtl.desc'), "sessionAffinityTtl.placeholder": t('config.shared.sessionAffinityTtl.placeholder'),
    sessionAffinitySubagents: t('config.shared.sessionAffinitySubagents'), "sessionAffinitySubagents.desc": t('config.shared.sessionAffinitySubagents.desc'),
    streamingKeepaliveSeconds: t('config.shared.streamingKeepaliveSeconds'), "streamingKeepaliveSeconds.desc": t('config.shared.streamingKeepaliveSeconds.desc'),
    streamingSendKeepaliveBeforeFt: t('config.shared.streamingSendKeepaliveBeforeFt'), "streamingSendKeepaliveBeforeFt.desc": t('config.shared.streamingSendKeepaliveBeforeFt.desc'),
    streamingBootstrapRetries: t('config.shared.streamingBootstrapRetries'), "streamingBootstrapRetries.desc": t('config.shared.streamingBootstrapRetries.desc'),
    nonstreamKeepaliveInterval: t('config.shared.nonstreamKeepaliveInterval'), "nonstreamKeepaliveInterval.desc": t('config.shared.nonstreamKeepaliveInterval.desc'),
    "oauth-request-errors.title": t('config.shared.oauth-request-errors.title'), "oauth-request-errors.description": t('config.shared.oauth-request-errors.description'),
    oauthRequestScopedErrorsJson: t('config.shared.oauthRequestScopedErrorsJson'), "oauthRequestScopedErrorsJson.desc": t('config.shared.oauthRequestScopedErrorsJson.desc'),
    "upstream-claude.title": t('config.shared.upstream-claude.title'), "upstream-claude.description": t('config.shared.upstream-claude.description'),
    claudeToolSearch: t('config.shared.claudeToolSearch'), "claudeToolSearch.desc": t('config.shared.claudeToolSearch.desc'),
    claudeModelLevelCooling: t('config.shared.claudeModelLevelCooling'), "claudeModelLevelCooling.desc": t('config.shared.claudeModelLevelCooling.desc'),
    claudeDisableCloakMode: t('config.shared.claudeDisableCloakMode'), "claudeDisableCloakMode.desc": t('config.shared.claudeDisableCloakMode.desc'),
    claudeDisableCloakingModelList: t('config.shared.claudeDisableCloakingModelList'), "claudeDisableCloakingModelList.desc": t('config.shared.claudeDisableCloakingModelList.desc'),
    claudeHeaderUserAgent: t('config.shared.claudeHeaderUserAgent'), "claudeHeaderUserAgent.desc": t('config.shared.claudeHeaderUserAgent.desc'),
    claudeHeaderPackageVersion: t('config.shared.claudeHeaderPackageVersion'), "claudeHeaderPackageVersion.desc": t('config.shared.claudeHeaderPackageVersion.desc'),
    claudeHeaderRuntimeVersion: t('config.shared.claudeHeaderRuntimeVersion'), "claudeHeaderRuntimeVersion.desc": t('config.shared.claudeHeaderRuntimeVersion.desc'),
    claudeHeaderOs: t('config.shared.claudeHeaderOs'), "claudeHeaderOs.desc": t('config.shared.claudeHeaderOs.desc'),
    claudeHeaderArch: t('config.shared.claudeHeaderArch'), "claudeHeaderArch.desc": t('config.shared.claudeHeaderArch.desc'),
    claudeHeaderTimeout: t('config.shared.claudeHeaderTimeout'), "claudeHeaderTimeout.desc": t('config.shared.claudeHeaderTimeout.desc'),
    claudeHeaderTimezone: t('config.shared.claudeHeaderTimezone'), "claudeHeaderTimezone.desc": t('config.shared.claudeHeaderTimezone.desc'),
    claudeHeaderStabilizeDeviceProfile: t('config.shared.claudeHeaderStabilizeDeviceProfile'), "claudeHeaderStabilizeDeviceProfile.desc": t('config.shared.claudeHeaderStabilizeDeviceProfile.desc'),
    "upstream-codex.title": t('config.shared.upstream-codex.title'), "upstream-codex.description": t('config.shared.upstream-codex.description'),
    codexResponseSteering: t('config.shared.codexResponseSteering'), "codexResponseSteering.desc": t('config.shared.codexResponseSteering.desc'),
    codexDisableCloaking: t('config.shared.codexDisableCloaking'), "codexDisableCloaking.desc": t('config.shared.codexDisableCloaking.desc'),
    codexStreamBootstrapBuffering: t('config.shared.codexStreamBootstrapBuffering'), "codexStreamBootstrapBuffering.desc": t('config.shared.codexStreamBootstrapBuffering.desc'),
    codexStreamBootstrapTimeout: t('config.shared.codexStreamBootstrapTimeout'), "codexStreamBootstrapTimeout.desc": t('config.shared.codexStreamBootstrapTimeout.desc'),
    codexOrphanDelegationCompatibility: t('config.shared.codexOrphanDelegationCompatibility'), "codexOrphanDelegationCompatibility.desc": t('config.shared.codexOrphanDelegationCompatibility.desc'),
    codexModelLevelCooling: t('config.shared.codexModelLevelCooling'), "codexModelLevelCooling.desc": t('config.shared.codexModelLevelCooling.desc'),
    "client-codex.title": t('config.shared.client-codex.title'), "client-codex.description": t('config.shared.client-codex.description'),
    codexOptimizeMultiAgentV2: t('config.shared.codexOptimizeMultiAgentV2'), "codexOptimizeMultiAgentV2.desc": t('config.shared.codexOptimizeMultiAgentV2.desc'),
    "upstream-xai.title": t('config.shared.upstream-xai.title'), "upstream-xai.description": t('config.shared.upstream-xai.description'),
    xaiInjectXSearch: t('config.shared.xaiInjectXSearch'), "xaiInjectXSearch.desc": t('config.shared.xaiInjectXSearch.desc'),
  };
}
const displaySharedSections = computed(() => {
  const text = sharedText();
  return sharedConfigSections.map(section => ({
    ...section,
    title: text[`${section.id}.title`] || section.title,
    description: text[`${section.id}.description`] || section.description,
    fields: section.fields.map(field => ({
      ...field,
      label: text[field.key] || field.label,
      // Descriptions only exist where the source has one; an empty source stays empty.
      description: field.description ? text[`${field.key}.desc`] || field.description : field.description,
      placeholder: field.placeholder ? text[`${field.key}.placeholder`] || field.placeholder : field.placeholder,
    })),
  }));
});
const outline = computed(() => [
  { id: "server", short: t('config.outline.server'), keys: ["debug", "port", "cpaPublicUrl"] },
  { id: "tls", short: t('config.outline.tls'), keys: ["tlsEnable", "tlsCert", "tlsKey"] },
  {
    id: "remote-management",
    short: t('config.outline.management'),
    keys: [
      "remoteManagementAllowRemote",
      "remoteManagementSecretKey",
      "remoteManagementDisableControlPanel",

    ],
  },
  {
    id: "user-email",
    short: t('config.outline.mail'),
    keys: ["userEmailEnabled", "userEmailPublicUrl", "userEmailFromAddress", "userEmailFromName", "userEmailSenderType", "userEmailSmtpHost", "userEmailSmtpPort", "userEmailSmtpUsername", "userEmailSmtpPasswordEnv", "userEmailSmtpStarttls", "userEmailVerificationTtl", "userEmailResetTtl"],
  },
  {
    id: "plugins",
    short: t('config.outline.plugins'),
    keys: ["pluginsEnabled", "pluginsDir", "pluginStoreSourcesJson"],
  },
  {
    id: "oauth-rules",
    short: t('config.outline.oauthRules'),
    keys: ["oauthExcludedModelsJson", "oauthModelAliasJson"],
  },
  {
    id: "logs",
    short: t('config.outline.logs'),
    keys: [
      "requestLog",

      "loggingToFile",
      "logsMaxTotalSizeMb",
      "errorLogsMaxFiles",
    ],
  },
  { id: "models", short: t('config.outline.models'), keys: ["modelsCatalog", "modelsCodexCatalog", "modelsDevinCatalog"] },
  { id: "network", short: t('config.outline.network'), keys: ["proxyUrl", "tlsHandshakeTimeoutSeconds"] },
  {
    id: "quota",
    short: t('config.outline.quota'),
    keys: ["quotaSwitchProject", "quotaSwitchPreviewModel"],
  },
  {
    id: "retry-routing",
    short: t('config.outline.routing'),
    keys: [
      "requestRetry",
      "maxRetryCredentials",
      "maxRetryInterval",
      "disableCooling",
      "forceModelPrefix",
      "routingStrategy",
    ],
  },
  ...displaySharedSections.value.map(section => ({ id: section.id, short: section.title, keys: section.fields.map(field => field.key) })),
  { id: "payload", short: t('config.outline.parameters'), keys: ["payloadJson"] },
  { id: "devin", short: t('config.outline.devin'), keys: ["devinSensitiveWordsJson"] },
  {
    id: "antigravity",
    short: t('config.outline.antigravity'),
    keys: ["antigravitySensitiveWordsJson"],
  },
]);
function visualFieldLabels() {
  return {
    debug: t('config.field.debug'), port: t('config.field.port'), cpaPublicUrl: t('config.field.cpaPublicUrl'),
    tlsEnable: t('config.field.tlsEnable'), tlsCert: t('config.field.tlsCert'), tlsKey: t('config.field.tlsKey'),
    remoteManagementAllowRemote: t('config.field.remoteManagementAllowRemote'), remoteManagementSecretKey: t('config.field.remoteManagementSecretKey'),
    remoteManagementDisableControlPanel: t('config.field.remoteManagementDisableControlPanel'),
    userEmailEnabled: t('config.field.userEmailEnabled'), userEmailPublicUrl: t('config.field.userEmailPublicUrl'),
    userEmailFromAddress: t('config.field.userEmailFromAddress'), userEmailFromName: t('config.field.userEmailFromName'),
    userEmailSenderType: t('config.field.userEmailSenderType'), userEmailSmtpHost: t('config.field.userEmailSmtpHost'),
    userEmailSmtpPort: t('config.field.userEmailSmtpPort'), userEmailSmtpUsername: t('config.field.userEmailSmtpUsername'),
    userEmailSmtpPasswordEnv: t('config.field.userEmailSmtpPasswordEnv'), userEmailSmtpStarttls: t('config.field.userEmailSmtpStarttls'),
    userEmailVerificationTtl: t('config.field.userEmailVerificationTtl'), userEmailResetTtl: t('config.field.userEmailResetTtl'),
    pluginsEnabled: t('config.field.pluginsEnabled'), pluginsDir: t('config.field.pluginsDir'), pluginStoreSourcesJson: t('config.field.pluginStoreSourcesJson'),
    oauthExcludedModelsJson: t('config.oauthRules.manualLabel'), oauthModelAliasJson: t('config.aliases.title'),
    requestLog: t('config.field.requestLog'), loggingToFile: t('config.field.loggingToFile'),
    logsMaxTotalSizeMb: t('config.field.logsMaxTotalSizeMb'), errorLogsMaxFiles: t('config.field.errorLogsMaxFiles'),
    modelsCatalog: t('config.field.modelsCatalog'), modelsCodexCatalog: t('config.field.modelsCodexCatalog'), modelsDevinCatalog: t('config.field.modelsDevinCatalog'),
    proxyUrl: t('config.field.proxyUrl'), tlsHandshakeTimeoutSeconds: t('config.field.tlsHandshakeTimeoutSeconds'),
    quotaSwitchProject: t('config.field.quotaSwitchProject'), quotaSwitchPreviewModel: t('config.field.quotaSwitchPreviewModel'),
    requestRetry: t('config.field.requestRetry'), maxRetryCredentials: t('config.field.maxRetryCredentials'), maxRetryInterval: t('config.field.maxRetryInterval'),
    disableCooling: t('config.field.disableCooling'), forceModelPrefix: t('config.field.forceModelPrefix'), routingStrategy: t('config.field.routingStrategy'),
    payloadJson: t('config.field.payloadJson'), devinSensitiveWordsJson: t('config.field.devinSensitiveWordsJson'),
    antigravitySensitiveWordsJson: t('config.field.antigravitySensitiveWordsJson'),
  };
}
const labels = computed(() => {
  const visual = visualFieldLabels();
  const shared = Object.fromEntries(displaySharedSections.value.flatMap(section => section.fields.map(field => [field.key, field.label])));
  return Object.fromEntries(
    outline.value.flatMap((section) =>
      section.keys.map((key) => [
        key,
        visual[key] || shared[key] || key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (value) => value.toUpperCase()),
      ]),
    ),
  );
});
const updatedLabel = computed(() =>
  updatedAt.value
    ? new Intl.DateTimeFormat(intlLocale.value, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(updatedAt.value)
    : "—",
);
const validationErrors = computed(() => {
  const errors = {};
  const integerKeys = [
    "requestRetry",
    "maxRetryCredentials",
    "maxRetryInterval",
    "logsMaxTotalSizeMb",
    "errorLogsMaxFiles",
    "tlsHandshakeTimeoutSeconds",
  ];
  if (
    !Number.isInteger(Number(draft.value.port)) ||
    Number(draft.value.port) < 1 ||
    Number(draft.value.port) > 65535
  )
    errors.port = t('config.validation.port');
  for (const key of integerKeys)
    if (
      draft.value[key] === null || draft.value[key] === "" ||
      !Number.isInteger(Number(draft.value[key])) ||
      Number(draft.value[key]) < 0
    )
      errors[key] = t('config.validation.nonNegativeInteger');
  if (
    !["round-robin", "weighted-round-robin", "fill-first"].includes(
      draft.value.routingStrategy,
    )
  )
    errors.routingStrategy = t('config.validation.strategy');
  if (String(draft.value.cpaPublicUrl || "").trim()) {
    try {
      const url = new URL(String(draft.value.cpaPublicUrl).trim());
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch {
      errors.cpaPublicUrl = t('config.validation.cpaPublicUrl');
    }
  }
  for (const key of ["modelsCatalog", "modelsCodexCatalog", "modelsDevinCatalog"]) {
    const source = String(draft.value[key] || "").trim();
    if (!source || source.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(source) || source.startsWith("\\\\")) continue;
    try {
      const url = new URL(source);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
      errors[key] = t('config.validation.catalog');
    }
  }
  if (draft.value.userEmailEnabled) {
    const text = key => String(draft.value[key] || "").trim();
    const isLoopback = host => host === "localhost" || host === "::1" || host === "[::1]" || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host);
    try {
      const url = new URL(text("userEmailPublicUrl"));
      if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && isLoopback(url.hostname)))) throw new Error();
    } catch {
      errors.userEmailPublicUrl = t('config.validation.emailPublicUrl');
    }
    if (!/^[^\s<>@]+@[^\s<>@]+$/.test(text("userEmailFromAddress"))) errors.userEmailFromAddress = t('config.validation.fromAddress');
    if (text("userEmailSenderType") !== "smtp") errors.userEmailSenderType = t('config.validation.smtpOnly');
    if (!text("userEmailSmtpHost")) errors.userEmailSmtpHost = t('config.validation.smtpHost');
    const port = Number(draft.value.userEmailSmtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 465) errors.userEmailSmtpPort = t('config.validation.smtpPort');
    if (!draft.value.userEmailSmtpStarttls && !isLoopback(text("userEmailSmtpHost").toLowerCase())) errors.userEmailSmtpStarttls = t('config.validation.starttls');
    if (text("userEmailSmtpUsername") && !text("userEmailSmtpPasswordEnv")) errors.userEmailSmtpPasswordEnv = t('config.validation.passwordEnv');
    for (const key of ["userEmailVerificationTtl", "userEmailResetTtl"]) {
      const value = text(key);
      if (!/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value) || !/[1-9]/.test(value)) errors[key] = t('config.validation.positiveDuration');
    }
  }
  const exclusions = parseJSON(draft.value.oauthExcludedModelsJson, null);
  if (!exclusions || typeof exclusions !== "object" || Array.isArray(exclusions) || Object.values(exclusions).some(rules => !Array.isArray(rules) || rules.some(rule => typeof rule !== "string"))) {
    errors.oauthExcludedModelsJson = t('config.validation.exclusions');
  }
  for (const field of sharedConfigFields) {
    const value = draft.value[field.key];
    if (value === null || value === undefined) continue;
    if (configParitySections.some(section => section.fields.some(item => item.key === field.key))) {
      const error = validateConfigParityField(field, value);
      if (error) errors[field.key] = parityErrorText(field);
      continue;
    }
    if (field.type === "boolean") {
      if (typeof value !== "boolean") errors[field.key] = t('config.validation.boolean');
    } else if (field.type === "number") {
      if (typeof value !== "number" || !Number.isSafeInteger(value)) errors[field.key] = t('config.validation.integer');
    } else if (field.type === "json") {
      const rules = parseJSON(value, null);
      const isObject = item => item !== null && typeof item === "object" && !Array.isArray(item);
      const actions = ["stop", "stop-and-cooldown", "continue", "continue-and-cooldown"];
      if (!isObject(rules) || Object.values(rules).some(entries => !Array.isArray(entries) || entries.some(rule =>
        !isObject(rule) || !actions.includes(rule.action) ||
        (rule.status !== undefined && !Number.isSafeInteger(rule.status)) ||
        ["match", "match-regexr"].some(key => rule[key] !== undefined && (!Array.isArray(rule[key]) || rule[key].some(item => typeof item !== "string"))) ||
        Object.hasOwn(rule, "match-regex")
      ))) errors[field.key] = t('config.validation.requestScopedRules');
    } else if (typeof value !== "string") {
      errors[field.key] = t('config.validation.string');
    } else if (field.type === "session-duration") {
      if (value.trim() !== "" && value.trim() !== "0" && !/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value.trim())) {
        errors[field.key] = t('config.validation.sessionDuration');
      }
    } else if (field.type === "duration") {
      const text = value.trim().toLowerCase();
      if (!["", "0", "0s", "none", "unlimited", "disabled", "off", "never"].includes(text) && !/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value.trim())) {
        errors[field.key] = t('config.validation.duration');
      }
    } else if (/[\r\n\u0000]/.test(value)) {
      errors[field.key] = t('config.validation.header');
    }
  }
  if (draft.value.liveMediaRelayUdpPortMin != null && draft.value.liveMediaRelayUdpPortMax != null && Number(draft.value.liveMediaRelayUdpPortMin) > Number(draft.value.liveMediaRelayUdpPortMax)) {
    errors.liveMediaRelayUdpPortMax = t('config.validation.udpRange');
  }
  return errors;
});
// configParity.ts returns English messages (asserted by tests); show the translation for the failing field type.
function parityErrorText(field) {
  if (field.type === "image-mode") return t('config.validation.imageMode');
  if (field.type === "string-list") return t('config.validation.stringList');
  if (field.type === "ice-servers") return t('config.validation.iceServers');
  if (field.type === "go-duration") return t('config.validation.goDuration');
  if (field.type === "number") return t('config.validation.integerRange', { min: field.min ?? t('config.validation.rangeMin'), max: field.max ?? t('config.validation.rangeMax') });
  return t('config.validation.header');
}
const validationCount = computed(
  () => Object.keys(validationErrors.value).length,
);
const changes = computed(() =>
  Object.keys(draft.value)
    .filter((key) => fieldChanged(key))
    .map((key) => ({
      key,
      label: labels.value[key] || key,
      before: formatChangeValue(key, baseline.value[key]),
      after: formatChangeValue(key, draft.value[key]),
      section:
        outline.value.find((section) => section.keys.includes(key))?.id || "server",
    })),
);
const dirtyCount = computed(() => changes.value.length);
const excludedMap = computed(() => {
  const value = parseJSON(draft.value.oauthExcludedModelsJson, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
});
const excludedForChannel = computed(() =>
  Array.isArray(excludedMap.value[exclusionChannel.value])
    ? excludedMap.value[exclusionChannel.value]
    : [],
);

const filteredChannelModels = computed(() => {
  const q = modelSearch.value.trim().toLowerCase();
  return channelModels.value.filter(
    (model) =>
      !q ||
      [
        model.id,
        model.display_name,
        model.name,
        model.owned_by,
        model.type,
        model.description,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q),
      ),
  );
});

function parseJSON(value, fallback) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}
function scrollToSection(id) {
  document
    .getElementById(`config-${id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function fieldChanged(key) {
  if (sharedConfigFields.some(field => field.key === key)) {
    return draft.value[key] !== baseline.value[key];
  }
  return String(draft.value[key]) !== String(baseline.value[key]);
}
function formatChangeValue(key, value) {
  if (key === "remoteManagementSecretKey" || key === "liveMediaRelayIceServersJson") return t('config.changes.sensitive');
  if (sharedConfigFields.some(field => field.key === key)) {
    if (value === null || value === undefined) return t('config.changes.unset');
    if (value === "") return t('config.changes.emptyString');
  }
  return String(value ?? "");
}
function sectionDirty(keys) {
  return keys.some(fieldChanged);
}
function lines(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
function buildDraft(config, yamlRoot) {
  const server = yamlRoot.server || config.server || {};
  const remote = yamlRoot.management || config.management || {};
  const plugins = yamlRoot.plugins || config.plugins || {};
  const routing = config.routing || yamlRoot.routing || {};
  const retry = routing.retry || {};
  const cooldown = routing.cooldown || {};
  const requests = config.requests || yamlRoot.requests || {};
  const observability = config.observability || yamlRoot.observability || {};
  const logs = observability.logs || {};

  const oauth = config.oauth || yamlRoot.oauth || {};
  const antigravity = oauth.providers?.antigravity || {};
  const devin = oauth.providers?.devin || {};
  const models = config.models || yamlRoot.models || {};
  const email = config["user-email"] || yamlRoot["user-email"] || {};
  const smtp = email.sender?.smtp || {};
  return {
    // Read shared settings from YAML so omitted/null, false and empty strings stay distinct.
    ...Object.fromEntries(sharedConfigFields.map(field => {
      const value = field.path.reduce((node, part) => node?.[part], yamlRoot) ?? null;
      return [field.key, isConfigJsonField(field.type) && value !== null ? JSON.stringify(value, null, 2) : value];
    })),
    debug: Boolean(logs.debug),
    port: Number(server.port || 8317),
    cpaPublicUrl: (config["user-panel"] || yamlRoot["user-panel"])?.["cpa-public-url"] || "",
    tlsEnable: Boolean(server.tls?.enable),
    tlsCert: server.tls?.cert || "",
    tlsKey: server.tls?.key || "",
    remoteManagementAllowRemote: Boolean(remote["allow-remote"]),
    remoteManagementSecretKey: remote["secret-key"] || "",
    remoteManagementDisableControlPanel: Boolean(
      remote["disable-control-panel"],
    ),

    userEmailEnabled: Boolean(email.enabled),
    userEmailPublicUrl: email["public-user-url"] || "",
    userEmailFromAddress: email["from-address"] || "",
    userEmailFromName: email["from-name"] || "",
    userEmailSenderType: email.sender?.type || "smtp",
    userEmailSmtpHost: smtp.host || "",
    userEmailSmtpPort: Number(smtp.port ?? 587),
    userEmailSmtpUsername: smtp.username || "",
    userEmailSmtpPasswordEnv: smtp["password-env"] || "HOME_USER_EMAIL_SMTP_PASSWORD",
    userEmailSmtpStarttls: smtp.starttls ?? true,
    userEmailVerificationTtl: email["verification-token-ttl"] || "24h",
    userEmailResetTtl: email["reset-token-ttl"] || "30m",
    pluginsEnabled: Boolean(plugins.enabled),
    pluginsDir: plugins.dir || "plugins",
    pluginStoreSourcesJson: (plugins["store-sources"] || []).join("\n"),
    oauthExcludedModelsJson: JSON.stringify(
      oauth["excluded-models"] || {},
      null,
      2,
    ),
    oauthModelAliasJson: JSON.stringify(oauth["model-alias"] || {}, null, 2),
    requestLog: Boolean(logs["request-log"]),

    loggingToFile: Boolean(logs["logging-to-file"]),
    logsMaxTotalSizeMb: Number(logs["logs-max-total-size-mb"] || 0),
    errorLogsMaxFiles: Number(logs["error-logs-max-files"] ?? 10),
    proxyUrl: requests["proxy-url"] || "",
    tlsHandshakeTimeoutSeconds: Number(requests["tls-handshake-timeout-seconds"] ?? 0),
    modelsCatalog: models.catalog || "",
    modelsCodexCatalog: models["codex-catalog"] || "",
    modelsDevinCatalog: models["devin-catalog"] || "",
    devinSensitiveWordsJson: (devin["sensitive-words"] || []).join("\n"),
    quotaSwitchProject: Boolean(config["quota-exceeded"]?.["switch-project"]),
    quotaSwitchPreviewModel: Boolean(
      config["quota-exceeded"]?.["switch-preview-model"],
    ),
    requestRetry: Number(retry["request-retry"] || 0),
    maxRetryCredentials: Number(retry["max-retry-credentials"] || 0),
    maxRetryInterval: Number(retry["max-retry-interval"] || 0),
    disableCooling: Boolean(cooldown["disable-cooling"]),
    forceModelPrefix: Boolean(
      routing["force-model-prefix"] ?? config["force-model-prefix"],
    ),
    routingStrategy: routing.strategy || "round-robin",
    payloadJson: JSON.stringify(requests.payload || {}, null, 2),
    antigravitySensitiveWordsJson: (antigravity["sensitive-words"] || []).join(
      "\n",
    ),
  };
}
function syncEditors() {
  const aliases = parseJSON(draft.value.oauthModelAliasJson, {});
  aliasRows.value = Object.entries(aliases).flatMap(([channel, entries]) =>
    (entries || []).map((entry) => ({
      key: ++aliasKey,
      channel,
      original: structuredClone(toRaw(entry)),
      displayName: entry["display-name"] || "",
      name: entry.name || "",
      alias: entry.alias || "",
      fork: Boolean(entry.fork),
      forceMapping: Boolean(entry["force-mapping"]),
    })),
  );
  aliasEditorBaseline = JSON.stringify(aliasRows.value);
  aliasEditorSource = draft.value.oauthModelAliasJson;
  const payload = parseJSON(draft.value.payloadJson, {});
  for (const mode of payloadModes)
    payloadDraft[mode.value] = structuredClone(
      Array.isArray(payload[mode.value]) ? toRaw(payload[mode.value]) : [],
    );
  payloadEditorBaseline = JSON.stringify(payloadDraft);
  payloadEditorSource = draft.value.payloadJson;
}
function syncSpecialDrafts() {
  const grouped = {};
  for (const row of aliasRows.value) {
    const channel = row.channel.trim().toLowerCase();
    if (!channel || !row.name.trim() || !row.alias.trim()) continue;
    (grouped[channel] ||= []).push({
      ...row.original,
      ...(row.displayName?.trim() ? { "display-name": row.displayName.trim() } : row.original?.["display-name"] !== undefined ? { "display-name": "" } : {}),
      name: row.name.trim(),
      alias: row.alias.trim(),
      fork: row.fork,
      "force-mapping": row.forceMapping,
    });
  }
  if (JSON.stringify(aliasRows.value) !== aliasEditorBaseline) {
    draft.value.oauthModelAliasJson = JSON.stringify(grouped, null, 2);
  } else {
    draft.value.oauthModelAliasJson = aliasEditorSource;
  }
  draft.value.payloadJson = JSON.stringify(payloadDraft) === payloadEditorBaseline
    ? payloadEditorSource
    : JSON.stringify({
        ...parseJSON(payloadEditorSource, {}),
        ...Object.fromEntries(payloadModes.map((mode) => [mode.value, payloadDraft[mode.value]])),
      }, null, 2);
}
async function loadWorkspace(preserveDraft = false) {
  if (loading.value) return;
  loading.value = true;
  pageError.value = "";
  try {
    const [config, yaml] = await Promise.all([
      fetchAPI("/config"),
      fetchAPI("/config.yaml", { responseType: "text" }),
    ]);
    configSnapshot.value = config;
    yamlText.value = String(yaml || "");
    const document = parseDocument(yamlText.value);
    if (document.errors.length) throw new Error(t('config.load.invalidYaml'));
    const root = document.toJS() || {};
    const next = buildDraft(config, root);
    const reconciled = preserveDraft === true
      ? reconcileConfigDraft(baseline.value, draft.value, next)
      : structuredClone(next);
    baseline.value = structuredClone(next);
    draft.value = reconciled;
    syncEditors();
    saveNeedsReload.value = false;
    runtimeMode.value =
      String(config.mode || config["runtime-mode"] || "home").toLowerCase() ===
      "cpa"
        ? "cpa"
        : "home";
    updatedAt.value = new Date();
    loaded.value = true;
    await loadChannelModels();
  } catch (error) {
    pageError.value =
      error?.data?.message ||
      error?.data?.error ||
      error?.message ||
      t('config.load.fallback');
  } finally {
    loading.value = false;
  }
}
function reloadWorkspace() {
  syncSpecialDrafts();
  if (dirtyCount.value) reloadConfirmOpen.value = true;
  else loadWorkspace();
}
async function loadChannelModels() {
  const version = ++modelRequestVersion;
  const channel = exclusionChannel.value;
  modelsLoading.value = true;
  modelsError.value = "";
  channelModels.value = [];
  try {
    const response = await fetchAPI(`/routing/model-definitions/${encodeURIComponent(channel)}`);
    if (version !== modelRequestVersion) return;
    if (!Array.isArray(response?.models)) throw new Error(t('config.models.invalidResponse'));
    channelModels.value = response.models;
  } catch (error) {
    if (version !== modelRequestVersion) return;
    modelsError.value = error?.message || t('config.models.loadFailed');
  } finally {
    if (version === modelRequestVersion) modelsLoading.value = false;
  }
}
function toggleExcluded(id, checked) {
  const map = structuredClone(excludedMap.value);
  const selected = new Set(map[exclusionChannel.value] || []);
  checked ? selected.add(id) : selected.delete(id);
  if (selected.size) map[exclusionChannel.value] = [...selected];
  else delete map[exclusionChannel.value];
  draft.value.oauthExcludedModelsJson = JSON.stringify(map, null, 2);
}
function clearExcludedChannel() {
  const map = structuredClone(excludedMap.value);
  delete map[exclusionChannel.value];
  draft.value.oauthExcludedModelsJson = JSON.stringify(map, null, 2);
}
function addAlias() {
  aliasRows.value.push({
    key: ++aliasKey,
    channel: aliasRows.value.at(-1)?.channel || "claude",
    name: "",
    alias: "",
    displayName: "",
    fork: false,
    forceMapping: false,
  });
}
function payloadRuleSummary(rule) {
  return Array.isArray(rule?.models)
    ? rule.models.map((model) => model?.name || t('config.payload.unnamed')).join(", ")
    : t('config.payload.unsupportedMatcher');
}
function payloadRulePaths(rule, mode) {
  return mode === "filter"
    ? Array.isArray(rule?.params)
      ? rule.params.join(", ")
      : ""
    : Object.keys(rule?.params || {}).join(", ");
}
function addPayloadRule(mode) {
  payloadEditMode.value = mode;
  payloadEditIndex.value = -1;
  payloadEditor.models = JSON.stringify([{ name: "" }], null, 2);
  payloadEditor.params = mode === "filter" ? "[]" : "{}";
  payloadEditorError.value = "";
  payloadEditorOpen.value = true;
}
function editPayload(mode, index) {
  const rule = payloadDraft[mode][index];
  payloadEditMode.value = mode;
  payloadEditIndex.value = index;
  payloadEditor.models = JSON.stringify(rule.models || [], null, 2);
  payloadEditor.params = JSON.stringify(
    rule.params ?? (mode === "filter" ? [] : {}),
    null,
    2,
  );
  payloadEditorError.value = "";
  payloadEditorOpen.value = true;
}
function duplicatePayload(mode, index) {
  payloadDraft[mode].push(structuredClone(toRaw(payloadDraft[mode][index])));
  syncSpecialDrafts();
}
function removePayload(mode, index) {
  payloadDraft[mode].splice(index, 1);
  syncSpecialDrafts();
}
function savePayloadEditor() {
  try {
    const models = JSON.parse(payloadEditor.models);
    const params = JSON.parse(payloadEditor.params);
    if (
      !Array.isArray(models) ||
      !models.length ||
      models.some((model) => !model?.name?.trim())
    )
      throw new Error(t('config.payload.errorModels'));
    if (
      payloadEditMode.value === "filter"
        ? !Array.isArray(params)
        : !params || typeof params !== "object" || Array.isArray(params)
    )
      throw new Error(t('config.payload.errorParams'));
    const rule = { models, params };
    if (payloadEditIndex.value < 0)
      payloadDraft[payloadEditMode.value].push(rule);
    else payloadDraft[payloadEditMode.value][payloadEditIndex.value] = rule;
    syncSpecialDrafts();
    payloadEditorOpen.value = false;
  } catch (error) {
    payloadEditorError.value = error.message;
  }
}

const v8YamlPaths = {
  ...Object.fromEntries(sharedConfigFields.map(field => [field.key, field.path])),
  debug: ["observability", "logs", "debug"],
  port: ["server", "port"],
  cpaPublicUrl: ["user-panel", "cpa-public-url"],
  tlsEnable: ["server", "tls", "enable"],
  tlsCert: ["server", "tls", "cert"],
  tlsKey: ["server", "tls", "key"],
  remoteManagementAllowRemote: ["management", "allow-remote"],
  remoteManagementSecretKey: ["management", "secret-key"],
  remoteManagementDisableControlPanel: ["management", "disable-control-panel"],

  userEmailEnabled: ["user-email", "enabled"],
  userEmailPublicUrl: ["user-email", "public-user-url"],
  userEmailFromAddress: ["user-email", "from-address"],
  userEmailFromName: ["user-email", "from-name"],
  userEmailSenderType: ["user-email", "sender", "type"],
  userEmailSmtpHost: ["user-email", "sender", "smtp", "host"],
  userEmailSmtpPort: ["user-email", "sender", "smtp", "port"],
  userEmailSmtpUsername: ["user-email", "sender", "smtp", "username"],
  userEmailSmtpPasswordEnv: ["user-email", "sender", "smtp", "password-env"],
  userEmailSmtpStarttls: ["user-email", "sender", "smtp", "starttls"],
  userEmailVerificationTtl: ["user-email", "verification-token-ttl"],
  userEmailResetTtl: ["user-email", "reset-token-ttl"],
  pluginsEnabled: ["plugins", "enabled"],
  pluginsDir: ["plugins", "dir"],
  pluginStoreSourcesJson: ["plugins", "store-sources"],
  oauthExcludedModelsJson: ["oauth", "excluded-models"],
  oauthModelAliasJson: ["oauth", "model-alias"],
  requestLog: ["observability", "logs", "request-log"],

  loggingToFile: ["observability", "logs", "logging-to-file"],
  logsMaxTotalSizeMb: ["observability", "logs", "logs-max-total-size-mb"],
  errorLogsMaxFiles: ["observability", "logs", "error-logs-max-files"],
  proxyUrl: ["requests", "proxy-url"],
  tlsHandshakeTimeoutSeconds: ["requests", "tls-handshake-timeout-seconds"],
  modelsCatalog: ["models", "catalog"],
  modelsCodexCatalog: ["models", "codex-catalog"],
  modelsDevinCatalog: ["models", "devin-catalog"],
  devinSensitiveWordsJson: ["oauth", "providers", "devin", "sensitive-words"],
  quotaSwitchProject: ["quota-exceeded", "switch-project"],
  quotaSwitchPreviewModel: ["quota-exceeded", "switch-preview-model"],
  requestRetry: ["routing", "retry", "request-retry"],
  maxRetryCredentials: ["routing", "retry", "max-retry-credentials"],
  maxRetryInterval: ["routing", "retry", "max-retry-interval"],
  disableCooling: ["routing", "cooldown", "disable-cooling"],
  forceModelPrefix: ["routing", "force-model-prefix"],
  routingStrategy: ["routing", "strategy"],
  payloadJson: ["requests", "payload"],
  antigravitySensitiveWordsJson: [
    "oauth",
    "providers",
    "antigravity",
    "sensitive-words",
  ],
};
function configWriteValue(key) {
  const value = draft.value[key];
  if (value === null) return null;
  const field = sharedConfigFields.find(field => field.key === key);
  if (field && isConfigJsonField(field.type)) return JSON.parse(value);
  if (["pluginStoreSourcesJson", "antigravitySensitiveWordsJson", "devinSensitiveWordsJson"].includes(key)) return lines(value);
  if (["oauthExcludedModelsJson", "oauthModelAliasJson", "payloadJson"].includes(key)) return JSON.parse(value);
  if (["port", "userEmailSmtpPort", "logsMaxTotalSizeMb", "errorLogsMaxFiles", "requestRetry", "maxRetryCredentials", "maxRetryInterval", "tlsHandshakeTimeoutSeconds"].includes(key)) return Number(value);
  if (["proxyUrl", "cpaPublicUrl", "modelsCatalog", "modelsCodexCatalog", "modelsDevinCatalog"].includes(key)) return String(value).trim();
  return value;
}

async function saveWorkspace() {
  if (saving.value || loading.value || !loaded.value || saveNeedsReload.value) return;
  syncSpecialDrafts();
  if (!dirtyCount.value || validationCount.value) return;
  saving.value = true;
  pageError.value = "";
  try {
    const previous = structuredClone(toRaw(baseline.value));
    const intended = structuredClone(toRaw(draft.value));
    const writes = planConfigWrites(changes.value.map(change => change.key), v8YamlPaths, configWriteValue);
    const result = await applyConfigWrites(writes, fetchAPI);
    // Even a failed write may have committed before runtime reload failed.
    // Always reread before offering a retry, without discarding remaining edits.
    await loadWorkspace(true);
    if (!pageError.value) {
      draft.value = reconcileConfigDraft(previous, intended, baseline.value);
      // Acknowledged writes may be normalized (including omitted defaults).
      for (const write of result.completed) {
        for (const key of write.keys) draft.value[key] = baseline.value[key];
      }
      syncEditors();
    }
    saveNeedsReload.value = Boolean(pageError.value);
    if (result.failed) {
      const error = result.error;
      const detail = error?.data?.message || error?.data?.error || error?.message || t('config.save.requestFailed');
      const refreshError = pageError.value;
      pageError.value = t('config.save.partial', {
        completed: result.completed.length,
        total: writes.length,
        path: result.failed.path,
        detail,
        next: refreshError ? t('config.save.readbackFailedRetry', { error: refreshError }) : t('config.save.reread'),
      });
    } else if (pageError.value) {
      pageError.value = t('config.save.readbackFailed', { error: pageError.value });
    } else {
      toast.add({ title: t('config.save.saved'), color: "success" });
    }
  } catch (error) {
    pageError.value = error?.message || t('config.save.prepareFailed');
  } finally {
    saving.value = false;
  }
}

watch(aliasRows, syncSpecialDrafts, { deep: true });

useDataSync('admin:config:sync', () => {
  if (saving.value) return;
  syncSpecialDrafts();
  return loadWorkspace(true);
});
onMounted(loadWorkspace);
</script>
