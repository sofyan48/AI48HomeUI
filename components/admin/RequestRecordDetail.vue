<template>
  <AppModal v-model:open="open" :ui="{ content: 'w-full sm:max-w-2xl', header: 'shrink-0 border-b border-[var(--ui-border)] px-4 py-3 sm:px-5', body: 'min-h-0 overflow-y-auto p-0 sm:p-0', footer: 'shrink-0 border-t border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 py-3 sm:px-5' }">
    <template #header="{ close }">
      <div class="flex w-full min-w-0 items-start gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="size-2 shrink-0 rounded-full" :class="loading ? 'bg-[var(--ui-text-dimmed)]' : event.failed ? 'bg-[var(--ui-color-error-500)]' : 'bg-[var(--ui-color-success-500)]'" aria-hidden="true" />
            <h2 class="truncate text-base font-semibold" :title="title">{{ loading ? 'Loading request…' : title }}</h2>
          </div>
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
      <div v-if="loading" role="status" class="flex items-center justify-center gap-2 py-16 text-sm text-[var(--ui-text-muted)]"><UIcon name="i-tabler-loader-2" class="size-5 animate-spin" />Loading request details…</div>
      <div v-else-if="detail" class="space-y-4">
        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="field in overview" :key="field.label" class="min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3 sm:p-4" :class="field.full ? 'sm:col-span-2' : ''">
            <dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ field.label }}</dt>
            <dd class="mt-2 flex min-w-0 items-start justify-between gap-3 text-sm">
              <div class="min-w-0 space-y-1">
                <UBadge v-if="field.label === 'Status'" :color="statusColor" variant="subtle" class="font-mono tabular-nums" :title="statusLabel">{{ statusCode || statusLabel }}</UBadge>
                <span v-else class="block break-all font-medium" :class="field.mono ? 'font-mono text-xs leading-5' : ''">{{ display(field.value) }}</span>
                <p v-if="field.secondary" class="break-all text-xs text-[var(--ui-text-muted)]">{{ field.secondary }}</p>
              </div>
              <AppButton v-if="field.copy" type="button" color="neutral" variant="ghost" size="xs" icon="i-tabler-copy" class="shrink-0" :aria-label="`Copy ${field.label.toLowerCase()}`" :title="`Copy ${field.label.toLowerCase()}`" @click="copyText(field.copy, field.label)" />
            </dd>
          </div>
        </dl>

        <section class="rounded-lg border border-[var(--ui-border)] p-3 sm:p-4" aria-labelledby="request-detail-tokens">
          <div class="mb-3 flex items-center justify-between gap-3"><h3 id="request-detail-tokens" class="text-sm font-semibold">Tokens</h3><span class="text-xs text-[var(--ui-text-muted)]">Total <strong class="ml-1 text-[var(--ui-text)] tabular-nums">{{ number(event.tokens?.total_tokens) }}</strong></span></div>
          <dl class="grid grid-cols-3 gap-3">
            <div v-for="item in primaryTokens" :key="item.label" class="min-w-0 rounded-md bg-[var(--ui-bg-muted)] p-3"><dt class="text-xs text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 break-all text-lg font-semibold tabular-nums">{{ item.value }}</dd></div>
          </dl>
          <dl class="mt-3 grid grid-cols-1 gap-3 border-t border-[var(--ui-border)] pt-3 sm:grid-cols-3">
            <div v-for="item in cacheTokens" :key="item.label"><dt class="text-xs text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 text-sm font-medium tabular-nums">{{ item.value }}</dd></div>
          </dl>
        </section>

        <UAlert v-if="hasError" color="error" variant="subtle" icon="i-tabler-alert-circle" title="Request error" :description="event.error.message || event.error.reason || event.error.body_preview" />
        <section v-if="hasError" class="rounded-lg border border-[var(--ui-border)] p-4" aria-labelledby="request-detail-error">
          <h3 id="request-detail-error" class="mb-3 text-sm font-semibold">Error details</h3>
          <dl class="grid gap-3 sm:grid-cols-2"><AdminDetailItem v-for="item in errorDetails" :key="item.label" :label="item.label" :value="item.value" /></dl>
          <pre v-if="event.error?.body_preview" class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[var(--ui-bg-muted)] p-3 font-mono text-xs leading-5">{{ event.error.body_preview }}</pre>
        </section>

        <section class="rounded-lg border border-[var(--ui-border)] p-3 sm:p-4" aria-labelledby="request-detail-routing">
          <h3 id="request-detail-routing" class="mb-3 text-sm font-semibold">Additional request details</h3>
          <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2"><AdminDetailItem v-for="item in requestDetails" :key="item.label" :label="item.label" :value="item.value" /></dl>
        </section>
        <section v-if="toolUsage.length" class="rounded-lg border border-[var(--ui-border)] p-3 sm:p-4" aria-labelledby="request-detail-tools">
          <h3 id="request-detail-tools" class="mb-3 text-sm font-semibold">Tool usage</h3>
          <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3"><div v-for="item in toolUsage" :key="item.label"><dt class="text-xs text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="mt-1 text-sm font-semibold tabular-nums">{{ item.value }}</dd></div></dl>
        </section>
        <section v-if="costBreakdown.length" class="rounded-lg border border-[var(--ui-border)] p-3 sm:p-4" aria-labelledby="request-detail-cost">
          <h3 id="request-detail-cost" class="mb-3 text-sm font-semibold">Cost breakdown</h3>
          <dl class="divide-y divide-[var(--ui-border-muted)]"><div v-for="item in costBreakdown" :key="item.label" class="flex items-center justify-between gap-4 py-2 text-sm"><dt class="text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="font-medium tabular-nums">{{ item.value }}</dd></div></dl>
        </section>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AdminDetailSection title="Runtime" :items="runtimeDetails" />
          <AdminDetailSection title="Credential" :items="credentialDetails" />
          <AdminDetailSection title="Client" :items="clientDetails" />
          <AdminDetailSection title="Performance" :items="performanceDetails" />
          <AdminDetailSection title="Billing" :items="billingDetails" />
        </div>
        <section v-if="detail.payload_summary" class="rounded-lg border border-[var(--ui-border)] p-4"><h3 class="mb-3 text-sm font-semibold">Payload summary</h3><dl class="grid grid-cols-2 gap-3 sm:grid-cols-4"><AdminDetailItem label="Method" :value="detail.payload_summary.method" /><AdminDetailItem label="Streaming" :value="formatBoolean(detail.payload_summary.stream)" /><AdminDetailItem label="Messages" :value="number(detail.payload_summary.message_count)" /><AdminDetailItem label="Tools" :value="number(detail.payload_summary.tool_count)" /></dl></section>
        <section v-if="detail.log_excerpt?.length" class="rounded-lg border border-[var(--ui-border)] p-4"><div class="mb-3 flex items-center justify-between gap-2"><h3 class="text-sm font-semibold">Request log excerpt</h3><UBadge color="neutral" variant="subtle" size="sm">Redacted</UBadge></div><pre class="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-md bg-[var(--ui-bg-muted)] p-3 font-mono text-xs leading-5">{{ detail.log_excerpt.join('\n') }}</pre></section>
      </div>

      <div v-else class="flex flex-col items-center justify-center px-4 py-16 text-center text-sm text-[var(--ui-text-muted)]"><UIcon name="i-tabler-file-unknown" class="mb-2 size-6" />No request selected.</div>
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
type OverviewField = { label: string; value?: unknown; secondary?: string; mono?: boolean; full?: boolean; copy?: string }
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
const overview = computed<OverviewField[]>(() => [
  { label: 'Event type', value: event.value.event_type || 'completion' },
  { label: 'Status', secondary: status.value },
  { label: 'Request ID', value: event.value.request_id, mono: true, copy: event.value.request_id },
  { label: 'Upstream request ID', value: event.value.upstream_request_id, mono: true, copy: event.value.upstream_request_id },
  { label: 'Provider', value: event.value.provider },
  { label: 'Model', value: event.value.model },
  { label: 'Endpoint', value: endpoint.value, mono: true, full: true, copy: endpoint.value },
  { label: 'Home node', value: event.value.runtime?.home_id || event.value.runtime?.home_ip },
  { label: 'CPA node', value: event.value.runtime?.cpa_label || event.value.runtime?.cpa_node_id },
  { label: 'User', value: event.value.client?.username || event.value.client?.user_id },
  { label: 'Client access key', value: event.value.client?.client_key_label },
  { label: 'Credential', value: event.value.credential?.label || event.value.credential?.credential_id, secondary: event.value.credential?.credential_type },
  { label: 'Latency', value: event.value.performance?.latency_ms == null ? '—' : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(event.value.performance.latency_ms / 1000)} s` },
  { label: 'Cost', value: amount.value, full: true }
])
function details(object: Fields | undefined, pairs: string[][]) { return pairs.map(([label, key]) => ({ label: label!, value: display(object?.[key!]) })) }
const errorDetails = computed(() => details(event.value.error, [['HTTP status', 'status_code'], ['Upstream status', 'upstream_status_code'], ['Reason', 'reason'], ['Message', 'message']]))
const primaryTokens = computed(() => details(event.value.tokens, [['Input', 'input_tokens'], ['Output', 'output_tokens'], ['Reasoning', 'reasoning_tokens']]).map(item => ({ ...item, value: item.value === '—' ? '—' : number(item.value) })))
const cacheTokens = computed(() => details(event.value.tokens, [['Cached', 'cached_tokens'], ['Cache read', 'cache_read_tokens'], ['Cache creation', 'cache_creation_tokens']]).map(item => ({ ...item, value: item.value === '—' ? '—' : number(item.value) })))
const toolUsage = computed(() => toolUsageEntries(event.value.tool_usage).map(([key, value]) => ({ label: key.replaceAll('_', ' '), value: number(value) })))
const requestDetails = computed(() => details(event.value, [['Event ID', 'id'], ['Original model', 'original_model'], ['Model alias', 'model_alias'], ['Executor', 'executor_type'], ['Source', 'source'], ['Service tier', 'service_tier'], ['Reasoning effort', 'reasoning_effort'], ['Session ID', 'session_id'], ['Parent session ID', 'parent_session_id'], ['Root session ID', 'root_session_id']]))
const runtimeDetails = computed(() => details(event.value.runtime, [['Home', 'home_id'], ['Home IP', 'home_ip'], ['Home port', 'home_port'], ['CPA label', 'cpa_label'], ['CPA node ID', 'cpa_node_id'], ['CPA address', 'cpa_ip'], ['CPA port', 'cpa_port']]))
const credentialDetails = computed(() => details(event.value.credential, [['Type', 'credential_type'], ['Label', 'label'], ['Credential ID', 'credential_id'], ['Auth index', 'auth_index'], ['Provider', 'provider'], ['Source', 'source'], ['Key preview', 'api_key_preview']]))
const clientDetails = computed(() => details(event.value.client, [['Username', 'username'], ['User ID', 'user_id'], ['Key label', 'client_key_label'], ['Key ID', 'client_key_id'], ['Masked key', 'client_key_masked'], ['Client IP', 'client_ip']]))
const performanceDetails = computed(() => [{ label: 'Latency', value: milliseconds(event.value.performance?.latency_ms) }, { label: 'TTFT', value: milliseconds(event.value.performance?.ttft_ms) }, { label: 'TPS', value: event.value.performance?.tps == null ? '—' : decimal(event.value.performance.tps) }])
const billingDetails = computed(() => [{ label: 'Amount', value: amount.value }, ...details(event.value.billing, [['Charge ID', 'charge_id'], ['Price rule', 'matched_price_rule']])])
const costBreakdown = computed(() => requestCostRows(event.value.billing))
const formatBoolean = (value: unknown) => value == null ? '—' : value ? 'Yes' : 'No'
const hasError = computed(() => Boolean(event.value.error?.message || event.value.error?.reason || event.value.error?.body_preview))

async function copyText(value: string | undefined, label: string) {
  if (!value) return
  try { await navigator.clipboard.writeText(value); toast.add({ title: `${label} copied`, color: 'success' }) }
  catch { toast.add({ title: `Could not copy ${label.toLowerCase()}`, description: 'Select the value and copy it manually.', color: 'error' }) }
}
</script>
