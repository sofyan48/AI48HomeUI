<template>
  <UModal v-model:open="open" :title="t('shared.connection.title')" :description="t('shared.connection.description')" :dismissible="!pending" :close="!pending" :ui="{ content: 'sm:max-w-lg' }">
    <template #body>
      <form class="space-y-5" :aria-busy="pending" @submit.prevent="connect">
        <div class="space-y-1">
          <p role="status" class="text-sm font-medium">{{ pending ? tc('connection.checking') : statusLabel }}</p>
          <p class="break-all text-xs text-[var(--ui-text-muted)]">{{ apiBase }}</p>
        </div>
        <UAlert v-if="errorMessage || capabilitiesError" color="error" variant="subtle" :title="tc('connection.failed')" :description="errorMessage || capabilitiesError || undefined" />
        <UFormField :label="tc('connect.key')" required>
          <UInput v-model="key" type="password" autocomplete="current-password" :placeholder="tc('connect.keyPlaceholder')" icon="i-tabler-key" class="w-full" :disabled="pending" autofocus />
        </UFormField>
        <UCheckbox v-model="remember" :label="tc('connect.remember')" :disabled="pending" />
        <p class="text-xs leading-5 text-[var(--ui-text-muted)]">{{ t('shared.connection.privacy') }}</p>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton v-if="token" type="button" color="error" variant="soft" :disabled="pending" @click="disconnect">{{ tc('shell.disconnect') }}</AppButton>
          <AppButton type="button" color="neutral" variant="ghost" :disabled="pending" @click="open = false">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" :loading="pending" :disabled="pending || !key.trim()">{{ t('shared.connection.submit') }}</AppButton>
        </div>
      </form>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useManagementSessionStore } from '~/stores/managementSession'
import { useConsoleLocale } from '~/composables/useConsoleLocale'

const open = defineModel<boolean>('open', { default: false })
defineProps<{ statusLabel: string }>()
const { t } = useAdminI18n()
const { t: tc } = useConsoleLocale()
const { token, rememberSession } = storeToRefs(useManagementSessionStore())
const { fetchAPI, apiBase } = useApi()
const { error: capabilitiesError, refreshCapabilities, resetCapabilities } = useCapabilities()
const key = ref('')
const remember = ref(false)
const pending = ref(false)
const errorMessage = ref('')
let controller: AbortController | undefined

watch(open, (value) => {
  errorMessage.value = ''
  key.value = value ? token.value || '' : ''
  remember.value = value ? Boolean(rememberSession.value) : false
}, { immediate: true })

onBeforeUnmount(() => controller?.abort())

async function connect() {
  const candidate = key.value.trim()
  if (!candidate || pending.value) return
  pending.value = true
  errorMessage.value = ''
  controller = new AbortController()
  const signal = controller.signal
  const previousToken = token.value
  try {
    // Keep the active session intact until the candidate key has been validated.
    await fetchAPI('/capabilities', { token: candidate, signal })
    if (signal.aborted || token.value !== previousToken) return
    const cookieOptions = {
      sameSite: 'strict' as const,
      secure: import.meta.client && window.location.protocol === 'https:',
      ...(remember.value ? { maxAge: 60 * 60 * 24 * 30 } : {})
    }
    useCookie<string | null>('management_token', cookieOptions).value = candidate
    useCookie<boolean>('management_remember', cookieOptions).value = remember.value
    token.value = candidate
    rememberSession.value = remember.value
    resetCapabilities()
    await refreshCapabilities(true)
    if (!signal.aborted && token.value === candidate) open.value = false
  } catch (cause: any) {
    if (!signal.aborted) errorMessage.value = cause?.message || tc('connect.unreachable')
  } finally {
    pending.value = false
  }
}

function disconnect() {
  if (pending.value) return
  token.value = null
  rememberSession.value = false
  resetCapabilities()
  key.value = ''
  remember.value = false
  errorMessage.value = ''
}
</script>
