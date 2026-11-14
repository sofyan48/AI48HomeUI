<template>
  <div class="space-y-4">
    <AppPanelTabs v-model="activeView" :items="views" label="Diagnostics views" />

    <section v-if="activeView === 'console'" class="space-y-4" role="tabpanel">
      <AppCard :ui="{ body: 'p-3 sm:p-3' }">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Overview window">
            <USelect v-model="windowSeconds" :items="windowOptions" value-key="value" label-key="label" class="w-40" :disabled="loadingConsole" @update:model-value="refreshConsole" />
          </UFormField>
          <UFormField label="Realtime grouping">
            <USelect v-model="groupBy" :items="['model', 'provider', 'client_key', 'credential']" class="w-40" :disabled="loadingConsole" @update:model-value="refreshConsole" />
          </UFormField>
          <div class="ml-auto flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm"><USwitch v-model="autoRefresh" aria-label="Auto-refresh every 30 seconds" />Auto-refresh 30s</label>
            <span v-if="lastUpdated" class="text-xs text-[var(--ui-text-muted)]" role="status">Updated {{ formatTime(lastUpdated) }}</span>
            <AppButton icon="i-tabler-refresh" :loading="loadingConsole" @click="refreshConsole">Refresh</AppButton>
          </div>
        </div>
      </AppCard>
      <UAlert v-if="consoleError" color="error" variant="subtle" title="Some diagnostics could not be loaded" :description="consoleError" />
      <section class="pulse" aria-label="Diagnostics summary" :aria-busy="loadingConsole && !overview">
        <div class="pulse__head">
          <div class="flex min-w-0 items-center gap-3">
            <span class="pulse__beacon" :class="`pulse__beacon--${overallHealth.tone}`" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ overallHealth.label }}</p>
              <p class="text-xs text-[var(--ui-text-muted)]">{{ windowOptions.find(option => option.value === windowSeconds)?.label || 'Selected window' }} · {{ activityBars.length }} activity buckets</p>
            </div>
          </div>
        </div>
        <div v-if="activityBars.length" class="pulse__timeline" role="img" :aria-label="`Request volume and errors across ${activityBars.length} buckets`">
          <span
            v-for="bar in activityBars"
            :key="bar.key"
            class="pulse__bar"
            :class="`pulse__bar--${bar.tone}`"
            :style="{ height: `${bar.height}%` }"
            :title="bar.title"
          />
        </div>
        <p v-else class="pulse__empty">No request activity in this window.</p>
      </section>
      <AdminStatGrid label="Diagnostics figures" :items="summaryMetrics" :columns="4" :loading="loadingConsole && !overview" />

      <div class="grid gap-4 xl:grid-cols-12">
        <AppCard class="xl:col-span-7" :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div><h2 class="font-semibold">Realtime</h2><p class="text-xs text-[var(--ui-text-muted)]">Last 15 minutes · grouped by {{ groupBy }}</p></div>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-muted)] px-2.5 py-1 text-xs text-[var(--ui-text-muted)]"><span class="size-1.5 rounded-full" :class="latestVelocity ? 'bg-emerald-500' : 'bg-zinc-400'" />{{ latestVelocity ? 'Live' : 'Idle' }}</span>
            </div>
          </template>
          <dl class="grid grid-cols-3 gap-2 p-3">
            <div v-for="item in velocityItems" :key="item.label" class="velocity-tile">
              <dt class="text-[11px] text-[var(--ui-text-muted)]">{{ item.label }}</dt>
              <dd class="mt-0.5 font-[family-name:var(--admin-display-font)] text-base font-bold tabular-nums text-[var(--ui-text-highlighted)]">{{ item.value }}</dd>
            </div>
          </dl>
          <div class="grid gap-3 px-3 pb-3 md:grid-cols-2">
            <div class="velocity-panel">
              <h3 class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">Current usage</h3>
              <ul v-if="realtime?.current_usage?.length" class="space-y-2.5">
                <li v-for="item in realtime.current_usage" :key="item.id" class="text-sm">
                  <div class="flex justify-between gap-3"><span class="truncate" :title="item.label || item.id">{{ item.label || item.id }}</span><span class="shrink-0 tabular-nums text-[var(--ui-text-muted)]">{{ number(item.request_count) }}</span></div>
                  <div class="mt-1 h-1 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]"><div class="h-full rounded-full bg-violet-500" :style="{ width: `${shareOf(item.request_count, realtime.current_usage)}%` }" /></div>
                </li>
              </ul>
              <p v-else class="py-4 text-sm text-[var(--ui-text-muted)]">No recent usage.</p>
            </div>
            <div class="velocity-panel">
              <h3 class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">Latency distribution</h3>
              <ul v-if="realtime?.latency_distribution?.length" class="space-y-2.5">
                <li v-for="bucket in realtime.latency_distribution" :key="bucket.bucket" class="text-sm">
                  <div class="flex justify-between gap-3"><span class="font-mono text-xs">{{ bucket.bucket }}</span><span class="tabular-nums text-[var(--ui-text-muted)]">{{ number(bucket.request_count) }}</span></div>
                  <div class="mt-1 h-1 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]"><div class="h-full rounded-full bg-blue-500" :style="{ width: `${shareOf(bucket.request_count, realtime.latency_distribution)}%` }" /></div>
                </li>
              </ul>
              <p v-else class="py-4 text-sm text-[var(--ui-text-muted)]">No latency data.</p>
            </div>
          </div>
        </AppCard>
        <AppCard class="xl:col-span-5" :ui="{ body: 'p-0 sm:p-0' }">
          <template #header><div><h2 class="font-semibold">Recent activity</h2><p class="text-xs text-[var(--ui-text-muted)]">Latest active buckets in this window</p></div></template>
          <ol v-if="recentActivity.length" class="divide-y divide-[var(--ui-border)]">
            <li v-for="point in recentActivity" :key="point.bucket_start" class="flex items-center gap-3 px-4 py-2 text-sm">
              <span class="size-2 shrink-0 rounded-full" :class="healthDot(point.status)" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-xs text-[var(--ui-text-muted)]">{{ formatTime(point.bucket_start) }}</span>
              <span class="tabular-nums">{{ number(point.request_count) }} req</span>
              <span class="w-14 text-right text-xs tabular-nums text-[var(--ui-text-muted)]">{{ percent(point.error_rate) }}</span>
              <UBadge :color="healthColor(point.status)" variant="subtle" size="sm">{{ point.status }}</UBadge>
            </li>
          </ol>
          <p v-else class="px-4 py-8 text-center text-sm text-[var(--ui-text-muted)]">No activity in this window.</p>
        </AppCard>
        <AppCard v-for="section in healthSections" :key="section.label" class="xl:col-span-6" :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold">{{ section.label }} health</h2>
              <div v-if="section.items.length" class="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
                <span v-for="count in healthCounts(section.items)" :key="count.status" class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full" :class="healthDot(count.status)" />{{ count.total }} {{ count.status }}</span>
              </div>
            </div>
          </template>
          <ul v-if="section.items.length" class="max-h-96 divide-y divide-[var(--ui-border)] overflow-y-auto">
            <li v-for="item in section.items" :key="item.id" class="px-4 py-2.5 text-sm">
              <div class="flex items-center gap-2">
                <span class="size-2 shrink-0 rounded-full" :class="healthDot(item.status)" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate font-medium" :title="item.label || item.id">{{ item.label || item.id }}</span>
                <span class="shrink-0 text-xs tabular-nums text-[var(--ui-text-muted)]">{{ percent(item.recent_error_rate) }} err · p95 {{ milliseconds(item.p95_latency_ms) }}</span>
                <UBadge :color="healthColor(item.status)" variant="subtle" size="sm">{{ item.status }}</UBadge>
              </div>
              <p class="mt-0.5 pl-4 text-xs text-[var(--ui-text-muted)]">{{ item.provider || item.credential_type || '—' }} · {{ number(item.recent_success_count) }} success / {{ number(item.recent_failed_count) }} failed<template v-if="item.next_retry_at"> · retry {{ formatTime(item.next_retry_at) }}</template></p>
              <p v-if="item.last_error_message" class="mt-0.5 break-words pl-4 text-xs text-[var(--ui-error)]">Last error{{ item.last_error_status ? ` (${item.last_error_status})` : '' }}: {{ item.last_error_message }} · {{ formatTime(item.last_error_at) }}</p>
            </li>
          </ul>
          <p v-else class="px-4 py-8 text-center text-sm text-[var(--ui-text-muted)]">No health data in this window.</p>
        </AppCard>
      </div>

      <AdminDataPanel title="Request logs" :description="`${number(logs?.total)} indexed · local availability or remote routability`">
        <template #actions>
          <form class="flex w-full gap-2 sm:w-auto" @submit.prevent="applyLogSearch"><UInput v-model="logSearch" icon="i-tabler-search" placeholder="Request ID, model, status or file" aria-label="Search request logs" class="w-full sm:w-72" /><AppButton type="submit" color="neutral" variant="outline" :disabled="loadingConsole">Search</AppButton></form>
        </template>
        <AppTable native><table class="min-w-[42rem] text-left"><thead><tr><th class="app-table-number-head">No.</th><th>Request</th><th>Provider / model</th><th>Home</th><th>File</th><th>Status</th><th class="w-px text-right">Actions</th></tr></thead><tbody>
          <tr v-for="(item, index) in logItems" :key="item.id"><td class="app-table-number-cell"><span class="app-table-number">{{ (logPage - 1) * logPageSize + index + 1 }}</span></td><td><div>{{ formatTime(item.timestamp) }}</div><div class="font-mono text-xs">{{ item.request_id || '—' }}</div></td><td>{{ item.provider || '—' }} / {{ item.model || '—' }}</td><td>{{ item.home_ip || '—' }}{{ item.home_port ? `:${item.home_port}` : '' }}</td><td class="font-mono text-xs">{{ item.file_name || 'Remote / unavailable' }}</td><td>{{ item.status }}</td><td><div class="flex justify-end"><AdminTableAction action="download" label="Download request log" :disabled="!item.download_url" :loading="downloadingId === item.id" @click="downloadLog(item)" /></div></td></tr>
        </tbody></table></AppTable>
        <p v-if="!logItems.length" class="py-8 text-center text-sm text-[var(--ui-text-muted)]">No request logs match this window and search.</p>
        <template #footer>
          <div class="flex items-center justify-end gap-3 text-sm"><AppButton size="sm" color="neutral" variant="outline" :disabled="logPage === 1 || loadingConsole" @click="changeLogPage(-1)">Previous</AppButton><span class="tabular-nums">Page {{ logPage }} / {{ logPages }}</span><AppButton size="sm" color="neutral" variant="outline" :disabled="logPage >= logPages || loadingConsole" @click="changeLogPage(1)">Next</AppButton></div>
        </template>
      </AdminDataPanel>
    </section>

    <section v-else class="space-y-4" role="tabpanel">
    <p class="text-sm text-[var(--ui-text-muted)]">Send an HTTP request from Home, optionally using a stored credential for token substitution and credential-scoped proxy selection.</p>
    <UAlert color="warning" variant="subtle" icon="i-tabler-shield-exclamation" title="Administrative network access" description="Requests originate from Home and can reach addresses available to that server. Use only trusted URLs. Responses shown below may contain sensitive upstream data." />
    <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-tabler-alert-circle" title="Request failed" :description="errorMessage" />

    <div class="grid gap-4 xl:grid-cols-2">
      <AppCard>
        <template #header><h2 class="font-semibold">Request</h2></template>
        <form class="space-y-4" @submit.prevent="sendRequest">
          <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <UFormField label="Method">
              <USelect v-model="form.method" :items="methods" class="w-full" />
            </UFormField>
            <UFormField label="Absolute URL" required>
              <UInput v-model="form.url" type="url" placeholder="https://api.example.com/v1/models" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Credential">
            <USelectMenu :model-value="form.auth_index || noCredentialValue" @update:model-value="form.auth_index = $event === noCredentialValue ? '' : $event" :items="credentialOptions" value-key="value" label-key="label" class="w-full" :search-input="{ placeholder: 'Search credentials...' }" />
            <template #hint>Required when a header contains <code>$TOKEN$</code>.</template>
          </UFormField>
          <UFormField label="Headers (JSON object)">
            <UTextarea v-model="form.headers" :rows="8" class="w-full font-mono text-xs" spellcheck="false" />
          </UFormField>
          <UFormField label="Raw request body">
            <UTextarea v-model="form.data" :rows="10" class="w-full font-mono text-xs" spellcheck="false" />
          </UFormField>
          <div class="flex justify-end">
            <AppButton type="submit" icon="i-tabler-send" :loading="sending">Send request</AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-semibold">Response</h2>
            <UBadge v-if="result" :color="statusColor(result.status_code)" variant="subtle">HTTP {{ result.status_code }}</UBadge>
          </div>
        </template>
        <div v-if="result" class="space-y-4">
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Headers</p>
            <pre class="max-h-64 overflow-auto rounded-lg bg-[var(--ui-bg-muted)] p-4 text-xs">{{ formattedHeaders }}</pre>
          </div>
          <div>
            <div class="mb-2 flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">Body</p>
              <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-clipboard" @click="copyBody">Copy</AppButton>
            </div>
            <pre class="max-h-[42rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--ui-bg-muted)] p-4 text-xs">{{ formattedBody }}</pre>
          </div>
        </div>
        <div v-else class="flex min-h-48 flex-col items-center justify-center text-center text-[var(--ui-text-muted)]">
          <UIcon name="i-tabler-terminal-2" class="size-10" />
          <p class="mt-3 text-sm">Send a request to inspect its status, headers, and body.</p>
        </div>
      </AppCard>
    </div>
    </section>
  </div>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
