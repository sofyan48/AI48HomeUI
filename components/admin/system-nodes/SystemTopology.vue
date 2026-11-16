<template>
  <section class="grid w-full gap-4">
    <AppCard v-if="loading && !loaded" class="min-h-36">
      <div class="flex min-h-28 items-center justify-center text-[var(--ui-text-muted)]">
        <AppIcon name="i-tabler-loader-2" class="mr-2 size-5 animate-spin" /> {{ t('system.loading') }}
      </div>
    </AppCard>

    <AppCard v-else-if="fatalError" class="mx-auto w-full max-w-5xl">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="flex min-w-0 gap-4">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-600">
            <AppIcon name="i-tabler-alert-triangle" class="size-5" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">{{ t('system.fatalTitle') }}</h2>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--ui-text-muted)]">{{ fatalError }}</p>
          </div>
        </div>
        <AppButton color="neutral" variant="outline" icon="i-tabler-refresh" @click="refreshSystem">{{ t('common.retry') }}</AppButton>
      </div>
    </AppCard>

    <template v-else>
      <section class="console" :class="`console--${verdictLevel}`" :aria-label="t('system.verdictAria')">
        <div class="console__main">
          <div class="flex flex-wrap items-center gap-2">
            <span class="console__led" aria-hidden="true" />
            <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">{{ t('system.runtimeTag', { runtime: runtimeLabel }) }}</span>
            <PortalBadge :color="verdictColor" variant="subtle" size="sm">{{ verdict.badge }}</PortalBadge>
          </div>
          <h2 class="console__title">{{ verdict.title }}</h2>
          <p class="max-w-3xl text-sm leading-6 text-zinc-400">{{ verdict.description }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span v-for="fact in verdictFacts" :key="fact.label" class="console__fact" :class="fact.tone === 'success' ? 'console__fact--ok' : 'console__fact--warn'"><AppIcon :name="fact.tone === 'success' ? 'i-tabler-circle-check' : 'i-tabler-alert-circle'" class="size-3.5" />{{ fact.label }}</span>
          </div>
        </div>
        <div class="console__side">
          <dl class="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div class="console__kv"><dt>{{ t('system.capabilities') }}</dt><dd>{{ formatDate(probedAt) }}</dd></div>
            <div class="console__kv"><dt>{{ t('system.lastSync') }}</dt><dd>{{ formatDate(fetchedAt) }}</dd></div>
          </dl>
          <div class="flex flex-wrap gap-2">
            <AppSyncButton :loading="loading" @click="refreshSystem" />
            <AppButton color="neutral" variant="outline" icon="i-tabler-square-terminal" @click="openDiagnostics">{{ t('system.diagnostics') }}</AppButton>
          </div>
        </div>
      </section>

      <PortalAlert v-if="issues.length" color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('system.issuesTitle')">
        <template #description>
          <div class="mt-2 grid gap-1">
            <p v-for="issue in issues" :key="`${issue.scope}:${issue.message}`"><strong>{{ scopeLabel(issue.scope) }}</strong> · {{ issue.message || t('system.requestFailed') }}</p>
          </div>
        </template>
      </PortalAlert>

      <AdminStatGrid :label="t('system.summaryAria')" :items="summaryStats" :columns="6" />

      <AppCard :ui="{ body: 'p-4' }">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base font-semibold">{{ t('system.topology.title') }}</h2>
              <PortalBadge :color="nodesSupported ? 'info' : 'warning'" variant="subtle">{{ topologySourceLabel }}</PortalBadge>
            </div>
            <p class="mt-1 text-xs leading-5 text-[var(--ui-text-muted)]">{{ topologyDescription }}</p>
          </div>
          <AppButton icon="i-tabler-plus" class="lg:shrink-0" @click="openEnrollment">{{ t('system.topology.addNode') }}</AppButton>
        </div>

        <div class="mt-4">
          <div v-if="!nodesSupported" class="rounded-md border border-dashed p-8 text-center text-sm text-[var(--ui-text-muted)]">{{ t('system.topology.noRoute', { runtime: runtimeLabel }) }}</div>
          <div v-else-if="!homeGroups.length" class="rounded-md border border-dashed p-8 text-center text-sm text-[var(--ui-text-muted)]">{{ t('system.topology.noRecords') }}</div>
          <div v-else class="grid gap-3">
            <div class="flex flex-wrap gap-2">
              <PortalBadge color="info" variant="subtle">{{ homeGroups.length }} Home</PortalBadge>
              <PortalBadge color="neutral" variant="subtle">{{ nodes.length }} CPA</PortalBadge>
            </div>

            <section v-for="group in homeGroups" :key="group.id" class="overflow-hidden rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)]/20">
              <div class="px-3 py-3">
                <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('system.topology.homeAddress') }}</p>
                    <p class="mt-1 truncate font-mono text-sm">{{ group.unknown ? t('system.topology.unknownHome') : group.label }}</p>
                  </div>
                  <div class="flex flex-wrap gap-2 lg:justify-end">
                    <PortalBadge v-if="group.unknown" color="warning" variant="subtle">{{ t('system.topology.partialData') }}</PortalBadge>
                    <PortalBadge :color="roleColor(group.role)" variant="subtle">{{ roleLabel(group.role) }}</PortalBadge>
                    <PortalBadge :color="healthColor(group.health)" variant="subtle">{{ healthLabel(group.health) }}</PortalBadge>
                    <PortalBadge :color="group.cpaCount > 0 && group.healthyCpaCount === group.cpaCount ? 'success' : 'warning'" variant="subtle">{{ t('system.topology.healthyCount', { healthy: group.healthyCpaCount, total: group.cpaCount }) }}</PortalBadge>
                  </div>
                </div>
                <div class="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                  <InfoField :label="t('system.topology.homeRole')" :value="roleLabel(group.role)" />
                  <InfoField :label="t('system.topology.cpaCount')" :value="String(group.cpaCount)" />
                  <InfoField :label="t('system.topology.clients')" :value="String(group.clientCount)" />
                  <InfoField :label="t('system.topology.connectedSince')" :value="formatDate(group.startedAt)" />
                  <InfoField :label="t('system.topology.lastSeen')" :value="formatDate(group.lastSeenAt)" />
                </div>
                <p v-if="group.unknown" class="mt-3 text-xs leading-5 text-[var(--ui-text-muted)]">{{ t('system.topology.unmatched') }}</p>
              </div>

              <div class="bg-[var(--ui-bg-muted)]/30">
                <div v-if="!group.nodes.length" class="border-t border-[var(--ui-border)] px-3 py-6 text-center text-sm text-[var(--ui-text-muted)]">{{ t('system.topology.noCpa') }}</div>
                <div v-for="node in group.nodes" :key="nodeKey(node)" class="grid gap-3 border-t border-[var(--ui-border)] px-3 py-3 lg:grid-cols-[minmax(120px,0.65fr)_minmax(0,2.6fr)_auto] lg:items-start">
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ node.node_name ? t('system.topology.nodeName') : t('system.topology.nodeIp') }}</p>
                    <div class="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                      <p class="truncate text-sm" :class="node.node_name ? 'font-medium' : 'font-mono'">{{ node.node_name || node.ip || t('system.topology.unknownNode') }}</p>
                      <AppButton v-if="node.node_id" color="neutral" variant="ghost" size="xs" icon="i-tabler-pencil" :aria-label="t('system.topology.renameAria', { name: node.node_name || node.ip || t('system.topology.node') })" @click="openRename(node)" />
                      <PortalBadge :color="healthColor(nodeHealth(node))" variant="subtle">{{ healthLabel(nodeHealth(node)) }}</PortalBadge>
                    </div>
                    <p v-if="node.node_name" class="mt-1 truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ node.ip || t('system.na') }}</p>
                  </div>
                  <div class="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(72px,0.45fr)]">
                    <InfoField :label="t('system.topology.nodeId')" :value="node.node_id || t('system.na')" />
                    <InfoField :label="t('system.topology.connectedTime')" :value="formatDate(node.connected_time)" />
                    <InfoField :label="t('system.topology.lastSeen')" :value="formatDate(node.last_seen_at)" />
                    <InfoField :label="t('system.topology.clients')" :value="String(node.client_count ?? 0)" />
                  </div>
                  <div class="flex items-center lg:justify-self-end">
                    <PortalBadge :color="pluginReportColor(node.plugin_report_state)" variant="subtle">{{ pluginReportLabel(node.plugin_report_state) }}</PortalBadge>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </AppCard>

      <AppCard :ui="{ body: 'p-4' }">
        <h2 class="text-base font-semibold">{{ t('system.signals.title') }}</h2>
        <p class="mt-1 text-xs leading-5 text-[var(--ui-text-muted)]">{{ t('system.signals.description') }}</p>
        <div v-if="configSnapshot" class="mt-3 grid gap-3 lg:grid-cols-2">
          <ConfigSignals :title="t('system.signals.diagnosticLogs')" :items="diagnosticSignals" />
          <ConfigSignals :title="t('system.signals.routingRuntime')" :items="runtimeSignals" />
        </div>
        <div v-else class="mt-3 rounded-md border border-dashed p-8 text-center text-sm text-[var(--ui-text-muted)]">{{ t('system.signals.empty') }}</div>
      </AppCard>

      <section class="credits" aria-labelledby="system-credits-title">
        <div class="flex min-w-0 items-start gap-3">
          <AppBrandMark size="sm" />
          <div class="min-w-0">
            <h2 id="system-credits-title" class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('system.credits.title') }}</h2>
            <p class="mt-0.5 text-xs leading-5 text-[var(--ui-text-muted)]">
              {{ t('system.credits.builtUpon') }}
              <a href="https://github.com/router-for-me/CLIProxyAPIHome" target="_blank" rel="noopener noreferrer" class="credits__link">router-for-me/CLIProxyAPIHome</a>.
              {{ t('system.credits.thanks') }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--ui-bg-muted)] px-2.5 py-1 font-mono text-[11px] text-[var(--ui-text-muted)]"><AppIcon name="i-tabler-tag" class="size-3.5" aria-hidden="true" />{{ currentVersion }}</span>
          <AppButton to="https://github.com/router-for-me/CLIProxyAPIHome" target="_blank" rel="noopener noreferrer" size="sm" color="neutral" variant="outline" icon="i-tabler-brand-github" trailing-icon="i-tabler-external-link">{{ t('system.credits.original') }}</AppButton>
        </div>
      </section>

      <AppModal v-model:open="diagnosticsOpen" :title="t('system.diag.title')" :description="t('system.diag.description')" :ui="{ content: 'sm:max-w-xl' }">
        <template #body>
          <div class="space-y-4">
            <PortalAlert color="warning" variant="subtle" icon="i-tabler-shield-exclamation" :title="t('system.diag.warningTitle')" :description="t('system.diag.warningDesc')" />
            <form class="space-y-4" @submit.prevent="runDiagnostic">
              <div class="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                <AdminField :label="t('system.diag.method')"><AdminSelect v-model="diagnostic.method" :items="methods" class="w-full" /></AdminField>
                <AdminField :label="t('system.diag.targetUrl')" required><AdminInput v-model="diagnostic.url" placeholder="https://api.example.com/v1/ping" class="w-full" /></AdminField>
              </div>
              <AdminField :label="t('system.diag.credentialIndex')"><AdminInput v-model="diagnostic.authIndex" :placeholder="t('system.diag.credentialIndexPlaceholder')" class="w-full" /></AdminField>
              <AdminField :label="t('system.diag.headers')"><AdminTextarea v-model="diagnostic.headers" :rows="6" class="w-full font-mono text-xs" /></AdminField>
              <AdminField :label="t('system.diag.body')"><AdminTextarea v-model="diagnostic.data" :rows="6" :placeholder="t('system.diag.bodyPlaceholder')" class="w-full font-mono text-xs" /></AdminField>
              <PortalAlert v-if="diagnosticError" color="error" variant="subtle" :description="diagnosticError" />
              <AppButton type="submit" icon="i-tabler-player-play" :loading="diagnosticLoading">{{ t('system.diag.send') }}</AppButton>
            </form>
            <div v-if="diagnosticResult" class="rounded-md border border-[var(--ui-border)] p-3">
              <p class="text-sm font-medium">{{ t('system.diag.responseStatus', { status: diagnosticResult.status_code ?? t('system.na') }) }}</p>
              <pre class="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--ui-bg-muted)] p-3 text-xs">{{ diagnosticOutput }}</pre>
            </div>
          </div>
        </template>
      </AppModal>

      <AppModal v-model:open="enrollmentOpen" :title="t('system.enroll.title')" :description="enrollment ? t('system.enroll.descResult') : t('system.enroll.descForm')">
        <template #body>
          <div v-if="enrollment" class="space-y-4">
            <div v-if="enrollment.id"><p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('system.enroll.clientId') }}</p><p class="mt-2 break-all font-mono text-sm">{{ enrollment.id }}</p></div>
            <div v-if="enrollment.node_name"><p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('system.enroll.nodeName') }}</p><p class="mt-2 text-sm">{{ enrollment.node_name }}</p></div>
            <div><p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('system.enroll.credential') }}</p><pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-3 font-mono text-xs leading-5">{{ enrollment.home_jwt }}</pre></div>
            <div class="flex justify-end"><AppButton icon="i-tabler-copy" @click="copyJWT">{{ t('system.enroll.copy') }}</AppButton></div>
          </div>
          <form v-else class="space-y-4" @submit.prevent="generateEnrollment">
            <AdminField :label="t('system.enroll.nodeName')" :hint="t('system.enroll.nodeNameHint')">
              <AdminInput v-model="nodeName" maxlength="128" :placeholder="t('system.enroll.nodeNamePlaceholder')" class="w-full" />
            </AdminField>
            <PortalAlert v-if="enrollmentError" color="error" variant="subtle" :description="enrollmentError" />
            <div class="flex justify-end"><AppButton type="submit" :loading="generating">{{ t('system.enroll.generate') }}</AppButton></div>
          </form>
        </template>
      </AppModal>

      <AppModal v-model:open="renameOpen" :title="t('system.rename.title')" :description="t('system.rename.description')">
        <template #body>
          <form class="space-y-4" @submit.prevent="saveRename">
            <AdminField :label="t('system.enroll.nodeName')" :hint="t('system.rename.hint')">
              <AdminInput v-model="renameValue" maxlength="128" :placeholder="t('system.enroll.nodeNamePlaceholder')" class="w-full" />
            </AdminField>
            <PortalAlert v-if="renameError" color="error" variant="subtle" :description="renameError" />
            <div class="flex justify-end gap-2">
              <AppButton type="button" color="neutral" variant="outline" :disabled="renaming" @click="closeRename">{{ t('common.cancel') }}</AppButton>
              <AppButton type="submit" :loading="renaming">{{ t('system.rename.save') }}</AppButton>
            </div>
          </form>
        </template>
      </AppModal>
    </template>
  </section>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AppIcon from '~/components/AppIcon.vue'
