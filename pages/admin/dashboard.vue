<template>
  <div class="space-y-4">
    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      title="Dashboard data could not be loaded"
      :description="loadError"
    >
      <template #actions
        ><AppButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="refreshDashboard"
          >Retry</AppButton
        ></template
      >
    </UAlert>

    <template v-if="snapshot && !loadError">
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section aria-label="Service readiness" class="dashboard-hero lg:col-span-5" :class="`dashboard-hero--${health.color}`">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="dashboard-hero-icon" aria-hidden="true"><UIcon :name="healthIcon" class="size-5" /></span>
              <UBadge :color="health.color" variant="subtle" class="rounded-full">{{ health.label }}</UBadge>
            </div>
            <AppSyncButton :loading="loading" size="sm" @click="refreshDashboard" />
          </div>
          <h1 class="mt-4 text-xl font-bold tracking-tight text-[var(--ui-text-highlighted)]">{{ health.title }}</h1>
          <p class="mt-1.5 text-sm leading-relaxed text-[var(--ui-text-muted)]">{{ health.description }}</p>

          <div class="mt-4 flex flex-wrap gap-1.5 text-xs">
            <span class="dashboard-chip"><UIcon name="i-tabler-server" class="size-3.5" aria-hidden="true" />{{ runtimeMode || "Home" }}</span>
            <span class="dashboard-chip"><UIcon name="i-tabler-tag" class="size-3.5" aria-hidden="true" />{{ latestVersion || "Version unavailable" }}</span>
            <span class="dashboard-chip"><UIcon name="i-tabler-clock" class="size-3.5" aria-hidden="true" />{{ lastUpdated ? lastUpdated.toLocaleTimeString() : "Not synced" }}</span>
          </div>

          <div v-if="statusItems.length" class="dashboard-issues mt-4">
            <p class="mb-1.5 text-xs font-medium text-[var(--ui-text-muted)]">Data loading status · {{ statusItems.length }}</p>
            <NuxtLink v-for="item in statusItems.slice(0, 4)" :key="item.label" :to="item.to" class="dashboard-issue">
              <UIcon name="i-tabler-point-filled" class="size-3 shrink-0 text-[var(--ui-warning)]" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate"><span class="font-medium text-[var(--ui-text-highlighted)]">{{ item.label }}</span> · {{ item.detail }}</span>
              <span class="shrink-0 text-xs font-medium text-[var(--ui-primary)]">Review</span>
            </NuxtLink>
          </div>

          <div v-if="suggestedActions.length" class="mt-auto flex flex-wrap gap-2 pt-5">
            <AppButton
              v-for="(action, index) in suggestedActions"
              :key="action.label"
              :to="action.to"
              size="sm"
              class="rounded-full"
              :color="index === 0 ? 'primary' : 'neutral'"
              :variant="index === 0 ? 'solid' : 'outline'"
              :trailing-icon="index === 0 ? 'i-tabler-arrow-right' : undefined"
              >{{ action.label }}</AppButton
            >
          </div>
        </section>

        <section aria-label="Operating metrics" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
          <NuxtLink
            v-for="card in operatingCards"
            :key="card.label"
            :to="card.to"
            class="dashboard-metric"
            :class="[`dashboard-metric--${card.tone}`, { 'dashboard-metric--static': !card.to }]"
          >
            <div class="metric-head">
              <span class="metric-icon" aria-hidden="true"><UIcon :name="card.icon" class="size-[18px]" /></span>
              <h2 class="metric-label min-w-0 flex-1 truncate">{{ card.label }}</h2>
              <UIcon v-if="card.to" name="i-tabler-arrow-up-right" class="metric-link-icon" aria-hidden="true" />
            </div>
            <p class="metric-value">{{ card.value }}</p>
            <p class="metric-detail">{{ card.detail }}</p>
            <div class="mt-auto pt-3">
              <AdminUsageSparkline v-if="card.points && card.points.length > 1" :values="card.points" :label="`${card.label} trend`" class="metric-spark" />
              <div v-else-if="card.ratio != null" class="metric-bar" role="img" :aria-label="`${card.label}: ${Math.round(card.ratio * 100)}%`">
                <span :style="{ width: `${Math.min(100, Math.max(0, card.ratio * 100))}%` }" />
              </div>
            </div>
          </NuxtLink>
        </section>

        <AdminDashboardTokenTrend
          v-if="tokenTrend.length"
          :class="activity.length ? 'lg:col-span-8' : 'lg:col-span-12'"
          :trend="tokenTrend"
          :range="usage?.range"
        />
        <AdminDashboardRequestHealth
          v-if="activity.length"
          :class="tokenTrend.length ? 'lg:col-span-4' : 'lg:col-span-12'"
          :activity="activity"
          :range="usage?.range"
        />

        <AppCard class="lg:col-span-4">
          <template #header>
            <div class="dashboard-card-head">
              <div class="min-w-0">
                <h2 class="font-semibold">Top client keys</h2>
                <p class="text-xs text-[var(--ui-text-muted)]">
                  {{ formatNumber(usage?.totals?.active_client_key_count ?? 0) }} active · {{ formatNumber(quietKeyCount) }} quiet · {{ formatNumber(clientKeys.length) }} configured
                </p>
              </div>
              <AppButton to="/admin/usage" color="neutral" variant="ghost" size="xs" trailing-icon="i-tabler-arrow-right" aria-label="Key usage details">Details</AppButton>
            </div>
          </template>
          <ol v-if="topClientKeys.length" class="space-y-3.5">
            <li v-for="(item, index) in topClientKeys" :key="item.id || index" class="dashboard-rank">
              <span class="dashboard-rank-index" aria-hidden="true">{{ index + 1 }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ keyLabel(item) }}</p>
                  <span class="shrink-0 text-xs font-semibold tabular-nums">{{ item.token_breakdown?.total_tokens == null ? "--" : formatCompact(item.token_breakdown.total_tokens) }} tokens</span>
                </div>
                <div class="dashboard-share mt-1.5"><span :style="{ width: shareOf(item, topClientKeys) }" /></div>
                <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
                  {{ formatNumber(item.request_count) }} requests · {{ formatPercent(item.success_rate) }} success<span v-if="item.failed_count"> · {{ formatNumber(item.failed_count) }} failed</span>
                </p>
              </div>
            </li>
          </ol>
          <div v-else class="dashboard-empty"><UIcon name="i-tabler-key-off" class="size-6" aria-hidden="true" /><p>{{ usage ? "No client key activity in this range." : "Key usage is unavailable." }}</p></div>
        </AppCard>

        <AppCard class="lg:col-span-4">
          <template #header>
            <div class="dashboard-card-head">
              <div class="min-w-0">
                <h2 class="font-semibold">Model usage distribution</h2>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ formatNumber(usage?.totals?.active_model_count ?? 0) }} models used</p>
              </div>
              <AppButton to="/admin/usage" color="neutral" variant="ghost" size="xs" trailing-icon="i-tabler-arrow-right" aria-label="Model usage details">Details</AppButton>
            </div>
          </template>
          <ol v-if="topModels.length" class="space-y-3.5">
            <li v-for="(item, index) in topModels" :key="item.id || index" class="dashboard-rank dashboard-rank--blue">
              <span class="dashboard-rank-index" aria-hidden="true">{{ index + 1 }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ item.label || item.id }}</p>
                  <span class="shrink-0 text-xs font-semibold tabular-nums">{{ item.token_breakdown?.total_tokens == null ? "--" : formatCompact(item.token_breakdown.total_tokens) }} tokens</span>
                </div>
                <div class="dashboard-share mt-1.5"><span :style="{ width: shareOf(item, topModels) }" /></div>
                <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
                  {{ formatNumber(item.request_count) }} requests · {{ formatPercent(item.success_rate) }} success<span v-if="item.failed_count"> · {{ formatNumber(item.failed_count) }} failed</span>
                </p>
              </div>
            </li>
          </ol>
          <div v-else class="dashboard-empty"><UIcon name="i-tabler-box-off" class="size-6" aria-hidden="true" /><p>{{ usage ? "No model activity in this range." : "Model usage is unavailable." }}</p></div>
        </AppCard>

        <AppCard class="lg:col-span-4" :ui="{ body: 'p-2 sm:p-2' }">
          <template #header><h2 class="font-semibold">Service inventory</h2></template>
          <nav aria-label="Service inventory" class="space-y-0.5">
            <NuxtLink
              v-for="card in inventoryCards"
              :key="card.label"
              :to="card.to"
              class="dashboard-inventory"
              :class="`dashboard-metric--${card.tone}`"
            >
              <span class="metric-icon metric-icon--sm" aria-hidden="true"><UIcon :name="card.icon" class="size-4" /></span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ card.label }}</span>
                <span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ card.detail }}</span>
              </span>
              <span class="text-lg font-bold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatNumber(card.value) }}</span>
              <UIcon name="i-tabler-chevron-right" class="metric-chevron" aria-hidden="true" />
            </NuxtLink>
          </nav>
          <div class="mx-2 mt-2 border-t border-[var(--ui-border)] px-1 pb-1 pt-3">
            <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">Account credential sources</p>
            <div v-if="credentialSources.length" class="flex flex-wrap gap-1.5">
              <span v-for="source in credentialSources" :key="source.label" class="dashboard-chip">{{ source.label }} <strong class="text-[var(--ui-text-highlighted)]">{{ source.count }}</strong></span>
            </div>
            <p v-else class="text-xs text-[var(--ui-text-dimmed)]">No account credential sources available.</p>
          </div>
        </AppCard>

        <AppCard class="lg:col-span-7">
          <template #header>
            <div class="dashboard-card-head">
              <h2 class="font-semibold">Model service access</h2>
              <AppButton to="/admin/providers" color="neutral" variant="ghost" size="xs" trailing-icon="i-tabler-arrow-right">Manage</AppButton>
            </div>
          </template>
          <div class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div v-for="provider in providerRows" :key="provider.path" class="min-w-0">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-sm font-medium text-[var(--ui-text-highlighted)]">{{ provider.label }}</p>
                <span v-if="provider.total" class="shrink-0 text-xs tabular-nums text-[var(--ui-text-muted)]"><strong class="text-[var(--ui-text-highlighted)]">{{ provider.active }}</strong> / {{ provider.total }}</span>
                <span v-else class="shrink-0 text-xs text-[var(--ui-text-dimmed)]">Not configured</span>
              </div>
              <div class="provider-bar mt-1.5" role="img" :aria-label="`${provider.label}: ${provider.total} total, ${provider.active} available, ${provider.disabled} disabled`">
                <span v-if="provider.total" class="provider-bar__active" :style="{ width: `${(provider.active / provider.total) * 100}%` }" />
                <span v-if="provider.total" class="provider-bar__disabled" :style="{ width: `${(provider.disabled / provider.total) * 100}%` }" />
              </div>
              <p class="mt-1 truncate font-mono text-[11px] text-[var(--ui-text-dimmed)]">{{ provider.path }}</p>
            </div>
          </div>
          <AppButton
            v-if="providerRows.every((item) => item.total === 0)"
            to="/admin/providers"
            color="primary"
            variant="soft"
            size="sm"
            icon="i-tabler-plus"
            class="mt-5 rounded-full"
            >Configure model service</AppButton
          >
        </AppCard>

        <AppCard class="lg:col-span-5">
          <template #header><h2 class="font-semibold">Key switches</h2></template>
          <div class="grid gap-2 sm:grid-cols-2">
            <div v-for="item in configChecks" :key="item.label" class="dashboard-switch" :class="`dashboard-switch--${item.color}`">
              <span class="dashboard-switch__dot" aria-hidden="true" />
              <span class="min-w-0 flex-1 leading-tight">
                <span class="block truncate text-xs text-[var(--ui-text-muted)]">{{ item.label }}</span>
                <span class="block truncate text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ item.value }}</span>
              </span>
            </div>
          </div>
        </AppCard>
      </div>
    </template>
    <p
      v-else-if="loading"
      class="py-12 text-center text-sm text-[var(--ui-text-muted)]"
    >
      Loading dashboard…
    </p>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
