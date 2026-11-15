<template>
    <div class="space-y-4">
        <UAlert
            v-if="pageError"
            color="error"
            variant="subtle"
            :title="t('plugins.loadFailed')"
            :description="pageError"
        />
        <section class="bay" :aria-label="t('plugins.summaryAria')">
            <div class="bay__slots" aria-hidden="true">
                <span
                    v-for="(plugin, index) in installed.slice(0, 12)"
                    :key="plugin.id || index"
                    class="bay__slot"
                    :class="plugin.effective_enabled ? 'bay__slot--on' : plugin.enabled ? 'bay__slot--idle' : ''"
                    :title="plugin.id"
                />
                <span v-for="index in Math.max(0, 6 - installed.length)" :key="`empty-${index}`" class="bay__slot bay__slot--empty" />
            </div>
            <dl class="bay__stats">
                <div>
                    <dt>{{ t('plugins.stats.installed') }}</dt>
                    <dd>{{ installed.length }}<span>{{ t('plugins.stats.effective', { count: installed.filter((plugin) => plugin.effective_enabled).length }) }}</span></dd>
                </div>
                <div>
                    <dt>{{ t('plugins.stats.inStore') }}</dt>
                    <dd>{{ store.length }}<span>{{ t('plugins.stats.availableToInstall') }}</span></dd>
                </div>
                <div>
                    <dt>{{ t('plugins.stats.authRules') }}</dt>
                    <dd>{{ authRules.length }}<span>{{ t('plugins.stats.accessRules') }}</span></dd>
                </div>
            </dl>
        </section>
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
        <AppCard>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 class="font-semibold">{{ t('plugins.reports.title') }}</h2>
                    <p class="text-xs text-[var(--ui-text-muted)]">
                        {{ t('plugins.reports.description') }}
                    </p>
                </div>
                <AppButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-tabler-refresh"
                    :loading="nodesLoading"
                    @click="startNodePolling"
                    >{{ t('plugins.reports.refresh') }}</AppButton
                >
            </div>
            <UAlert
                v-if="nodesError"
                class="mt-3"
                color="error"
                variant="subtle"
                :title="t('plugins.reports.loadFailed')"
                :description="nodesError"
            />
            <div v-if="nodesResponse" class="mt-4 space-y-3 text-sm">
                <p class="text-[var(--ui-text-muted)]">
                    {{
                        nodesResponse.plugin_report_required
                            ? t('plugins.reports.required')
                            : t('plugins.reports.notRequired')
                    }}
                    · {{ t('plugins.reports.activeNodes', { count: activeNodes.length }) }}
                </p>
                <p
                    v-if="!activeNodes.length"
                    class="text-[var(--ui-text-muted)]"
                >
                    {{ t('plugins.reports.noActiveNodes') }}
                </p>
                <div
                    v-for="(node, index) in activeNodes"
                    :key="`${node.node_id || node.ip}-${index}`"
                    class="rounded-lg border border-[var(--ui-border)] p-3"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <strong>{{
                            node.node_name ||
                            node.node_id ||
                            node.ip ||
                            t('plugins.reports.unknownNode')
                        }}</strong
                        ><span
                            v-if="node.node_name && node.node_id"
                            class="text-xs text-[var(--ui-text-muted)]"
                            >{{ node.node_id }}</span
                        ><UBadge
                            :color="reportColor(node.plugin_report_state)"
                            variant="subtle"
                            >{{ reportLabel(node.plugin_report_state) }}</UBadge
                        ><UBadge
                            v-if="!node.healthy"
                            color="warning"
                            variant="subtle"
                            >{{ t('plugins.reports.nodeUnhealthy') }}</UBadge
                        >
                    </div>
                    <div
                        v-for="(
                            report, reportIndex
                        ) in node.plugin_report_statuses || []"
                        :key="reportIndex"
                        class="mt-2 break-words text-xs text-[var(--ui-text-muted)]"
                    >
                        <p>
                            {{ report.task || t('plugins.reports.pluginTask') }} ·
                            {{ report.status || t('plugins.reports.unknown')
                            }}<span v-if="report.phase">
                                · {{ report.phase }}</span
                            ><span v-if="report.updated_at">
                                · {{ report.updated_at }}</span
                            >
                        </p>
                        <p
                            v-for="(item, itemIndex) in report.plugins || []"
                            :key="itemIndex"
                            class="pl-3"
                        >
                            {{ item.id }} ·
                            {{ t('plugins.reports.install', { status: item.install_status || t('plugins.reports.unknown') }) }} ·
                            {{ t('plugins.reports.load', { status: item.load_status || t('plugins.reports.unknown') })
                            }}<span v-if="item.error"> · {{ item.error }}</span>
                        </p>
                        <p v-if="report.error" class="pl-3">
                            {{ report.error }}
                        </p>
                    </div>
                </div>
                <p
                    v-if="pollExpired"
                    class="text-xs text-[var(--ui-text-muted)]"
                >
                    {{ t('plugins.reports.pollExpired') }}
                </p>
            </div>
        </AppCard>
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

        <section v-if="section === 'installed'" class="space-y-4">
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

        <section v-else-if="section === 'store'" class="space-y-4">
            <UAlert
                v-if="storeResponse && !storeResponse.plugins_enabled"
                color="warning"
                variant="subtle"
                :title="t('plugins.globallyDisabledTitle')"
                :description="t('plugins.globallyDisabledStore')"
            />
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <UInput
                    v-model="storeSearch"
                    icon="i-tabler-search"
                    :placeholder="t('plugins.store.searchPlaceholder')"
                    class="w-full"
                /><USelect
                    v-model="sourceFilter"
                    :items="sourceOptions"
                    value-key="value"
                    label-key="label"
                    :aria-label="t('plugins.store.sourceAria')"
                    class="w-full"
                /><USelect
                    v-model="statusFilter"
                    :items="statusOptions"
                    value-key="value"
                    label-key="label"
                    :aria-label="t('plugins.store.statusAria')"
                    class="w-full"
                /><USelect
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
            <UAlert
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
                                    <UBadge
                                        v-if="plugin.update_available"
                                        color="warning"
                                        variant="subtle"
                                        >{{ t('plugins.badge.update') }}</UBadge
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
                            <UBadge
                                :color="
                                    plugin.installed ? 'success' : 'neutral'
                                "
                                variant="subtle"
                                >{{
                                    plugin.installed
                                        ? t('plugins.badge.installedVersion', { version: plugin.installed_version })
                                        : plugin.install_type
                                }}</UBadge
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
                            <UBadge
                                v-for="tag in plugin.tags || []"
                                :key="tag"
                                color="neutral"
                                variant="subtle"
                                size="sm"
                                >{{ tag }}</UBadge
                            ><UBadge
                                v-if="plugin.auth_required"
                                color="warning"
                                variant="subtle"
                                size="sm"
                                >{{ t('plugins.badge.authRequired') }}</UBadge
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
                            <USwitch
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
                            <UAlert
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

        <section v-else class="space-y-4">
            <div class="flex justify-end">
                <AppButton icon="i-tabler-plus" @click="openAuthCreate"
                    >{{ t('plugins.auth.newRule') }}</AppButton
                >
            </div>
            <AppCard :ui="{ body: 'p-0' }"
                ><AppTable :columns="authColumns" :data="authRules" searchable :search-placeholder="t('plugins.auth.searchPlaceholder')"
                    ><template #identity-cell="{ row }"
                        ><div>
                            <p class="font-medium">{{ value(row).name }}</p>
                            <p
                                class="mt-1 font-mono text-xs text-[var(--ui-text-muted)]"
                            >
                                {{ value(row).match }}
                            </p>
                        </div></template
                    ><template #type-cell="{ row }"
                        ><div>
                            <UBadge color="neutral" variant="subtle">{{
                                value(row).auth_type
                            }}</UBadge>
                            <p
                                v-if="value(row).header_name"
                                class="mt-1 text-xs text-[var(--ui-text-muted)]"
                            >
                                {{ value(row).header_name }}
                            </p>
                        </div></template
                    ><template #scope-cell="{ row }"
                        ><div class="flex flex-wrap gap-1">
                            <UBadge
                                v-for="scope in value(row).apply_to || []"
                                :key="scope"
                                color="info"
                                variant="subtle"
                                size="sm"
                                >{{ scopeLabel(scope) }}</UBadge
                            ><span
                                v-if="!value(row).apply_to?.length"
                                class="text-sm text-[var(--ui-text-muted)]"
                                >{{ t('plugins.auth.allRequests') }}</span
                            >
                        </div></template
                    ><template #status-cell="{ row }"
                        ><UBadge
                            :color="value(row).enabled ? 'success' : 'neutral'"
                            variant="subtle"
                            >{{
                                value(row).enabled ? t('plugins.badge.enabled') : t('plugins.badge.disabled')
                            }}</UBadge
                        ></template
                    ><template #actions-cell="{ row }"
                        ><div class="flex justify-end gap-1">
                            <AdminTableAction
                                action="edit"
                                :label="t('plugins.auth.editAria')"
                                @click="openAuthEdit(value(row))"
                            /><AdminTableAction
                                action="delete"
                                :label="t('plugins.auth.deleteAria')"
                                destructive
                                @click="deleteAuth(value(row))"
                            /></div></template
                    ><template #empty
                        ><div
                            class="py-8 text-center text-sm text-[var(--ui-text-muted)]"
                        >
                            {{ t('plugins.auth.empty') }}
                        </div></template
                    ></AppTable
                ></AppCard
            >
        </section>

        <AppModal v-model:open="confirmationOpen" :title="confirmationTitle" :dismissible="!confirmationBusy" :close="!confirmationBusy">
          <template #body>
            <form class="space-y-4" @submit.prevent="performConfirmedAction">
              <p class="text-sm">{{ confirmationDescription }}</p>
              <template v-if="confirmation?.kind === 'install'">
                <p class="break-all text-sm">{{ t('plugins.confirm.source', { source: confirmation.plugin.source_name || confirmation.plugin.source_id, url: confirmation.plugin.source_url }) }}</p>
                <UFormField :label="t('plugins.confirm.version')" :hint="t('plugins.confirm.versionHint')">
                  <UInput v-model="installVersion" :placeholder="confirmation.plugin.version || t('plugins.confirm.latestRelease')" :disabled="confirmationBusy" class="w-full" />
                </UFormField>
                <UAlert color="warning" variant="subtle" :title="t('plugins.confirm.trustTitle')" :description="t('plugins.confirm.trustDescription')" />
                <UFormField :label="t('plugins.confirm.typeId', { id: installTrust.confirmation })">
                  <UInput v-model="typedConfirmation" :disabled="confirmationBusy" :spellcheck="false" autocomplete="off" class="w-full" />
                </UFormField>
              </template>
              <div class="flex justify-end gap-3">
                <AppButton type="button" color="neutral" variant="outline" :disabled="confirmationBusy" @click="confirmationOpen = false">{{ t('common.cancel') }}</AppButton>
                <AppButton type="submit" :color="confirmation?.kind === 'install' ? 'primary' : 'error'" :loading="confirmationBusy" :disabled="!canConfirmAction">{{ confirmation?.kind === 'install' ? t('plugins.store.install') : confirmation?.kind === 'uninstall' ? t('plugins.store.uninstall') : t('plugins.confirm.deleteRule') }}</AppButton>
              </div>
            </form>
          </template>
        </AppModal>
        <AdminPluginConfigEditor
            v-model:open="configOpen"
            :plugin="configPlugin"
            :disabled="!!busyPlugin"
            @saved="refreshAll"
        />
        <AppModal
            v-model:open="authOpen"
            :title="
                editingAuth ? t('plugins.auth.editTitle') : t('plugins.auth.createTitle')
            "
            :description="t('plugins.auth.modalDescription')"
            ><template #body
                ><form class="space-y-4" @submit.prevent="saveAuth">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <UFormField :label="t('common.name')" required
                            ><UInput
                                v-model="authForm.name"
                                class="w-full" /></UFormField
                        ><UFormField :label="t('plugins.auth.urlMatch')" required
                            ><UInput
                                v-model="authForm.match"
                                class="w-full"
                                placeholder="https://github.com/owner/"
                        /></UFormField>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <UFormField :label="t('plugins.auth.authType')" required
                            ><USelect
                                v-model="authForm.auth_type"
                                :items="authTypes"
                                value-key="value"
                                label-key="label"
                                class="w-full"
                        /></UFormField>
                    </div>
                    <fieldset class="space-y-2">
                        <legend class="text-sm font-medium">{{ t('plugins.auth.applyTo') }}</legend>
                        <div class="flex flex-wrap gap-4">
                            <UCheckbox
                                v-for="scope in authScopes"
                                :key="scope"
                                :model-value="authForm.apply_to.includes(scope)"
                                :label="scopeLabel(scope)"
                                @update:model-value="toggleScope(scope, $event)"
                            />
                        </div>
                        <p class="text-xs text-[var(--ui-text-muted)]">
                            {{ t('plugins.auth.applyToHint') }}
                        </p>
                    </fieldset>
                    <UFormField
                        v-if="
                            ['bearer', 'github-token'].includes(
                                authForm.auth_type,
                            )
                        "
                        :label="t('plugins.auth.token')"
                        ><UInput
                            v-model="authForm.token"
                            type="password"
                            class="w-full"
                            :placeholder="
                                editingAuth
                                    ? t('plugins.auth.keepExisting')
                                    : ''
                            "
                    /></UFormField>
                    <div
                        v-if="authForm.auth_type === 'basic'"
                        class="grid gap-4 sm:grid-cols-2"
                    >
                        <UFormField :label="t('plugins.auth.username')"
                            ><UInput
                                v-model="authForm.username"
                                class="w-full" /></UFormField
                        ><UFormField :label="t('plugins.auth.password')"
                            ><UInput
                                v-model="authForm.password"
                                type="password"
                                class="w-full"
                                :placeholder="
                                    editingAuth
                                        ? t('plugins.auth.keepExisting')
                                        : ''
                                "
                        /></UFormField>
                    </div>
                    <div
                        v-if="authForm.auth_type === 'header'"
                        class="grid gap-4 sm:grid-cols-2"
                    >
                        <UFormField :label="t('plugins.auth.headerName')"
                            ><UInput
                                v-model="authForm.header_name"
                                class="w-full" /></UFormField
                        ><UFormField :label="t('plugins.auth.headerValue')"
                            ><UInput
                                v-model="authForm.header_value"
                                type="password"
                                class="w-full"
                                :placeholder="
                                    editingAuth
                                        ? t('plugins.auth.keepExisting')
                                        : ''
                                "
                        /></UFormField>
                    </div>
                    <UCheckbox
                        v-model="authForm.enabled"
                        :label="t('common.enabled')"
                    /><UAlert
                        v-if="authError"
                        color="error"
                        variant="subtle"
                        :description="authError"
                    />
                    <div class="flex justify-end gap-3">
                        <AppButton
                            color="neutral"
                            variant="ghost"
                            type="button"
                            @click="authOpen = false"
                            >{{ t('common.cancel') }}</AppButton
                        ><AppButton type="submit" :loading="savingAuth"
                            >{{ t('common.save') }}</AppButton
                        >
                    </div>
                </form></template
            ></AppModal
        >
    </div>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { useStoreData } from '~/composables/useStoreData'