const { fetchAPI } = useApi()
const toast = useToast()
const views = [{ value: 'console', label: 'Observability' }, { value: 'sender', label: 'API-call sender' }]
const activeView = ref('console')
const windowOptions = [{ label: 'Last hour', value: 3600 }, { label: 'Last 24 hours', value: 86400 }, { label: 'Last 7 days', value: 604800 }]
const windowSeconds = ref(86400)
const groupBy = ref('model')
const autoRefresh = ref(true)
const loadingConsole = useWorkspaceState('admin:diagnostics:loadingConsole', () => (false))
const consoleError = useWorkspaceState('admin:diagnostics:consoleError', () => (''))
const lastUpdated = useWorkspaceState('admin:diagnostics:lastUpdated', () => (''))
const overview = useWorkspaceState('admin:diagnostics:overview', () => (null))
const realtime = useWorkspaceState('admin:diagnostics:realtime', () => (null))
const providerHealth = useWorkspaceState('admin:diagnostics:providerHealth', () => (null))
const credentialHealth = useWorkspaceState('admin:diagnostics:credentialHealth', () => (null))
const logs = useWorkspaceState('admin:diagnostics:logs', () => (null))
const logSearch = ref('')
const appliedLogSearch = ref('')
const logPage = ref(1)
const logPageSize = 20
const downloadingId = useWorkspaceState('admin:diagnostics:downloadingId', () => (''))
let refreshTimer
const number = value => value == null ? '—' : Number(value).toLocaleString()
const decimal = value => value == null ? '—' : Number(value).toFixed(1)
const percent = value => value == null ? '—' : `${(Number(value) * 100).toFixed(1)}%`
const milliseconds = value => value == null ? '—' : `${number(Math.round(value))} ms`
const formatTime = value => value ? new Date(value).toLocaleString() : '—'
const healthColor = status => status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : status === 'empty' || status === 'unknown' ? 'neutral' : 'error'
const latestVelocity = computed(() => realtime.value?.velocity?.at(-1))
const recentActivity = computed(() => (overview.value?.activity || []).filter(point => point.request_count > 0).slice(-10).reverse())
const activityBars = computed(() => {
  const points = (overview.value?.activity || []).slice(-60)
  const max = Math.max(1, ...points.map(point => Number(point.request_count) || 0))
  return points.map(point => {
    const count = Number(point.request_count) || 0
    const errors = Number(point.error_rate) || 0
    return {
      key: point.bucket_start,
      height: count ? Math.max(8, Math.round((count / max) * 100)) : 4,
      tone: !count ? 'idle' : errors > 0.2 ? 'bad' : errors > 0.05 ? 'warn' : 'good',
      title: `${formatTime(point.bucket_start)} · ${number(count)} requests · ${percent(errors)} errors`
    }
  })
})
const overallHealth = computed(() => {
  const rate = Number(overview.value?.totals?.error_rate) || 0
  if (!overview.value) return { label: 'Waiting for data', tone: 'idle' }
  if (!Number(overview.value?.totals?.request_count)) return { label: 'No traffic in this window', tone: 'idle' }
  if (rate > 0.2) return { label: 'Error rate is high', tone: 'bad' }
  if (rate > 0.05) return { label: 'Some requests are failing', tone: 'warn' }
  return { label: 'Traffic is healthy', tone: 'good' }
})
const healthSections = computed(() => [
  { label: 'Provider', items: providerHealth.value?.items || [] },
  { label: 'Credential', items: credentialHealth.value?.items || [] }
])
const logItems = computed(() => logs.value?.items || [])
const logPages = computed(() => Math.max(1, Math.ceil((logs.value?.total || 0) / logPageSize)))
const summaryMetrics = computed(() => {
  const totals = overview.value?.totals
  return [
    { label: 'Requests', value: number(totals?.request_count), detail: `${number(totals?.failed_count)} failed · ${percent(totals?.error_rate)} error rate`, icon: 'i-tabler-arrows-exchange', tone: 'violet', warning: Number(totals?.error_rate) > 0.05, ratio: totals?.request_count ? 1 - (Number(totals?.error_rate) || 0) : null },
    { label: 'P95 latency', value: milliseconds(totals?.p95_latency_ms), detail: 'Slowest 5% of requests', icon: 'i-tabler-clock-bolt', tone: 'blue' },
    { label: 'Tokens', value: number(totals?.total_tokens), detail: totals?.total_amount == null ? 'No billed amount' : `${decimal(totals.total_amount)} ${totals.currency || 'credits'} billed`, icon: 'i-tabler-database', tone: 'emerald' },
    { label: 'Active credentials', value: number(totals?.active_credential_count), detail: `${number(totals?.active_model_count)} active models`, icon: 'i-tabler-id-badge-2', tone: 'amber' }
  ]
})
const velocityItems = computed(() => [
  { label: 'Requests/min', value: decimal(latestVelocity.value?.rpm) },
  { label: 'Tokens/min', value: number(latestVelocity.value?.tpm) },
  { label: 'Error rate', value: percent(latestVelocity.value?.error_rate) }
])
function shareOf(value, items) {
  const max = Math.max(1, ...(items || []).map(item => Number(item?.request_count) || 0))
  return Math.max(2, Math.round(((Number(value) || 0) / max) * 100))
}
function healthDot(status) {
  return status === 'healthy' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : status === 'empty' || status === 'unknown' ? 'bg-zinc-400' : 'bg-rose-500'
}
function healthCounts(items) {
  const counts = new Map()
  for (const item of items) counts.set(item.status || 'unknown', (counts.get(item.status || 'unknown') || 0) + 1)
  return [...counts].map(([status, total]) => ({ status, total }))
}
function consoleQueries() {
  const to = new Date()
  const from = new Date(to.getTime() - Number(windowSeconds.value) * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}
async function refreshConsole() {
  if (loadingConsole.value || activeView.value !== 'console') return
  loadingConsole.value = true
  consoleError.value = ''
  const range = consoleQueries()
  const requests = [
    ['Overview', () => fetchAPI('/usage/overview', { query: range }), overview],
    ['Realtime', () => fetchAPI('/usage/realtime', { query: { window_seconds: 900, bucket_seconds: 60, group_by: groupBy.value } }), realtime],
    ['Provider health', () => fetchAPI('/usage/health/providers', { query: range }), providerHealth],
    ['Credential health', () => fetchAPI('/usage/health/credentials', { query: range }), credentialHealth],
    ['Request logs', () => fetchAPI('/request-logs', { query: { ...range, search: appliedLogSearch.value, limit: logPageSize, offset: (logPage.value - 1) * logPageSize } }), logs]
  ]
  const results = await Promise.allSettled(requests.map(([, load]) => load()))
  const failures = []
  results.forEach((result, index) => {
    const [label, , target] = requests[index]
    if (result.status === 'fulfilled') target.value = result.value
    else { target.value = null; failures.push(`${label}: ${message(result.reason, 'Load failed')}`) }
  })
  consoleError.value = failures.join(' · ')
  lastUpdated.value = new Date().toISOString()
  loadingConsole.value = false
}
function applyLogSearch() { logPage.value = 1; appliedLogSearch.value = logSearch.value.trim(); refreshConsole() }
function changeLogPage(delta) { logPage.value += delta; refreshConsole() }
async function downloadLog(item) {
  if (!item.download_url) return
  downloadingId.value = item.id
  try {
    const blob = await fetchAPI(item.download_url, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${item.request_id || 'request'}.log`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) { consoleError.value = message(error, 'Could not download request log.') }
  finally { downloadingId.value = '' }
}
watch(activeView, view => { if (view === 'sender') loadCredentials(); else refreshConsole() })
useDataSync('admin:diagnostics:sync', refreshConsole)
onMounted(() => { refreshConsole(); refreshTimer = setInterval(() => { if (autoRefresh.value) refreshConsole() }, 30000) })
onUnmounted(() => clearInterval(refreshTimer))
const sending = useWorkspaceState('admin:diagnostics:sending', () => (false))
const errorMessage = useWorkspaceState('admin:diagnostics:errorMessage', () => (''))
const authResponse = useWorkspaceState('admin:diagnostics:authResponse', () => (null))
const result = useWorkspaceState('admin:diagnostics:result', () => (null))
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const form = reactive({ method: 'GET', url: '', auth_index: '', headers: '{\n  "Accept": "application/json"\n}', data: '' })
const credentials = computed(() => Array.isArray(authResponse.value) ? authResponse.value : Array.isArray(authResponse.value?.credentials) ? authResponse.value.credentials : Array.isArray(authResponse.value?.files) ? authResponse.value.files : [])
const noCredentialValue = '__no_credential__'
const credentialOptions = computed(() => [
  { label: 'No credential', value: noCredentialValue },
  ...credentials.value.map(item => ({ value: item.auth_index || item.id, label: `${item.label || item.name || item.id} · ${item.provider || item.type || 'credential'}` }))
])
const formattedHeaders = computed(() => JSON.stringify(result.value?.header || {}, null, 2))
const formattedBody = computed(() => {
  const body = result.value?.body || ''
  try { return JSON.stringify(JSON.parse(body), null, 2) } catch { return body }
})
const message = (error, fallback) => error?.data?.message || error?.data?.error || error?.message || fallback
function statusColor(status) { if (status >= 200 && status < 300) return 'success'; if (status >= 400) return 'error'; return 'warning' }
async function loadCredentials() {
  try { authResponse.value = await fetchAPI('/credentials') }
  catch { authResponse.value = { files: [] } }
}
async function sendRequest() {
  errorMessage.value = ''; result.value = null
  if (!form.url.trim()) { errorMessage.value = 'An absolute URL is required.'; return }
  let headers
  try {
    headers = JSON.parse(form.headers || '{}')
    if (!headers || Array.isArray(headers) || typeof headers !== 'object' || Object.values(headers).some(value => typeof value !== 'string')) throw new Error()
  } catch { errorMessage.value = 'Headers must be a JSON object with string values.'; return }
  sending.value = true
  try {
    result.value = await fetchAPI('/requests/api-call', { method: 'POST', body: { auth_index: form.auth_index || undefined, method: form.method, url: form.url.trim(), header: headers, data: form.data } })
  } catch (error) { errorMessage.value = message(error, 'The diagnostic request failed.') }
  finally { sending.value = false }
}
async function copyBody() {
  await navigator.clipboard.writeText(result.value?.body || '')
  toast.add({ title: 'Response body copied', color: 'success' })
}
</script>

<style scoped>
/* Diagnostics signature: health beacon, inline figures and a per-bucket uptime timeline. */
.pulse {
  padding: 1rem 1.125rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    linear-gradient(180deg, color-mix(in oklch, var(--page-accent) 6%, transparent), transparent 60%),
    var(--admin-panel-bg);
  box-shadow: var(--admin-panel-shadow);
}
.pulse__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem 2rem; }
.pulse__beacon { position: relative; width: 0.75rem; height: 0.75rem; flex-shrink: 0; border-radius: 9999px; background: var(--color-zinc-400); }
.pulse__beacon::after { position: absolute; inset: -0.3125rem; border-radius: inherit; background: inherit; opacity: 0.25; content: ''; animation: pulse-ring 1.8s ease-out infinite; }
.pulse__beacon--good { background: var(--color-emerald-500); }
.pulse__beacon--warn { background: var(--color-amber-500); }
.pulse__beacon--bad { background: var(--color-rose-500); }
.pulse__beacon--idle::after { animation: none; }
@keyframes pulse-ring { from { transform: scale(0.6); opacity: 0.45; } to { transform: scale(1.6); opacity: 0; } }
.pulse__timeline { display: flex; height: 3.5rem; align-items: flex-end; gap: 3px; margin-top: 1rem; }
.pulse__bar { min-width: 3px; flex: 1; border-radius: 3px 3px 1px 1px; background: var(--color-emerald-500); opacity: 0.85; transition: opacity 120ms ease; }
.pulse__bar:hover { opacity: 1; }
.pulse__bar--warn { background: var(--color-amber-500); }
.pulse__bar--bad { background: var(--color-rose-500); }
.pulse__bar--idle { background: var(--ui-bg-accented); }
.velocity-tile {
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, color-mix(in oklch, var(--page-accent) 9%, transparent), transparent 70%), var(--ui-bg-muted);
}
.velocity-panel {
  padding: 0.875rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.75rem;
}
.pulse__empty { margin-top: 1rem; padding: 1rem; border-radius: 0.75rem; background: var(--ui-bg-muted); text-align: center; font-size: 0.75rem; color: var(--ui-text-muted); }
@media (prefers-reduced-motion: reduce) { .pulse__beacon::after { animation: none; } .pulse__bar { transition: none; } }
</style>
