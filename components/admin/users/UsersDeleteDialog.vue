<template>
  <AppConfirmModal
    v-model:open="open"
    :title="t('users.confirmDeletion')"
    :message="message"
    :confirm-label="t('common.delete')"
    :loading="saving"
    @confirm="submit"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { maskKey, type AnyRecord } from '~/composables/users/common'

type DeleteKind = 'user' | 'key' | 'group' | 'detail'
type ScopeKind = 'channel' | 'model'

const { t, fetchAPI, toast, saving, errorMessage, syncAll } = useUsersWorkspace()

const open = ref(false)
const kind = ref<DeleteKind>('user')
const scope = ref<ScopeKind | ''>('')
const target = ref<AnyRecord | null>(null)

const message = computed(() => {
  const item = target.value
  if (!item) return ''
  if (kind.value === 'user') return t('users.deleteUserConfirm', { name: item.username })
  if (kind.value === 'key') return t('users.deleteKeyConfirm', { key: maskKey(item.api_key) })
  if (kind.value === 'detail') return t('users.deleteBindingConfirm', { name: item.auth_id || item.model_id })
  return t('users.deleteScopeConfirm', { name: item.channel_name || item.group_name })
})

const successTitle = () => ({
  user: t('users.userDeleted'),
  key: t('users.clientKeyDeleted'),
  group: t('users.scopeDeleted'),
  detail: t('users.bindingDeleted')
})[kind.value]

function deleteUrl(item: AnyRecord): string {
  const id = encodeURIComponent(item.id)
  switch (kind.value) {
    case 'user':
      return `/users/${id}`
    case 'key':
      return `/access/api-keys?${item.numeric_id != null ? `id=${encodeURIComponent(item.numeric_id)}` : `index=${encodeURIComponent(item.index)}`}`
    case 'group':
      return `/${scope.value === 'channel' ? 'channel-groups' : 'model-groups'}/${id}`
    case 'detail':
      return `/${scope.value === 'channel' ? 'channel-group-details' : 'model-group-details'}/${id}`
  }
}

function openFor(nextKind: DeleteKind, item: AnyRecord, nextScope: ScopeKind | '' = '') {
  kind.value = nextKind
  scope.value = nextScope
  target.value = { ...item }
  open.value = true
}

async function submit() {
  if (!target.value) return
  saving.value = true
  try {
    await fetchAPI(deleteUrl(target.value), { method: 'DELETE' })
    open.value = false
    await syncAll()
    toast.add({ title: successTitle(), color: 'success' })
  } catch (error) {
    toast.add({ title: t('users.deleteFailed'), description: errorMessage(error), color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ openFor })
</script>
