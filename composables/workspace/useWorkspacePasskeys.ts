import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useUserApi, type UserPasskey } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalToast } from '~/composables/portal/usePortalToast'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage } from './common'

function createWorkspacePasskeys() {
  const { t } = usePortalI18n()
  const toast = usePortalToast()
  const { fetchAPI, loadCurrentUser, registerPasskey } = useUserApi()
  const passkeyName = ref('')
  const passkeyError = useWorkspaceState('user:workspace:passkey-error', () => '')
  const passkeySaving = useWorkspaceState('user:workspace:passkey-saving', () => false)
  const passkeyDeleteOpen = ref(false)
  const passkeyDeleteTarget = ref<UserPasskey | null>(null)
  const passkeyDeleting = useWorkspaceState('user:workspace:passkey-deleting', () => false)
  const passkeyColumns = computed(() => [
    { accessorKey: 'name', header: t('ws.settings.col.name') },
    { accessorKey: 'created_at', header: t('ws.settings.col.created') },
    { accessorKey: 'updated_at', header: t('ws.settings.col.updated') },
    { id: 'actions', header: t('ws.settings.col.actions'), meta: { class: { th: 'text-right', td: 'text-right' } } }
  ])
  function closePasskeyDelete() { passkeyDeleteOpen.value = false }
  async function addPasskey() {
    passkeyError.value = ''
    passkeySaving.value = true
    try {
      await registerPasskey(passkeyName.value.trim())
      passkeyName.value = ''
      toast.add({ title: t('ws.settings.passkeyAdded'), color: 'success' })
    } catch (error: any) {
      passkeyError.value = error?.name === 'NotAllowedError' ? t('ws.settings.passkeyCancelled') : errorMessage(error, t('ws.settings.passkeyAddFailed'))
    } finally {
      passkeySaving.value = false
    }
  }
  function confirmPasskeyDelete(passkey: UserPasskey) {
    passkeyDeleteTarget.value = passkey
    passkeyDeleteOpen.value = true
  }
  async function deletePasskey() {
    const target = passkeyDeleteTarget.value
    if (!target) return
    passkeyDeleting.value = true
    try {
      await fetchAPI(`/passkeys/${encodeURIComponent(target.id)}`, { method: 'DELETE', body: {} })
      await loadCurrentUser()
      passkeyDeleteOpen.value = false
      passkeyDeleteTarget.value = null
      toast.add({ title: t('ws.settings.passkeyDeleted'), color: 'success' })
    } catch (error: any) {
      toast.add({ title: t('ws.settings.passkeyDeleteFailed'), description: errorMessage(error, t('ws.requestFailed')), color: 'error' })
    } finally {
      passkeyDeleting.value = false
    }
  }
  return { passkeyName, passkeyError, passkeySaving, passkeyDeleteOpen, passkeyDeleteTarget, passkeyDeleting, passkeyColumns, closePasskeyDelete, addPasskey, confirmPasskeyDelete, deletePasskey }
}
const passkeysKey: InjectionKey<ReturnType<typeof createWorkspacePasskeys>> = Symbol('workspace-passkeys')
export function provideWorkspacePasskeys() {
  const passkeys = createWorkspacePasskeys()
  provide(passkeysKey, passkeys)
  return passkeys
}
export function useWorkspacePasskeys() {
  const passkeys = inject(passkeysKey)
  if (!passkeys) throw new Error('Workspace passkeys are not provided')
  return passkeys
}
