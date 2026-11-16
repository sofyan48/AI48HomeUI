<template>
  <div class="space-y-4">
    <input ref="fileInput" type="file" accept="application/json,.json" multiple class="hidden" @change="uploadFiles">

    <PortalAlert v-if="pageError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('cred.loadFailed')" :description="pageError" />
    <PortalAlert v-if="flightError" color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('cred.flightUnavailable')" :description="flightError" />

    <AccountsListPanel />
    <CreateAccountDialog />
    <AccountDetailsSlideover />
    <ResetCreditDialog />
    <ConnectivityDialog />
    <DeleteCredentialDialogs />
  </div>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { provideUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'
import AccountsListPanel from '~/components/admin/upstream-accounts/list/AccountsListPanel.vue'
import CreateAccountDialog from '~/components/admin/upstream-accounts/create/CreateAccountDialog.vue'
import AccountDetailsSlideover from '~/components/admin/upstream-accounts/details/AccountDetailsSlideover.vue'
import ResetCreditDialog from '~/components/admin/upstream-accounts/dialogs/ResetCreditDialog.vue'
import ConnectivityDialog from '~/components/admin/upstream-accounts/dialogs/ConnectivityDialog.vue'
import DeleteCredentialDialogs from '~/components/admin/upstream-accounts/dialogs/DeleteCredentialDialogs.vue'

const props = defineProps({ attentionRequest: { type: Number, default: 0 }, syncRequest: { type: Number, default: 0 } })
const emit = defineEmits(['changed'])
// Owns every upstream-accounts workspace key; children read it through useUpstreamAccounts().
const { t, pageError, flightError, fileInput, uploadFiles } = provideUpstreamAccounts(props, emit)
</script>