const { fetchAPI } = useApi();
const { refreshCapabilities, supports } = useCapabilities();

type Issue = { label: string; detail: string; to: string };
type ProviderRow = {
  label: string;
  path: string;
  total: number;
  active: number;
  disabled: number;
};
const providers = [
  { label: "Gemini", path: "/config/api-keys/gemini" },
  { label: "Google Interactions", path: "/config/api-keys/interactions" },
  { label: "Claude", path: "/config/api-keys/claude" },
  { label: "Codex", path: "/config/api-keys/codex" },
  { label: "Vertex", path: "/config/api-keys/vertex" },
  {
    label: "OpenAI compatibility",
    path: "/config/api-keys/openai-compatibility",
  },
  { label: "xAI", path: "/config/api-keys/xai" },
];
const loading = useWorkspaceState('admin:dashboard:loading', () => (false));
const loadError = useWorkspaceState('admin:dashboard:loadError', () => (""));
const lastUpdated = useWorkspaceState<Date | null>('admin:dashboard:lastUpdated', () => (null));
const snapshot = useWorkspaceState('admin:dashboard:snapshot', () => (false));
const config = useWorkspaceState<Record<string, any>>('admin:dashboard:config', () => ({}));
const latestVersion = useWorkspaceState('admin:dashboard:latestVersion', () => (""));
const clientKeys = useWorkspaceState<any[]>('admin:dashboard:clientKeys', () => ([]));
const accountFiles = useWorkspaceState<any[]>('admin:dashboard:accountFiles', () => ([]));
const providerRows = useWorkspaceState<ProviderRow[]>('admin:dashboard:providerRows', () => ([]));
const availableModels = useWorkspaceState<number | null>('admin:dashboard:availableModels', () => (null));
const topology = useWorkspaceState<any>('admin:dashboard:topology', () => (null));
const nodes = useWorkspaceState<any[]>('admin:dashboard:nodes', () => ([]));
const usage = useWorkspaceState<any>('admin:dashboard:usage', () => (null));
const dataIssues = useWorkspaceState<Issue[]>('admin:dashboard:dataIssues', () => ([]));
const runtimeMode = computed(() =>
  String(
    config.value["mode"] || config.value["runtime-mode"] || "",
  ).toLowerCase(),
);
const visibleProviders = computed(() =>
  runtimeMode.value === "cpa"
    ? providers.filter((item) => item.label !== "xAI")
    : providers,
);
const availableProviders = computed(() =>
  providerRows.value.reduce((sum, item) => sum + item.active, 0),
);
const activeAccounts = computed(
  () =>
    accountFiles.value.filter(
      (item) => item.disabled !== true && item.unavailable !== true,
    ).length,
);
const hasUsage = computed(() => !!usage.value);
const topClientKeys = computed<any[]>(() =>
  Array.isArray(usage.value?.top?.client_keys)
    ? usage.value.top.client_keys.slice(0, 3)
    : [],
);
const topModels = computed<any[]>(() =>
  Array.isArray(usage.value?.top?.models)
    ? usage.value.top.models.slice(0, 3)
    : [],
);
const tokenTrend = computed(() =>
  Array.isArray(usage.value?.trend) &&
  usage.value?.totals?.token_breakdown?.total_tokens != null &&
  usage.value.trend.every(
    (point: any) => point.token_breakdown?.total_tokens != null,
  )
    ? usage.value.trend
    : [],
);
const activity = computed(() =>
  Array.isArray(usage.value?.activity) ? usage.value.activity : [],
);
const quietKeyCount = computed(() =>
  Math.max(
    0,
    clientKeys.value.length -
      Number(usage.value?.totals?.active_client_key_count || 0),
  ),
);
const homeCount = computed(
  () =>
    topology.value?.summary?.home_count ??
    new Set(
      nodes.value
        .filter((node) => node.home_ip)
        .map((node) => `${node.home_ip}:${node.home_port || 0}`),
    ).size,
);
const cpaCount = computed(
  () => topology.value?.summary?.cpa_count ?? nodes.value.length,
);
const routing = computed(() => {
  const value = String(
    config.value["routing"]?.strategy ||
      config.value["routing-strategy"] ||
      "round-robin",
  );
  return ["round-robin", "weighted-round-robin", "fill-first"].includes(value)
    ? value
    : "Unknown";
});
const missingCapabilities = computed(() =>
  [
    {
      label: "Node topology",
      enabled: supports("topology", false) || supports("nodes", false),
    },
    { label: "Usage statistics", enabled: supports("usage_overview", false) },
    { label: "Request logs", enabled: supports("logs", false) },
    { label: "Error logs", enabled: supports("request_error_logs", false) },
    { label: "User management", enabled: supports("users", false) },
    { label: "Access scopes", enabled: supports("access_groups", false) },
  ].filter((item) => !item.enabled),
);
const statusItems = computed<Issue[]>(() => [
  ...dataIssues.value,
  ...missingCapabilities.value.map((item) => ({
    label: item.label,
    detail: "Not provided by this runtime",
    to:
      item.label === "Usage statistics"
        ? "/admin/usage"
        : item.label === "Request logs" || item.label === "Error logs"
          ? "/admin/diagnostics"
          : item.label === "User management"
            ? "/admin/users"
            : item.label === "Access scopes"
              ? "/admin/users"
              : "/admin/system-nodes",
  })),
]);
const health = computed(() => {
  if (availableModels.value === null)
    return {
      title: "Model request status cannot be confirmed",
      description:
        "Available model data could not be loaded. Sync again or review data status instead of treating the current inventory counts as missing configuration.",
      label: "Needs review",
      color: "warning" as const,
    };
  if (availableModels.value === 0)
    return availableProviders.value || activeAccounts.value
      ? {
          title: "No models are currently available",
          description:
            "Upstream configuration was detected, but the runtime has not registered any available models. Review model services or account credential status and model mappings.",
          label: "Needs review",
          color: "warning" as const,
        }
      : {
          title: "Add upstream model access",
          description:
            "The runtime has no available models and no model service keys or account credentials were detected. Configure at least one upstream access method.",
          label: "Needs review",
          color: "warning" as const,
        };
  if (!clientKeys.value.length)
    return {
      title: "Create a client access key",
      description: "Model access is ready; add a client key to allow requests.",
      label: "Needs review",
      color: "warning" as const,
    };
  if (
    dataIssues.value.length ||
    config.value.debug === true ||
    config.value.observability?.logs?.debug === true ||
    routing.value === "Unknown"
  )
    return {
      title: "Service is connected with items to review",
      description: "Review the data loading status and configuration below.",
      label: "Needs review",
      color: "warning" as const,
    };
  if (missingCapabilities.value.length)
    return {
      title: "Service is connected with limited capabilities",
      description:
        "Core data loaded, but this runtime does not expose every observability route. Model, credential, and config management remain available.",
      label: "Limited",
      color: "info" as const,
    };
  return {
    title: "Model requests are available",
    description:
      "Available models and a client access key were detected. Model access can come from model service keys or OAuth and file-backed credentials.",
    label: "Ready",
    color: "success" as const,
  };
});
const healthIcon = computed(() =>
  health.value.color === "success"
    ? "i-tabler-rosette-discount-check"
    : health.value.color === "info"
      ? "i-tabler-info-circle"
      : "i-tabler-alert-triangle",
);
const suggestedActions = computed(() => {
  const actions: { label: string; to: string }[] = [];
  if (availableModels.value === null)
    actions.push({ label: "Review data status", to: "/admin/system-nodes" });
  if (availableModels.value === 0) {
    if (!activeAccounts.value)
      actions.push({ label: "Add credential", to: "/admin/credentials" });
    actions.push({
      label: availableProviders.value
        ? "Review model services"
        : "Configure providers",
      to: "/admin/providers",
    });
  }
  if (!clientKeys.value.length)
    actions.push({ label: "Create client key", to: "/admin/access-keys" });
  if (routing.value === "Unknown")
    actions.push({ label: "Check routing", to: "/admin/config" });
  if (
    config.value.debug === true ||
    config.value.observability?.logs?.debug === true
  )
    actions.push({ label: "Review debug mode", to: "/admin/config" });
  if (dataIssues.value.length)
    actions.push({ label: "Review data status", to: "/admin/system-nodes" });
  return actions.slice(0, 3);
});
const trendPoints = computed<any[]>(() =>
  Array.isArray(usage.value?.trend) ? usage.value.trend : [],
);
const operatingCards = computed<
  Array<{ label: string; value: string; detail: string; to?: string; icon: string; tone: string; points?: number[]; ratio?: number | null }>
