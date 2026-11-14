<template>
  <AppModal v-model:open="open" :ui="{ content: 'w-full sm:max-w-2xl', header: 'shrink-0 border-b border-[var(--ui-border)] px-4 py-3 sm:px-5', body: 'min-h-0 overflow-y-auto p-0 sm:p-0', footer: 'shrink-0 border-t border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 py-3 sm:px-5' }">
    <template #header="{ close }">
      <div class="flex w-full min-w-0 items-start gap-3">
        <span class="rd-status-icon" :class="`rd-status-icon--${loading ? 'idle' : statusColor}`" aria-hidden="true">
          <UIcon :name="loading ? 'i-tabler-loader-2' : statusColor === 'error' ? 'i-tabler-x' : 'i-tabler-check'" class="size-4" :class="loading ? 'animate-spin' : ''" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-base font-semibold" :title="title">{{ title }}</h2>
          <p class="mt-0.5 truncate text-xs text-[var(--ui-text-muted)]">{{ subtitle }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <AppButton type="button" color="neutral" variant="ghost" size="sm" icon="i-tabler-chevron-up" aria-label="Previous request" title="Previous request" :disabled="loading || !hasPrevious" @click="emit('navigate', -1)" />
          <AppButton type="button" color="neutral" variant="ghost" size="sm" icon="i-tabler-chevron-down" aria-label="Next request" title="Next request" :disabled="loading || !hasNext" @click="emit('navigate', 1)" />
          <span class="mx-1 h-5 w-px bg-[var(--ui-border)]" aria-hidden="true" />
          <AppButton type="button" color="neutral" variant="ghost" size="sm" icon="i-tabler-x" aria-label="Close" @click="close" />
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="loading" role="status" class="flex items-center justify-center gap-2 py-10 text-sm text-[var(--ui-text-muted)]"><UIcon name="i-tabler-loader-2" class="size-5 animate-spin" />Loading request details…</div>
      <div v-else-if="detail" class="space-y-4 p-4 sm:p-5">
        <!-- Key facts: status, latency, tokens, cost -->
        <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="fact in keyFacts" :key="fact.label" class="rd-fact" :class="fact.tone ? `rd-fact--${fact.tone}` : ''">
            <dt class="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ui-text-muted)]"><UIcon :name="fact.icon" class="size-3.5" />{{ fact.label }}</dt>
            <dd class="mt-1 truncate text-base font-semibold tabular-nums text-[var(--ui-text-highlighted)]" :title="fact.value">{{ fact.value }}</dd>
            <dd v-if="fact.hint" class="truncate text-[11px] text-[var(--ui-text-muted)]" :title="fact.hint">{{ fact.hint }}</dd>
          </div>
        </dl>

        <!-- Error first when the request failed -->
        <section v-if="hasError" class="rd-error" aria-labelledby="request-detail-error">
          <div class="flex items-start gap-2.5">
            <UIcon name="i-tabler-alert-circle" class="mt-0.5 size-4 shrink-0" />
            <div class="min-w-0 flex-1">
              <h3 id="request-detail-error" class="text-sm font-semibold">{{ event.error?.reason || 'Request failed' }}</h3>
              <p v-if="event.error?.message" class="mt-0.5 break-words text-xs">{{ event.error.message }}</p>
              <p v-if="errorCodes" class="mt-1 font-mono text-[11px] opacity-80">{{ errorCodes }}</p>
            </div>
          </div>
          <pre v-if="event.error?.body_preview" class="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[var(--ui-bg)] p-3 font-mono text-xs leading-5 text-[var(--ui-text)]">{{ event.error.body_preview }}</pre>
        </section>

        <!-- Identifiers with copy -->
        <section class="rd-card" aria-labelledby="request-detail-ids">
          <h3 id="request-detail-ids" class="rd-title">Identifiers</h3>
          <dl class="divide-y divide-[var(--ui-border)]">
            <div v-for="item in identifiers" :key="item.label" class="rd-row">
              <dt>{{ item.label }}</dt>
              <dd class="flex min-w-0 items-center justify-end gap-1">
                <span class="truncate font-mono text-xs" :title="item.value">{{ item.value }}</span>
                <AppButton type="button" color="neutral" variant="ghost" size="xs" icon="i-tabler-copy" class="shrink-0" :aria-label="`Copy ${item.label.toLowerCase()}`" :title="`Copy ${item.label.toLowerCase()}`" @click="copyText(item.value, item.label)" />
              </dd>
            </div>
          </dl>
        </section>

        <!-- Tokens -->
        <section class="rd-card" aria-labelledby="request-detail-tokens">
          <div class="flex items-center justify-between gap-3">
            <h3 id="request-detail-tokens" class="rd-title !mb-0">Tokens</h3>
            <span class="text-xs text-[var(--ui-text-muted)]">Total <strong class="text-[var(--ui-text-highlighted)] tabular-nums">{{ number(event.tokens?.total_tokens) }}</strong><template v-if="cacheRate"> · {{ cacheRate }} cached</template></span>
          </div>
          <div v-if="tokenParts.length" class="rd-token-bar" role="img" :aria-label="tokenParts.map(part => `${part.label} ${part.display}`).join(', ')">
            <span v-for="part in tokenParts" :key="part.label" :style="{ flexGrow: part.value, background: part.color }" :title="`${part.label} · ${part.display}`" />
          </div>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <div v-for="part in tokenRows" :key="part.label" class="flex min-w-0 items-center gap-2">
              <span class="size-2 shrink-0 rounded-sm" :style="{ background: part.color }" aria-hidden="true" />
              <dt class="truncate text-xs text-[var(--ui-text-muted)]">{{ part.label }}</dt>
              <dd class="ml-auto text-xs font-semibold tabular-nums">{{ part.display }}</dd>
            </div>
          </dl>
          <div v-if="toolUsage.length" class="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--ui-border)] pt-3">
            <span v-for="item in toolUsage" :key="item.label" class="inline-flex items-center gap-1 rounded-full bg-[var(--ui-bg-muted)] px-2 py-0.5 text-[11px] capitalize"><UIcon name="i-tabler-tool" class="size-3" />{{ item.label }} <strong class="tabular-nums">{{ item.value }}</strong></span>
          </div>
        </section>

        <!-- Routing / who / where -->
        <div class="grid gap-4 sm:grid-cols-2">
          <section v-for="group in infoGroups" :key="group.title" class="rd-card" :aria-label="group.title">
            <h3 class="rd-title"><UIcon :name="group.icon" class="size-3.5" />{{ group.title }}</h3>
            <dl v-if="group.items.length" class="divide-y divide-[var(--ui-border)]">
              <div v-for="item in group.items" :key="item.label" class="rd-row">
                <dt>{{ item.label }}</dt>
                <dd class="truncate" :class="item.mono ? 'font-mono text-xs' : ''" :title="item.value">{{ item.value }}</dd>
              </div>
            </dl>
            <p v-else class="text-xs text-[var(--ui-text-dimmed)]">Not recorded</p>
          </section>
        </div>

        <!-- Billing -->
        <section v-if="costBreakdown.length" class="rd-card" aria-labelledby="request-detail-cost">
          <h3 id="request-detail-cost" class="rd-title"><UIcon name="i-tabler-receipt" class="size-3.5" />Billing</h3>
          <dl class="divide-y divide-[var(--ui-border)]">
            <div v-for="(item, index) in costBreakdown" :key="item.label" class="rd-row" :class="index === 0 ? 'rd-row--total' : ''">
              <dt>{{ item.label }}</dt>
              <dd class="font-mono text-xs tabular-nums">{{ item.value }}</dd>
            </div>
            <div v-for="item in billingMeta" :key="item.label" class="rd-row">
              <dt>{{ item.label }}</dt>
              <dd class="truncate font-mono text-xs" :title="item.value">{{ item.value }}</dd>
            </div>
          </dl>
        </section>

        <!-- Log excerpt -->
        <section v-if="detail.log_excerpt?.length" class="rd-card !p-0" aria-labelledby="request-detail-log">
          <div class="flex items-center justify-between gap-2 px-4 py-3">
            <h3 id="request-detail-log" class="rd-title !mb-0"><UIcon name="i-tabler-terminal-2" class="size-3.5" />Log excerpt</h3>
            <span class="text-[11px] text-[var(--ui-text-muted)]">{{ detail.log_excerpt.length }} lines · redacted</span>
          </div>
          <pre class="rd-log">{{ detail.log_excerpt.join('\n') }}</pre>
        </section>
      </div>
      <div v-else class="flex flex-col items-center justify-center px-4 py-10 text-center text-sm text-[var(--ui-text-muted)]"><UIcon name="i-tabler-file-unknown" class="mb-2 size-6" />No request selected.</div>
    </template>

    <template #footer>
      <div class="flex w-full items-center gap-2">
        <AppButton type="button" color="neutral" variant="outline" size="sm" icon="i-tabler-copy" :disabled="loading || !event.request_id" @click="copyText(event.request_id, 'Request ID')">Copy request ID</AppButton>
        <p v-if="downloadError" role="alert" class="min-w-0 flex-1 truncate text-xs text-[var(--ui-color-error-500)]" :title="downloadError">{{ downloadError }}</p>
        <AppButton type="button" color="neutral" variant="solid" size="sm" icon="i-tabler-download" class="ml-auto shrink-0" :loading="downloading" :disabled="loading || !downloadUrl || downloading" :title="!loading && !downloadUrl ? 'This request has no downloadable log' : undefined" @click="emit('download', downloadUrl, event.request_id)">Download log</AppButton>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { requestCostRows, toolUsageEntries } from '~/composables/requestTelemetry'
type Fields = Record<string, any>
type Detail = { event?: Fields; payload_summary?: Fields | null; log_excerpt?: string[] }
type Row = { label: string; value: string; hint?: string; mono?: boolean; copy?: boolean }
type RowInput = { label: string; value: unknown; hint?: unknown; mono?: boolean; copy?: boolean }
const props = defineProps<{ detail: Detail | null; loading: boolean; downloading: boolean; downloadError?: string; hasPrevious?: boolean; hasNext?: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ download: [url: string, requestId: string]; navigate: [direction: -1 | 1] }>()
const toast = useToast()
const event = computed(() => props.detail?.event || {})
const payload = computed(() => props.detail?.payload_summary || {})

const isEmpty = (value: unknown) => value == null || value === ''
const number = (value: unknown) => isEmpty(value) ? '—' : new Intl.NumberFormat().format(Number(value))
const decimal = (value: unknown, digits = 2) => new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Number(value))
const duration = (ms: unknown) => isEmpty(ms) ? '' : Number(ms) >= 1000 ? `${decimal(Number(ms) / 1000)} s` : `${number(ms)} ms`
// Drops empty rows so every section only shows recorded values.
const rows = (items: RowInput[]): Row[] => items.filter(item => !isEmpty(item.value)).map(item => ({ ...item, value: String(item.value), hint: isEmpty(item.hint) ? undefined : String(item.hint) }))
const display = (value: unknown) => isEmpty(value) ? '—' : String(value)
const milliseconds = (value: unknown) => isEmpty(value) ? '—' : Number(value) >= 1000 ? `${decimal(Number(value) / 1000)} s` : `${number(value)} ms`

