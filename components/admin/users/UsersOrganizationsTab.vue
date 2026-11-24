<template>
  <AdminTablePanel :title="t('users.organizations')" :description="t('users.organizationsDescription')">
    <template #actions>
      <AppButton variant="outline" :loading="loading" :disabled="loading || saving" @click="reload">{{ t('users.organizationReload') }}</AppButton>
      <AppButton icon="i-tabler-plus" :disabled="!loaded || unavailable || !!loadError || loading || saving" @click="openCreate">{{ t('users.organizationNew') }}</AppButton>
    </template>
    <div class="flex flex-col gap-3">
      <PortalAlert v-if="unavailable" color="info" :description="t('users.organizationsUnavailable')" />
      <PortalAlert v-else-if="loadError" color="error" :description="loadError" />
      <PortalAlert v-if="!accessGroupsSupported" color="info" :description="t('users.organizationAccessUnsupported')" />
      <AppTable v-if="!unavailable && !loadError" :columns="columns" :data="organizations" :loading="loading">
        <template #owners-cell="{ row }">{{ row.original.owners?.join(', ') || t('users.organizationNoOwner') }}</template>
        <template #credentialScope-cell="{ row }">
          {{ scopeText(row.original.channel_groups, channelName) }}
        </template>
        <template #modelScope-cell="{ row }">{{ scopeText(row.original.model_groups, modelGroupName) }}</template>
        <template #actions-cell="{ row }">
          <AppButton size="sm" variant="outline" :disabled="!accessGroupsSupported || saving || loading" @click="openEdit(row.original)">{{ t('users.organizationEditScope') }}</AppButton>
        </template>
        <template #empty><AppEmptyState icon="i-tabler-building" :text="t('users.organizationsEmpty')" /></template>
      </AppTable>
    </div>
  </AdminTablePanel>

  <AppFormModal
    v-model:open="open"
    :title="editing ? t('users.organizationEditScope') : t('users.organizationNew')"
    :description="editing ? editing.name : t('users.organizationsDescription')"
    :error="formError"
    :submit-label="editing ? t('users.saveChanges') : t('users.organizationCreate')"
    :loading="saving"
    :locked="saving"
    :submit-disabled="!canSubmit"
    content-class="sm:max-w-xl"
    @submit="submit"
  >
    <FieldGroup>
      <template v-if="!editing">
        <AdminField :label="t('users.organizationName')" required>
          <AdminInput v-model="name" :disabled="saving" required />
        </AdminField>
        <AdminField :label="t('users.owner')" :description="t('users.organizationOwnerHint')">
          <AdminSelectMenu v-model="ownerId" :items="ownerOptions" value-key="value" label-key="label" :disabled="saving || usersLoading" />
        </AdminField>
      </template>
      <p v-if="detailLoading" role="status">{{ t('users.organizationLoadingScope') }}</p>
      <AppButton v-else-if="editing && !detailReady" variant="outline" @click="loadDetail">{{ t('users.organizationRetryScope') }}</AppButton>
      <template v-if="!detailLoading && (!editing || detailReady)">
        <template v-if="scopeSupported">
          <UsersScopePicker
            :title="t('users.credentialScope')"
            :empty-label="t('users.noCredentialScopesCreated')"
            :items="scopeOptions"
            :selected="selected"
            :disabled="saving"
            @toggle="toggleScope"
          />
          <p class="text-sm text-muted-foreground">{{ t('users.organizationScopeHint') }}</p>
        </template>
        <PortalAlert v-else color="info" :description="!accessGroupsSupported ? t('users.organizationAccessUnsupported') : t('users.organizationScopeUnverified')" />
      </template>
    </FieldGroup>
  </AppFormModal>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AdminTablePanel from '~/components/admin/general/TablePanel.vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { FieldGroup } from '~/components/ui/field'
import UsersScopePicker from './UsersScopePicker.vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { useOrganizations } from '~/composables/users/useOrganizations'
import { useDataSync } from '~/composables/useDataSync'

const { t, accessGroupsSupported, channelName, modelGroupName, scopeSummary } = useUsersWorkspace()
const {
  organizations, loading, loaded, unavailable, loadError, reload,
  open, editing, detailLoading, saving, formError, name, ownerId, selected,
  detailReady, scopeSupported, canSubmit, scopeOptions, ownerOptions, usersLoading,
  openCreate, openEdit, loadDetail, toggleScope, submit
} = useOrganizations()
const columns = computed(() => [
  { accessorKey: 'name', header: t('users.organizationName') },
  { accessorKey: 'owners', header: t('users.owner') },
  { accessorKey: 'member_count', header: t('users.organizationMembers') },
  { id: 'credentialScope', header: t('users.credentialScope') },
  { id: 'modelScope', header: t('users.modelScope') },
  { id: 'actions', header: t('common.actions') }
])
const scopeText = (ids: number[] | undefined, label: (id: unknown) => string) =>
  ids === undefined ? t('users.notReturned') : scopeSummary(ids.map(label))
useDataSync('admin:users:organizations:sync', reload)
onMounted(reload)
</script>
