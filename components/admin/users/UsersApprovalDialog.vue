<template>
  <AppFormModal
    v-model:open="open"
    :title="t('users.approveUser')"
    :description="t('users.approveUserDescription')"
    :error="formError"
    :submit-label="t('users.approveUser')"
    submit-color="success"
    submit-icon="i-tabler-user-check"
    :loading="approvingUserId !== null"
    :locked="approvingUserId !== null"
    :submit-disabled="!accessGroupsSupported || loading || !selected.length"
    @submit="submit"
  >
    <p class="text-sm">{{ t('users.userLabel') }} <span class="font-semibold">{{ user?.username }}</span></p>
    <UAlert
      v-if="!accessGroupsSupported"
      color="warning"
      variant="subtle"
      :title="t('users.modelScopesUnavailable')"
      :description="t('users.modelScopesUnavailableDescription')"
    />
    <fieldset v-else :disabled="approvingUserId !== null">
      <UsersScopePicker
        :title="t('users.modelScope')"
        :empty-label="t('users.noEnabledModelScopes')"
        :items="modelOptions"
        :selected="selected"
        @toggle="toggleId(selected, $event)"
      />
    </fieldset>
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.approveHint') }}</p>
  </AppFormModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UsersScopePicker from './UsersScopePicker.vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { toggleId, type AnyRecord } from '~/composables/users/common'

const {
  t, fetchAPI, toast, loading, approvingUserId, accessGroupsSupported, modelGroups, keysForUser, errorMessage, syncAll
} = useUsersWorkspace()

const open = ref(false)
const user = ref<AnyRecord | null>(null)
const selected = ref<number[]>([])
const formError = ref('')

const modelOptions = computed(() => modelGroups.value
  .filter(group => !group.disabled && !group.deleted_at)
  .map(group => ({ label: group.group_name, value: Number(group.id) })))

function openFor(target: AnyRecord) {
  if (approvingUserId.value !== null || !target.approval_pending || target.deleted_at) return
  user.value = target
  // Preselect scopes the user's keys already grant.
  const existing = new Set(keysForUser(target.id).flatMap(key => key.model_groups))
  selected.value = modelOptions.value.filter(option => existing.has(option.value)).map(option => option.value)
  formError.value = ''
  open.value = true
}

async function submit() {
  const target = user.value
  if (approvingUserId.value !== null || loading.value || !target?.approval_pending || target.deleted_at) return
  formError.value = ''
  if (!accessGroupsSupported.value || !selected.value.length) {
    formError.value = t('users.selectEnabledModelScope')
    return
  }
  approvingUserId.value = target.id
  try {
    await fetchAPI(`/users/${encodeURIComponent(target.id)}/approve`, {
      method: 'POST',
      body: { model_groups: [...selected.value] }
    })
    open.value = false
    await syncAll()
    toast.add({ title: t('users.userApproved'), description: t('users.userApprovedDescription', { name: target.username }), color: 'success' })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    approvingUserId.value = null
  }
}

defineExpose({ openFor })
</script>
