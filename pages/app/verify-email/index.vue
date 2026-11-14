<template>
  <div class="mx-auto max-w-md py-16 text-center">
    <AppCard>
      <UIcon v-if="verifying" name="i-tabler-refresh" class="mx-auto size-14 animate-spin text-primary-500" />
      <UIcon v-else-if="verified" name="i-tabler-circle-check" class="mx-auto size-14 text-emerald-500" />
      <UIcon v-else-if="invalidToken" name="i-tabler-clock-x" class="mx-auto size-14 text-amber-500" />
      <UIcon v-else-if="failed || !verificationToken" name="i-tabler-alert-circle" class="mx-auto size-14 text-rose-500" />
      <UIcon v-else name="i-tabler-mail" class="mx-auto size-14 text-primary-500" />

      <h1 class="mt-5 text-2xl font-bold">{{ title }}</h1>
      <p class="mt-2 text-sm text-[var(--ui-text-muted)]">{{ message }}</p>

      <div v-if="ready" class="mt-6 space-y-3">
        <UAlert color="info" variant="subtle" :title="t('verify.confirmTitle')" :description="t('verify.confirmDesc')" />
        <UCheckbox v-model="confirmed" :label="t('verify.checkbox')" />
        <AppButton color="primary" block :disabled="!confirmed" :loading="verifying" @click="verifyEmail">{{ t('verify.confirmButton') }}</AppButton>
        <AppButton :to="returnRoute" color="neutral" variant="ghost" block>{{ t('common.cancel') }}</AppButton>
      </div>
      <div v-else-if="invalidToken" class="mt-6 space-y-3">
        <UAlert color="warning" variant="subtle" :title="t('verify.invalidTitle')" :description="t('verify.invalidDesc')" />
        <AppButton :to="returnRoute" color="primary" block>{{ authenticated ? t('verify.openWorkspace') : t('verify.goToSignIn') }}</AppButton>
      </div>
      <AppButton v-else-if="!verifying" :to="returnRoute" color="primary" block class="mt-6">{{ authenticated ? t('verify.openWorkspace') : t('verify.goToSignIn') }}</AppButton>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceState } from '~/composables/useWorkspaceState'
definePageMeta({ layout: 'app' })
const { t } = usePortalI18n()
const route = useRoute()
const router = useRouter()
const { token: sessionToken, fetchAPI, loadCurrentUser } = useUserApi()
const verificationToken = ref('')
const verifying = useWorkspaceState('user:verify-email:verifying', () => false)
const verified = ref(false)
const failed = useWorkspaceState('user:verify-email:failed', () => false)
const invalidToken = ref(false)
const confirmed = ref(false)
const messageKind = useWorkspaceState<'confirm' | 'verified' | 'expired' | 'failed' | 'missing'>('user:verify-email:message-kind', () => 'confirm')
const serverMessage = useWorkspaceState('user:verify-email:message', () => '')
const message = computed(() => {
  if (messageKind.value === 'verified') return t('verify.msgVerified')
  if (messageKind.value === 'expired') return t('verify.msgExpired')
  if (messageKind.value === 'failed') return serverMessage.value || t('verify.msgUnable')
  if (messageKind.value === 'missing') return t('verify.msgMissing')
  return t('verify.msgConfirm')
})
const authenticated = computed(() => Boolean(sessionToken.value))
const returnRoute = computed(() => authenticated.value ? '/app' : '/app/login')
const ready = computed(() => Boolean(verificationToken.value) && !verified.value && !failed.value && !invalidToken.value && !verifying.value)
const title = computed(() => {
  if (verifying.value) return t('verify.titleVerifying')
  if (verified.value) return t('verify.titleVerified')
  if (invalidToken.value) return t('verify.titleExpired')
  if (failed.value || !verificationToken.value) return t('verify.titleFailed')
  return t('verify.title')
})

async function scrubToken() {
  const query = { ...route.query }
  delete query.token
  await router.replace({ path: route.path, query, hash: '' })
}

async function verifyEmail() {
  if (!verificationToken.value || !confirmed.value || verifying.value) return
  verifying.value = true
  failed.value = false
  invalidToken.value = false
  try {
    await fetchAPI('/email/verify', { method: 'POST', auth: false, body: { token: verificationToken.value } })
    verified.value = true
    messageKind.value = 'verified'
    if (authenticated.value) await loadCurrentUser()
  } catch (cause: any) {
    if (cause?.code === 'invalid_or_expired_token') {
      invalidToken.value = true
      verificationToken.value = ''
      messageKind.value = 'expired'
    } else {
      failed.value = true
      serverMessage.value = cause?.message || ''
            messageKind.value = 'failed'
    }
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  const fragmentToken = new URLSearchParams(route.hash.slice(1)).get('token')
    verificationToken.value = (fragmentToken || (typeof route.query.token === 'string' ? route.query.token : '')).trim()
  if (!verificationToken.value) messageKind.value = 'missing'
  void scrubToken()
})
</script>
