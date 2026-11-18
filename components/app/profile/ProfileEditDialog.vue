<script setup lang="ts">
import { computed, ref } from 'vue'
import AppFormModal from '~/components/AppFormModal.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { FieldGroup } from '~/components/ui/field'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalToast } from '~/composables/portal/usePortalToast'

const { t } = usePortalI18n()
const { currentUser, capabilities, updateProfile } = useUserApi()
const toast = usePortalToast()
const emit = defineEmits<{ saved: [] }>()
const open = ref(false)
const saving = ref(false)
const error = ref('')
const username = ref('')
const timezone = ref('')
const supported = computed(() => capabilities.value.profile_edit === true)
const timezoneOptions = computed(() => {
  let values: string[] = []
  try { values = Intl.supportedValuesOf('timeZone') } catch {}
  return [...new Set(['UTC', currentUser.value?.timezone || 'UTC', ...values])].sort()
})
function edit() {
  if (!currentUser.value || !supported.value || saving.value) return
  username.value = currentUser.value.username
  timezone.value = currentUser.value.timezone
  error.value = ''
  open.value = true
}
async function save() {
  if (saving.value || !supported.value) return
  if (!username.value.trim() || !timezone.value.trim()) { error.value = t('profile.editRequired'); return }
  try { new Intl.DateTimeFormat('en', { timeZone: timezone.value.trim() }) }
  catch { error.value = t('profile.editInvalidTimezone'); return }
  saving.value = true
  error.value = ''
  try {
    const user = await updateProfile({ username: username.value.trim(), timezone: timezone.value.trim() })
    if (!user) return
    open.value = false
    toast.add({ title: t('profile.editSaved'), color: 'success' })
    emit('saved')
  } catch (cause) {
    const failure = cause as { statusCode?: number; message?: string }
    error.value = failure.statusCode === 404 || failure.statusCode === 405 ? t('profile.editUnsupported') : failure.message || t('profile.editFailed')
  } finally { saving.value = false }
}
</script>

<template>
  <AppButton v-if="supported" size="sm" icon="i-tabler-edit" :disabled="!currentUser" @click="edit">{{ t('profile.edit') }}</AppButton>
  <AppFormModal v-model:open="open" :title="t('profile.edit')" :description="t('profile.editDescription')" :error="error" :loading="saving" :locked="saving" :submit-disabled="saving" :submit-label="t('common.save')" :cancel-label="t('common.cancel')" @submit="save">
    <FieldGroup>
      <PortalField :label="t('profile.detail.username')" required><PortalInput v-model="username" autocomplete="username" required :disabled="saving" class="w-full" /></PortalField>
      <PortalField :label="t('profile.timezone')" required>
        <PortalInput v-model="timezone" list="profile-timezones" required :disabled="saving" class="w-full" />
        <datalist id="profile-timezones"><option v-for="zone in timezoneOptions" :key="zone" :value="zone" /></datalist>
        <p class="mt-1 text-xs text-muted-foreground">{{ t('profile.timezoneHelp') }}</p>
      </PortalField>
    </FieldGroup>
  </AppFormModal>
</template>