const title = computed(() => [event.value.provider, event.value.model].filter(Boolean).join(' · ') || 'Request details')
const subtitle = computed(() => {
  const time = event.value.timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(event.value.timestamp)) : ''
  const endpoint = [payload.value.method, event.value.endpoint].filter(Boolean).join(' ')
  return [time, endpoint].filter(Boolean).join(' · ') || 'Routing, usage, billing, and redacted logs for this request.'
})
const downloadUrl = computed(() => event.value.related?.request_log?.download_url || '')
const amount = computed(() => event.value.billing?.amount == null ? '—' : `${decimal(event.value.billing.amount)} ${event.value.billing.currency || 'credits'}`)
const endpoint = computed(() => [props.detail?.payload_summary?.method, event.value.endpoint].filter(Boolean).join(' '))
const statusLabel = computed(() => event.value.status || (event.value.failed ? 'Failed' : 'Success'))
const statusCode = computed(() => event.value.status_code || event.value.error?.status_code || event.value.upstream_status_code || '')
const statusColor = computed(() => { const code = Number(statusCode.value); return event.value.failed || code >= 400 ? 'error' : code >= 200 && code < 400 ? 'success' : 'neutral' })
const status = computed(() => [statusLabel.value, statusCode.value ? `HTTP ${statusCode.value}` : '', event.value.upstream_status_code && event.value.upstream_status_code !== event.value.status_code ? `Upstream ${event.value.upstream_status_code}` : ''].filter(Boolean).join(' · '))
const toolUsage = computed(() => toolUsageEntries(event.value.tool_usage).map(([key, value]) => ({ label: key.replaceAll('_', ' '), value: number(value) })))
const costBreakdown = computed(() => requestCostRows(event.value.billing))
const formatBoolean = (value: unknown) => value == null ? '—' : value ? 'Yes' : 'No'
const hasError = computed(() => Boolean(event.value.error?.message || event.value.error?.reason || event.value.error?.body_preview))