import AppModal from '~/components/AppModal.vue'
import AdminStatGrid from '~/components/admin/general/StatGrid.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'; import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { normalizeTopologyConfig } from '~/composables/systemTopologyConfig'
const InfoField = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  template: '<div class="min-w-0"><p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ label }}</p><p class="mt-1 truncate font-mono text-xs" :title="value">{{ value }}</p></div>'
})

const ConfigSignals = defineComponent({
  props: { title: { type: String, required: true }, items: { type: Array as PropType<Array<{ label: string, value: string, tone: string }>>, required: true } },
  template: '<section class="rounded-md bg-[var(--ui-bg-muted)]/40 p-3"><h3 class="text-sm font-semibold">{{ title }}</h3><div class="mt-2 flex flex-wrap gap-2"><div v-for="item in items" :key="item.label" class="inline-flex max-w-full items-center gap-2 rounded-md bg-[var(--ui-bg)] px-2.5 py-2"><span class="truncate text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</span><span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="item.tone === \'success\' ? \'bg-emerald-500/10 text-emerald-600\' : item.tone === \'warning\' ? \'bg-amber-500/10 text-amber-600\' : \'bg-[var(--ui-bg-muted)] text-[var(--ui-text-muted)]\'">{{ item.value }}</span></div></div></section>'
})

