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
      <div v-if="loading" role="status" aria-label="Loading request details" class="space-y-6 p-4 sm:p-5">
        <USkeleton class="h-16 w-full" />
        <div v-for="index in 3" :key="index" class="space-y-3"><USkeleton class="h-3 w-24" /><USkeleton class="h-4 w-full" /><USkeleton class="h-4 w-4/5" /><USkeleton class="h-4 w-3/5" /></div>
      </div>

      <div v-else-if="detail" class="divide-y divide-[var(--ui-border)]">
        <dl class="grid grid-cols-2 sm:grid-cols-4">
          <div v-for="(metric, index) in metrics" :key="metric.label" class="min-w-0 px-4 py-3 sm:px-5" :class="[index % 2 ? 'border-l' : '', index > 1 ? 'border-t sm:border-t-0' : '', index === 2 ? 'sm:border-l' : '', 'border-[var(--ui-border)]']">
            <dt class="text-xs text-[var(--ui-text-muted)]">{{ metric.label }}</dt>
            <dd class="mt-1 truncate text-sm font-semibold tabular-nums" :class="metric.tone" :title="metric.value">{{ metric.value }}</dd>
          </div>
        </dl>

        <div v-if="hasError" class="px-4 py-4 sm:px-5">
          <div class="rounded-md border border-[var(--ui-color-error-500)]/25 bg-[var(--ui-color-error-500)]/5 px-3 py-2.5 text-sm">
            <p class="flex items-center gap-2 font-medium text-[var(--ui-color-error-600)] dark:text-[var(--ui-color-error-400)]"><UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" />{{ event.error.reason || 'Request failed' }}</p>
            <p v-if="event.error.message" class="mt-1 line-clamp-3 break-words text-[var(--ui-text-muted)]">{{ event.error.message }}</p>
            <details v-if="event.error.body_preview" class="mt-2">
              <summary class="cursor-pointer select-none text-xs font-medium text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]">Response body</summary>
              <pre class="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--ui-bg)] p-2.5 font-mono text-xs leading-5">{{ event.error.body_preview }}</pre>
            </details>
          </div>
        </div>

        <section v-for="section in sections" :key="section.title" class="px-4 py-4 sm:px-5" :aria-label="section.title">
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">{{ section.title }}</h3>
          <dl>
            <div v-for="row in section.rows" :key="row.label" class="group grid min-h-8 grid-cols-[7.5rem_minmax(0,1fr)_1.75rem] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_1.75rem]">
              <dt class="truncate text-sm text-[var(--ui-text-muted)]">{{ row.label }}</dt>
              <dd class="min-w-0 truncate text-sm" :class="row.mono ? 'font-mono text-xs' : ''" :title="row.value">{{ row.value }}<span v-if="row.hint" class="ml-1.5 text-xs text-[var(--ui-text-muted)]">{{ row.hint }}</span></dd>
              <AppButton v-if="row.copy" type="button" color="neutral" variant="ghost" size="xs" icon="i-tabler-copy" class="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100" :aria-label="`Copy ${row.label.toLowerCase()}`" :title="`Copy ${row.label.toLowerCase()}`" @click="copyText(row.value, row.label)" />
            </div>
          </dl>
        </section>

        <details v-if="technicalRows.length" class="group/tech">
          <summary class="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] sm:px-5 [&::-webkit-details-marker]:hidden">
            Technical details
            <UIcon name="i-tabler-chevron-down" class="size-4 transition-transform group-open/tech:rotate-180" />
          </summary>
          <dl class="px-4 pb-4 sm:px-5">
            <div v-for="row in technicalRows" :key="row.label" class="grid min-h-7 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt class="truncate text-xs text-[var(--ui-text-muted)]">{{ row.label }}</dt>
              <dd class="min-w-0 truncate font-mono text-xs" :title="row.value">{{ row.value }}</dd>
            </div>
          </dl>
        </details>

        <details v-if="detail.log_excerpt?.length" class="group/log">
          <summary class="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>Log excerpt <span class="ml-1 font-normal normal-case tracking-normal">· {{ detail.log_excerpt.length }} lines, redacted</span></span>
            <UIcon name="i-tabler-chevron-down" class="size-4 transition-transform group-open/log:rotate-180" />
          </summary>
          <div class="px-4 pb-4 sm:px-5">
            <pre class="max-h-72 overflow-auto whitespace-pre rounded-md bg-[var(--ui-bg-muted)] p-3 font-mono text-xs leading-5">{{ detail.log_excerpt.join('\n') }}</pre>
          </div>
        </details>
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

const title = computed(() => [event.value.provider, event.value.model].filter(Boolean).join(' · ') || 'Request details')
const subtitle = computed(() => {
  const time = event.value.timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(event.value.timestamp)) : ''
  const endpoint = [payload.value.method, event.value.endpoint].filter(Boolean).join(' ')
  return [time, endpoint].filter(Boolean).join(' · ') || 'Routing, usage, billing, and redacted logs for this request.'
})
const downloadUrl = computed(() => event.value.related?.request_log?.download_url || '')
const amount = computed(() => isEmpty(event.value.billing?.amount) ? '' : `${decimal(event.value.billing.amount, 6)} ${event.value.billing.currency || 'credits'}`)
const statusLabel = computed(() => {
  const code = event.value.status_code ? ` ${event.value.status_code}` : ''
  return event.value.failed ? `Failed${code}` : `Success${code}`
})

