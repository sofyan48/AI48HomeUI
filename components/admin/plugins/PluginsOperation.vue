<template>
        <UAlert
            v-if="operation"
            :color="operation.error ? 'error' : 'info'"
            variant="subtle"
            :title="operation.title"
            :description="operation.error || operation.detail"
        />
        <AppCard v-if="operation?.response && !operation.error"
            ><div class="space-y-1 text-sm">
                <p>
                    {{ t('plugins.response.configStatus') }}
                    <strong>{{ operation.response.status }}</strong
                    ><span v-if="operation.response.version">
                        · {{ t('plugins.response.version', { version: operation.response.version }) }}</span
                    ><span v-if="operation.response.source_name">
                        · {{ operation.response.source_name }}</span
                    >
                </p>
                <p v-if="operation.response.task">
                    {{ t('plugins.response.deleteTask', { id: operation.response.task.id }) }} ·
                    {{ operation.response.task.operation }} ·
                    {{
                        t('plugins.response.target', { target: operation.response.target_node_type ||
                        operation.response.task.target_node_type })
                    }}<span
                        v-if="
                            operation.response.target_node_id ||
                            operation.response.task.target_node_id
                        "
                    >
                        /
                        {{
                            operation.response.target_node_id ||
                            operation.response.task.target_node_id
                        }}</span
                    >
                </p>
                <p v-if="operation.response.configured_removed !== undefined">
                    {{ t('plugins.response.configRemoved', { value: operation.response.configured_removed ? t('common.yes') : t('common.no') }) }}
                </p>
                <p v-if="operation.response.plugins_enabled === false">
                    {{ t('plugins.response.globallyDisabled') }}
                </p>
                <p v-if="operation.response.restart_required">
                    {{ t('plugins.response.restartRequired') }}
                </p>
                <p v-if="operation.response.task">
                    {{ t('plugins.response.taskCreated') }}
                </p>
                <p v-else>
                    {{ t('plugins.response.configUpdated') }}
                </p>
            </div></AppCard
        >

</template>

<script setup lang="ts">
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, operation } = usePluginsWorkspace();
</script>
