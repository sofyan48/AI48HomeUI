import { computed, onMounted, onUnmounted } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import type { PluginServices, PluginNodesResponse } from './types'

export function usePluginReports({ fetchAPI, message, t }: Pick<PluginServices, 'fetchAPI' | 'message' | 't'>) {
const nodesResponse = useWorkspaceState<PluginNodesResponse | null>('admin:plugins:nodesResponse', () => (null));
const nodesError = useWorkspaceState('admin:plugins:nodesError', () => (""));
const nodesLoading = useWorkspaceState('admin:plugins:nodesLoading', () => (false));
const pollExpired = useWorkspaceState('admin:plugins:pollExpired', () => (false));
const activeNodes = computed(() =>
    Array.isArray(nodesResponse.value?.nodes) ? nodesResponse.value.nodes : [],
);
const pollDuration = 60000;
const pollInterval = 5000;
let pollUntil = 0;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let pollGeneration = 0;
function reportLabel(state: string) {
    return (
        ({
            not_required: t('plugins.reports.state.notRequired'),
            missing_report: t('plugins.reports.state.missing'),
            reported_partial: t('plugins.reports.state.partial'),
            reported_failed: t('plugins.reports.state.failed'),
            reported_ok: t('plugins.reports.state.ok'),
        } as Record<string, string>)[state] || t('plugins.reports.state.unavailable')
    );
}
function reportColor(state: string) {
    return (
        ({
            not_required: "neutral",
            missing_report: "warning",
            reported_partial: "warning",
            reported_failed: "error",
            reported_ok: "success",
        } as Record<string, 'neutral' | 'warning' | 'error' | 'success'>)[state] || "neutral"
    );
}
function scheduleNodePoll(generation: number) {
    if (generation !== pollGeneration || document.hidden) return;
    clearTimeout(pollTimer);
    const remaining = pollUntil - Date.now();
    if (remaining <= 0) {
        pollExpired.value = true;
        return;
    }
    pollTimer = setTimeout(
        () => {
            pollTimer = undefined;
            void loadNodes(generation);
        },
        Math.min(pollInterval, remaining),
    );
}
async function loadNodes(generation: number) {
    if (generation !== pollGeneration || document.hidden || nodesLoading.value)
        return;
    nodesLoading.value = true;
    try {
        const response = await fetchAPI<PluginNodesResponse>("/nodes");
        if (generation !== pollGeneration) return;
        nodesResponse.value = response;
        nodesError.value = "";
    } catch (error) {
        if (generation === pollGeneration) nodesError.value = message(error);
    } finally {
        nodesLoading.value = false;
        scheduleNodePoll(pollGeneration);
    }
}
function startNodePolling() {
    if (import.meta.server) return;
    clearTimeout(pollTimer);
    pollGeneration++;
    pollUntil = Date.now() + pollDuration;
    pollExpired.value = false;
    if (!nodesLoading.value) void loadNodes(pollGeneration);
    else scheduleNodePoll(pollGeneration);
}
function onVisibilityChange() {
    clearTimeout(pollTimer);
    if (!document.hidden) {
        if (pollUntil > Date.now()) {
            if (!nodesLoading.value) void loadNodes(pollGeneration);
            else scheduleNodePoll(pollGeneration);
        } else pollExpired.value = true;
    }
}
useDataSync('admin:plugins:sync', () => loadNodes(pollGeneration));
onMounted(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    startNodePolling();
});
onUnmounted(() => {
    pollGeneration++;
    clearTimeout(pollTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
});
return { nodesResponse, nodesError, nodesLoading, pollExpired, activeNodes, reportLabel, reportColor, startNodePolling };
}
