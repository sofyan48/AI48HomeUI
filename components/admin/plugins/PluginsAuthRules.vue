<template>
        <section class="space-y-4">
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
                            <PortalBadge color="neutral" variant="subtle">{{
                                value(row).auth_type
                            }}</PortalBadge>
                            <p
                                v-if="value(row).header_name"
                                class="mt-1 text-xs text-[var(--ui-text-muted)]"
                            >
                                {{ value(row).header_name }}
                            </p>
                        </div></template
                    ><template #scope-cell="{ row }"
                        ><div class="flex flex-wrap gap-1">
                            <PortalBadge
                                v-for="scope in value(row).apply_to || []"
                                :key="scope"
                                color="info"
                                variant="subtle"
                                size="sm"
                                >{{ scopeLabel(scope) }}</PortalBadge
                            ><span
                                v-if="!value(row).apply_to?.length"
                                class="text-sm text-[var(--ui-text-muted)]"
                                >{{ t('plugins.auth.allRequests') }}</span
                            >
                        </div></template
                    ><template #status-cell="{ row }"
                        ><PortalBadge
                            :color="value(row).enabled ? 'success' : 'neutral'"
                            variant="subtle"
                            >{{
                                value(row).enabled ? t('plugins.badge.enabled') : t('plugins.badge.disabled')
                            }}</PortalBadge
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

</template>

<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, openAuthCreate, authColumns, authRules, value, scopeLabel, openAuthEdit, deleteAuth } = usePluginsWorkspace();
</script>
