import { computed, ref, watch } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { pluginInstallTrust } from '~/composables/pluginInstallTrust'

export function usePluginActions({ fetchAPI, token, message, t, toast, refreshAll, installed, performDeleteAuth }) {
const configOpen = ref(false);
const configPlugin = ref(null);
const pluginMutationError = ref(null);
const confirmationOpen = ref(false);
const confirmation = ref(null);
const confirmationBusy = ref(false);
const installVersion = ref('');
const typedConfirmation = ref('');
const installTrust = computed(() => pluginInstallTrust(confirmation.value?.plugin || { id: '' }));
const canConfirmAction = computed(() => Boolean(confirmation.value) && (confirmation.value.kind !== 'install' || Boolean(installTrust.value.confirmation) && typedConfirmation.value.trim() === installTrust.value.confirmation));
const confirmationTitle = computed(() => confirmation.value?.kind === 'install' ? t('plugins.confirm.installTitle') : confirmation.value?.kind === 'uninstall' ? t('plugins.confirm.uninstallTitle') : t('plugins.confirm.deleteAuthTitle'));
const confirmationDescription = computed(() => {
    const action = confirmation.value;
    if (!action) return '';
    if (action.kind === 'install') return t('plugins.confirm.installDescription', { name: action.plugin.name || action.plugin.id });
    if (action.kind === 'uninstall') return t('plugins.confirm.uninstallDescription', { id: action.id });
    return t('plugins.confirm.deleteAuthDescription', { name: action.rule.name });
});
function requestConfirmation(action) {
    if (busyPlugin.value || confirmationBusy.value) return;
    confirmation.value = action;
    installVersion.value = '';
    typedConfirmation.value = '';
    confirmationOpen.value = true;
}
const install = plugin => requestConfirmation({ kind: 'install', plugin });
const uninstall = id => requestConfirmation({ kind: 'uninstall', id });
const deleteAuth = rule => requestConfirmation({ kind: 'auth', rule });
async function performConfirmedAction() {
    if (confirmationBusy.value || !canConfirmAction.value) return;
    const action = confirmation.value;
    confirmationBusy.value = true;
    try {
        if (action.kind === 'install') await performInstall(action.plugin, installVersion.value.trim());
        else if (action.kind === 'uninstall') await performUninstall(action.id);
        else await performDeleteAuth(action.rule);
        confirmationOpen.value = false;
    } finally {
        confirmationBusy.value = false;
    }
}
watch(token, () => {
    confirmationOpen.value = false;
    confirmation.value = null;
    configOpen.value = false;
    configPlugin.value = null;
    pluginMutationError.value = null;
});
function openPluginConfig(plugin) {
    if (busyPlugin.value) return;
    configPlugin.value = installed.value.find((item) => item.id === plugin.id) || plugin;
    configOpen.value = true;
}
async function togglePlugin(plugin, enabled) {
    if (busyPlugin.value || configOpen.value) return;
    const activeToken = token.value;
    busyPlugin.value = plugin.id;
    pluginMutationError.value = null;
    try {
        await fetchAPI(`/config/plugins/configs/${encodeURIComponent(plugin.id)}/enabled`, {
            method: "PUT",
            body: JSON.stringify(enabled),
            headers: { "Content-Type": "application/json" },
        });
        if (activeToken !== token.value) return;
        toast.add({
            title: enabled ? t('plugins.toggle.enabled') : t('plugins.toggle.disabled'),
            description: enabled ? t('plugins.toggle.enabledDescription') : plugin.id,
            color: "success",
        });
        await refreshAll();
    } catch (error) {
        if (activeToken !== token.value) return;
        pluginMutationError.value = {
            id: plugin.id,
            message: t('plugins.toggle.failed', { message: message(error) }),
        };
    } finally {
        if (activeToken === token.value) busyPlugin.value = "";
    }
}
const operation = useWorkspaceState('admin:plugins:operation', () => (null));
const busyPlugin = useWorkspaceState('admin:plugins:busyPlugin', () => (""));
async function performInstall(plugin, version) {
    if (busyPlugin.value) return;
    busyPlugin.value = plugin.id;
    operation.value = {
        title: t('plugins.op.installing', { name: plugin.name || plugin.id }),
        detail: t('plugins.op.waiting'),
    };
    try {
        const response = await fetchAPI(
            `/plugins/store/${encodeURIComponent(plugin.id)}/install`,
            {
                method: "POST",
                query: { source: plugin.source_id || undefined },
                body: version ? { version } : {},
            },
        );
        operation.value = {
            title: `${plugin.name || plugin.id}: ${response.status}`,
            response,
        };
        toast.add({
            title: `${plugin.name || plugin.id}: ${response.status}`,
            description:
                t('plugins.op.installedDescription'),
            color: "info",
        });
        await refreshAll();
    } catch (error) {
        operation.value = { title: t('plugins.op.installFailed'), error: message(error) };
        toast.add({
            title: t('plugins.op.installFailed'),
            description: message(error),
            color: "error",
        });
    } finally {
        busyPlugin.value = "";
    }
}
async function performUninstall(id) {
    if (busyPlugin.value) return;
    busyPlugin.value = id;
    operation.value = {
        title: t('plugins.op.uninstalling', { id }),
        detail: t('plugins.op.waiting'),
    };
    try {
        const response = await fetchAPI(
            `/plugins/store/${encodeURIComponent(id)}/uninstall`,
            { method: "POST" },
        );
        operation.value = { title: `${id}: ${response.status}`, response };
        toast.add({
            title: `${id}: ${response.status}`,
            description:
                t('plugins.op.uninstalledDescription'),
            color: "info",
        });
        await refreshAll();
    } catch (error) {
        operation.value = { title: t('plugins.op.uninstallFailed'), error: message(error) };
        toast.add({
            title: t('plugins.op.uninstallFailed'),
            description: message(error),
            color: "error",
        });
    } finally {
        busyPlugin.value = "";
    }
}
return { configOpen, configPlugin, pluginMutationError, confirmationOpen, confirmation, confirmationBusy, installVersion, typedConfirmation, installTrust, canConfirmAction, confirmationTitle, confirmationDescription, install, uninstall, deleteAuth, performConfirmedAction, openPluginConfig, togglePlugin, operation, busyPlugin };
}
