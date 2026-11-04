<template>
  <div class="space-y-4">
    <UAlert
      v-if="summaryError"
      color="warning"
      variant="subtle"
      title="Upstream summary unavailable"
      :description="summaryError"
    />
    <section aria-label="Upstream summary" :aria-busy="summaryPending" class="metric-strip">
      <dl class="metric">
        <dt>Accounts</dt>
        <dd class="metric-value">{{ summaryPending && !accounts.length ? "—" : accounts.length }}</dd>
        <dd class="metric-detail">
          <span class="metric-dot bg-green-500" />{{ activeAccounts }} active
          <span class="metric-dot ml-2 bg-slate-400" />{{ disabledAccounts }} disabled
          <template v-if="unavailableAccounts"><span class="metric-dot ml-2 bg-amber-500" />{{ unavailableAccounts }} unavailable</template>
        </dd>
      </dl>
      <dl class="metric">
        <dt>Provider keys</dt>
        <dd class="metric-value">{{ providerKeyCount }}</dd>
        <dd class="metric-detail truncate" :title="providerGroups">
          {{ providerGroups || "No entries" }}
        </dd>
      </dl>
      <button
        type="button"
        class="metric metric--action text-left"
        :class="attentionCount && !quotaError ? 'metric--warning' : ''"
        aria-label="Show accounts needing attention"
        @click="showAttention"
      >
        <span class="flex items-center justify-between text-xs text-[var(--ui-text-muted)]">Needs attention<UIcon name="i-tabler-arrow-right" class="metric-arrow size-3.5" /></span>
        <span class="metric-value block">{{ quotaError ? "—" : attentionCount }}</span>
        <span class="metric-detail block">{{ quotaError ? "Quota snapshots unavailable" : "Quota status or stale collection" }}</span>
      </button>
      <dl class="metric">
        <dt>WebSockets</dt>
        <dd class="metric-value">
          {{ accounts.filter((item) => item.websockets).length }}
        </dd>
        <dd class="metric-detail">Accounts with WebSockets on</dd>
      </dl>
    </section>

    <AppPanelTabs
      :model-value="tab"
      :items="upstreamTabs"
      label="Upstream"
      @update:model-value="selectTab"
    />
    <AdminUpstreamAccounts
      v-if="tab === 'accounts'"
      :attention-request="attentionRequest"
      :sync-request="syncRequest"
      @changed="refreshSummary"
    />
    <AdminUpstreamProviders
      v-else
      :sync-request="syncRequest"
      @changed="refreshSummary"
    />
  </div>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
import { useQuotaCollection } from '~/composables/useQuotaCollection'
import { isQuotaAttention } from '~/composables/upstreamQuota'
import { useDataSync } from '~/composables/useDataSync'
const quotaCollection = useQuotaCollection()
const route = useRoute();
if (route.query.tab === "proxy")
  await navigateTo("/admin/proxy-network", { replace: true });
watch(
  () => route.query.tab,
  (value) => {
    if (value === "proxy")
      void navigateTo("/admin/proxy-network", { replace: true });
  },
);
const router = useRouter();
const { fetchAPI, token } = useApi();
const toast = useToast();
const tab = computed(() =>
  route.query.credential
    ? "accounts"
    : route.query.tab === "providers"
      ? "providers"
      : "accounts",
);
const upstreamTabs = [
  { label: "Accounts", value: "accounts", icon: "i-tabler-user-shield" },
  { label: "Provider keys", value: "providers", icon: "i-tabler-key" },
];
const summaryError = useWorkspaceState('admin:upstream:summaryError', () => (""));
const quotaError = useWorkspaceState('admin:upstream:quotaError', () => (""));
const syncing = useWorkspaceState('admin:upstream:syncing', () => (false));

