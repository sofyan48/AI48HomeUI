<template>
        <section class="space-y-4">
            <PortalAlert
                v-if="storeResponse && !storeResponse.plugins_enabled"
                color="warning"
                variant="subtle"
                :title="t('plugins.globallyDisabledTitle')"
                :description="t('plugins.globallyDisabledStore')"
            />
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AdminInput
                    v-model="storeSearch"
                    icon="i-tabler-search"
                    :placeholder="t('plugins.store.searchPlaceholder')"
                    class="w-full"
                /><AdminSelect
                    v-model="sourceFilter"
                    :items="sourceOptions"
                    value-key="value"
                    label-key="label"
                    :aria-label="t('plugins.store.sourceAria')"
                    class="w-full"
                /><AdminSelect
                    v-model="statusFilter"
                    :items="statusOptions"
                    value-key="value"
                    label-key="label"
                    :aria-label="t('plugins.store.statusAria')"
                    class="w-full"
                /><AdminSelect
                    v-model="installFilter"
                    :items="installOptions"
                    value-key="value"
                    label-key="label"
                    :aria-label="t('plugins.store.installTypeAria')"
                    class="w-full"
                />
            </div>
            <p class="text-xs text-[var(--ui-text-muted)]">
                {{ t('plugins.store.entries', { shown: filteredStore.length, total: store.length }) }} ·
                {{ storeResponse?.plugins_dir || "plugins" }}
            </p>
            <div
                v-if="storeResponse?.sources?.length"
                class="flex flex-wrap gap-2 text-xs"
            >
                <span class="text-[var(--ui-text-muted)]">{{ t('plugins.store.sources') }}</span
                ><span v-for="source in storeResponse.sources" :key="source.id"
                    >{{ source.name || source.id
                    }}<span
                        v-if="source.url"
                        class="text-[var(--ui-text-muted)]"
                    >
                        ({{ source.url }})</span
                    ></span
                >
            </div>
            <PortalAlert
                v-for="failure in storeResponse?.source_errors || []"
                :key="failure.source_id"
                color="warning"
                variant="subtle"
                :title="t('plugins.store.sourceFailed', { name: failure.source_name || failure.source_id })"
                :description="failure.message"
            />
            <div class="grid gap-4 lg:grid-cols-2">
                <AppCard
                    v-for="plugin in filteredStore"
                    :key="plugin.store_id || `${plugin.source_id}/${plugin.id}`"
                    ><div class="flex h-full flex-col">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2">
                                    <p class="font-semibold">
                                        {{ plugin.name || plugin.id }}
                                    </p>
                                    <PortalBadge
                                        v-if="plugin.update_available"
                                        color="warning"
                                        variant="subtle"
                                        >{{ t('plugins.badge.update') }}</PortalBadge
                                    >
                                </div>
                                <p
                                    class="mt-1 text-xs text-[var(--ui-text-muted)]"
                                >
                                    {{ plugin.author || t('plugins.store.unknownAuthor') }} ·
                                    {{ plugin.version || t('plugins.store.unversioned') }} ·
                                    {{ plugin.source_name || plugin.source_id }}
                                </p>
                            </div>
                            <PortalBadge
                                :color="
                                    plugin.installed ? 'success' : 'neutral'
                                "
                                variant="subtle"
                                >{{
                                    plugin.installed
                                        ? t('plugins.badge.installedVersion', { version: plugin.installed_version })
                                        : plugin.install_type
                                }}</PortalBadge
                            >
                        </div>
                        <p
                            class="mt-3 flex-1 text-sm text-[var(--ui-text-muted)]"
                        >
                            {{
                                plugin.description || t('plugins.store.noDescription')
                            }}
                        </p>
                        <div class="mt-4 flex flex-wrap gap-1">
                            <PortalBadge
                                v-for="tag in plugin.tags || []"
                                :key="tag"
                                color="neutral"
                                variant="subtle"
                                size="sm"
                                >{{ tag }}</PortalBadge
                            ><PortalBadge
                                v-if="plugin.auth_required"
                                color="warning"
                                variant="subtle"
                                size="sm"
                                >{{ t('plugins.badge.authRequired') }}</PortalBadge
                            >
                        </div>
                        <div
                            class="mt-4 flex flex-wrap items-center justify-between gap-3"
                        >
                            <AppButton
                                color="neutral"
                                variant="link"
                                size="sm"
                                @click="
                                    selectedStore =
                                        selectedStore ===
                                        (plugin.store_id ||
                                            `${plugin.source_id}/${plugin.id}`)
                                            ? ''
                                            : plugin.store_id ||
                                              `${plugin.source_id}/${plugin.id}`
                                "
                                >{{
                                    selectedStore ===
                                    (plugin.store_id ||
                                        `${plugin.source_id}/${plugin.id}`)
                                        ? t('plugins.hideDetails')
                                        : t('common.details')
                                }}</AppButton
                            >
                            <div class="flex gap-2">
                                <AppButton
                                    v-if="plugin.installed"
                                    color="error"
                                    variant="outline"
                                    size="sm"
                                    :loading="busyPlugin === plugin.id"
                                    :disabled="!!busyPlugin"
                                    @click="uninstall(plugin.id)"
                                    >{{ t('plugins.store.uninstall') }}</AppButton
                                ><AppButton
                                    v-if="
                                        !plugin.installed ||
                                        plugin.update_available
                                    "
                                    size="sm"
                                    :loading="busyPlugin === plugin.id"
                                    :disabled="!!busyPlugin"
                                    @click="install(plugin)"
                                    >{{
                                        plugin.update_available
                                            ? t('plugins.store.update')
                                            : t('plugins.store.install')
                                    }}</AppButton
                                >
                            </div>
                        </div>
                        <div v-if="plugin.installed || plugin.configured" class="mt-3 flex flex-wrap items-center gap-3">
                            <AdminSwitch
                                :model-value="plugin.enabled === true"
                                :label="t('plugins.enableNamed', { name: plugin.name || plugin.id })"
                                :loading="busyPlugin === plugin.id"
                                :disabled="!!busyPlugin || configOpen"
                                @update:model-value="togglePlugin(plugin, $event)"
                            />
                            <AppButton
                                color="neutral"
                                variant="outline"
                                size="sm"
                                icon="i-tabler-settings"
                                :disabled="!!busyPlugin || configOpen"
                                @click="openPluginConfig(plugin)"
                            >{{ t('plugins.configure') }}</AppButton>
                            <PortalAlert
                                v-if="pluginMutationError?.id === plugin.id"
                                color="error"
                                variant="subtle"
                                :title="t('plugins.updateFailed')"
                                :description="pluginMutationError.message"
                                class="w-full"
                            />
                        </div>
                        <div
                            v-if="
                                selectedStore ===
                                (plugin.store_id ||
                                    `${plugin.source_id}/${plugin.id}`)
                            "
                            class="mt-3 space-y-2 break-words text-sm text-[var(--ui-text-muted)]"
                        >
                            <p>
                                {{ t('plugins.details.id') }} <code>{{ plugin.id }}</code> · {{ t('plugins.details.source') }}
                                {{ plugin.source_name || plugin.source_id
                                }}<span v-if="plugin.source_url">
                                    · {{ plugin.source_url }}</span
                                >
                            </p>
                            <p>
                                {{ t('plugins.details.storeFlags', { type: plugin.install_type, configured: yesNo(plugin.configured), registered: yesNo(plugin.registered), enabled: yesNo(plugin.enabled), effective: yesNo(plugin.effective_enabled) }) }}
                            </p>
                            <p v-if="plugin.installed">
                                {{ t('plugins.details.installedVersion', { version: plugin.installed_version || t('plugins.reports.unknown') }) }}
                            </p>
                            <p v-if="plugin.platforms?.length">
                                {{
                                    t('plugins.details.platforms', { list: plugin.platforms
                                        .map(
                                            (platform) =>
                                                `${platform.goos}/${platform.goarch}`,
                                        )
                                        .join(", ") })
                                }}
                            </p>
                            <p v-if="plugin.license">
                                {{ t('plugins.details.license', { license: plugin.license }) }}
                            </p>
                            <p v-if="plugin.path">
                                {{ t('plugins.details.path') }} <code>{{ plugin.path }}</code>
                            </p>
                            <p
                                v-for="link in ['repository', 'homepage']"
                                :key="link"
                                v-show="plugin[link]"
                            >
                                {{ link === 'repository' ? t('plugins.details.repository') : t('plugins.details.homepage') }}
                                <a
                                    v-if="safeURL(plugin[link])"
                                    :href="safeURL(plugin[link])"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="underline"
                                    >{{ plugin[link] }}</a
                                ><span v-else> {{ plugin[link] }}</span>
                            </p>
                        </div>
                    </div></AppCard
                >
                <p
                    v-if="!filteredStore.length"
                    class="py-12 text-center text-sm text-[var(--ui-text-muted)] lg:col-span-2"
                >
                    {{ t('plugins.store.empty') }}
                </p>
            </div>
        </section>

</template>

<script setup lang="ts">
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, storeResponse, storeSearch, sourceFilter, sourceOptions, statusFilter, statusOptions, installFilter, installOptions, filteredStore, store, selectedStore, busyPlugin, uninstall, install, configOpen, togglePlugin, openPluginConfig, pluginMutationError, yesNo, safeURL } = usePluginsWorkspace();
</script>