>(() => [
  {
    label: "Total token consumption",
    value:
      hasUsage.value &&
      usage.value.totals?.token_breakdown?.total_tokens != null
        ? formatCompact(usage.value.totals.token_breakdown.total_tokens)
        : "--",
    detail:
      hasUsage.value &&
      usage.value.totals?.token_breakdown?.total_tokens != null
        ? `Across ${formatNumber(usage.value.totals?.active_model_count || 0)} active models`
        : "No usage yet",
    to: hasUsage.value ? "/admin/usage" : undefined,
    icon: "i-tabler-coins",
    tone: "violet",
    points: trendPoints.value.map(
      (point) => Number(point.token_breakdown?.total_tokens ?? point.total_tokens) || 0,
    ),
  },
  {
    label: "Total requests",
    value: hasUsage.value
      ? formatNumber(usage.value.totals?.request_count)
      : "--",
    detail: hasUsage.value
      ? `${formatNumber(usage.value.totals?.failed_count)} failed requests`
      : "No requests yet",
    to: hasUsage.value ? "/admin/usage" : undefined,
    icon: "i-tabler-arrows-exchange",
    tone: "blue",
    points: trendPoints.value.map((point) => Number(point.request_count) || 0),
  },
  {
    label: "Request success rate",
    value: hasUsage.value
      ? formatPercent(usage.value.totals?.success_rate)
      : "--",
    detail: hasUsage.value
      ? `${formatPercent(usage.value.totals?.error_rate)} error rate`
      : "No success rate yet",
    to: hasUsage.value ? "/admin/diagnostics" : undefined,
    icon: "i-tabler-circle-check",
    tone: "emerald",
    ratio:
      hasUsage.value && usage.value.totals?.success_rate != null
        ? Number(usage.value.totals.success_rate) || 0
        : null,
  },
  {
    label: "Active access keys",
    value: hasUsage.value
      ? formatNumber(usage.value.totals?.active_client_key_count)
      : "--",
    detail: hasUsage.value
      ? `${formatNumber(usage.value.totals?.active_credential_count)} execution credentials used`
      : "No active keys yet",
    to: hasUsage.value ? "/admin/usage" : undefined,
    icon: "i-tabler-key",
    tone: "amber",
    ratio:
      hasUsage.value && clientKeys.value.length
        ? Number(usage.value.totals?.active_client_key_count || 0) /
          clientKeys.value.length
        : null,
  },
]);
const inventoryCards = computed(() => [
  {
    label: "Enabled model service keys",
    value: availableProviders.value,
    detail: `${providerRows.value.filter((item) => item.total > 0).length} model service types connected`,
    to: "/admin/providers",
    icon: "i-tabler-cloud-computing",
    tone: "violet",
  },
  {
    label: "Enabled account credentials",
    value: activeAccounts.value,
    detail: `${accountFiles.value.length} total records`,
    to: "/admin/credentials",
    icon: "i-tabler-id-badge-2",
    tone: "blue",
  },
  {
    label: "Client access keys",
    value: clientKeys.value.length,
    detail: `${clientKeys.value.length} keys can call the server API`,
    to: "/admin/access-keys",
    icon: "i-tabler-key",
    tone: "amber",
  },
  ...(supports("topology", false) || supports("nodes", false)
    ? [
        {
          label: "Runtime nodes",
          value: cpaCount.value,
          detail: `${homeCount.value} Home instances`,
          to: "/admin/system-nodes",
          icon: "i-tabler-server-2",
          tone: "emerald",
        },
      ]
    : []),
]);
const configChecks = computed(() => {
  const logs = config.value.observability?.logs || config.value;
  const usageConfig = config.value.observability?.usage || config.value;
  return [
    {
      label: "Request log",
      value: logs["request-log"] === true ? "Enabled" : "Disabled",
      color: logs["request-log"] === true ? "success" : "warning",
    },
    {
      label: "Usage statistics",
      value:
        usageConfig["usage-statistics-enabled"] === true
          ? "Enabled"
          : "Disabled",
      color:
        usageConfig["usage-statistics-enabled"] === true
          ? "success"
          : "warning",
    },
    {
      label: "File logging",
      value: logs["logging-to-file"] === true ? "Enabled" : "Disabled",
      color: "neutral",
    },
    {
      label: "Debug mode",
      value: logs.debug === true ? "Enabled" : "Disabled",
      color: logs.debug === true ? "warning" : "success",
    },
    {
      label: "Routing strategy",
      value: routing.value,
      color: routing.value === "Unknown" ? "warning" : "success",
    },
  ] as const;
});
const credentialSources = computed(() => {
  const counts = new Map<string, number>();
  for (const item of accountFiles.value) {
    const source = String(item.source || "unknown").toLowerCase();
    const label =
      source === "db" || source === "database"
        ? "Database"
        : source === "file"
          ? "File"
          : source === "memory"
            ? "Memory"
            : source === "unknown"
              ? "Unknown"
              : source;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
});
function shareOf(item: any, list: any[]) {
  const max = Math.max(1, ...list.map((entry) => Number(entry.request_count) || 0));
  return `${Math.round(((Number(item.request_count) || 0) / max) * 100)}%`;
}
function formatNumber(value: unknown) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}
function formatCompact(value: unknown) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}
function formatPercent(value: unknown) {
  if (value == null) return "--";
  const num = Number(value);
  return Number.isFinite(num) ? `${(num * 100).toFixed(1)}%` : "--";
}
function keyLabel(item: any) {
  if (item.metadata?.username) return item.metadata.username;
  const userId = Number(item.metadata?.user_id);
  const owner = snapshotUsers.value.find((user) => Number(user.id) === userId);
  if (owner?.username) return owner.username;
  const key = clientKeys.value.find(
    (key) => String(key.id) === String(item.metadata?.api_key_id || item.id),
  );
  return (
    key?.display_name || key?.name || item.label || item.id || "Client key"
  );
}
const snapshotUsers = useWorkspaceState<any[]>('admin:dashboard:snapshotUsers', () => ([]));

