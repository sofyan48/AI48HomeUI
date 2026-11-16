<template>
  <AppFormModal
    v-model:open="open"
    :title="t('users.approveTopup')"
    :description="t('users.approveTopupDescription')"
    :error="formError"
    :submit-label="t('users.approveTopup')"
    submit-color="success"
    submit-icon="i-tabler-coins"
    :loading="approvingTopupUserId !== null"
    :locked="approvingTopupUserId !== null"
    @submit="submit"
  >
    <template v-if="target">
      <div class="space-y-2 rounded-md border border-[var(--ui-border)] p-3">
        <AppSummaryRow :label="t('common.user')" :value="target.username" />
        <AppSummaryRow :label="t('users.requestId')" :value="String(target.request.id)" />
        <AppSummaryRow :label="t('users.amount')" :value="t('users.creditsAmount', { amount: formatCredits(target.request.amount) })" />
        <AppSummaryRow :label="t('users.requested')" :value="formatDate(target.request.created_at)" />
      </div>
      <p v-if="target.request.note" class="break-words text-sm text-[var(--ui-text-muted)]">{{ target.request.note }}</p>
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.approveTopupHint') }}</p>
    </template>
  </AppFormModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'

const {
  t, fetchAPI, toast, approvingTopupUserId, topupApprovalSupported, formatCredits, formatDate, errorMessage, syncAll
} = useUsersWorkspace()

const open = ref(false)
const target = ref<{ id: number | string; username: string; request: AnyRecord } | null>(null)
const formError = ref('')

function openFor(user: AnyRecord) {
  if (approvingTopupUserId.value !== null || !user.pending_topup || user.deleted_at) return
  // Snapshot the request so a background sync cannot change what is being approved.
  target.value = { id: user.id, username: user.username, request: { ...user.pending_topup } }
  formError.value = ''
  open.value = true
}

async function submit() {
  const user = target.value
  if (!user || approvingTopupUserId.value !== null || !topupApprovalSupported.value) return
  approvingTopupUserId.value = user.id
  formError.value = ''
  try {
    await fetchAPI(`/users/${encodeURIComponent(user.id)}/topup/approve`, {
      method: 'POST',
      body: { request_id: user.request.id }
    })
    open.value = false
    await syncAll()
    toast.add({
      title: t('users.topupApproved'),
      description: t('users.topupApprovedDescription', { name: user.username, amount: formatCredits(user.request.amount) }),
      color: 'success'
    })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    approvingTopupUserId.value = null
  }
}

defineExpose({ openFor })
</script>