import { pluginInstallTrust } from '~/composables/pluginInstallTrust'
const { fetchAPI, token } = useApi();
const { t } = useAdminI18n();
const toast = useToast();
const value = (row) => row?.original ?? row;
const yesNo = (flag) => (flag ? t('common.yes') : t('common.no'));
const section = ref("installed");
const sections = computed(() => [
    { label: t('plugins.section.installed'), value: "installed" },
    { label: t('plugins.section.store'), value: "store" },
    { label: t('plugins.section.auth'), value: "auth" },
]);
const pageError = useWorkspaceState('admin:plugins:pageError', () => (""));
const storeSearch = ref("");
const sourceFilter = ref("all");
const statusFilter = ref("all");
const installFilter = ref("all");
const selectedInstalled = ref("");
const selectedStore = ref("");
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
async function loadAll() {
    pageError.value = "";
    const result = {};
    const failures = [];
    await Promise.all(
        [
            ["plugins", "/plugins"],
            ["store", "/plugins/store"],
            ["auth", "/plugin-store-auth"],
        ].map(async ([key, path]) => {
            try {
                result[key] = await fetchAPI(path);
            } catch (error) {
                failures.push(`${key}: ${message(error)}`);
                result[key] = key === "auth" ? { items: [] } : { plugins: [] };
            }
        }),
    );
    pageError.value = failures.join(" · ");
    return result;
}
const {
    data,
    pending,
    refresh: refreshData,
} = useStoreData('admin:plugins:management-plugins', loadAll);
const nodesResponse = useWorkspaceState('admin:plugins:nodesResponse', () => (null));
const nodesError = useWorkspaceState('admin:plugins:nodesError', () => (""));
const nodesLoading = useWorkspaceState('admin:plugins:nodesLoading', () => (false));
const pollExpired = useWorkspaceState('admin:plugins:pollExpired', () => (false));
const activeNodes = computed(() =>
    Array.isArray(nodesResponse.value?.nodes) ? nodesResponse.value.nodes : [],
);
const pollDuration = 60000;
const pollInterval = 5000;
let pollUntil = 0;
let pollTimer;
let pollGeneration = 0;
function reportLabel(state) {
    return (
        {
            not_required: t('plugins.reports.state.notRequired'),
            missing_report: t('plugins.reports.state.missing'),
            reported_partial: t('plugins.reports.state.partial'),
            reported_failed: t('plugins.reports.state.failed'),
            reported_ok: t('plugins.reports.state.ok'),
        }[state] || t('plugins.reports.state.unavailable')
    );
}
function reportColor(state) {
    return (
        {
            not_required: "neutral",
            missing_report: "warning",
            reported_partial: "warning",
            reported_failed: "error",
            reported_ok: "success",
        }[state] || "neutral"
    );
}
function scheduleNodePoll(generation) {
    if (generation !== pollGeneration || document.hidden) return;
    clearTimeout(pollTimer);
    const remaining = pollUntil - Date.now();
    if (remaining <= 0) {
        pollExpired.value = true;
        return;
    }
    pollTimer = setTimeout(
        () => {
            pollTimer = undefined;
            void loadNodes(generation);
        },
        Math.min(pollInterval, remaining),
    );
}
async function loadNodes(generation) {
    if (generation !== pollGeneration || document.hidden || nodesLoading.value)
        return;
    nodesLoading.value = true;
    try {
        const response = await fetchAPI("/nodes");
        if (generation !== pollGeneration) return;
        nodesResponse.value = response;
        nodesError.value = "";
    } catch (error) {
        if (generation === pollGeneration) nodesError.value = message(error);
    } finally {
        nodesLoading.value = false;
        scheduleNodePoll(pollGeneration);
    }
}
function startNodePolling() {
    if (import.meta.server) return;
    clearTimeout(pollTimer);
    pollGeneration++;
    pollUntil = Date.now() + pollDuration;
    pollExpired.value = false;
    if (!nodesLoading.value) void loadNodes(pollGeneration);
    else scheduleNodePoll(pollGeneration);
}
function onVisibilityChange() {
    clearTimeout(pollTimer);
    if (!document.hidden) {
        if (pollUntil > Date.now()) {
            if (!nodesLoading.value) void loadNodes(pollGeneration);
            else scheduleNodePoll(pollGeneration);
        } else pollExpired.value = true;
    }
}
useDataSync('admin:plugins:sync', () => loadNodes(pollGeneration));
onMounted(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    startNodePolling();
});
onUnmounted(() => {
    pollGeneration++;
    clearTimeout(pollTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
});
async function refreshAll() {
    await refreshData();
    startNodePolling();
}
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
function safeURL(raw) {
    try {
        const url = new URL(raw);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}
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
function message(error) {
    return (
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        t('plugins.unexpectedError')
    );
}
</script>

<style scoped>
/* Plugins signature: module bay of slot LEDs, one per installed plugin. */
.bay {
    display: grid;
    gap: 1rem 2rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--admin-panel-border);
    border-radius: 0.875rem;
    background:
        radial-gradient(ellipse 60% 140% at 0% 50%, color-mix(in oklch, var(--page-accent) 12%, transparent), transparent 70%),
        var(--admin-panel-bg);
    box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
@media (min-width: 64rem) { .bay { grid-template-columns: auto minmax(0, 1fr); align-items: center; } }
.bay__slots {
    display: grid;
    width: fit-content;
    grid-template-columns: repeat(6, 1.75rem);
    gap: 0.375rem;
    padding: 0.5rem;
    border-radius: 0.75rem;
    background: oklch(0.2 0.02 270);
}
.bay__slot { position: relative; height: 1.75rem; border-radius: 0.375rem; background: rgb(255 255 255 / 8%); }
.bay__slot::after { position: absolute; top: 0.3125rem; left: 0.3125rem; width: 0.3125rem; height: 0.3125rem; border-radius: 9999px; background: rgb(255 255 255 / 20%); content: ''; }
.bay__slot--on { background: color-mix(in oklch, var(--page-accent) 35%, rgb(255 255 255 / 6%)); }
.bay__slot--on::after { background: var(--color-emerald-400); box-shadow: 0 0 6px var(--color-emerald-400); }
.bay__slot--idle::after { background: var(--color-amber-400); }
.bay__slot--empty { background: transparent; outline: 1px dashed rgb(255 255 255 / 14%); outline-offset: -1px; }
.bay__slot--empty::after { display: none; }
.bay__stats { display: grid; gap: 0.75rem 1.5rem; }
@media (min-width: 40rem) { .bay__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.bay__stats dt { font-size: 0.75rem; color: var(--ui-text-muted); }
.bay__stats dd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; font-family: var(--admin-display-font); font-size: 1.5rem; line-height: 2rem; font-weight: 800; color: var(--ui-text-highlighted); }
.bay__stats dd span { font-family: inherit; font-size: 0.75rem; font-weight: 500; color: var(--ui-text-muted); }
</style>
