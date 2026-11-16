<template>
  <div class="mx-auto max-w-md py-8">

    <AppCard>
      <template #header>
        <div class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-500"><AppIcon :name="passkeyRequired ? 'i-tabler-fingerprint' : needsTOTP ? 'i-tabler-device-mobile' : 'i-tabler-user'" class="size-5" /></span>
          <div><h1 class="text-xl font-semibold text-[var(--ui-text-highlighted)]">{{ title }}</h1><p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ description }}</p></div>
        </div>
      </template>

      <form @submit.prevent="submit">
        <FieldGroup class="gap-4">
          <PortalAlert v-if="error" ref="errorAlert" color="error" variant="subtle" :title="t('login.failed')" :description="error" role="alert" tabindex="-1" />
          <PortalField :label="t('auth.username')" required><PortalInput v-model="form.username" class="w-full" autocomplete="username" icon="i-tabler-user" :readonly="needsTOTP || passkeyRequired" autofocus /></PortalField>
          <PortalField v-if="!passkeyRequired" :label="t('auth.password')" required>
            <PortalInput v-model="form.password" class="w-full" :type="passwordVisible ? 'text' : 'password'" autocomplete="current-password" icon="i-tabler-lock" :ui="{ trailing: 'pe-1' }">
              <template #trailing>
                <AppButton type="button" size="xs" color="neutral" variant="ghost" :icon="passwordVisible ? 'i-tabler-eye-off' : 'i-tabler-eye'" :aria-label="passwordVisible ? t('login.hidePassword') : t('login.showPassword')" :title="passwordVisible ? t('login.hidePassword') : t('login.showPassword')" :aria-pressed="passwordVisible" @click="passwordVisible = !passwordVisible" />
              </template>
            </PortalInput>
          </PortalField>
          <PortalField v-if="needsTOTP" :label="t('login.totpCode')" required><PortalInput v-model="form.totp" class="w-full font-mono tracking-[0.3em]" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" autofocus /></PortalField>
          <PortalAlert v-if="passkeyRequired" color="warning" variant="subtle" :title="t('login.passkeyRequired')" :description="t('login.passkeyRequiredDesc')" />
          <div v-if="!needsTOTP && !passkeyRequired" class="flex justify-end"><NuxtLink to="/app/forgot-password" class="text-sm font-medium text-primary-500">{{ t('login.forgot') }}</NuxtLink></div>
          <PortalCheckbox v-model="remember" :label="t('login.remember')" :disabled="loading || passkeyLoading" />
          <p class="text-xs leading-5 text-[var(--ui-text-muted)]">{{ remember ? t('login.rememberOn') : t('login.rememberOff') }}</p>
          <AppButton v-if="passkeyRequired" type="button" color="primary" block icon="i-tabler-fingerprint" :loading="passkeyLoading" :disabled="!passkeysSupported || loading" @click="passkeyLogin">{{ t('login.usePasskey') }}</AppButton>
          <AppButton v-else type="submit" color="primary" block :loading="loading" :disabled="passkeyLoading">{{ needsTOTP ? t('login.verifyAndSignIn') : t('shell.signIn') }}</AppButton>
          <AppButton v-if="!needsTOTP && !passkeyRequired && passkeysSupported" type="button" color="neutral" variant="outline" block icon="i-tabler-fingerprint" :loading="passkeyLoading" :disabled="loading" @click="passkeyLogin">{{ t('login.withPasskey') }}</AppButton>
        </FieldGroup>
      </form>
      <template #footer><p class="text-center text-sm text-[var(--ui-text-muted)]">{{ t('login.needAccount') }} <NuxtLink to="/app/register" class="font-medium text-primary-500">{{ t('login.createAccount') }}</NuxtLink></p></template>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalCheckbox from '~/components/app/general/PortalCheckbox.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { FieldGroup } from '~/components/ui/field'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const route = useRoute()
const router = useRouter()
const { token, login, loginWithPasskey, hydrateSession, loadCurrentUser, clearSession } = useUserApi()
const form = reactive({ username: '', password: '', totp: '' })
const remember = ref(false)
const passwordVisible = ref(false)
const needsTOTP = ref(false)
const passkeyRequired = ref(false)
const loading = useWorkspaceState('user:login:loading', () => false)
const passkeyLoading = useWorkspaceState('user:login:passkey-loading', () => false)
const error = useWorkspaceState('user:login:error', () => '')
const errorAlert = ref<HTMLElement | null>(null)
const passkeysSupported = ref(false)
const title = computed(() => needsTOTP.value ? t('login.titleTotp') : passkeyRequired.value ? t('login.titlePasskey') : t('login.title'))
const description = computed(() => needsTOTP.value ? t('login.descTotp') : passkeyRequired.value ? t('login.descPasskey') : t('login.desc'))
const destination = computed(() => typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/app') && route.query.redirect !== '/app/login' ? route.query.redirect : '/app')

async function focusError() { await nextTick(); errorAlert.value?.focus?.() }
async function submit() {
  if (loading.value || passkeyLoading.value) return
  error.value = ''
  if (!form.username.trim()) { error.value = t('auth.usernameRequired'); return focusError() }
  if (!form.password) { error.value = t('auth.passwordRequired'); return focusError() }
  if (needsTOTP.value && !form.totp.trim()) { error.value = t('login.totpRequired'); return focusError() }
  loading.value = true
  try {
    await login(form.username.trim(), form.password, needsTOTP.value ? form.totp.trim() : undefined, remember.value)
    await router.replace(destination.value)
  } catch (cause: any) {
    if (cause?.code === 'totp_required') { needsTOTP.value = true; passkeyRequired.value = false; form.totp = '' }
    else if (cause?.code === 'passkey_required') { passkeyRequired.value = true; needsTOTP.value = false; error.value = '' }
    else { error.value = cause?.message || t('login.unable'); await focusError() }
  } finally { loading.value = false }
}
async function passkeyLogin() {
  if (loading.value || passkeyLoading.value) return
  if (!form.username.trim()) { error.value = t('auth.usernameRequired'); return focusError() }
  error.value = ''; passkeyLoading.value = true
  try { await loginWithPasskey(form.username.trim(), remember.value); await router.replace(destination.value) }
  catch (cause: any) { error.value = cause?.name === 'NotAllowedError' ? t('login.passkeyCancelled') : (cause?.message || t('login.passkeyFailed')); await focusError() }
  finally { passkeyLoading.value = false }
}
onMounted(async () => {
  passkeysSupported.value = Boolean(window.PublicKeyCredential && navigator.credentials)
  hydrateSession()
  if (!token.value) return
  try {
    await loadCurrentUser()
    await router.replace(destination.value)
  } catch (cause: any) {
    if (cause?.statusCode === 401 || cause?.code === 'approval_pending') clearSession()
    if (cause?.code === 'approval_pending') { error.value = cause.message; await focusError() }
  }
})
</script>
