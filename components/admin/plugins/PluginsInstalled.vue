<template>
        <section class="space-y-4">
            <UAlert
                v-if="pluginsResponse && !pluginsResponse.plugins_enabled"
                color="warning"
                variant="subtle"
                :title="t('plugins.globallyDisabledTitle')"
                :description="t('plugins.globallyDisabledInstalled')"
            />
            <div class="grid gap-4 lg:grid-cols-2">
                <AppCard v-for="plugin in installed" :key="plugin.id"
                    ><div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <p class="font-semibold">
                                    {{ plugin.metadata?.name || plugin.id }}
                                </p>
                                <UBadge
                                    :color="
                                        plugin.effective_enabled
                                            ? 'success'
                                            : 'neutral'
                                    "
                                    variant="subtle"
                                    >{{
                                        plugin.effective_enabled
                                            ? t('plugins.badge.effective')
                                            : plugin.enabled
                                              ? t('plugins.badge.enabled')
                                              : t('plugins.badge.disabled')
                                    }}</UBadge
                                >
                            </div>
                            <p
                                class="mt-1 font-mono text-xs text-[var(--ui-text-muted)]"
                            >
                                {{ plugin.id
                                }}<span v-if="plugin.metadata?.version">
                                    · {{ plugin.metadata.version }}</span
                                >
                            </p>
                            <p
                                v-if="plugin.metadata?.author"
                                class="mt-2 text-sm text-[var(--ui-text-muted)]"
                            >
                                {{ t('plugins.byAuthor', { author: plugin.metadata.author }) }}
                            </p>
                        </div>
                        <AppButton
                            v-if="plugin.configured"
                            color="error"
                            variant="ghost"
                            size="sm"
                            icon="i-tabler-trash"
                            :loading="busyPlugin === plugin.id"
                            :disabled="!!busyPlugin"
                            :aria-label="t('plugins.uninstallAria')"
                            @click="uninstall(plugin.id)"
                        />
                    </div>
                    <div class="mt-4 flex flex-wrap gap-1">
                        <UBadge
                            v-if="plugin.registered"
                            color="info"
                            variant="subtle"
                            >{{ t('plugins.badge.registered') }}</UBadge
                        ><UBadge
                            v-if="plugin.configured"
                            color="neutral"
                            variant="subtle"
                            >{{ t('plugins.badge.configured') }}</UBadge
                        ><UBadge
                            v-if="plugin.supports_oauth"
                            color="primary"
                            variant="subtle"
                            >OAuth:
                            {{ plugin.oauth_provider || t('plugins.badge.oauthSupported') }}</UBadge
                        >
                    </div>
                    <div class="mt-4 flex flex-wrap items-center gap-3">
                        <USwitch
                            :model-value="plugin.enabled === true"
                            :label="t('plugins.enableNamed', { name: plugin.metadata?.name || plugin.id })"
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
                    </div>
                    <UAlert
                        v-if="pluginMutationError?.id === plugin.id"
                        class="mt-3"
                        color="error"
                        variant="subtle"
                        :title="t('plugins.updateFailed')"
                        :description="pluginMutationError.message"
                    />
                    <AppButton
                        color="neutral"
                        variant="link"
                        size="sm"
                        class="mt-3"
                        @click="
                            selectedInstalled =
                                selectedInstalled === plugin.id ? '' : plugin.id
                        "
                        >{{
                            selectedInstalled === plugin.id
                                ? t('plugins.hideDetails')
                                : t('common.details')
                        }}</AppButton
                    >
                    <div
                        v-if="selectedInstalled === plugin.id"
                        class="mt-3 space-y-2 break-words text-sm text-[var(--ui-text-muted)]"
                    >
                        <p>
                            {{ t('plugins.details.installedFlags', { configured: yesNo(plugin.configured), registered: yesNo(plugin.registered), enabled: yesNo(plugin.enabled), effective: yesNo(plugin.effective_enabled) }) }}
                        </p>
                        <p v-if="plugin.path">
                            {{ t('plugins.details.path') }} <code>{{ plugin.path }}</code>
                        </p>
                        <p v-if="plugin.metadata?.github_repository">
                            {{ t('plugins.details.repository') }}
                            <a
                                v-if="
                                    safeURL(plugin.metadata.github_repository)
                                "
                                :href="
                                    safeURL(plugin.metadata.github_repository)
                                "
                                target="_blank"
                                rel="noopener noreferrer"
                                class="underline"
                                >{{ plugin.metadata.github_repository }}</a
                            ><span v-else>
                                {{ plugin.metadata.github_repository }}</span
                            >
                        </p>
                        <p
                            v-for="field in plugin.config_fields || []"
                            :key="field.name"
                        >
                            {{ field.name }} ({{ field.type }})<span
                                v-if="field.description"
                            >
                                — {{ field.description }}</span
                            ><span v-if="field.enum_values?.length">
                                · {{ t('plugins.details.options', { list: field.enum_values.join(", ") }) }}</span
                            >
                        </p>
                        <p v-for="menu in plugin.menus || []" :key="menu.path">
                            {{ t('plugins.details.menu', { menu: menu.menu }) }} · {{ menu.path
                            }}<span v-if="menu.description">
                                — {{ menu.description }}</span
                            >
                        </p>
                    </div></AppCard
                >
                <p
                    v-if="!installed.length"
                    class="py-12 text-center text-sm text-[var(--ui-text-muted)] lg:col-span-2"
                >
                    {{ t('plugins.installedEmpty') }}
                </p>
            </div>
        </section>

</template>

<script setup lang="ts">
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, pluginsResponse, installed, busyPlugin, uninstall, configOpen, togglePlugin, openPluginConfig, pluginMutationError, selectedInstalled, yesNo, safeURL } = usePluginsWorkspace();
</script>