const present = (value: unknown) => !isEmpty(value) && value !== '—'
const keyFacts = computed(() => [
  { label: 'Status', icon: 'i-tabler-activity', value: statusCode.value ? `HTTP ${statusCode.value}` : statusLabel.value, hint: [statusCode.value ? statusLabel.value : '', event.value.upstream_status_code && event.value.upstream_status_code !== event.value.status_code ? `upstream ${event.value.upstream_status_code}` : ''].filter(Boolean).join(' · '), tone: statusColor.value },
  { label: 'Latency', icon: 'i-tabler-clock', value: milliseconds(event.value.performance?.latency_ms), hint: [present(event.value.performance?.ttft_ms) ? `TTFT ${milliseconds(event.value.performance.ttft_ms)}` : '', present(event.value.performance?.tps) ? `${decimal(event.value.performance.tps)} tok/s` : ''].filter(Boolean).join(' · ') },
  { label: 'Tokens', icon: 'i-tabler-database', value: number(event.value.tokens?.total_tokens), hint: `${number(event.value.tokens?.input_tokens)} in · ${number(event.value.tokens?.output_tokens)} out` },
  { label: 'Cost', icon: 'i-tabler-coin', value: amount.value, hint: event.value.billing?.matched_price_rule ? 'Price rule matched' : '' }
])
const errorCodes = computed(() => [event.value.error?.status_code ? `HTTP ${event.value.error.status_code}` : '', event.value.error?.upstream_status_code ? `upstream ${event.value.error.upstream_status_code}` : ''].filter(Boolean).join(' · '))
const identifiers = computed(() => rows([
  { label: 'Request ID', value: event.value.request_id },
  { label: 'Upstream request ID', value: event.value.upstream_request_id },
  { label: 'Event ID', value: event.value.id },
  { label: 'Session ID', value: event.value.session_id },
  { label: 'Parent session', value: event.value.parent_session_id },
  { label: 'Root session', value: event.value.root_session_id }
]))
const tokenPalette = { Input: '#8b5cf6', Output: '#10b981', Reasoning: '#f59e0b', 'Cache read': '#3b82f6', 'Cache creation': '#d946ef', Cached: '#06b6d4' } as Record<string, string>
const tokenRows = computed(() => [
  ['Input', event.value.tokens?.input_tokens], ['Output', event.value.tokens?.output_tokens], ['Reasoning', event.value.tokens?.reasoning_tokens],
  ['Cache read', event.value.tokens?.cache_read_tokens], ['Cache creation', event.value.tokens?.cache_creation_tokens], ['Cached', event.value.tokens?.cached_tokens]
].filter(([, value]) => present(value)).map(([label, value]) => ({ label: String(label), value: Number(value) || 0, display: number(value), color: tokenPalette[String(label)] })))
// Bar shows billable composition only; "Cached" overlaps cache read so it stays out of the bar.
const tokenParts = computed(() => tokenRows.value.filter(part => part.value > 0 && part.label !== 'Cached'))
const cacheRate = computed(() => {
  const input = Number(event.value.tokens?.input_tokens) || 0
  const cached = Number(event.value.tokens?.cache_read_tokens ?? event.value.tokens?.cached_tokens) || 0
  return input > 0 && cached > 0 ? `${Math.round(Math.min(1, cached / input) * 100)}%` : ''
})
const infoGroups = computed(() => [
  { title: 'Request', icon: 'i-tabler-route', items: rows([
    { label: 'Event type', value: event.value.event_type || 'completion' },
    { label: 'Endpoint', value: endpoint.value, mono: true },
    { label: 'Original model', value: event.value.original_model },
    { label: 'Model alias', value: event.value.model_alias },
    { label: 'Service tier', value: event.value.service_tier },
    { label: 'Reasoning effort', value: event.value.reasoning_effort },
    { label: 'Streaming', value: payload.value.stream == null ? '' : formatBoolean(payload.value.stream) },
    { label: 'Messages / tools', value: payload.value.message_count == null && payload.value.tool_count == null ? '' : `${number(payload.value.message_count)} / ${number(payload.value.tool_count)}` },
    { label: 'Executor', value: event.value.executor_type },
    { label: 'Source', value: event.value.source }
  ]) },
  { title: 'Client', icon: 'i-tabler-user', items: rows([
    { label: 'User', value: event.value.client?.username || event.value.client?.user_id },
    { label: 'Access key', value: event.value.client?.client_key_label || event.value.client?.client_key_masked },
    { label: 'Key ID', value: event.value.client?.client_key_id, mono: true },
    { label: 'Client IP', value: event.value.client?.client_ip, mono: true }
  ]) },
  { title: 'Credential', icon: 'i-tabler-id-badge-2', items: rows([
    { label: 'Label', value: event.value.credential?.label },
    { label: 'Type', value: event.value.credential?.credential_type },
    { label: 'Provider', value: event.value.credential?.provider },
    { label: 'Credential ID', value: event.value.credential?.credential_id, mono: true },
    { label: 'Auth index', value: event.value.credential?.auth_index, mono: true },
    { label: 'Key preview', value: event.value.credential?.api_key_preview, mono: true },
    { label: 'Source', value: event.value.credential?.source }
  ]) },
  { title: 'Runtime', icon: 'i-tabler-server-2', items: rows([
    { label: 'Home', value: event.value.runtime?.home_id },
    { label: 'Home address', value: [event.value.runtime?.home_ip, event.value.runtime?.home_port].filter(Boolean).join(':'), mono: true },
    { label: 'CPA node', value: event.value.runtime?.cpa_label || event.value.runtime?.cpa_node_id },
    { label: 'CPA address', value: [event.value.runtime?.cpa_ip, event.value.runtime?.cpa_port].filter(Boolean).join(':'), mono: true }
  ]) }
])
const billingMeta = computed(() => rows([
  { label: 'Charge ID', value: event.value.billing?.charge_id },
  { label: 'Price rule', value: event.value.billing?.matched_price_rule }
]))
async function copyText(value: string | undefined, label: string) {
  if (!value) return
  try { await navigator.clipboard.writeText(value); toast.add({ title: `${label} copied`, color: 'success' }) }
  catch { toast.add({ title: `Could not copy ${label.toLowerCase()}`, description: 'Select the value and copy it manually.', color: 'error' }) }
}
</script>

