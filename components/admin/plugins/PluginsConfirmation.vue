<template>
        <AppModal v-model:open="confirmationOpen" centered :title="confirmationTitle" :dismissible="!confirmationBusy" :close="!confirmationBusy">
          <template #body>
            <form class="space-y-4" @submit.prevent="performConfirmedAction">
              <p class="text-sm">{{ confirmationDescription }}</p>
              <template v-if="confirmation?.kind === 'install'">
                <p class="break-all text-sm">{{ t('plugins.confirm.source', { source: confirmation.plugin.source_name || confirmation.plugin.source_id, url: confirmation.plugin.source_url }) }}</p>
                <AdminField :label="t('plugins.confirm.version')" :hint="t('plugins.confirm.versionHint')">
                  <AdminInput v-model="installVersion" :placeholder="confirmation.plugin.version || t('plugins.confirm.latestRelease')" :disabled="confirmationBusy" class="w-full" />
                </AdminField>
                <PortalAlert color="warning" variant="subtle" :title="t('plugins.confirm.trustTitle')" :description="t('plugins.confirm.trustDescription')" />
                <AdminField :label="t('plugins.confirm.typeId', { id: installTrust.confirmation })">
                  <AdminInput v-model="typedConfirmation" :disabled="confirmationBusy" :spellcheck="false" autocomplete="off" class="w-full" />
                </AdminField>
              </template>
              <div class="flex justify-end gap-3">
                <AppButton type="button" color="neutral" variant="outline" :disabled="confirmationBusy" @click="confirmationOpen = false">{{ t('common.cancel') }}</AppButton>
                <AppButton type="submit" :color="confirmation?.kind === 'install' ? 'primary' : 'error'" :loading="confirmationBusy" :disabled="!canConfirmAction">{{ confirmation?.kind === 'install' ? t('plugins.store.install') : confirmation?.kind === 'uninstall' ? t('plugins.store.uninstall') : t('plugins.confirm.deleteRule') }}</AppButton>
              </div>
            </form>
          </template>
        </AppModal>

</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { usePluginsWorkspace } from "~/composables/plugins/usePluginsWorkspace"
const { t, confirmationOpen, confirmationTitle, confirmationBusy, performConfirmedAction, confirmationDescription, confirmation, installVersion, installTrust, typedConfirmation, canConfirmAction } = usePluginsWorkspace();
</script>