const attentionRequest = ref(0);
const syncRequest = ref(0);
const providerRoutes = [
  "gemini",
  "interactions",
  "claude",
  "codex",
  "xai",
  "meta",
  "vertex",
  "openai-compatibility",
];
async function loadSummary() {
  summaryError.value = "";
  quotaError.value = "";
  const [auth, ...providers] = await Promise.allSettled([
    fetchAPI("/credentials"),
    ...providerRoutes.map((name) => fetchAPI(`/config/api-keys/${name}`)),
  ]);
  if (auth.status === "rejected")
    summaryError.value = auth.reason?.message || "Could not load accounts.";
  const authData = auth.status === "fulfilled" ? auth.value : null;
  const accounts = Array.isArray(authData)
    ? authData
    : Array.isArray(authData?.files)
      ? authData.files
      : Array.isArray(authData?.credentials)
        ? authData.credentials
        : Array.isArray(authData?.items)
          ? authData.items
          : [];
  const groups = providerRoutes.map((name, index) => {
    const result = providers[index];
    const response = result.status === "fulfilled" ? result.value : null;
    const groups = Array.isArray(response) ? response : [];
    return {
      name,
      count: groups.reduce(
        (total, group) =>
          total + (Array.isArray(group?.keys) ? group.keys.length : 0),
        0,
      ),
    };
  });
  if (providers.some((result) => result.status === "rejected"))
    summaryError.value = [
      summaryError.value,
      "Some provider groups could not be loaded.",
    ]
      .filter(Boolean)
      .join(" ");
  return { accounts, groups };
}
const {
  data: summary,
  pending: summaryPending,
  refresh: refreshSummary,
} = useStoreData('admin:upstream:upstream-summary', loadSummary, {
  lazy: true,
  default: () => ({ accounts: [], groups: [] }),
});
const accounts = computed(() => summary.value?.accounts || []);
async function loadSummaryQuota() {
  quotaError.value = "";
  const items = accounts.value;
  if (!items.length) return [];
  try {
    const quota = [];
    for (let index = 0; index < items.length; index += 200) {
      const ids = items
        .slice(index, index + 200)
        .map((item) => item.id)
        .filter(Boolean)
        .join(",");
      if (!ids) continue;
      const result = await fetchAPI("/quota/credentials", {
        query: { ids, limit: 200 },
      });
      quota.push(...(result.items || []));
    }
    return quota;
  } catch (error) {
    quotaError.value = error?.message || "Quota snapshots unavailable.";
    return [];
  }
}
const summaryIDs = computed(() =>
  accounts.value
    .map((item) => item.id)
    .filter(Boolean)
    .join(","),
);
const { data: summaryQuota, refresh: refreshSummaryQuota } = useStoreData('admin:upstream:upstream-summary-quota',
  loadSummaryQuota,
  { lazy: true, default: () => [], watch: [summaryIDs] },
);
const activeAccounts = computed(
  () =>
    accounts.value.filter((item) => !item.disabled && !item.unavailable).length,
);
const disabledAccounts = computed(
  () => accounts.value.filter((item) => item.disabled).length,
);
const unavailableAccounts = computed(
  () =>
    accounts.value.filter((item) => !item.disabled && item.unavailable).length,
);
const providerKeyCount = computed(() =>
  (summary.value?.groups || []).reduce((total, item) => total + item.count, 0),
);
const providerGroups = computed(() =>
  (summary.value?.groups || [])
    .filter((item) => item.count)
    .map((item) => item.name)
    .join(", "),
);
const attentionCount = computed(
  () => (summaryQuota.value || []).filter(isQuotaAttention).length,
);
function selectTab(value) {
  void router.replace({
    query: { ...route.query, tab: value, credential: undefined },
  });
}
function showAttention() {
  if (tab.value === "providers") selectTab("accounts");
  attentionRequest.value++;
}
watch(quotaCollection.revision, () => { void refreshSummaryQuota() });
useDataSync('admin:upstream:quota-collection', syncData);
async function syncData() {
  if (syncing.value) return;
  const session = token.value;
  syncing.value = true;
  try {
    await Promise.all([quotaCollection.collect(), refreshSummary()]);
    if (session !== token.value) return;
    void refreshSummaryQuota();
    syncRequest.value++;
  } catch (error) {
    if (session !== token.value) return;
    toast.add({
      title: "Sync failed",
      description: error?.message || "Could not queue quota collection.",
      color: "error",
    });
  } finally {
    syncing.value = false;
  }
}
</script>

<style scoped>
.metric-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  background: var(--ui-border);
}

.metric {
  min-width: 0;
  padding: 0.875rem 1.125rem;
  background: var(--ui-bg);
}

.metric dt,
.metric-detail {
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--ui-text-muted);
}

.metric-value {
  margin-block: 0.375rem 0.25rem;
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-highlighted);
}

.metric-dot {
  display: inline-block;
  width: 0.375rem;
  height: 0.375rem;
  margin-right: 0.3125rem;
  border-radius: 9999px;
  vertical-align: middle;
}

.metric--action {
  cursor: pointer;
  transition: background-color 120ms ease;
}

.metric--action:hover { background: var(--ui-bg-elevated); }
.metric--action:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: -2px; }
.metric--action .metric-arrow { opacity: 0; transition: opacity 120ms ease; }
.metric--action:is(:hover, :focus-visible) .metric-arrow { opacity: 1; }
.metric--warning .metric-value { color: var(--color-amber-600); }
:global(.dark) .metric--warning .metric-value { color: var(--color-amber-400); }

@media (min-width: 40rem) {
  .metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 80rem) {
  .metric-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
