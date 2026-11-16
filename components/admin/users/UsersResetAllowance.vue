<template>
  <AppFormModal
    v-model:open="open"
    :title="`${t('users.resetAllowance')} · ${user?.username || t('common.user')}`"
    :error="error"
    :submit-label="t('users.saveAllowance')"
    :loading="saving"
    :submit-disabled="saving"
    :locked="saving"
    @submit="submit"
  >
        <p class="text-sm text-[var(--ui-text-muted)]">{{ t('users.resetAllowanceIntro') }}</p>
        <UFormField :label="t('users.mode')"><USelect v-model="mode" :items="modes" value-key="value" label-key="label" :disabled="saving" class="w-full" /></UFormField>
        <UFormField :label="mode === 'monthly' ? t('users.resetsPerMonth') : t('users.numberOfResets')"><UInput v-model="amount" type="number" min="0" step="1" :disabled="saving" class="w-full" /></UFormField>
        <UFormField v-if="mode === 'one_time'" :label="t('users.expiresAtOptional')" :description="t('users.localTimezoneHint')"><UInput v-model="expiresAt" type="datetime-local" :disabled="saving" class="w-full" /></UFormField>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ mode === 'monthly' ? t('users.monthlyRenewHint') : t('users.oneTimeHint') }}</p>
        <UAlert color="warning" variant="subtle" :description="t('users.allowanceReplaceWarning')" />
  </AppFormModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user: any }>()
const emit = defineEmits<{ saved: [] }>()
const { fetchAPI } = useApi()
const toast = useToast()
const { t } = useAdminI18n()
const mode = ref('one_time')
const amount = ref('0')
const expiresAt = ref('')
const saving = ref(false)
const error = ref('')
const modes = computed(() => [{ label: t('users.oneTime'), value: 'one_time' }, { label: t('users.monthly'), value: 'monthly' }])
const controller = new AbortController()
onScopeDispose(() => controller.abort())
watch(open, (value) => {
  if (!value) return
  const allowance = props.user?.reset_allowance
  mode.value = allowance?.mode === 'monthly' ? 'monthly' : 'one_time'
  amount.value = String(allowance?.amount ?? 0)
  error.value = ''
  expiresAt.value = ''
  if (allowance?.expires_at) {
    const date = new Date(allowance.expires_at)
    if (!Number.isNaN(date.getTime())) {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      expiresAt.value = local.toISOString().slice(0, 16)
    }
  }
})
async function submit() {
  if (saving.value || !props.user) return
  error.value = ''
  const count = Number(amount.value)
  if (String(amount.value).trim() === '' || !Number.isSafeInteger(count) || count < 0) {
    error.value = t('users.wholeNumberInvalid')
    return
  }
  let expiry: string | null = null
  if (mode.value === 'one_time' && expiresAt.value) {
    const date = new Date(expiresAt.value)
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      error.value = t('users.expiryInvalid')
      return
    }
    expiry = date.toISOString()
  }
  saving.value = true
  try {
    await fetchAPI(`/users/${encodeURIComponent(props.user.id)}/reset-allowance`, {
      method: 'PUT', body: { mode: mode.value, amount: count, expires_at: expiry }, signal: controller.signal
    })
    if (controller.signal.aborted) return
    open.value = false
    toast.add({ title: t('users.resetAllowanceSaved'), color: 'success' })
    emit('saved')
  } catch (cause: any) {
    if (!controller.signal.aborted) error.value = cause?.message || t('users.resetAllowanceSaveFailed')
  } finally { saving.value = false }
}
</script>
