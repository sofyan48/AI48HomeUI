<template>
  <section class="grid gap-4">
    <PortalAlert v-if="capabilitiesError" color="warning" variant="subtle" :title="t('users.capabilityFailed')" :description="capabilitiesError" />
    <PortalAlert v-if="pageErrors.length" color="warning" variant="subtle" :title="t('users.partialLoadFailed')" :description="pageErrors.join(' · ')" />
    <PortalAlert v-if="!usersSupported" color="info" variant="subtle" :title="t('users.unsupportedTitle')" :description="t('users.unsupportedDescription')" />

    <template v-else>
      <UsersMembersSummary />
      <AppPanelTabs v-model="activeTab" :items="tabs" :label="t('users.tabsLabel')" />

      <UsersUsersTab
        v-if="activeTab === 'users'"
        @create="userForm?.openCreate()"
        @view="detail?.openFor($event)"
        @edit="userForm?.openEdit($event)"
        @balance="balance?.openFor($event)"
        @reset="openResetAllowance"
        @approve="approval?.openFor($event)"
        @topup="topupApproval?.openFor($event)"
        @delete="remove?.openFor('user', $event)"
      />
      <UsersKeysTab
        v-else-if="activeTab === 'keys'"
        @create="keyForm?.openCreate()"
        @edit="keyForm?.openEdit($event)"
        @delete="remove?.openFor('key', $event)"
      />
      <UsersCredentialScopesTab
        v-else-if="activeTab === 'channelGroups'"
        @create="groupForm?.openFor('channel')"
        @edit="groupForm?.openFor('channel', $event)"
        @delete="remove?.openFor('group', $event, 'channel')"
        @bind="binding?.openFor('credential', $event)"
        @delete-detail="remove?.openFor('detail', $event, 'channel')"
      />
      <UsersModelScopesTab
        v-else
        @create="groupForm?.openFor('model')"
        @edit="groupForm?.openFor('model', $event)"
        @delete="remove?.openFor('group', $event, 'model')"
        @bind="binding?.openFor('model', $event)"
        @delete-detail="remove?.openFor('detail', $event, 'model')"
      />
    </template>

    <UsersUserFormDialog ref="userForm" />
    <UsersDetailDrawer ref="detail" />
    <UsersKeyFormDialog ref="keyForm" />
    <UsersGroupFormDialog ref="groupForm" />
    <UsersBindingDialog ref="binding" />
    <UsersBalanceDialog ref="balance" />
    <UsersApprovalDialog ref="approval" />
    <UsersTopupApprovalDialog ref="topupApproval" />
    <UsersResetAllowance v-model:open="resetAllowanceOpen" :user="resetAllowanceUser" @saved="syncAll" />
    <UsersDeleteDialog ref="remove" />
  </section>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { computed, ref } from 'vue'
import { useDataSync } from '~/composables/useDataSync'
import { provideUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { isOperableUser, type AnyRecord } from '~/composables/users/common'
import UsersApprovalDialog from '~/components/admin/users/UsersApprovalDialog.vue'
import UsersBalanceDialog from '~/components/admin/users/UsersBalanceDialog.vue'
import UsersBindingDialog from '~/components/admin/users/UsersBindingDialog.vue'
import UsersCredentialScopesTab from '~/components/admin/users/UsersCredentialScopesTab.vue'
import UsersDeleteDialog from '~/components/admin/users/UsersDeleteDialog.vue'
import UsersDetailDrawer from '~/components/admin/users/UsersDetailDrawer.vue'
import UsersGroupFormDialog from '~/components/admin/users/UsersGroupFormDialog.vue'
import UsersKeyFormDialog from '~/components/admin/users/UsersKeyFormDialog.vue'
import UsersKeysTab from '~/components/admin/users/UsersKeysTab.vue'
import UsersMembersSummary from '~/components/admin/users/UsersMembersSummary.vue'
import UsersModelScopesTab from '~/components/admin/users/UsersModelScopesTab.vue'
import UsersResetAllowance from '~/components/admin/users/UsersResetAllowance.vue'
import UsersTopupApprovalDialog from '~/components/admin/users/UsersTopupApprovalDialog.vue'
import UsersUserFormDialog from '~/components/admin/users/UsersUserFormDialog.vue'
import UsersUsersTab from '~/components/admin/users/UsersUsersTab.vue'

// All page state lives in useUsersWorkspace(); tabs and dialogs read it through inject.
const { t, capabilitiesError, pageErrors, usersSupported, resetAllowanceSupported, activeTab, syncAll } = provideUsersWorkspace()

const tabs = computed(() => [
  { label: t('common.users'), value: 'users' },
  { label: t('users.clientKeys'), value: 'keys' },
  { label: t('users.credentialScopes'), value: 'channelGroups' },
  { label: t('users.modelScopes'), value: 'modelGroups' }
])

const userForm = ref<InstanceType<typeof UsersUserFormDialog> | null>(null)
const detail = ref<InstanceType<typeof UsersDetailDrawer> | null>(null)
const keyForm = ref<InstanceType<typeof UsersKeyFormDialog> | null>(null)
const groupForm = ref<InstanceType<typeof UsersGroupFormDialog> | null>(null)
const binding = ref<InstanceType<typeof UsersBindingDialog> | null>(null)
const balance = ref<InstanceType<typeof UsersBalanceDialog> | null>(null)
const approval = ref<InstanceType<typeof UsersApprovalDialog> | null>(null)
const topupApproval = ref<InstanceType<typeof UsersTopupApprovalDialog> | null>(null)
const remove = ref<InstanceType<typeof UsersDeleteDialog> | null>(null)

const resetAllowanceOpen = ref(false)
const resetAllowanceUser = ref<AnyRecord | null>(null)
function openResetAllowance(user: AnyRecord) {
  if (!resetAllowanceSupported.value || !isOperableUser(user)) return
  resetAllowanceUser.value = user
  resetAllowanceOpen.value = true
}

useDataSync('admin:users:sync', syncAll)
await syncAll()
</script>
