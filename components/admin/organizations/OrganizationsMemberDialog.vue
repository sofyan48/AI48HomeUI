<template>
  <AppFormModal
    v-model:open="memberFormOpen"
    :title="editingMember ? t('organizations.member.editTitle') : t('organizations.member.addTitle')"
    :description="t('organizations.member.formDescription')"
    :error="memberFormError"
    :submit-label="editingMember ? t('organizations.saveChanges') : t('organizations.member.add')"
    :loading="memberSaving"
    :locked="memberSaving"
    @submit="saveMember"
  >
    <AdminField :label="t('organizations.member.username')" :required="!editingMember">
      <AdminInput v-if="editingMember" :model-value="memberForm.username" disabled class="w-full" />
      <AdminSearchSelect
        v-else
        :model-value="selectedUserId"
        :items="memberUserOptions"
        :disabled="usersLoading"
        :placeholder="usersLoading ? t('organizations.usersLoading') : t('organizations.searchUser')"
        :aria-label="t('organizations.member.username')"
        :empty-text="t('organizations.noUserMatch')"
        :more-text="t('organizations.moreUsers')"
        :clear-label="t('organizations.clearSelection')"
        @update:model-value="selectUser"
      />
    </AdminField>
    <AdminField :label="t('organizations.member.role')" required>
      <AdminSelect v-model="memberForm.role" :items="roleItems" class="w-full" />
    </AdminField>
    <div class="grid gap-4 sm:grid-cols-3">
      <AdminField :label="t('organizations.member.limit1d')">
        <AdminInput v-model="memberForm.limit1d" inputmode="decimal" class="w-full" placeholder="∞" />
      </AdminField>
      <AdminField :label="t('organizations.member.limit7d')">
        <AdminInput v-model="memberForm.limit7d" inputmode="decimal" class="w-full" placeholder="∞" />
      </AdminField>
      <AdminField :label="t('organizations.member.limit30d')">
        <AdminInput v-model="memberForm.limit30d" inputmode="decimal" class="w-full" placeholder="∞" />
      </AdminField>
    </div>
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.member.limitHelp') }}</p>
  </AppFormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSearchSelect from '~/components/admin/general/controls/AdminSearchSelect.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'

const { t, memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, saveMember, memberUserOptions, usersLoading } = useOrganizationsWorkspace()

// The API takes a username; the dropdown works with user IDs.
const selectedUserId = computed(() => memberUserOptions.value.find(option => option.label === memberForm.value.username)?.value ?? null)
function selectUser(value: string | number | null) {
  memberForm.value.username = memberUserOptions.value.find(option => option.value === value)?.label ?? ''
}

const roleItems = computed(() => [
  { label: t('organizations.role.member'), value: 'member' },
  { label: t('organizations.role.owner'), value: 'owner' },
])
</script>
