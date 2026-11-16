import { inject, provide, ref, type InjectionKey } from 'vue'
import { useUserApi } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage } from './common'

type TOTPSetup = { secret: string; otp_auth_url?: string; issuer?: string; enabled?: boolean }
function createWorkspaceTOTP() {
  const { t } = usePortalI18n()
  const toast = useToast()
  const { fetchAPI, loadCurrentUser } = useUserApi()
  const totpSetup = useWorkspaceState<TOTPSetup | null>('user:workspace:totp-setup', () => null)
  const totpCode = ref('')
  const totpError = useWorkspaceState('user:workspace:totp-error', () => '')
  const totpLoading = useWorkspaceState('user:workspace:totp-loading', () => false)
  const totpSaving = useWorkspaceState('user:workspace:totp-saving', () => false)
  const totpDeleteOpen = ref(false)
  const totpDeleting = useWorkspaceState('user:workspace:totp-deleting', () => false)
  function openTOTPDelete() { totpDeleteOpen.value = true }
  function closeTOTPDelete() { totpDeleteOpen.value = false }
  async function showTOTP(regenerate: boolean) {
    totpError.value = ''
    totpLoading.value = true
    try {
      totpSetup.value = await fetchAPI<TOTPSetup>('/totp', { query: { issuer: 'AI48Hub', ...(regenerate ? { regenerate: true } : {}) } })
      totpCode.value = ''
    } catch (error: any) {
      totpError.value = errorMessage(error, t('ws.settings.totpLoadFailed'))
    } finally {
      totpLoading.value = false
    }
  }
  async function bindTOTP() {
    if (!totpSetup.value) return
    totpError.value = ''
    if (!totpCode.value.trim()) return void (totpError.value = t('ws.settings.enterCode'))
    totpSaving.value = true
    try {
      await fetchAPI('/totp', { method: 'POST', body: { secret: totpSetup.value.secret, issuer: totpSetup.value.issuer || 'AI48Hub', code: totpCode.value.trim() } })
      await loadCurrentUser()
      totpSetup.value = null
      totpCode.value = ''
      toast.add({ title: t('ws.settings.totpSaved'), color: 'success' })
    } catch (error: any) {
      totpError.value = errorMessage(error, t('ws.settings.totpSaveFailed'))
    } finally {
      totpSaving.value = false
    }
  }
  async function deleteTOTP() {
    totpDeleting.value = true
    try {
      await fetchAPI('/totp', { method: 'DELETE', body: {} })
      await loadCurrentUser()
      totpSetup.value = null
      totpDeleteOpen.value = false
      toast.add({ title: t('ws.settings.totpDisabled'), color: 'success' })
    } catch (error: any) {
      toast.add({ title: t('ws.settings.totpDisableFailed'), description: errorMessage(error, t('ws.requestFailed')), color: 'error' })
    } finally {
      totpDeleting.value = false
    }
  }
  return { totpSetup, totpCode, totpError, totpLoading, totpSaving, totpDeleteOpen, totpDeleting, openTOTPDelete, closeTOTPDelete, showTOTP, bindTOTP, deleteTOTP }
}
const totpKey: InjectionKey<ReturnType<typeof createWorkspaceTOTP>> = Symbol('workspace-totp')
export function provideWorkspaceTOTP() {
  const totp = createWorkspaceTOTP()
  provide(totpKey, totp)
  return totp
}
export function useWorkspaceTOTP() {
  const totp = inject(totpKey)
  if (!totp) throw new Error('Workspace TOTP is not provided')
  return totp
}
