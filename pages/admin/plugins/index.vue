<template>
    <div class="space-y-4">
        <UAlert
            v-if="pageError"
            color="error"
            variant="subtle"
            :title="t('plugins.loadFailed')"
            :description="pageError"
        />
        <PluginsSummary />
        <PluginsOperation />
        <PluginsReports />
        <div class="border-b border-[var(--ui-border)]">
            <div class="flex gap-1">
                <AppButton
                    v-for="item in sections"
                    :key="item.value"
                    color="neutral"
                    :variant="section === item.value ? 'soft' : 'ghost'"
                    @click="section = item.value"
                    >{{ item.label }}</AppButton
                >
            </div>
        </div>
        <PluginsInstalled v-if="section === 'installed'" />
        <PluginsStore v-else-if="section === 'store'" />
        <PluginsAuthRules v-else />
        <PluginsConfirmation />
        <AdminPluginConfigEditor
            v-model:open="configOpen"
            :plugin="configPlugin"
            :disabled="!!busyPlugin"
            @saved="refreshAll"
        />
        <PluginsAuthDialog />
    </div>
</template>

<script setup lang="ts">
import AdminPluginConfigEditor from '~/components/admin/plugins/PluginConfigEditor.vue'
import PluginsSummary from '~/components/admin/plugins/PluginsSummary.vue'
import PluginsOperation from '~/components/admin/plugins/PluginsOperation.vue'
import PluginsReports from '~/components/admin/plugins/PluginsReports.vue'
import PluginsInstalled from '~/components/admin/plugins/PluginsInstalled.vue'
import PluginsStore from '~/components/admin/plugins/PluginsStore.vue'
import PluginsAuthRules from '~/components/admin/plugins/PluginsAuthRules.vue'
import PluginsConfirmation from '~/components/admin/plugins/PluginsConfirmation.vue'
import PluginsAuthDialog from '~/components/admin/plugins/PluginsAuthDialog.vue'
import { providePluginsWorkspace } from '~/composables/plugins/usePluginsWorkspace'

const { t, pageError, section, sections, configOpen, configPlugin, busyPlugin, refreshAll } = providePluginsWorkspace();
</script>