async function refreshDashboard() {
  if (loading.value) return;
  loading.value = true;
  loadError.value = "";
  try {
    const configResponse = await fetchAPI<Record<string, any>>("/config");
    const issues: Issue[] = [];
    try {
      await refreshCapabilities(true);
    } catch (error: any) {
      issues.push({
        label: "Capabilities",
        detail: error?.statusCode
          ? `HTTP ${error.statusCode}`
          : error?.message || "Request failed",
        to: "/admin/system-nodes",
      });
    }
    const optional = async <T,>(
      label: string,
      path: string,
      fallback: T,
      to: string,
    ): Promise<T> => {
      try {
        return await fetchAPI<T>(path);
      } catch (error: any) {
        issues.push({
          label,
          detail: error?.statusCode
            ? `HTTP ${error.statusCode}`
            : error?.message || "Request failed",
          to,
        });
        return fallback;
      }
    };
    const rawConfig =
      configResponse?.config && typeof configResponse.config === "object"
        ? configResponse.config
        : configResponse;
    config.value = rawConfig || {};
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const usageQuery = new URLSearchParams({
      from: from.toISOString(),
      to: now.toISOString(),
      timezone,
    });
    const [
      version,
      keys,
      files,
      models,
      rows,
      topologyResponse,
      nodeResponse,
      overview,
      users,
    ] = await Promise.all([
      optional<any>(
        "Latest version",
        "/server/latest-version",
        null,
        "/admin/system-nodes",
      ),
      optional<any>(
        "Client keys",
        "/access/api-keys",
        null,
        "/admin/access-keys",
      ),
      optional<any>(
        "Account credentials",
        "/credentials",
        { items: [] },
        "/admin/credentials",
      ),
      optional<any>(
        "Available models",
        "/models?scope=available",
        null,
        "/admin/providers",
      ),
      Promise.all(
        visibleProviders.value.map(async (provider) => {
          const groups = await optional<any[]>(
            provider.label,
            provider.path,
            [],
            "/admin/providers",
          );
          const entries = Array.isArray(groups)
            ? groups.flatMap((group) =>
                Array.isArray(group?.keys)
                  ? group.keys.map((key: any) => ({
                      ...key,
                      disabled:
                        key?.disabled === true || group?.disabled === true,
                    }))
                  : [],
              )
            : [];
          const disabled = entries.filter((item: any) => item.disabled).length;
          return {
            ...provider,
            total: entries.length,
            disabled,
            active: entries.length - disabled,
          };
        }),
      ),
      supports("topology", false)
        ? optional<any>("Topology", "/topology", null, "/admin/system-nodes")
        : Promise.resolve(null),
      supports("nodes", false) && !supports("topology", false)
        ? optional<any>("Nodes", "/nodes", { nodes: [] }, "/admin/system-nodes")
        : Promise.resolve(null),
      supports("usage_overview", false)
        ? optional<any>(
            "Usage overview",
            `/usage/overview?${usageQuery}`,
            null,
            "/admin/usage",
          )
        : Promise.resolve(null),
      supports("users", false)
        ? optional<any>("Users", "/users", { items: [] }, "/admin/users")
        : Promise.resolve({ items: [] }),
    ]);
    let nodeFallback = nodeResponse;
    if (
      !topologyResponse &&
      supports("topology", false) &&
      supports("nodes", false)
    )
      nodeFallback = await optional<any>(
        "Nodes",
        "/nodes",
        { nodes: [] },
        "/admin/system-nodes",
      );
    latestVersion.value = String(
      version?.["latest-version"] || version?.latest_version || "",
    );
    clientKeys.value = Array.isArray(keys?.items)
      ? keys.items
      : Array.isArray(keys?.api_key_entries)
        ? keys.api_key_entries
        : Array.isArray(keys?.keys)
          ? keys.keys
          : keys == null
            ? Array.isArray(rawConfig?.["api-keys"])
              ? rawConfig["api-keys"]
              : []
            : [];
    accountFiles.value = Array.isArray(files)
      ? files
      : Array.isArray(files?.credentials)
        ? files.credentials
        : Array.isArray(files?.files)
          ? files.files
          : Array.isArray(files?.items)
            ? files.items
            : [];
    availableModels.value = Array.isArray(models?.models)
      ? models.models.length
      : models?.models && typeof models.models === "object"
        ? Object.values(models.models).flat().length
        : null;
    providerRows.value = rows;
    topology.value = topologyResponse;
    nodes.value = Array.isArray(nodeFallback?.nodes) ? nodeFallback.nodes : [];
    usage.value = overview;
    snapshotUsers.value = Array.isArray(users?.items)
      ? users.items
      : Array.isArray(users?.users)
        ? users.users
        : [];
    dataIssues.value = issues;
    lastUpdated.value = new Date();
    snapshot.value = true;
  } catch (error: any) {
    loadError.value = error?.message || "Unable to load dashboard data.";
  } finally {
    loading.value = false;
  }
}
useDataSync('admin:dashboard:sync', refreshDashboard);
onMounted(refreshDashboard);
</script>

