import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useApi, useAdminI18n } from '#imports'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { usePluginsData } from './usePluginsData'
import { usePluginReports } from './usePluginReports'
import { usePluginAuth } from './usePluginAuth'
import { usePluginActions } from './usePluginActions'
import { usePluginCatalog } from './usePluginCatalog'
import { safeURL } from './presentation'
import { pluginErrorMessage } from './types'

function createPluginsWorkspace() {
    const { fetchAPI, token } = useApi();
    const { t } = useAdminI18n();
    const toast = useAdminToast();
    const value = <T extends object>(row: T | { original: T }): T => (('original' in row ? row.original : undefined) ?? row) as T;
    const yesNo = (flag: unknown) => (flag ? t('common.yes') : t('common.no'));
    const message = (error: unknown) => pluginErrorMessage(error, t('plugins.unexpectedError'));
    const section = ref('installed');
    const sections = computed(() => [
        { label: t('plugins.section.installed'), value: 'installed' },
        { label: t('plugins.section.store'), value: 'store' },
        { label: t('plugins.section.auth'), value: 'auth' },
    ]);
    const shared = { fetchAPI, token, t, toast, message };
    const data = usePluginsData(shared);
    const reports = usePluginReports(shared);
    async function refreshAll() {
        await data.refreshData();
        reports.startNodePolling();
    }
    const auth = usePluginAuth({ ...shared, refreshAll });
    const actions = usePluginActions({ ...shared, refreshAll, installed: data.installed, performDeleteAuth: auth.performDeleteAuth });
    const catalog = usePluginCatalog({ ...data, t });
    return { t, value, yesNo, safeURL, section, sections, refreshAll, ...data, ...reports, ...auth, ...actions, ...catalog };
}

const pluginsWorkspaceKey: InjectionKey<ReturnType<typeof createPluginsWorkspace>> = Symbol('plugins-workspace');

export function providePluginsWorkspace() {
    // Initialize once in the page scope: tab remounts must not reset workspace owners or local forms/filters.
    const workspace = createPluginsWorkspace();
    provide(pluginsWorkspaceKey, workspace);
    return workspace;
}

export function usePluginsWorkspace() {
    const workspace = inject(pluginsWorkspaceKey);
    if (!workspace) throw new Error('Plugins workspace is not provided');
    return workspace;
}