const { fetchAPI, apiBase } = useApi()
const { capabilities, serverInfo, supports, refreshCapabilities } = useCapabilities()
const toast = useAdminToast()
const { t, intlLocale } = useAdminI18n()

const topology = useWorkspaceState<any>('admin:system-topology:topology', () => (null))
const nodesResponse = useWorkspaceState<any>('admin:system-topology:nodesResponse', () => (null))
const configSnapshot = useWorkspaceState<any>('admin:system-topology:configSnapshot', () => (null))
const latestVersion = useWorkspaceState('admin:system-topology:latestVersion', () => (''))
const loading = useWorkspaceState('admin:system-topology:loading', () => (false))
const loaded = useWorkspaceState('admin:system-topology:loaded', () => (false))
const fatalError = useWorkspaceState('admin:system-topology:fatalError', () => (''))
const issues = useWorkspaceState<Array<{ scope: string, message: string }>>('admin:system-topology:issues', () => ([]))
const fetchedAt = useWorkspaceState<Date | null>('admin:system-topology:fetchedAt', () => (null))
const probedAt = useWorkspaceState<Date | null>('admin:system-topology:probedAt', () => (null))
const diagnosticsOpen = ref(false)
const diagnosticLoading = useWorkspaceState('admin:system-topology:diagnosticLoading', () => (false))
const diagnosticError = useWorkspaceState('admin:system-topology:diagnosticError', () => (''))
const diagnosticResult = useWorkspaceState<any>('admin:system-topology:diagnosticResult', () => (null))
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const diagnostic = reactive({ method: 'GET', url: '', authIndex: '', headers: '{}', data: '' })
const enrollmentOpen = ref(false)
const enrollment = useWorkspaceState<any>('admin:system-topology:enrollment', () => (null))
const nodeName = ref('')
const generating = useWorkspaceState('admin:system-topology:generating', () => (false))
const enrollmentError = useWorkspaceState('admin:system-topology:enrollmentError', () => (''))
const renameOpen = ref(false)
const renameTarget = ref<any>(null)
const renameValue = ref('')
const renaming = useWorkspaceState('admin:system-topology:renaming', () => (false))
const renameError = ref('')

