<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="w-full max-w-lg"
      :show-close-button="!!token && !pending"
      @escape-key-down="preventDismiss"
      @interact-outside="preventDismiss"
      @pointer-down-outside="preventDismiss"
    >
      <DialogHeader>
        <DialogTitle>{{ t('shared.connection.title') }}</DialogTitle>
        <DialogDescription>{{ t('shared.connection.description') }}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-5" :aria-busy="pending" @submit.prevent="connect">
        <div class="flex flex-col gap-1">
          <p role="status" class="text-sm font-medium">{{ pending ? tc('connection.checking') : statusLabel }}</p>
          <p class="break-all text-xs text-muted-foreground">{{ apiBase }}</p>
        </div>
        <PortalAlert v-if="errorMessage || capabilitiesError" color="error" variant="subtle" :title="tc('connection.failed')" :description="errorMessage || capabilitiesError || undefined" />
        <AdminField :label="tc('connect.key')" required>
          <AdminInput v-model="key" type="password" autocomplete="current-password" :placeholder="tc('connect.keyPlaceholder')" icon="i-tabler-key" class="w-full" :disabled="pending" autofocus :ui="{ leading: 'pl-3 pr-1.5', base: 'pl-2' }" />
        </AdminField>
        <AdminCheckbox v-model="remember" :label="tc('connect.remember')" :disabled="pending" />
        <p class="text-xs leading-5 text-muted-foreground">{{ t('shared.connection.privacy') }}</p>
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton v-if="token" type="button" color="error" variant="soft" :disabled="pending" @click="disconnect">{{ tc('shell.disconnect') }}</AppButton>
          <AppButton v-if="token" type="button" color="neutral" variant="ghost" :disabled="pending" @click="open = false">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" :loading="pending" :disabled="pending || !key.trim()">{{ t('shared.connection.submit') }}</AppButton>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
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

function preventDismiss(event: Event) {
  if (pending.value || !token.value) event.preventDefault()
}

async function connect() {
  const candidate = key.value.trim()
  if (!candidate || pending.value) return
  pending.value = true
  errorMessage.value = ''
  controller = new AbortController()
  const signal = controller.signal
  const previousToken = token.value
  try {
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