<style scoped>
/* Request detail: key facts strip, then compact grouped definition lists. */
.rd-status-icon { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.625rem; background: var(--ui-bg-muted); color: var(--ui-text-muted); }
.rd-status-icon--success { background: color-mix(in oklch, var(--ui-success) 14%, transparent); color: var(--ui-success); }
.rd-status-icon--error { background: color-mix(in oklch, var(--ui-error) 14%, transparent); color: var(--ui-error); }
.rd-fact { min-width: 0; padding: 0.625rem 0.75rem; border: 1px solid var(--ui-border); border-radius: 0.75rem; background: var(--ui-bg); }
.rd-fact--success { border-color: color-mix(in oklch, var(--ui-success) 30%, var(--ui-border)); background: color-mix(in oklch, var(--ui-success) 6%, var(--ui-bg)); }
.rd-fact--error { border-color: color-mix(in oklch, var(--ui-error) 30%, var(--ui-border)); background: color-mix(in oklch, var(--ui-error) 6%, var(--ui-bg)); }
.rd-error { padding: 0.875rem 1rem; border: 1px solid color-mix(in oklch, var(--ui-error) 30%, transparent); border-radius: 0.75rem; background: color-mix(in oklch, var(--ui-error) 8%, var(--ui-bg)); color: var(--ui-error); }
.rd-card { min-width: 0; padding: 0.875rem 1rem; border: 1px solid var(--ui-border); border-radius: 0.75rem; background: var(--ui-bg); }
.rd-title { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.5rem; font-size: 0.75rem !important; line-height: 1rem !important; font-weight: 600; color: var(--ui-text-toned); }
.rd-row { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr); align-items: center; gap: 0.75rem; padding-block: 0.4375rem; font-size: 0.8125rem; }
.rd-row > dt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ui-text-muted); font-size: 0.75rem; }
.rd-row > dd { min-width: 0; text-align: right; color: var(--ui-text-highlighted); }
.rd-row--total > dt, .rd-row--total > dd { font-weight: 600; color: var(--ui-text-highlighted); }
.rd-token-bar { display: flex; height: 0.5rem; gap: 2px; margin-top: 0.625rem; overflow: hidden; border-radius: 9999px; background: var(--ui-bg-muted); }
.rd-token-bar > span { flex-basis: 0; min-width: 3px; }
.rd-log { max-height: 22rem; margin: 0; overflow: auto; padding: 0.875rem 1rem; border-top: 1px solid var(--ui-border); border-radius: 0 0 0.75rem 0.75rem; background: oklch(0.2 0.02 270); color: var(--color-zinc-200); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.75rem; line-height: 1.25rem; white-space: pre-wrap; word-break: break-all; }
</style>