const homes = computed<any[]>(() => Array.isArray(topology.value?.homes) ? topology.value.homes : [])
const nodes = computed<any[]>(() => Array.isArray(nodesResponse.value?.nodes) ? nodesResponse.value.nodes : Array.isArray(topology.value?.cpas) ? topology.value.cpas : [])
const nodesSupported = computed(() => supports('topology', false) || supports('nodes', false))
const topologySource = computed(() => topology.value ? 'topology' : nodesResponse.value ? 'nodes' : 'unsupported')
const topologySourceLabel = computed(() => topologySource.value === 'topology' ? t('system.topology.cluster') : topologySource.value === 'nodes' ? t('system.topology.partial') : t('system.topology.unavailable'))
const runtimeLabel = computed(() => supports('topology', false) ? t('system.runtime.homeCluster') : supports('nodes', false) || serverInfo.value.home_version ? t('system.runtime.homeRuntime') : 'CPA')
const currentVersion = computed(() => serverInfo.value.home_version || configSnapshot.value?.version || configSnapshot.value?.['version'] || 'Unknown')
const summary = computed(() => topology.value?.summary || {})
const inferredHomeCount = computed(() => new Set(nodes.value.map(node => homeKey(node)).filter(key => key !== 'unknown-home')).size)
const homeCount = computed(() => summary.value.home_count ?? homes.value.length ?? inferredHomeCount.value)
const healthyHomeCount = computed(() => summary.value.healthy_home_count ?? homes.value.filter(home => homeHealth(home) === 'healthy').length)
const cpaCount = computed(() => summary.value.cpa_count ?? nodes.value.length)
const healthyCpaCount = computed(() => summary.value.healthy_cpa_count ?? nodes.value.filter(node => nodeHealth(node) === 'healthy').length)
const attentionCount = computed(() => summary.value.attention_count ?? issues.value.length + nodes.value.filter(node => nodeHealth(node) !== 'healthy' || !['reported_ok', 'not_required'].includes(node.plugin_report_state)).length)
const currentVersionLabel = computed(() => currentVersion.value === 'Unknown' ? t('common.unknown') : currentVersion.value)
const masterHome = computed(() => topology.value?.master?.id || homes.value.find(home => home.is_master)?.id || t('system.na'))