<style scoped>
/* Readiness banner, tinted by health state. */
.dashboard-hero {
  --hero-accent: var(--ui-primary);
  position: relative;
  overflow: hidden;
  padding: 1.25rem;
  border: 1px solid color-mix(in oklch, var(--hero-accent) 22%, var(--ui-border));
  border-radius: 1rem;
  background:
    radial-gradient(ellipse at 100% 0%, color-mix(in oklch, var(--hero-accent) 14%, transparent), transparent 60%),
    var(--admin-panel-bg, var(--ui-bg));
  box-shadow: var(--admin-panel-shadow);
}
.dashboard-hero--success { --hero-accent: var(--ui-success); }
.dashboard-hero--warning { --hero-accent: var(--ui-warning); }
.dashboard-hero--info { --hero-accent: var(--ui-info); }
.dashboard-hero-icon {
  display: flex;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.875rem;
  background: color-mix(in oklch, var(--hero-accent) 14%, transparent);
  color: var(--hero-accent);
}
.dashboard-hero h1 { font-size: 1.25rem; line-height: 1.75rem; }
.dashboard-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--ui-border);
  border-radius: 9999px;
  background: var(--ui-bg-elevated);
  color: var(--ui-text-muted);
}

/* Info cards: one tinted icon + accent per metric. */
.dashboard-metric--violet { --metric-accent: var(--color-violet-500); }
.dashboard-metric--blue { --metric-accent: var(--color-blue-500); }
.dashboard-metric--emerald { --metric-accent: var(--color-emerald-500); }
.dashboard-metric--amber { --metric-accent: var(--color-amber-500); }

