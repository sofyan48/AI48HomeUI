<template>
  <AppCard>
    <template #header><div><h2 class="font-semibold">{{ t('usage.session.title') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('usage.session.desc') }}</p></div></template>
    <UAlert v-if="capabilityError" class="mb-3" color="warning" variant="subtle" :title="t('usage.capsUnavailable')" :description="t('usage.session.capsDesc')" />
    <UAlert v-if="!available" color="warning" variant="subtle" :title="t('usage.session.unavailable')" :description="t('usage.session.unsupported')" />
    <template v-else>
      <form class="flex flex-wrap gap-2" @submit.prevent="loadTree"><UInput v-model="sessionID" :aria-label="t('usage.session.placeholder')" :placeholder="t('usage.session.placeholder')" class="min-w-0 flex-1 sm:min-w-64" /><AppButton type="submit" :loading="loadingTree" :disabled="loadingTree || !sessionID.trim()">{{ t('usage.session.find') }}</AppButton></form>
      <UAlert v-if="treeError" class="mt-3" color="error" variant="subtle" :description="treeError" />
      <div v-if="tree" class="mt-4 space-y-3">
        <p class="break-all text-sm">{{ t('usage.session.summary', { root: tree.root_session_id, sessions: tree.total_sessions, requests: tree.total_requests, tokens: tree.total_tokens.toLocaleString(intlLocale) }) }}</p>
        <UAlert v-if="tree.truncated" color="warning" variant="subtle" :description="t('usage.session.truncated')" />
        <p v-if="!sessionNodes.length" class="text-sm text-[var(--ui-text-muted)]">{{ t('usage.session.none') }}</p>
        <div class="max-h-96 space-y-2 overflow-auto">
          <details v-for="entry in sessionNodes" :key="entry.node.session_id" class="rounded-lg border border-[var(--ui-border)] p-3" :style="{ marginLeft: `${Math.min(entry.depth, 6) * 12}px` }">
            <summary class="cursor-pointer break-all text-sm">
              <span class="font-mono">{{ entry.node.session_id }}</span>
              <UBadge v-if="entry.node.is_compaction || entry.node.node_kind === 'compaction'" color="warning" variant="subtle" class="ml-2">{{ t('usage.session.compaction') }}</UBadge>
              <UBadge v-if="entry.node.is_fork || entry.node.node_kind === 'fork'" color="info" variant="subtle" class="ml-2">{{ t('usage.session.fork') }}</UBadge>
              <span v-if="entry.node.node_kind" class="ml-2 text-xs text-[var(--ui-text-muted)]">{{ entry.node.node_kind }}</span>
              <span class="ml-2 text-xs">{{ t('usage.session.nodeSummary', { requests: entry.node.request_count, tokens: entry.node.total_tokens.toLocaleString(intlLocale) }) }}</span>
            </summary>
            <p v-if="entry.node.parent_session_id" class="mt-2 break-all text-xs text-[var(--ui-text-muted)]">{{ t('usage.session.parent', { id: entry.node.parent_session_id }) }}</p>
            <pre class="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs">{{ JSON.stringify(entry.node.timeline || [], null, 2) }}</pre>
          </details>
        </div>
      </div>
    </template>
  </AppCard>
</template>

<script setup lang="ts">
import { useWorkspaceState } from '~/composables/useWorkspaceState'

interface SessionNode {
  session_id: string
  parent_session_id?: string
  node_kind?: string
  is_fork?: boolean
  is_compaction?: boolean
  request_count: number
  total_tokens: number
  children?: SessionNode[]
  timeline?: unknown[]
}
interface SessionTree {
  root_session_id: string
  total_sessions: number
  total_requests: number
  total_tokens: number
  truncated?: boolean
  tree?: SessionNode[]
}

const { t, intlLocale } = useAdminI18n()
const { fetchAPI, token } = useApi()
const { supports, error: capabilityError, refreshCapabilities } = useCapabilities()
const unavailable = ref(false)
const available = computed(() => supports('usage_session_tree') && !unavailable.value)
const sessionID = ref('')
const loadingTree = useWorkspaceState('admin:request-records:session-tree:loading', () => false)
const treeError = useWorkspaceState('admin:request-records:session-tree:error', () => '')
const tree = useWorkspaceState<SessionTree | null>('admin:request-records:session-tree:data', () => null)
let controller = new AbortController()
let requestVersion = 0
const sessionNodes = computed(() => {
  const entries: Array<{ node: SessionNode, depth: number }> = []
  const visit = (nodes: SessionNode[], depth: number) => {
    for (const node of nodes) { entries.push({ node, depth }); visit(node.children || [], depth + 1) }
  }
  visit(tree.value?.tree || [], 0)
  return entries
})

async function loadTree() {
  if (loadingTree.value || !available.value || !sessionID.value.trim()) return
  const version = ++requestVersion
  loadingTree.value = true
  treeError.value = ''
  tree.value = null
  try {
    const result = await fetchAPI<SessionTree>('/usage/session-tree', { query: { id: sessionID.value.trim() }, signal: controller.signal })
    if (version === requestVersion) tree.value = result
  } catch (cause: any) {
    if (version !== requestVersion) return
    if ([404, 405, 501].includes(cause?.statusCode)) unavailable.value = true
    else treeError.value = cause?.message || t('usage.session.loadFailed')
  } finally { if (version === requestVersion) loadingTree.value = false }
}
watch(token, () => {
  requestVersion++
  controller.abort()
  controller = new AbortController()
  unavailable.value = false
  sessionID.value = ''
  tree.value = null
  treeError.value = ''
  loadingTree.value = false
})
onMounted(() => { void refreshCapabilities().catch(() => {}) })
onScopeDispose(() => { requestVersion++; controller.abort() })
</script>
