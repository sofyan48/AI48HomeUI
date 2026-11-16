import { computed, ref } from 'vue'

export function usePluginCatalog({ store, storeResponse, t }) {
const storeSearch = ref("");
const sourceFilter = ref("all");
const statusFilter = ref("all");
const installFilter = ref("all");
const selectedInstalled = ref("");
const selectedStore = ref("");
const sourceOptions = computed(() => [
    { label: t('plugins.store.allSources'), value: "all" },
    ...(storeResponse.value?.sources || []).map((source) => ({
        label: source.name || source.id,
        value: source.id,
    })),
]);
const statusOptions = computed(() => [
    { label: t('plugins.store.allStatuses'), value: "all" },
    { label: t('plugins.store.statusInstalled'), value: "installed" },
    { label: t('plugins.store.statusAvailable'), value: "available" },
    { label: t('plugins.store.statusUpdates'), value: "updates" },
    { label: t('plugins.store.statusEffective'), value: "effective" },
    { label: t('plugins.store.statusDisabled'), value: "disabled" },
]);
const installOptions = computed(() => [
    { label: t('plugins.store.allInstallTypes'), value: "all" },
    ...[
        ...new Set(
            store.value.map((item) => item.install_type).filter(Boolean),
        ),
    ].map((type) => ({ label: type, value: type })),
]);
const filteredStore = computed(() => {
    const q = storeSearch.value.trim().toLowerCase();
    return store.value.filter(
        (item) =>
            (sourceFilter.value === "all" ||
                item.source_id === sourceFilter.value) &&
            (installFilter.value === "all" ||
                item.install_type === installFilter.value) &&
            (statusFilter.value === "all" ||
                (statusFilter.value === "installed" && item.installed) ||
                (statusFilter.value === "available" && !item.installed) ||
                (statusFilter.value === "updates" && item.update_available) ||
                (statusFilter.value === "effective" &&
                    item.effective_enabled) ||
                (statusFilter.value === "disabled" &&
                    item.configured &&
                    !item.effective_enabled)) &&
            (!q ||
                [
                    item.id,
                    item.name,
                    item.description,
                    item.author,
                    item.source_name,
                    ...(item.tags || []),
                ].some((v) =>
                    String(v || "")
                        .toLowerCase()
                        .includes(q),
                )),
    );
});
return { storeSearch, sourceFilter, statusFilter, installFilter, selectedInstalled, selectedStore, sourceOptions, statusOptions, installOptions, filteredStore };
}
