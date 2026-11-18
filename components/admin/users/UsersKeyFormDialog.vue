<template>
  <AppFormModal
    v-model:open="open"
    :title="editingKey ? t('users.editKeyAccess') : t('users.newClientKey')"
    :description="editingKey ? t('users.editKeyDescription') : t('users.newKeyDescription')"
    :error="formError"
    :submit-label="editingKey ? t('users.saveChanges') : t('users.createKey')"
    :loading="saving"
    :cancel-disabled="saving"
    content-class="sm:max-w-2xl"

    divided
    @submit="submit"
  >
    <AdminField :label="t('users.keyValue')">
      <AdminInput v-model="form.api_key" class="w-full font-mono text-xs" :disabled="saving || !!editingKey" />
    </AdminField>
    <AdminField :label="t('users.owner')" :hint="ownerUnavailable ? t('users.ownerUnavailableHint') : undefined">
      <AdminSelectMenu
        v-model="form.user_id"
        :items="ownerOptions"
        value-key="value"
        label-key="label"
        class="w-full"
        :search-input="{ placeholder: t('users.searchUsersEllipsis') }"
      />
    </AdminField>
    <div class="grid gap-5">
      <UsersScopePicker
        :title="t('users.credentialScope')"
        :empty-label="t('users.noCredentialScopesCreated')"
        :items="channelOptions"
        :selected="form.channels"
        @toggle="toggleId(form.channels, $event)"
      />
      <UsersScopePicker
        :title="t('users.modelScope')"
        :empty-label="t('users.noModelScopesCreated')"
        :items="modelGroupOptions"
        :selected="form.model_groups"
        @toggle="toggleId(form.model_groups, $event)"
      />
    </div>
    <p class="text-xs leading-5 text-[var(--ui-text-muted)]">{{ t('users.noScopeHint') }}</p>
  </AppFormModal>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminSelectMenu from '~/components/admin/general/controls/AdminSelectMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import { computed, ref } from 'vue'
import UsersScopePicker from './UsersScopePicker.vue'
import { changedUsersKeyBindings, usersKeyOwnerOptions } from '~/composables/usersKeyBindings'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { generateSecret, toggleId, uniquePositiveIds, type AnyRecord } from '~/composables/users/common'
import { keyEntries, keyPayload, normalizeKey } from '~/composables/users/normalize'

type KeyForm = { api_key: string; user_id: number; channels: number[]; model_groups: number[] }

const { t, fetchAPI, toast, saving, users, channelOptions, modelGroupOptions, errorMessage, syncAll } = useUsersWorkspace()

const open = ref(false)
const editingKey = ref<AnyRecord | null>(null)
const form = ref<KeyForm>({ api_key: '', user_id: 0, channels: [], model_groups: [] })
const formError = ref('')

const ownerOptions = computed(() => usersKeyOwnerOptions(users.value as any, Number(form.value.user_id) || 0))
const ownerUnavailable = computed(() => Number(form.value.user_id) > 0
  && !users.value.some(user => Number(user.id) === Number(form.value.user_id) && !user.deleted_at))

function openCreate() {
  editingKey.value = null
  form.value = { api_key: generateSecret(), user_id: 0, channels: [], model_groups: [] }
  formError.value = ''
  open.value = true
}

function openEdit(key: AnyRecord) {
  editingKey.value = key
  form.value = { api_key: key.api_key, user_id: Number(key.user_id || 0), channels: [...key.channels], model_groups: [...key.model_groups] }
  formError.value = ''
  open.value = true
}

async function createKey(body: AnyRecord) {
  const existing = keyEntries(await fetchAPI('/access/api-keys'))
    .map((entry, index) => normalizeKey(entry, index))
    .filter(key => key.api_key)
  const replaceAll = () => fetchAPI('/access/api-keys', {
    method: 'PUT',
    body: { api_key_entries: [...existing.map(keyPayload), body] }
  })
  // Legacy string-only key lists cannot accept POST; rewrite the whole list instead.
  if (existing.length && !existing.every(key => key.numeric_id != null)) return replaceAll()
  try {
    await fetchAPI('/access/api-keys', { method: 'POST', body })
  } catch (error: any) {
    const status = error?.statusCode || error?.status || error?.response?.status
    if (![404, 405].includes(Number(status))) throw error
    await replaceAll()
  }
}

async function submit() {
  if (saving.value) return
  if (!form.value.api_key.trim()) {
    formError.value = t('users.keyValueRequired')
    return
  }
  const bindings = {
    user_id: Number(form.value.user_id) || 0,
    channels: uniquePositiveIds(form.value.channels || []),
    model_groups: uniquePositiveIds(form.value.model_groups || [])
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingKey.value) {
      const changed = changedUsersKeyBindings(editingKey.value, bindings)
      if (!Object.keys(changed).length) {
        open.value = false
        return
      }
      await fetchAPI('/access/api-keys', {
        method: 'PATCH',
        body: {
          ...(editingKey.value.numeric_id != null ? { id: editingKey.value.numeric_id } : { api_key: editingKey.value.api_key }),
          ...changed
        }
      })
    } else {
      await createKey({ api_key: form.value.api_key.trim(), ...bindings })
    }
    open.value = false
    await syncAll()
    toast.add({ title: editingKey.value ? t('users.keyAccessUpdated') : t('users.clientKeyCreated'), color: 'success' })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    saving.value = false
  }
}

defineExpose({ openCreate, openEdit })
</script>
