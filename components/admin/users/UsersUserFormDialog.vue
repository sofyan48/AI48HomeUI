<template>
  <AppFormModal
    v-model:open="open"
    :title="editingUser ? t('users.editUser') : t('users.newUser')"
    :description="editingUser ? t('users.editUserDescription') : t('users.newUserDescription')"
    :error="formError"
    :submit-label="editingUser ? t('users.saveChanges') : t('users.createUser')"
    :loading="saving"
    content-class="sm:max-w-xl"
    divided
    @submit="submit"
  >
    <AdminField :label="t('users.username')" :error="fieldError('username')">
      <AdminInput v-model="form.username" class="w-full" placeholder="user@example.com" :disabled="saving || !!editingUser" />
      <p v-if="editingUser" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.usernameLocked') }}</p>
    </AdminField>
    <AdminField :label="editingUser ? t('users.newPasswordOptional') : t('users.initialPassword')">
      <AdminInput v-model="form.password" type="password" class="w-full" :placeholder="t('users.passwordPlaceholder')" :disabled="saving" />
    </AdminField>
    <AdminField :label="t('users.credits')">
      <AdminInput
        v-model="form.credits"
        type="text"
        inputmode="decimal"
        class="w-full"
        :disabled="saving || (periodLimitsSupported && form.credits_unlimited)"
      />
      <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
        {{ periodLimitsSupported && form.credits_unlimited ? t('users.unlimitedOnHint') : t('users.creditsHint') }}
      </p>
    </AdminField>

    <UsersPeriodLimitsFields v-if="periodLimitsSupported" :form="form" :disabled="saving" />
    <div v-else class="rounded-md border border-dashed border-[var(--ui-border)] px-3 py-2.5 text-xs text-[var(--ui-text-muted)]">
      {{ t('users.periodLimitsUnsupported') }}
    </div>
  </AppFormModal>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import { ref } from 'vue'
import UsersPeriodLimitsFields from './UsersPeriodLimitsFields.vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { apiFieldErrors, parseLocalizedNumber, type AnyRecord } from '~/composables/users/common'
import { emptyUserForm, periodWindowIds, userToForm } from '~/composables/users/periods'

const {
  t, fetchAPI, toast, saving, periodLimitsSupported, errorMessage, periodWindowLabel, syncAll
} = useUsersWorkspace()

const open = ref(false)
const editingUser = ref<AnyRecord | null>(null)
const form = ref(emptyUserForm())
const formError = ref('')
const fieldErrors = ref<Array<{ field: string; message: string }>>([])

function clearErrors() {
  formError.value = ''
  fieldErrors.value = []
}
const fieldError = (field: string) => fieldErrors.value.find(item => item.field === field)?.message || ''

function openCreate() {
  editingUser.value = null
  form.value = emptyUserForm()
  clearErrors()
  open.value = true
}

async function openEdit(user: AnyRecord) {
  clearErrors()
  try {
    const response = await fetchAPI<any>(`/users/${user.id}`)
    const detail = response?.user || user
    editingUser.value = detail
    form.value = userToForm(detail)
    open.value = true
  } catch (error) {
    toast.add({ title: t('users.loadUserFailed'), description: errorMessage(error), color: 'error' })
  }
}

function buildBody(): AnyRecord | string {
  const username = form.value.username.trim()
  const credits = parseLocalizedNumber(form.value.credits)
  if (!username) return t('users.usernameRequired')
  if (!Number.isFinite(credits) || credits < 0) return t('users.creditsInvalid')
  const body: AnyRecord = { username, credits, credits_unlimited: form.value.credits_unlimited }
  if (form.value.password.trim()) body.password = form.value.password.trim()
  if (!periodLimitsSupported.value) return body

  const timezone = form.value.timezone.trim()
  const weekResetDay = Number(form.value.week_reset_day)
  const weekResetHour = Number(form.value.week_reset_hour)
  if (!timezone) return t('users.timezoneRequired')
  if (!Number.isInteger(weekResetDay) || weekResetDay < 1 || weekResetDay > 7) return t('users.weekDayInvalid')
  if (!Number.isInteger(weekResetHour) || weekResetHour < 0 || weekResetHour > 23) return t('users.weekHourInvalid')
  body.timezone = timezone
  body.week_reset_day = weekResetDay
  body.week_reset_hour = weekResetHour
  for (const id of periodWindowIds) {
    const period = form.value.periods[id]
    const limit = parseLocalizedNumber(period.limit)
    if (period.enabled && (!Number.isFinite(limit) || limit < 0)) {
      return t('users.periodLimitInvalid', { window: periodWindowLabel(id) })
    }
    body[`limit_${id}_credits`] = period.enabled ? limit : null
    body[`window_mode_${id}`] = period.mode
  }
  return body
}

async function submit() {
  clearErrors()
  const body = buildBody()
  if (typeof body === 'string') {
    formError.value = body
    return
  }
  saving.value = true
  try {
    await fetchAPI(editingUser.value ? `/users/${encodeURIComponent(editingUser.value.id)}` : '/users', {
      method: editingUser.value ? 'PATCH' : 'POST',
      body
    })
    open.value = false
    await syncAll()
    toast.add({ title: editingUser.value ? t('users.userUpdated') : t('users.userCreated'), color: 'success' })
  } catch (error) {
    formError.value = errorMessage(error)
    fieldErrors.value = apiFieldErrors(error)
  } finally {
    saving.value = false
  }
}

defineExpose({ openCreate, openEdit })
</script>