const homeGroups = computed(() => {
  const groups = new Map<string, any>()
  for (const home of homes.value) {
    const id = home.id || endpoint(home.ip, home.port) || 'unknown-home'
    groups.set(id, { id, label: home.id || endpoint(home.ip, home.port) || 'unknown-home', home, nodes: [] })
  }
  for (const node of nodes.value) {
    const id = homeKey(node)
    if (!groups.has(id)) groups.set(id, { id, label: endpoint(node.home_ip, node.home_port) || 'unknown-home', home: null, nodes: [] })
    groups.get(id).nodes.push(node)
  }
  return Array.from(groups.values()).map(group => {
    const home = group.home
    const latestSeen = [home?.last_seen_at, ...group.nodes.map((node: any) => node.last_seen_at)].filter(Boolean).sort().at(-1)
    const startedAt = home?.started_at || group.nodes.map((node: any) => node.connected_time).filter(Boolean).sort().at(0)
    return {
      ...group,
      unknown: !home && group.id === 'unknown-home',
      role: home?.role || (home?.is_master ? 'master' : 'unknown'),
      health: homeHealth(home),
      cpaCount: home?.cpa_count ?? group.nodes.length,
      healthyCpaCount: home?.healthy_cpa_count ?? group.nodes.filter((node: any) => nodeHealth(node) === 'healthy').length,
      clientCount: home?.client_count ?? group.nodes.reduce((total: number, node: any) => total + (node.client_count || 0), 0),
      lastSeenAt: latestSeen,
      startedAt
    }
  }).sort((a, b) => a.label.localeCompare(b.label))
})