const metrics = computed(() => [
  { label: 'Status', value: statusLabel.value, tone: event.value.failed ? 'text-[var(--ui-color-error-500)]' : 'text-[var(--ui-color-success-600)] dark:text-[var(--ui-color-success-400)]' },
  { label: 'Latency', value: duration(event.value.performance?.latency_ms) || '—', tone: '' },
  { label: 'Tokens', value: number(event.value.tokens?.total_tokens), tone: '' },
  { label: 'Cost', value: amount.value || '—', tone: '' }
])

const tokenHint = computed(() => {
  const tokens = event.value.tokens || {}
  const parts = [['in', tokens.input_tokens], ['out', tokens.output_tokens], ['reasoning', tokens.reasoning_tokens], ['cached', tokens.cached_tokens]].filter(([, value]) => !isEmpty(value) && Number(value) > 0)
  return parts.map(([label, value]) => `${number(value)} ${label}`).join(' · ')
})

const sections = computed(() => [
  { title: 'Request', rows: rows([
    { label: 'Request ID', value: event.value.request_id, mono: true, copy: true },
    { label: 'Upstream ID', value: event.value.upstream_request_id, mono: true, copy: true },
    { label: 'Endpoint', value: [payload.value.method, event.value.endpoint].filter(Boolean).join(' '), mono: true },
    { label: 'Model', value: event.value.model, hint: event.value.original_model && event.value.original_model !== event.value.model ? `from ${event.value.original_model}` : '' },
    { label: 'Upstream status', value: event.value.upstream_status_code },
    { label: 'Stream', value: payload.value.stream == null ? '' : payload.value.stream ? 'Yes' : 'No' },
    { label: 'Messages / tools', value: isEmpty(payload.value.message_count) && isEmpty(payload.value.tool_count) ? '' : `${number(payload.value.message_count)} / ${number(payload.value.tool_count)}` },
    { label: 'Session', value: event.value.session_id, mono: true, copy: true }
  ]) },
  { title: 'Routing', rows: rows([
    { label: 'User', value: event.value.client?.username || event.value.client?.user_id },
    { label: 'Access key', value: event.value.client?.client_key_label, hint: event.value.client?.client_key_masked },
    { label: 'Credential', value: event.value.credential?.label || event.value.credential?.credential_id, hint: event.value.credential?.credential_type },
    { label: 'Home node', value: event.value.runtime?.home_id || event.value.runtime?.home_ip },
    { label: 'CPA node', value: event.value.runtime?.cpa_label || event.value.runtime?.cpa_node_id },
    { label: 'Client IP', value: event.value.client?.client_ip, mono: true }
  ]) },
  { title: 'Usage', rows: rows([
    { label: 'Tokens', value: isEmpty(event.value.tokens?.total_tokens) ? '' : number(event.value.tokens.total_tokens), hint: tokenHint.value },
    { label: 'Time to first token', value: duration(event.value.performance?.ttft_ms) },
    { label: 'Throughput', value: isEmpty(event.value.performance?.tps) ? '' : `${decimal(event.value.performance.tps)} tok/s` },
    { label: 'Cost', value: amount.value, hint: event.value.billing?.matched_price_rule }
  ]) }
].filter(section => section.rows.length))

const technicalRows = computed(() => rows([
  { label: 'Event ID', value: event.value.id },
  { label: 'Event type', value: event.value.event_type },
  { label: 'Executor', value: event.value.executor_type },
  { label: 'Source', value: event.value.source },
  { label: 'Model alias', value: event.value.model_alias },
  { label: 'Service tier', value: event.value.service_tier },
  { label: 'Reasoning effort', value: event.value.reasoning_effort },
  { label: 'Parent session', value: event.value.parent_session_id },
  { label: 'Root session', value: event.value.root_session_id },
  { label: 'Credential ID', value: event.value.credential?.credential_id },
  { label: 'Auth index', value: event.value.credential?.auth_index },
  { label: 'Credential source', value: event.value.credential?.source },
  { label: 'Key preview', value: event.value.credential?.api_key_preview },
  { label: 'Client key ID', value: event.value.client?.client_key_id },
  { label: 'User ID', value: event.value.client?.user_id },
  { label: 'Home address', value: [event.value.runtime?.home_ip, event.value.runtime?.home_port].filter(value => !isEmpty(value)).join(':') },
  { label: 'CPA node ID', value: event.value.runtime?.cpa_node_id },
  { label: 'CPA address', value: [event.value.runtime?.cpa_ip, event.value.runtime?.cpa_port].filter(value => !isEmpty(value)).join(':') },
  { label: 'Cache read', value: isEmpty(event.value.tokens?.cache_read_tokens) ? '' : number(event.value.tokens.cache_read_tokens) },
  { label: 'Cache creation', value: isEmpty(event.value.tokens?.cache_creation_tokens) ? '' : number(event.value.tokens.cache_creation_tokens) },
  { label: 'Charge ID', value: event.value.billing?.charge_id }
]))

const hasError = computed(() => Boolean(event.value.error?.message || event.value.error?.reason || event.value.error?.body_preview))

async function copyText(value: string | undefined, label: string) {
  if (!value) return
  try { await navigator.clipboard.writeText(value); toast.add({ title: `${label} copied`, color: 'success' }) }
  catch { toast.add({ title: `Could not copy ${label.toLowerCase()}`, description: 'Select the value and copy it manually.', color: 'error' }) }
}
</script>
