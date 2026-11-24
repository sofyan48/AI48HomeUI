<template>
  <AppFormModal
    v-model:open="orgFormOpen"
    :title="editingOrg ? t('organizations.editTitle') : t('organizations.addTitle')"
    :description="t('organizations.formDescription')"
    :error="orgFormError"
    :submit-label="editingOrg ? t('organizations.saveChanges') : t('organizations.create')"
    :loading="orgSaving"
    :locked="orgSaving"
    @submit="saveOrg"
  >
    <AdminField :label="t('organizations.col.name')" required>
      <AdminInput v-model="orgForm.name" class="w-full" placeholder="acme" />
    </AdminField>
    <AdminField :label="t('organizations.col.credits')" :help="t('organizations.creditsHelp')">
      <AdminInput v-model="orgForm.credits" inputmode="decimal" class="w-full" placeholder="0" />
    </AdminField>
    <AdminField v-if="!editingOrg" :label="t('organizations.owner')" :help="t('organizations.ownerHelp')">
      <AdminSearchSelect
        v-model="orgForm.ownerUserId"
        :items="userOptions"
        :disabled="usersLoading"
        :placeholder="usersLoading ? t('organizations.usersLoading') : t('organizations.searchUser')"
        :aria-label="t('organizations.owner')"
        :empty-text="t('organizations.noUserMatch')"
        :more-text="t('organizations.moreUsers')"
        :clear-label="t('organizations.clearSelection')"
      />
    </AdminField>
    <div class="flex items-center justify-between gap-3 rounded-md border border-[var(--ui-border)] px-3 py-2.5">
      <div>
        <p class="text-sm font-medium">{{ t('organizations.allowMemberKeys') }}</p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.allowMemberKeysHelp') }}</p>
      </div>
      <AdminSwitch v-model="orgForm.allowMemberKeys" :aria-label="t('organizations.allowMemberKeys')" :disabled="orgSaving" />
    </div>
    <AdminField :label="t('organizations.modelGroups')" :help="t('organizations.modelGroupsHelp')">
      <div class="grid gap-2 rounded-md border border-[var(--ui-border)] p-2">
        <div v-if="modelGroupsLoading" class="grid gap-2">
          <PortalSkeleton v-for="row in 3" :key="row" class="h-8" />
        </div>
        <div v-else-if="modelGroupsError" class="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
          <p class="text-sm text-[var(--ui-error)]">{{ modelGroupsError }}</p>
          <AppButton type="button" size="xs" color="neutral" variant="outline" icon="i-tabler-refresh" @click="loadModelGroups(true)">{{ t('common.retry') }}</AppButton>
        </div>
        <p v-else-if="!modelGroupOptions.length" class="px-1 py-2 text-sm text-[var(--ui-text-muted)]">{{ t('organizations.modelGroupsEmpty') }}</p>
        <template v-else>
          <div class="flex items-center justify-between gap-2 px-1">
            <span class="text-xs text-[var(--ui-text-muted)]">{{ orgForm.modelGroups.length ? t('organizations.modelGroupsSelected', { count: orgForm.modelGroups.length }) : t('organizations.allModels') }}</span>
            <AppButton v-if="orgForm.modelGroups.length" type="button" size="xs" color="neutral" variant="ghost" @click="orgForm.modelGroups = []">{{ t('organizations.clearSelection') }}</AppButton>
          </div>
          <div class="grid max-h-56 gap-1 overflow-y-auto">
            <AdminCheckbox
              v-for="group in modelGroupOptions"
              :key="group.id"
              :model-value="orgForm.modelGroups.includes(group.id)"
              :label="group.name"
              :description="group.disabled ? t('organizations.modelGroupDisabled') : undefined"
              class="rounded-md px-2 py-1.5 hover:bg-[var(--ui-bg-muted)]"
              @update:model-value="toggleModelGroup(group.id, $event === true)"
            />
          </div>
        </template>
      </div>
    </AdminField>
  </AppFormModal>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSearchSelect from '~/components/admin/general/controls/AdminSearchSelect.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'

const {
  t, orgFormOpen, orgForm, orgFormError, orgSaving, editingOrg, saveOrg, userOptions, usersLoading,
  modelGroupOptions, modelGroupsLoading, modelGroupsError, loadModelGroups, toggleModelGroup,
} = useOrganizationsWorkspace()
</script>
