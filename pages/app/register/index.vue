<template>
  <div class="mx-auto max-w-md py-12">
    <AppCard>
      <template #header>
        <h1 class="text-2xl font-bold text-[var(--ui-text-highlighted)]">{{ t('register.title') }}</h1>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ t('register.desc') }}</p>
      </template>
      <PortalAlert v-if="approvalPending" color="warning" variant="subtle" icon="i-tabler-clock" :title="t('register.pendingTitle')" :description="t('register.pendingDesc')" />
      <form v-else @submit.prevent="submit">
        <FieldGroup class="gap-5">
          <PortalAlert v-if="error" color="error" variant="subtle" :title="t('register.failed')" :description="error" />
          <PortalField :label="t('auth.username')" required>
            <PortalInput v-model="form.username" class="w-full" autocomplete="username" icon="i-tabler-user" />
          </PortalField>
          <PortalField v-if="emailEnabled" :label="t('auth.email')" :hint="t('register.emailHint')">
            <PortalInput v-model="form.email" class="w-full" type="email" autocomplete="email" icon="i-tabler-mail" />
          </PortalField>
          <PortalField :label="t('auth.password')" required :hint="t('register.passwordHint')">
            <PortalInput v-model="form.password" class="w-full" type="password" autocomplete="new-password" icon="i-tabler-lock" />
          </PortalField>
          <PortalField :label="t('auth.confirmPassword')" required>
            <PortalInput v-model="form.confirmPassword" class="w-full" type="password" autocomplete="new-password" icon="i-tabler-lock" />
          </PortalField>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('register.approvalNote') }}</p>
          <AppButton type="submit" color="primary" block size="lg" :loading="loading">{{ t('register.submit') }}</AppButton>
        </FieldGroup>
      </form>
      <template #footer><p class="text-center text-sm text-[var(--ui-text-muted)]">{{ t('register.alreadyRegistered') }} <NuxtLink to="/app/login" class="font-medium text-primary-500">{{ t('shell.signIn') }}</NuxtLink></p></template>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { FieldGroup } from '~/components/ui/field'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const router = useRouter()
const { fetchAPI, saveSession, capabilities, loadCapabilities } = useUserApi()
const approvalPending = ref(false)
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const loading = useWorkspaceState('user:register:loading', () => false)
const error = useWorkspaceState('user:register:error', () => '')
const capabilityLoaded = useWorkspaceState('user:register:capability-loaded', () => false)
const emailEnabled = computed(() => capabilityLoaded.value && capabilities.value.email_registration === true)

async function submit() {
  if (loading.value || approvalPending.value) return
  error.value = ''
  if (!form.username.trim()) return void (error.value = t('auth.usernameRequired'))
  if (!form.password) return void (error.value = t('auth.passwordRequired'))
  if (form.password !== form.confirmPassword) return void (error.value = t('auth.passwordsMismatch'))
  loading.value = true
  try {
    const session = await fetchAPI<UserSessionResponse | { approval_pending: true; message: string }>('/register', { method: 'POST', auth: false, body: { username: form.username.trim(), password: form.password, ...(form.email.trim() ? { email: form.email.trim() } : {}) } })
    if ('approval_pending' in session && session.approval_pending) {
      approvalPending.value = true
      form.password = ''
      form.confirmPassword = ''
      return
    }
    saveSession(session as UserSessionResponse)
    await router.replace('/app')
  } catch (cause: any) {
    error.value = cause?.message || t('register.unable')
  } finally { loading.value = false }
}

onMounted(async () => {
  try {
    await loadCapabilities()
    capabilityLoaded.value = true
  } catch (cause: any) {
    if (cause?.statusCode !== 404) return
  }
})
</script>