.dashboard-metric-grid,
.dashboard-inventory-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.dashboard-metric,
.dashboard-inventory {
  --metric-accent: var(--ui-primary);
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--admin-panel-border, var(--ui-border));
  border-radius: 1rem;
  background: var(--admin-panel-bg, var(--ui-bg));
  box-shadow: var(--admin-panel-shadow);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.dashboard-metric {
  display: flex;
  flex-direction: column;
  padding: 1.125rem 1.25rem 1.25rem;
}
.dashboard-metric::after {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--metric-accent), color-mix(in oklch, var(--metric-accent) 10%, transparent));
  content: '';
}

.dashboard-inventory {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
}

.dashboard-metric:focus-visible,
.dashboard-inventory:focus-visible {
  z-index: 1;
  outline: 2px solid var(--ui-focus);
  outline-offset: 2px;
}

.metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.metric-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--metric-accent) 13%, transparent);
  color: var(--metric-accent);
}

.metric-label {
  font-size: 0.8125rem;
  line-height: 1.125rem;
  font-weight: 500;
  color: var(--ui-text-muted);
}

.metric-value {
  margin-block: 0.25rem 0.375rem;
  font-size: 1.75rem;
  line-height: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ui-text-highlighted);
  font-variant-numeric: tabular-nums;
}
.metric-value--sm {
  margin-block: 0.125rem;
  font-size: 1.375rem;
  line-height: 1.75rem;
}

.metric-detail {
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--ui-text-dimmed);
}

.metric-link-icon,
.metric-chevron {
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-dimmed);
  transition: color 160ms ease, transform 160ms ease;
}
.metric-chevron { flex-shrink: 0; }

@media (hover: hover) {
  .dashboard-metric:not(.dashboard-metric--static):hover,
  .dashboard-inventory:hover {
    transform: translateY(-2px);
    border-color: color-mix(in oklch, var(--metric-accent) 40%, var(--ui-border));
    box-shadow: 0 12px 28px -14px color-mix(in oklch, var(--metric-accent) 45%, transparent);
  }
  .dashboard-metric:hover .metric-link-icon,
  .dashboard-inventory:hover .metric-chevron {
    color: var(--metric-accent);
    transform: translate(2px, -2px);
  }
  .dashboard-inventory:hover .metric-chevron { transform: translateX(2px); }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-metric,
  .dashboard-inventory { transition: none; }
}

@media (min-width: 40rem) {
  .dashboard-metric-grid,
  .dashboard-inventory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 80rem) {
  .dashboard-metric-grid,
  .dashboard-inventory-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
