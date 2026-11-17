import type { Ref } from 'vue'
import type { useApi } from '~/composables/useApi'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import type { useAdminToast } from '~/composables/admin-feedback/useAdminToast'

export interface PluginServices {
    fetchAPI: ReturnType<typeof useApi>['fetchAPI'];
    token: ReturnType<typeof useApi>['token'];
    t: ReturnType<typeof useAdminI18n>['t'];
    toast: ReturnType<typeof useAdminToast>;
    message: (error: unknown) => string;
}
export type PluginMutationServices = Pick<PluginServices, 'fetchAPI' | 'message' | 't' | 'toast'> & { refreshAll: () => Promise<void> };
export interface PluginConfigField { name: string; type: string; enum_values?: string[]; description?: string }
export interface Plugin {
    id: string;
    path?: string;
    configured?: boolean;
    registered?: boolean;
    enabled?: boolean;
    effective_enabled?: boolean;
    supports_oauth?: boolean;
    oauth_provider?: string;
    logo?: string;
    config_fields?: PluginConfigField[];
    menus?: { path: string; menu: string; description: string }[];
    metadata?: { name?: string; version?: string; author?: string; github_repository?: string; logo?: string; config_fields?: PluginConfigField[] } | null;
}
export interface StorePlugin extends Plugin {
    store_id?: string;
    source_id?: string;
    source_name?: string;
    source_url?: string;
    name?: string;
    description?: string;
    author?: string;
    version?: string;
    repository?: string;
    install_type?: string;
    auth_required?: boolean;
    platforms?: { goos: string; goarch: string }[];
    homepage?: string;
    license?: string;
    tags?: string[];
    installed?: boolean;
    installed_version?: string;
    update_available?: boolean;
}
export interface PluginsResponse { plugins?: Plugin[]; plugins_enabled?: boolean; plugins_dir?: string }
export interface PluginStoreResponse extends Omit<PluginsResponse, 'plugins'> {
    plugins?: StorePlugin[];
    sources?: { id: string; name: string; url: string }[];
    source_errors?: { source_id: string; source_name: string; source_url: string; message: string }[];
}
export interface PluginAuthRule {
    id: string;
    name: string;
    match: string;
    apply_to?: string[];
    auth_type: string;
    header_name?: string;
    enabled: boolean;
    credentials_configured?: boolean;
}
export interface PluginAuthForm {
    name: string; match: string; apply_to: string[]; auth_type: string;
    token: string; username: string; password: string; header_name: string; header_value: string; enabled: boolean;
}
export type PluginAuthPayload = Pick<PluginAuthForm, 'name' | 'match' | 'apply_to' | 'auth_type' | 'enabled'> & Partial<PluginAuthForm>;
export interface PluginDataResponses {
    plugins: PluginsResponse;
    store: PluginStoreResponse;
    auth: { items?: PluginAuthRule[] };
}
export type PluginConfirmation =
    | { kind: 'install'; plugin: StorePlugin }
    | { kind: 'uninstall'; id: string; plugin?: never }
    | { kind: 'auth'; rule: PluginAuthRule; plugin?: never };
export interface PluginOperationResponse { status: string; [key: string]: unknown }
export interface PluginOperation { title: string; detail?: string; response?: PluginOperationResponse; error?: string }
export type PluginActionsOptions = PluginMutationServices & Pick<PluginServices, 'token'> & {
    installed: Readonly<Ref<Plugin[]>>;
    performDeleteAuth: (rule: PluginAuthRule) => Promise<void>;
};
export interface PluginNode {
    node_id?: string;
    node_name?: string;
    ip?: string;
    healthy?: boolean;
    plugin_report_state: string;
    plugin_report_statuses?: {
        task?: string; status?: string; phase?: string; updated_at?: string; error?: string;
        plugins?: { id: string; install_status?: string; load_status?: string; error?: string }[];
    }[];
}
export interface PluginNodesResponse { nodes?: PluginNode[]; plugin_report_required?: boolean }

export function pluginErrorMessage(error: unknown, fallback: string): string {
    const failure = error as { data?: { message?: string; error?: string }; message?: string } | null | undefined;
    return failure?.data?.message || failure?.data?.error || failure?.message || fallback;
}
