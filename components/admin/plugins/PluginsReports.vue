<template>
        <AppCard>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 class="font-semibold">{{ t('plugins.reports.title') }}</h2>
                    <p class="text-xs text-[var(--ui-text-muted)]">
                        {{ t('plugins.reports.description') }}
                    </p>
                </div>
                <AppButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-tabler-refresh"
                    :loading="nodesLoading"
                    @click="startNodePolling"
                    >{{ t('plugins.reports.refresh') }}</AppButton
                >
            </div>
            <UAlert
                v-if="nodesError"
                class="mt-3"
                color="error"
                variant="subtle"
                :title="t('plugins.reports.loadFailed')"
                :description="nodesError"
            />
            <div v-if="nodesResponse" class="mt-4 space-y-3 text-sm">
                <p class="text-[var(--ui-text-muted)]">
                    {{
                        nodesResponse.plugin_report_required
                            ? t('plugins.reports.required')
                            : t('plugins.reports.notRequired')
                    }}
                    · {{ t('plugins.reports.activeNodes', { count: activeNodes.length }) }}
                </p>
                <p
                    v-if="!activeNodes.length"
                    class="text-[var(--ui-text-muted)]"
                >
                    {{ t('plugins.reports.noActiveNodes') }}
                </p>
                <div
                    v-for="(node, index) in activeNodes"
                    :key="`${node.node_id || node.ip}-${index}`"
                    class="rounded-lg border border-[var(--ui-border)] p-3"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <strong>{{
                            node.node_name ||
                            node.node_id ||
                            node.ip ||
                            t('plugins.reports.unknownNode')
                        }}</strong
                        ><span
                            v-if="node.node_name && node.node_id"
                            class="text-xs text-[var(--ui-text-muted)]"
                            >{{ node.node_id }}</span
                        ><UBadge
                            :color="reportColor(node.plugin_report_state)"
                            variant="subtle"
                            >{{ reportLabel(node.plugin_report_state) }}</UBadge
                        ><UBadge
                            v-if="!node.healthy"
                            color="warning"
                            variant="subtle"
                            >{{ t('plugins.reports.nodeUnhealthy') }}</UBadge
                        >
                    </div>
                    <div
                        v-for="(
                            report, reportIndex
                        ) in node.plugin_report_statuses || []"
                        :key="reportIndex"
                        class="mt-2 break-words text-xs text-[var(--ui-text-muted)]"
                    >
                        <p>
                            {{ report.task || t('plugins.reports.pluginTask') }} ·
                            {{ report.status || t('plugins.reports.unknown')
                            }}<span v-if="report.phase">
                                · {{ report.phase }}</span
                            ><span v-if="report.updated_at">
                                · {{ report.updated_at }}</span
                            >
                        </p>
                        <p
                            v-for="(item, itemIndex) in report.plugins || []"
                            :key="itemIndex"
                            class="pl-3"
                        >
                            {{ item.id }} ·
                            {{ t('plugins.reports.install', { status: item.install_status || t('plugins.reports.unknown') }) }} ·
                            {{ t('plugins.reports.load', { status: item.load_status || t('plugins.reports.unknown') })
                            }}<span v-if="item.error"> · {{ item.error }}</span>
                        </p>
                        <p v-if="report.error" class="pl-3">
                            {{ report.error }}
                        </p>
                    </div>
                </div>
                <p
                    v-if="pollExpired"
                    class="text-xs text-[var(--ui-text-muted)]"
                >
                    {{ t('plugins.reports.pollExpired') }}
                </p>
            </div>
        </AppCard>

</template>

<script setup lang="ts">
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, nodesLoading, startNodePolling, nodesError, nodesResponse, activeNodes, reportColor, reportLabel, pollExpired } = usePluginsWorkspace();
</script>
