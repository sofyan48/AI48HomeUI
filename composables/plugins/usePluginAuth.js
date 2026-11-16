import { computed, reactive, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

export function usePluginAuth({ fetchAPI, message, t, toast, refreshAll }) {
const authOpen = ref(false);
const editingAuth = ref(null);
const authError = ref("");
const savingAuth = useWorkspaceState('admin:plugins:savingAuth', () => (false));
const emptyAuth = () => ({
    name: "",
    match: "",
    apply_to: [],
    auth_type: "bearer",
    token: "",
    username: "",
    password: "",
    header_name: "",
    header_value: "",
    enabled: true,
});
const authForm = reactive(emptyAuth());
const authTypes = computed(() => [
    { label: t('plugins.auth.typeNone'), value: "none" },
    { label: t('plugins.auth.typeBearer'), value: "bearer" },
    { label: t('plugins.auth.typeBasic'), value: "basic" },
    { label: t('plugins.auth.typeHeader'), value: "header" },
    { label: t('plugins.auth.typeGithub'), value: "github-token" },
]);
const authScopes = ["registry", "metadata", "artifact"];
function scopeLabel(scope) {
    if (scope === "registry") return t('plugins.auth.scopeRegistry');
    if (scope === "metadata") return t('plugins.auth.scopeMetadata');
    if (scope === "artifact") return t('plugins.auth.scopeArtifact');
    return scope;
}
const authColumns = computed(() => [
    { accessorKey: "identity", header: t('plugins.auth.colRule') },
    { accessorKey: "type", header: t('plugins.auth.colType') },
    { accessorKey: "scope", header: t('plugins.auth.colScope') },
    { accessorKey: "status", header: t('plugins.auth.colStatus') },
    {
        accessorKey: "actions",
        header: "",
        meta: { class: { th: "table-action-head", td: "table-action-cell" } },
    },
]);
function assignAuth(values) {
    Object.assign(authForm, emptyAuth(), values);
}
function openAuthCreate() {
    editingAuth.value = null;
    assignAuth({});
    authError.value = "";
    authOpen.value = true;
}
function openAuthEdit(rule) {
    editingAuth.value = rule;
    assignAuth({
        name: rule.name,
        match: rule.match,
        apply_to: [...(rule.apply_to || [])],
        auth_type: rule.auth_type,
        header_name: rule.header_name || "",
        enabled: rule.enabled,
    });
    authError.value = "";
    authOpen.value = true;
}
function toggleScope(scope, checked) {
    authForm.apply_to = checked
        ? [...authForm.apply_to, scope]
        : authForm.apply_to.filter((value) => value !== scope);
}
function validateAuth() {
    if (!authForm.name.trim()) return t('plugins.auth.errName');
    const match = authForm.match.trim();
    try {
        const url = new URL(match);
        if (
            url.protocol !== "https:" ||
            !url.hostname ||
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            match.includes("?") ||
            match.includes("#")
        )
            return t('plugins.auth.errUrlParts');
    } catch {
        return t('plugins.auth.errUrl');
    }
    if (!authTypes.value.some((type) => type.value === authForm.auth_type))
        return t('plugins.auth.errType');
    if (
        !Array.isArray(authForm.apply_to) ||
        authForm.apply_to.some((scope) => !authScopes.includes(scope))
    )
        return t('plugins.auth.errScopes');
    const needsCredentials =
        !editingAuth.value ||
        editingAuth.value.auth_type !== authForm.auth_type ||
        !editingAuth.value.credentials_configured;
    if (
        ["bearer", "github-token"].includes(authForm.auth_type) &&
        needsCredentials &&
        !authForm.token
    )
        return t('plugins.auth.errToken');
    if (
        authForm.auth_type === "basic" &&
        needsCredentials &&
        (!authForm.username || !authForm.password)
    )
        return t('plugins.auth.errBasic');
    if (authForm.auth_type === "header") {
        if (
            !authForm.header_name.trim() ||
            !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(authForm.header_name.trim())
        )
            return t('plugins.auth.errHeaderName');
        if (needsCredentials && !authForm.header_value)
            return t('plugins.auth.errHeaderValue');
    }
    const secret = ["bearer", "github-token"].includes(authForm.auth_type)
        ? authForm.token
        : authForm.auth_type === "header"
          ? authForm.header_value
          : "";
    if (/[\x00-\x08\x0A-\x1F\x7F]/.test(secret))
        return t('plugins.auth.errHeaderChars');
    return "";
}
function authPayload() {
    const payload = {
        name: authForm.name.trim(),
        match: authForm.match.trim(),
        apply_to: [...authForm.apply_to],
        auth_type: authForm.auth_type,
        enabled: authForm.enabled,
    };
    if (
        ["bearer", "github-token"].includes(authForm.auth_type) &&
        authForm.token
    )
        payload.token = authForm.token;
    if (authForm.auth_type === "basic") {
        if (authForm.username) payload.username = authForm.username;
        if (authForm.password) payload.password = authForm.password;
    }
    if (authForm.auth_type === "header") {
        payload.header_name = authForm.header_name.trim();
        if (authForm.header_value) payload.header_value = authForm.header_value;
    }
    return payload;
}
async function saveAuth() {
    authError.value = validateAuth();
    if (authError.value) return;
    savingAuth.value = true;
    try {
        if (editingAuth.value)
            await fetchAPI(`/plugin-store-auth/${editingAuth.value.id}`, {
                method: "PATCH",
                body: authPayload(),
            });
        else
            await fetchAPI("/plugin-store-auth", {
                method: "POST",
                body: authPayload(),
            });
        authOpen.value = false;
        await refreshAll();
        toast.add({ title: t('plugins.auth.saved'), color: "success" });
    } catch (error) {
        authError.value = message(error);
    } finally {
        savingAuth.value = false;
    }
}
async function performDeleteAuth(rule) {
    try {
        await fetchAPI(`/plugin-store-auth/${rule.id}`, { method: "DELETE" });
        await refreshAll();
        toast.add({ title: t('plugins.auth.deleted'), color: "success" });
    } catch (error) {
        toast.add({
            title: t('plugins.auth.deleteFailed'),
            description: message(error),
            color: "error",
        });
    }
}
return { authOpen, editingAuth, authError, savingAuth, authForm, authTypes, authScopes, scopeLabel, authColumns, openAuthCreate, openAuthEdit, toggleScope, saveAuth, performDeleteAuth };
}