const verdictLevel = computed(() => {
  if (issues.value.length) return 'degraded'
  if (!nodesSupported.value) return 'limited'
  if (!configSnapshot.value && currentVersion.value === 'Unknown') return 'unavailable'
  return 'ready'
})
const verdict = computed(() => ({
  ready: { title: t('system.verdict.syncedTitle'), badge: t('system.verdict.readyBadge'), description: t('system.verdict.readyDesc') },
  limited: { title: t('system.verdict.syncedTitle'), badge: t('system.verdict.limitedBadge'), description: t('system.verdict.limitedDesc') },
  degraded: { title: t('system.verdict.degradedTitle'), badge: t('system.verdict.degradedBadge'), description: t('system.verdict.degradedDesc') },
  unavailable: { title: t('system.verdict.unavailableTitle'), badge: t('system.verdict.unavailableBadge'), description: t('system.verdict.unavailableDesc') }
}[verdictLevel.value]))
const verdictColor = computed<any>(() => verdictLevel.value === 'ready' ? 'success' : verdictLevel.value === 'limited' ? 'info' : verdictLevel.value === 'degraded' ? 'warning' : 'error')
const verdictIcon = computed(() => verdictLevel.value === 'ready' ? 'i-tabler-circle-check' : verdictLevel.value === 'limited' ? 'i-tabler-info-circle' : 'i-tabler-alert-triangle')
const verdictClasses = computed(() => ({ icon: toneClasses(verdictLevel.value === 'ready' ? 'success' : verdictLevel.value === 'limited' ? 'info' : 'warning') }))
const verdictFacts = computed(() => [
  { label: t('system.fact.version', { state: currentVersion.value === 'Unknown' ? t('system.na') : t('system.fact.available') }), tone: currentVersion.value === 'Unknown' ? 'warning' : 'success' },
  { label: nodesSupported.value ? homeCount.value > 0 ? t('system.fact.nodesWithHome', { cpa: nodes.value.length, home: homeCount.value }) : t('system.fact.nodes', { count: nodes.value.length }) : t('system.fact.nodeRouteUnavailable'), tone: nodesSupported.value ? nodes.value.length ? 'success' : 'neutral' : 'info' },
  { label: issues.value.length ? t('system.fact.loadIssues', { count: issues.value.length }) : t('system.fact.noLoadIssues'), tone: issues.value.length ? 'warning' : 'success' }
])
const summaryCards = computed(() => [
  { key: 'version', label: t('system.stat.version'), value: currentVersionLabel.value, detail: t('system.stat.latest', { version: latestVersion.value || t('common.unknown') }), tone: currentVersion.value === 'Unknown' ? 'warning' : 'success', icon: 'i-tabler-tag' },
  { key: 'endpoint', label: t('system.stat.endpoint'), value: apiBase, detail: t('system.stat.master', { id: masterHome.value }), tone: apiBase ? 'info' : 'warning', icon: 'i-tabler-link' },
  { key: 'home', label: 'Home', value: nodesSupported.value ? String(homeCount.value) : t('system.na'), detail: topology.value ? t('system.topology.healthyCount', { healthy: healthyHomeCount.value, total: homeCount.value }) : homeCount.value ? t('system.stat.inferred', { count: homeCount.value }) : t('system.stat.noHomeList'), tone: homeCount.value ? 'info' : 'warning', icon: 'i-tabler-building' },
  { key: 'cpa', label: 'CPA', value: String(cpaCount.value), detail: t('system.topology.healthyCount', { healthy: healthyCpaCount.value, total: cpaCount.value }), tone: cpaCount.value ? 'success' : 'neutral', icon: 'i-tabler-server-2' },
  { key: 'attention', label: t('system.stat.attention'), value: String(attentionCount.value), detail: attentionCount.value ? t('system.stat.needsReview') : t('system.stat.noAttention'), tone: attentionCount.value ? 'warning' : 'success', icon: 'i-tabler-alert-triangle' },
  { key: 'config', label: t('system.stat.config'), value: configSnapshot.value ? t('system.fact.available') : t('system.na'), detail: configSnapshot.value ? t('system.stat.summaryLoaded') : t('system.stat.summaryUnavailable'), tone: configSnapshot.value ? 'success' : 'warning', icon: 'i-tabler-adjustments' }
])
const statTones: Record<string, 'emerald' | 'blue' | 'amber' | 'rose' | 'neutral'> = { success: 'emerald', info: 'blue', warning: 'amber', danger: 'rose', neutral: 'neutral' }
const summaryStats = computed(() => summaryCards.value.map(stat => ({
  ...stat,
  tone: statTones[stat.tone] || 'neutral',
  warning: stat.tone === 'warning' && stat.key === 'attention'
})))
const topologyDescription = computed(() => nodesSupported.value ? topology.value ? t('system.topology.descCluster', { cpa: cpaCount.value, home: homeCount.value }) : nodes.value.length ? t('system.topology.descInferred', { cpa: nodes.value.length, home: inferredHomeCount.value }) : t('system.topology.descEmpty') : t('system.topology.descUnsupported'))
const configSummary = computed(() => normalizeTopologyConfig(configSnapshot.value))
const diagnosticSignals = computed(() => [signal(t('system.signals.requestLogs'), configSummary.value.requestLog), signal(t('system.signals.usageStatistics'), configSummary.value.usageStatistics), signal(t('system.signals.fileLogging'), configSummary.value.loggingToFile)])
const runtimeSignals = computed(() => [signal(t('system.signals.debugMode'), configSummary.value.debug, true), signal(t('system.signals.proxyEndpoint'), configSummary.value.proxyConfigured), { label: t('system.signals.routingStrategy'), value: configSummary.value.routingStrategy === 'unknown' ? t('common.unknown') : configSummary.value.routingStrategy, tone: configSummary.value.routingStrategy === 'unknown' ? 'warning' : 'neutral' }])
const diagnosticOutput = computed(() => diagnosticResult.value?.body || JSON.stringify(diagnosticResult.value?.header || diagnosticResult.value?.headers || {}, null, 2))

