<template>
  <div class="mx-auto max-w-md py-12">
    <AppCard>
      <template #header>
        <h1 class="text-2xl font-bold">{{ t('resetPw.title') }}</h1>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('resetPw.desc') }}</p>
      </template>

      <div v-if="securing" class="space-y-4 py-4 text-center">
        <AppIcon name="i-tabler-shield-lock" class="mx-auto size-12 text-primary-500" />
        <p class="font-medium">{{ t('resetPw.securing') }}</p>
        <p class="text-sm text-[var(--ui-text-muted)]">{{ t('resetPw.securingDesc') }}</p>
      </div>

      <div v-else-if="complete" class="space-y-5 text-center">
        <AppIcon name="i-tabler-circle-check" class="mx-auto size-14 text-emerald-500" />
        <p>{{ t('resetPw.complete') }}</p>
        <PortalAlert color="info" variant="subtle" :title="t('resetPw.unchangedTitle')" :description="t('resetPw.unchangedDesc')" />
        <AppButton to="/app/login" color="primary" block>{{ t('shell.signIn') }}</AppButton>
      </div>

      <div v-else-if="invalidToken" class="space-y-5">
        <PortalAlert color="warning" variant="subtle" :title="t('resetPw.invalidTitle')" :description="invalidTokenMessage" />
        <AppButton to="/app/forgot-password" color="primary" block>{{ t('resetPw.requestNew') }}</AppButton>
        <AppButton to="/app/login" color="neutral" variant="ghost" block>{{ t('auth.backToSignIn') }}</AppButton>
      </div>

      <form v-else @submit.prevent="submit">
        <FieldGroup class="gap-5">
          <PortalAlert v-if="error" color="error" variant="subtle" :title="t('resetPw.failed')" :description="error" />
          <PortalAlert color="info" variant="subtle" :title="t('resetPw.keepTitle')" :description="t('resetPw.keepDesc')" />
          <PortalField :label="t('resetPw.newPassword')" required><PortalInput v-model="password" class="w-full" type="password" autocomplete="new-password" /></PortalField>
          <PortalField :label="t('auth.confirmPassword')" required><PortalInput v-model="confirmPassword" class="w-full" type="password" autocomplete="new-password" /></PortalField>
          <AppButton type="submit" color="primary" block :loading="loading">{{ t('resetPw.submit') }}</AppButton>
        </FieldGroup>
      </form>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { FieldGroup } from '~/components/ui/field'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const route = useRoute()
const router = useRouter()
const { fetchAPI, clearSession } = useUserApi()
const resetToken = ref('')
const password = ref('')
const confirmPassword = ref('')
const securing = ref(true)
const loading = useWorkspaceState('user:reset-password:loading', () => false)
const error = useWorkspaceState('user:reset-password:error', () => '')
const complete = ref(false)
const invalidToken = ref(false)
const tokenExpired = ref(false)
const invalidTokenMessage = computed(() => tokenExpired.value ? t('resetPw.expiredToken') : t('resetPw.missingToken'))

async function scrubToken() {
  const query = { ...route.query }
  delete query.token
  await router.replace({ path: route.path, query, hash: '' })
}

async function submit() {
  error.value = ''
  if (!password.value) return void (error.value = t('auth.passwordRequired'))
  if (password.value !== confirmPassword.value) return void (error.value = t('auth.passwordsMismatch'))
  loading.value = true
  try {
    await fetchAPI('/password/reset', { method: 'POST', auth: false, body: { token: resetToken.value, new_password: password.value } })
    clearSession()
    complete.value = true
  } catch (cause: any) {
    if (cause?.code === 'invalid_or_expired_token') {
      invalidToken.value = true
      tokenExpired.value = true
      resetToken.value = ''
    } else {
      error.value = cause?.message || t('resetPw.unable')
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const fragmentToken = new URLSearchParams(route.hash.slice(1)).get('token')
    resetToken.value = (fragmentToken || (typeof route.query.token === 'string' ? route.query.token : '')).trim()
  invalidToken.value = !resetToken.value
  try {
    await scrubToken()
  } finally {
    securing.value = false
  }
})
</script>
