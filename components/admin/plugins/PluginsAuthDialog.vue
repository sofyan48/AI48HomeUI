<template>
        <AppModal
            v-model:open="authOpen"
            :title="
                editingAuth ? t('plugins.auth.editTitle') : t('plugins.auth.createTitle')
            "
            :description="t('plugins.auth.modalDescription')"
            ><template #body
                ><form class="space-y-4" @submit.prevent="saveAuth">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <AdminField :label="t('common.name')" required
                            ><AdminInput
                                v-model="authForm.name"
                                class="w-full" /></AdminField
                        ><AdminField :label="t('plugins.auth.urlMatch')" required
                            ><AdminInput
                                v-model="authForm.match"
                                class="w-full"
                                placeholder="https://github.com/owner/"
                        /></AdminField>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <AdminField :label="t('plugins.auth.authType')" required
                            ><AdminSelect
                                v-model="authForm.auth_type"
                                :items="authTypes"
                                value-key="value"
                                label-key="label"
                                class="w-full"
                        /></AdminField>
                    </div>
                    <fieldset class="space-y-2">
                        <legend class="text-sm font-medium">{{ t('plugins.auth.applyTo') }}</legend>
                        <div class="flex flex-wrap gap-4">
                            <AdminCheckbox
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
                    <AdminField
                        v-if="
                            ['bearer', 'github-token'].includes(
                                authForm.auth_type,
                            )
                        "
                        :label="t('plugins.auth.token')"
                        ><AdminInput
                            v-model="authForm.token"
                            type="password"
                            class="w-full"
                            :placeholder="
                                editingAuth
                                    ? t('plugins.auth.keepExisting')
                                    : ''
                            "
                    /></AdminField>
                    <div
                        v-if="authForm.auth_type === 'basic'"
                        class="grid gap-4 sm:grid-cols-2"
                    >
                        <AdminField :label="t('plugins.auth.username')"
                            ><AdminInput
                                v-model="authForm.username"
                                class="w-full" /></AdminField
                        ><AdminField :label="t('plugins.auth.password')"
                            ><AdminInput
                                v-model="authForm.password"
                                type="password"
                                class="w-full"
                                :placeholder="
                                    editingAuth
                                        ? t('plugins.auth.keepExisting')
                                        : ''
                                "
                        /></AdminField>
                    </div>
                    <div
                        v-if="authForm.auth_type === 'header'"
                        class="grid gap-4 sm:grid-cols-2"
                    >
                        <AdminField :label="t('plugins.auth.headerName')"
                            ><AdminInput
                                v-model="authForm.header_name"
                                class="w-full" /></AdminField
                        ><AdminField :label="t('plugins.auth.headerValue')"
                            ><AdminInput
                                v-model="authForm.header_value"
                                type="password"
                                class="w-full"
                                :placeholder="
                                    editingAuth
                                        ? t('plugins.auth.keepExisting')
                                        : ''
                                "
                        /></AdminField>
                    </div>
                    <AdminCheckbox
                        v-model="authForm.enabled"
                        :label="t('common.enabled')"
                    /><PortalAlert
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

</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, authOpen, editingAuth, saveAuth, authForm, authTypes, authScopes, scopeLabel, toggleScope, authError, savingAuth } = usePluginsWorkspace();
</script>