function toneClasses(tone: string) {
  if (tone === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (tone === 'info') return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (tone === 'danger') return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
  return 'border-[var(--ui-border)] bg-[var(--ui-bg-muted)] text-[var(--ui-text-muted)]'
}
function endpoint(ip?: string, port?: number) { return ip ? port ? `${ip}:${port}` : ip : '' }
function homeKey(node: any) { return node.home_id || endpoint(node.home_ip, node.home_port) || 'unknown-home' }
function nodeKey(node: any) { return node.node_id || `${node.ip || 'node'}:${node.connected_time || ''}` }
function nodeHealth(node: any) { return node.health || (node.healthy === true ? 'healthy' : node.healthy === false ? 'stale' : 'unknown') }
function homeHealth(home: any) { return home?.health || (home?.healthy === true ? 'healthy' : home?.healthy === false ? 'stale' : 'unknown') }
function healthLabel(value: string) { return value === 'healthy' ? t('system.health.healthy') : value === 'stale' ? t('system.health.stale') : t('common.unknown') }
function healthColor(value: string): any { return value === 'healthy' ? 'success' : value === 'stale' ? 'error' : 'warning' }
function roleLabel(value: string) { return value === 'master' ? t('system.role.master') : value === 'follower' ? t('system.role.follower') : t('system.role.unknown') }
function roleColor(value: string): any { return value === 'master' ? 'success' : value === 'follower' ? 'info' : 'warning' }
function pluginReportLabel(value?: string) { return ({ not_required: t('system.plugin.notRequired'), missing_report: t('system.plugin.missingReport'), reported_partial: t('system.plugin.partial'), reported_failed: t('system.plugin.failed'), reported_ok: t('system.plugin.ok') } as Record<string, string>)[value || ''] || t('system.plugin.unknown') }
function pluginReportColor(value?: string): any { return value === 'reported_ok' || value === 'not_required' ? 'success' : value === 'reported_failed' || value === 'missing_report' ? 'error' : 'warning' }
function formatDate(value?: string | Date | null) { if (!value) return t('system.na'); const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(intlLocale.value) }
function signal(label: string, value: unknown, warn = false) { return { label, value: value ? t('common.enabled') : t('common.disabled'), tone: value ? warn ? 'warning' : 'success' : 'neutral' } }
// Issue scopes are stored as stable English names and translated at render time.
function scopeLabel(scope: string) {
  return ({ 'Latest version': t('system.scope.latestVersion'), 'Config summary': t('system.scope.configSummary'), 'Node connections': t('system.scope.nodeConnections'), 'Cluster topology': t('system.scope.clusterTopology') } as Record<string, string>)[scope] || scope
}
function errorMessage(error: any, fallback: string) { return error?.data?.message || error?.data?.error || error?.message || fallback }

async function refreshSystem() {
  if (loading.value) return
  loading.value = true
  fatalError.value = ''
  issues.value = []
  try {
    await refreshCapabilities(true)
    probedAt.value = new Date()
    const requests: Array<{ scope: string, run: () => Promise<void> }> = [
      { scope: 'Latest version', run: async () => { const value: any = await fetchAPI('/server/latest-version'); latestVersion.value = String(value?.['latest-version'] || value?.latest_version || '') } },
      { scope: 'Config summary', run: async () => { configSnapshot.value = await fetchAPI('/config') } }
    ]
    if (supports('nodes', true)) requests.push({ scope: 'Node connections', run: async () => { nodesResponse.value = await fetchAPI('/nodes') } })
    if (supports('topology', false)) requests.push({ scope: 'Cluster topology', run: async () => { topology.value = await fetchAPI('/topology') } })
    const results = await Promise.allSettled(requests.map(item => item.run()))
    results.forEach((result, index) => {
      const request = requests[index]
      if (result.status === 'rejected' && request) issues.value.push({ scope: request.scope, message: errorMessage(result.reason, '') })
    })
    fetchedAt.value = new Date()
    loaded.value = true
    if (results.every(result => result.status === 'rejected')) fatalError.value = t('system.fatalFallback')
  } catch (error: any) {
    fatalError.value = errorMessage(error, t('system.fatalFallback'))
  } finally {
    loading.value = false
  }
}
function openDiagnostics() { diagnosticsOpen.value = true }
function closeRename() { renameOpen.value = false }
function openEnrollment() { enrollment.value = null; nodeName.value = ''; enrollmentError.value = ''; enrollmentOpen.value = true }
async function generateEnrollment() {
  generating.value = true; enrollmentError.value = ''
  try { enrollment.value = await fetchAPI('/certificates/clients', { method: 'POST', body: { node_name: nodeName.value.trim() } }); toast.add({ title: t('system.enroll.created'), color: 'success' }) }
  catch (error: any) { enrollmentError.value = errorMessage(error, t('system.enroll.failed')) }
  finally { generating.value = false }
}
async function copyJWT() { if (!enrollment.value?.home_jwt) return; await navigator.clipboard.writeText(enrollment.value.home_jwt); toast.add({ title: t('system.enroll.copied'), color: 'success' }) }
function openRename(node: any) { renameTarget.value = node; renameValue.value = node.node_name || ''; renameError.value = ''; renameOpen.value = true }
async function saveRename() {
  if (!renameTarget.value?.node_id) return
  renaming.value = true; renameError.value = ''
  try {
    const result: any = await fetchAPI(`/nodes/${encodeURIComponent(renameTarget.value.node_id)}`, { method: 'PATCH', body: { node_name: renameValue.value.trim() || null } })
    const name = result?.node_name ?? (renameValue.value.trim() || null)
    for (const node of nodes.value) if (node.node_id === renameTarget.value.node_id) node.node_name = name
    if (Array.isArray(topology.value?.cpas)) for (const node of topology.value.cpas) if (node.node_id === renameTarget.value.node_id) node.node_name = name
    renameOpen.value = false
    toast.add({ title: name ? t('system.rename.updated') : t('system.rename.cleared'), color: 'success' })
  } catch (error: any) { renameError.value = errorMessage(error, t('system.rename.failed')) }
  finally { renaming.value = false }
}
async function runDiagnostic() {
  diagnosticError.value = ''; diagnosticResult.value = null
  if (!diagnostic.url.trim()) { diagnosticError.value = t('system.diag.urlRequired'); return }
  let headers: Record<string, string>
  try { headers = JSON.parse(diagnostic.headers || '{}'); if (!headers || Array.isArray(headers) || typeof headers !== 'object') throw new Error() }
  catch { diagnosticError.value = t('system.diag.headersInvalid'); return }
  diagnosticLoading.value = true
  try {
    diagnosticResult.value = await fetchAPI('/requests/api-call', { method: 'POST', body: { auth_index: diagnostic.authIndex || undefined, method: diagnostic.method, url: diagnostic.url.trim(), header: headers, data: diagnostic.data } })
    toast.add({ title: t('system.diag.completed'), color: 'success' })
  } catch (error: any) { diagnosticError.value = errorMessage(error, t('system.diag.failed')) }
  finally { diagnosticLoading.value = false }
}

useDataSync('admin:system-topology:sync', refreshSystem)
onMounted(refreshSystem)
</script>

<style scoped>
/* Attribution card for the upstream project. */
.credits {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  padding: 0.875rem 1rem;
  border: 1px dashed var(--admin-panel-border);
  border-radius: 0.875rem;
  background: color-mix(in oklch, var(--admin-panel-bg) 70%, transparent);
}
.credits__link { font-weight: 500; color: var(--ui-primary); text-decoration: underline; text-underline-offset: 2px; text-decoration-color: color-mix(in oklch, var(--ui-primary) 40%, transparent); }
.credits__link:hover { text-decoration-color: currentColor; }
.credits__link:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; border-radius: 2px; }

