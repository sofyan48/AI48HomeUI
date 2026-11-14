<template>
  <div class="space-y-4">
    <UAlert
      v-if="summaryError"
      color="warning"
      variant="subtle"
      title="Upstream summary unavailable"
      :description="summaryError"
    />
    <AdminStatGrid
      label="Upstream summary"
      :items="summaryCards"
      :loading="summaryPending && !accounts.length"
      @select="showAttention"
    />

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
