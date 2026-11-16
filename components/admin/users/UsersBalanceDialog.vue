<template>
  <AppFormModal
    v-model:open="open"
    :title="batch ? t('users.batchBalanceOperation') : t('users.balanceOperation')"
    :description="batch ? t('users.batchBalanceDescription') : t('users.balanceDescription')"
    :error="formError"
    :submit-label="deduct ? t('users.deduct') : t('users.recharge')"
    :submit-color="deduct ? 'warning' : 'primary'"
    content-class="sm:max-w-xl"
    divided
    @submit="review"
  >
    <div>
      <p class="text-sm font-medium">{{ t('users.target') }}</p>
      <div class="mt-2 grid gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2.5 text-sm">
        <AppSummaryRow :label="targets.length === 1 ? t('common.user') : t('common.users')" :value="targetLabel" />
        <AppSummaryRow :label="t('users.currentBalanceTotal')" :value="formatCredits(currentTotal)" />
        <AppSummaryRow
          :label="t('users.balanceTotalAfter')"
          :value="afterTotal == null ? '—' : formatCredits(afterTotal)"
          :warning="afterTotal != null && afterTotal < 0"
        />
      </div>
      <p v-if="batch" class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ t('users.batchSameAmountHint') }}</p>
    </div>
    <AdminField :label="t('users.operationType')">
      <div class="grid grid-cols-2 gap-2">
        <AppButton
          type="button"
          :color="deduct ? 'neutral' : 'primary'"
          :variant="deduct ? 'outline' : 'solid'"
          icon="i-tabler-plus"
          @click="form.type = 'recharge'"
        >
          {{ t('users.recharge') }}
        </AppButton>
        <AppButton
          type="button"
          :color="deduct ? 'warning' : 'neutral'"
          :variant="deduct ? 'solid' : 'outline'"
          icon="i-tabler-minus"
          @click="form.type = 'deduct'"
        >
          {{ t('users.deduct') }}
        </AppButton>
      </div>
    </AdminField>
    <PortalAlert v-if="negativeCount" color="warning" variant="subtle" :description="t('users.negativeAfterDeduction', { count: negativeCount })" />
    <AdminField :label="t('users.amount')">
      <AdminInput v-model="form.amount" type="number" min="0" step="0.000001" class="w-full" />
      <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ batch ? t('users.amountEachHint') : t('users.amountCurrentHint') }}</p>
    </AdminField>
    <AdminField :label="deduct ? t('users.noteRequired') : t('users.note')">
      <AdminTextarea v-model="form.note" class="w-full" />
    </AdminField>
  </AppFormModal>

  <AppConfirmModal
    v-model:open="confirmOpen"
    :title="confirmTitle"
    :description="batch ? t('users.confirmBatchDescription') : deduct ? t('users.confirmDeductDescription') : t('users.confirmRechargeDescription')"
    :confirm-color="deduct ? 'warning' : 'primary'"
    :loading="saving"
    @confirm="apply"
  >
    <div class="grid gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2.5 text-sm">
      <AppSummaryRow :label="targets.length === 1 ? t('common.user') : t('common.users')" :value="targetLabel" />
      <AppSummaryRow :label="t('users.amountPerUser')" :value="signed(Number(form.amount))" :warning="deduct" />
      <AppSummaryRow v-if="batch" :label="t('users.totalChange')" :value="signed(Number(form.amount) * targets.length)" :warning="deduct" />
      <AppSummaryRow :label="t('users.currentBalanceTotal')" :value="formatCredits(currentTotal)" />
      <AppSummaryRow :label="t('users.balanceTotalAfter')" :value="formatCredits(afterTotal)" :warning="(afterTotal ?? 0) < 0" />
      <div class="border-t border-[var(--ui-border)] pt-2">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.note') }}</p>
        <p class="mt-1 break-words">{{ form.note || '—' }}</p>
      </div>
      <PortalAlert v-if="negativeCount" color="warning" variant="subtle" :description="t('users.negativeAfterOperation', { count: negativeCount })" />
    </div>
  </AppConfirmModal>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { computed, ref } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { isOperableUser, type AnyRecord } from '~/composables/users/common'

const { t, fetchAPI, toast, saving, selectedUserIds, formatCredits, errorMessage, syncAll } = useUsersWorkspace()

const open = ref(false)
const confirmOpen = ref(false)
const targets = ref<AnyRecord[]>([])
const form = ref({ type: 'recharge', amount: '', note: '' })
const formError = ref('')

const batch = computed(() => targets.value.length > 1)
const deduct = computed(() => form.value.type === 'deduct')
const currentTotal = computed(() => targets.value.reduce((sum, user) => sum + Number(user.credits || 0), 0))
const delta = computed(() => {
  const amount = Number(form.value.amount)
  return Number.isFinite(amount) && amount > 0 ? (deduct.value ? -amount : amount) : null
})
const afterTotal = computed(() => delta.value == null ? null : currentTotal.value + delta.value * targets.value.length)
const negativeCount = computed(() => delta.value == null
  ? 0
  : targets.value.filter(user => Number(user.credits || 0) + delta.value! < 0).length)
const targetLabel = computed(() => targets.value.length === 1
  ? `${targets.value[0].username} (#${targets.value[0].id})`
  : t('users.usersCountShort', { count: targets.value.length }))
const confirmTitle = computed(() => batch.value
  ? deduct.value ? t('users.confirmBatchDeduction') : t('users.confirmBatchRecharge')
  : deduct.value ? t('users.confirmDeduction') : t('users.confirmRecharge'))
const signed = (value: number) => `${deduct.value ? '−' : '+'}${formatCredits(value)}`

function openFor(users: AnyRecord[]) {
  targets.value = users.filter(isOperableUser)
  form.value = { type: 'recharge', amount: '', note: '' }
  formError.value = ''
  open.value = true
}

function review() {
  formError.value = ''
  const amount = Number(form.value.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    formError.value = t('users.amountInvalid')
    return
  }
  if (deduct.value && !form.value.note.trim()) {
    formError.value = t('users.deductionNoteRequired')
    return
  }
  confirmOpen.value = true
}

async function apply() {
  saving.value = true
  let succeeded = 0
  const failed: string[] = []
  for (const user of targets.value) {
    try {
      await fetchAPI(`/billing/balance-records/${form.value.type}`, {
        method: 'POST',
        body: { user_id: user.id, amount: Number(form.value.amount), note: form.value.note.trim() }
      })
      succeeded++
    } catch (error) {
      failed.push(errorMessage(error))
    }
  }
  await syncAll()
  saving.value = false
  if (failed.length) {
    toast.add({
      title: succeeded
        ? t('users.balancePartialFailed', { succeeded, failed: failed.length, message: failed[0] })
        : t('users.balanceAllFailed', { count: failed.length, message: failed[0] }),
      color: 'error'
    })
  } else {
    toast.add({
      title: batch.value
        ? t('users.balanceCompleted', { count: succeeded })
        : deduct.value ? t('users.deductionSubmitted') : t('users.rechargeSubmitted'),
      color: 'success'
    })
  }
  if (succeeded) {
    confirmOpen.value = false
    open.value = false
    selectedUserIds.value = new Set()
  }
}

defineExpose({ openFor })
</script>
