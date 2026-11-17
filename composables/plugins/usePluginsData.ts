import { computed } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useStoreData } from '~/composables/useStoreData'
import type { PluginServices, PluginDataResponses } from './types'

export function usePluginsData({ fetchAPI, message }: Pick<PluginServices, 'fetchAPI' | 'message'>) {
const pageError = useWorkspaceState('admin:plugins:pageError', () => (""));
async function loadAll() {
    pageError.value = "";
    const result: Partial<PluginDataResponses> = {};
    const failures: string[] = [];
    await Promise.all(
        ([
            ["plugins", "/plugins"],
            ["store", "/plugins/store"],
            ["auth", "/plugin-store-auth"],
        ] as const).map(async ([key, path]) => {
            try {
                const response = await fetchAPI<PluginDataResponses[typeof key]>(path);
                                Object.assign(result, { [key]: response });
            } catch (error) {
                failures.push(`${key}: ${message(error)}`);
                Object.assign(result, { [key]: key === "auth" ? { items: [] } : { plugins: [] } });
            }
        }),
    );
    pageError.value = failures.join(" · ");
    return result as PluginDataResponses;
}
const {
    data,
    pending,
    refresh: refreshData,
} = useStoreData('admin:plugins:management-plugins', loadAll);
const pluginsResponse = computed(() => data.value?.plugins || null);
const storeResponse = computed(() => data.value?.store || null);
const installed = computed(() =>
    Array.isArray(pluginsResponse.value?.plugins)
        ? pluginsResponse.value.plugins
        : [],
);
const store = computed(() =>
    Array.isArray(storeResponse.value?.plugins)
        ? storeResponse.value.plugins
        : [],
);
const authRules = computed(() =>
    Array.isArray(data.value?.auth?.items) ? data.value.auth.items : [],
);
return { pageError, pending, refreshData, pluginsResponse, storeResponse, installed, store, authRules };
}
