<template>
  <AppFormModal
    v-model:open="open"
    :title="title"
    :description="description"
    :error="formError"
    :submit-label="submitLabel"
    :loading="saving"
    @submit="submit"
  >
    <AdminField :label="kind === 'channel' ? t('users.credentialScopeName') : t('users.modelScopeName')">
      <AdminInput v-model="form.name" class="w-full" :placeholder="kind === 'channel' ? 'team-a' : 'premium-models'" />
    </AdminField>
    <label class="flex items-start gap-2 text-sm">
      <AdminCheckbox v-model="form.disabled" />
      <span>
        <span class="font-medium">{{ t('common.disabled') }}</span>
        <span class="block text-[var(--ui-text-muted)]">{{ t('users.disabledScopeHint') }}</span>
      </span>
    </label>
  </AppFormModal>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import { computed, ref } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'

type ScopeKind = 'channel' | 'model'

const { t, fetchAPI, toast, saving, errorMessage, syncAll } = useUsersWorkspace()

const open = ref(false)
const kind = ref<ScopeKind>('channel')
const editing = ref<AnyRecord | null>(null)
const form = ref({ name: '', disabled: false })
const formError = ref('')

const title = computed(() => editing.value
  ? kind.value === 'channel' ? t('users.editCredentialScope') : t('users.editModelScope')
  : kind.value === 'channel' ? t('users.newCredentialScope') : t('users.newModelScope'))
const description = computed(() => editing.value
  ? kind.value === 'channel' ? t('users.editCredentialScopeDescription') : t('users.editModelScopeDescription')
  : kind.value === 'channel' ? t('users.newCredentialScopeDescription') : t('users.newModelScopeDescription'))
const submitLabel = computed(() => editing.value
  ? t('users.saveChanges')
  : kind.value === 'channel' ? t('users.createCredentialScope') : t('users.createModelScope'))

function openFor(nextKind: ScopeKind, group: AnyRecord | null = null) {
  kind.value = nextKind
  editing.value = group
  form.value = {
    name: group ? (nextKind === 'channel' ? group.channel_name : group.group_name) : '',
    disabled: !!group?.disabled
  }
  formError.value = ''
  open.value = true
}

async function submit() {
  const name = form.value.name.trim()
  if (!name) {
    formError.value = t('users.scopeNameRequired')
    return
  }
  const channel = kind.value === 'channel'
  const base = channel ? '/channel-groups' : '/model-groups'
  saving.value = true
  try {
    await fetchAPI(editing.value ? `${base}/${editing.value.id}` : base, {
      method: editing.value ? 'PATCH' : 'POST',
      body: { [channel ? 'channel_name' : 'group_name']: name, disabled: form.value.disabled }
    })
    open.value = false
    await syncAll()
    toast.add({ title: editing.value ? t('users.scopeUpdated') : t('users.scopeCreated'), color: 'success' })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    saving.value = false
  }
}

defineExpose({ openFor })
</script>
