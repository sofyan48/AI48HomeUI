<template>
  <div class="space-y-4">
    <UAlert
      v-if="summaryError"
      color="warning"
      variant="subtle"
      title="Upstream summary unavailable"
      :description="summaryError"
    />
    <section class="fleet" aria-label="Upstream fleet" :aria-busy="summaryPending && !accounts.length">
      <div class="fleet__card">
        <span class="fleet__icon" aria-hidden="true"><UIcon name="i-tabler-user-shield" class="size-4" /></span>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <span class="truncate text-xs font-medium text-[var(--ui-text-muted)]">Accounts</span>
            <span class="shrink-0 text-[11px] tabular-nums text-[var(--ui-text-muted)]">{{ accounts.length ? Math.round((activeAccounts / accounts.length) * 100) : 0 }}% dispatchable</span>
          </div>
          <div class="flex min-w-0 items-baseline gap-3">
            <span class="fleet__count">{{ summaryPending && !accounts.length ? '—' : accounts.length }}</span>
            <span class="flex min-w-0 flex-wrap gap-x-2.5 text-[11px] text-[var(--ui-text-muted)]">
              <span class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full bg-emerald-500" />{{ activeAccounts }} active</span>
              <span v-if="unavailableAccounts" class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full bg-amber-500" />{{ unavailableAccounts }} unavailable</span>
              <span class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full bg-zinc-400" />{{ disabledAccounts }} disabled</span>
            </span>
          </div>
          <div class="fleet__bar" role="img" :aria-label="`${activeAccounts} active, ${unavailableAccounts} unavailable, ${disabledAccounts} disabled`">
            <span class="bg-emerald-500" :style="{ flexGrow: activeAccounts }" />
            <span class="bg-amber-500" :style="{ flexGrow: unavailableAccounts }" />
            <span class="bg-zinc-400 dark:bg-zinc-600" :style="{ flexGrow: disabledAccounts }" />
          </div>
        </div>
      </div>
      <AdminStatGrid
        label="Upstream details"
        :items="summaryCards.slice(1)"
        :columns="3"
        :loading="summaryPending && !accounts.length"
        @select="showAttention"
      />
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
const summaryCards = computed(() => [
  {
    key: "accounts",
    label: "Accounts",
    value: accounts.value.length,
    detail: [
      `${activeAccounts.value} active`,
      `${disabledAccounts.value} disabled`,
      unavailableAccounts.value ? `${unavailableAccounts.value} unavailable` : "",
    ].filter(Boolean).join(" · "),
    icon: "i-tabler-user-shield",
    tone: "violet",
    ratio: accounts.value.length ? activeAccounts.value / accounts.value.length : null,
  },
  {
    key: "providers",
    label: "Provider keys",
    value: providerKeyCount.value,
    detail: providerGroups.value || "No entries",
    icon: "i-tabler-key",
    tone: "blue",
  },
  {
    key: "attention",
    label: "Needs attention",
    value: quotaError.value ? "—" : attentionCount.value,
    detail: quotaError.value ? "Quota snapshots unavailable" : "Quota status or stale collection",
    icon: "i-tabler-alert-triangle",
    tone: "amber",
    action: true,
    ariaLabel: "Show accounts needing attention",
    warning: Boolean(attentionCount.value && !quotaError.value),
  },
  {
    key: "websockets",
    label: "WebSockets",
    value: accounts.value.filter((item) => item.websockets).length,
    detail: "Accounts with WebSockets on",
    icon: "i-tabler-plug-connected",
    tone: "emerald",
  },
]);
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
/* Upstream summary: one compact row; each card is only as tall as its content. */
.fleet { display: grid; gap: 0.75rem; align-items: start; }
@media (min-width: 64rem) { .fleet { grid-template-columns: minmax(0, 1.15fr) minmax(0, 2fr); } }
.fleet :deep(.kpi) { align-self: start; }
.fleet__card {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--page-accent) 6%, transparent), transparent 55%),
    var(--admin-panel-bg);
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
.fleet__icon {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: color-mix(in oklch, var(--page-accent) 12%, transparent);
  color: var(--page-accent);
}
.fleet__count {
  flex-shrink: 0;
  font-size: 1.1875rem;
  line-height: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-highlighted);
}
.fleet__bar {
  display: flex;
  height: 0.25rem;
  gap: 2px;
  margin-top: 0.375rem;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--ui-bg-muted);
}
.fleet__bar > span { flex-basis: 0; border-radius: 9999px; transition: flex-grow 400ms ease; }
@media (prefers-reduced-motion: reduce) { .fleet__bar > span { transition: none; } }
</style>
