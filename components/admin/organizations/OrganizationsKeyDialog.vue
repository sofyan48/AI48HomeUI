<template>
  <AppFormModal
    v-model:open="keyFormOpen"
    :title="editingKey ? t('organizations.key.renameTitle') : t('organizations.key.createTitle')"
    :description="editingKey ? t('organizations.key.renameDescription') : t('organizations.key.createDescription', { name: keyFormMember?.username || '' })"
    :error="keyFormError"
    :submit-label="editingKey ? t('organizations.saveChanges') : t('organizations.key.createSubmit')"
    :submit-disabled="Boolean(createdKeyValue)"
    :loading="keySaving"
    :locked="keySaving"
    @submit="saveKey"
  >
    <template v-if="createdKeyValue">
      <PortalAlert color="success" variant="subtle" icon="i-tabler-key" :title="t('organizations.key.createdOnce')">
        <template #description>
          <div class="flex min-w-0 items-center gap-2">
            <code class="min-w-0 break-all text-xs">{{ createdKeyValue }}</code>
            <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="t('organizations.key.copy')" @click="copy" />
          </div>
        </template>
      </PortalAlert>
    </template>
    <template v-else>
      <AdminField v-if="editingKey" :label="t('organizations.key.title')">
        <AdminInput :model-value="maskedKey" disabled class="w-full font-mono" />
      </AdminField>
      <AdminField :label="t('organizations.key.name')" :hint="t('organizations.key.nameHint', { max: organizationKeyNameMaxLength })">
        <AdminInput v-model="keyFormName" icon="i-tabler-tag" :maxlength="organizationKeyNameMaxLength" :placeholder="t('organizations.key.namePlaceholder')" autofocus class="w-full" />
      </AdminField>
    </template>
  </AppFormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { organizationKeyNameMaxLength } from '~/composables/organizations/useOrganizationKeyForm'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'

const { t, keyFormOpen, keyFormMember, editingKey, keyFormName, keyFormError, keySaving, createdKeyValue, saveKey } = useOrganizationsWorkspace()
const toast = useAdminToast()

const maskedKey = computed(() => {
  const value = editingKey.value?.api_key || ''
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
})

async function copy() {
  try {
    await navigator.clipboard.writeText(createdKeyValue.value)
    toast.add({ title: t('organizations.key.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('organizations.key.copyFailed'), color: 'error' })
  }
}
</script>