/* System signature: dark console panel with status LED and mono key/values. */
.console {
  --led: var(--color-emerald-400);
  display: grid;
  gap: 1.25rem 2rem;
  padding: 1.25rem 1.375rem;
  border-radius: var(--admin-panel-radius);
  background:
    radial-gradient(ellipse 60% 120% at 100% 0%, color-mix(in oklch, var(--page-accent) 22%, transparent), transparent 70%),
    linear-gradient(rgb(255 255 255 / 3%) 1px, transparent 1px) 0 0 / 100% 1.5rem,
    oklch(0.19 0.02 270);
  color: var(--color-zinc-200);
  box-shadow: 0 20px 40px -24px rgb(0 0 0 / 50%);
}
.console--limited { --led: var(--color-blue-400); }
.console--degraded { --led: var(--color-amber-400); }
.console--blocked, .console--unavailable { --led: var(--color-rose-400); }
@media (min-width: 64rem) { .console { grid-template-columns: minmax(0, 1fr) auto; align-items: end; } }
.console__led { width: 0.625rem; height: 0.625rem; border-radius: 9999px; background: var(--led); box-shadow: 0 0 0 3px color-mix(in oklch, var(--led) 25%, transparent), 0 0 12px var(--led); }
.console__title { margin-block: 0.625rem 0.25rem; font-family: var(--admin-display-font); font-size: 1.375rem; line-height: 1.875rem; font-weight: 800; letter-spacing: -0.02em; color: white; }
.console__fact { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 500; }
.console__fact--ok { background: rgb(16 185 129 / 14%); color: var(--color-emerald-300); }
.console__fact--warn { background: rgb(245 158 11 / 14%); color: var(--color-amber-300); }
.console__side { display: grid; gap: 0.75rem; } .console__kv { padding: 0.375rem 0.625rem; border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.5rem; background: rgb(255 255 255 / 4%); }
.console__kv :is(dt, dd) { color: var(--color-zinc-500); }
</style>
