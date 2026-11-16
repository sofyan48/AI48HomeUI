import { computed, inject, provide, reactive, ref, type InjectionKey } from 'vue'
import { useUserApi, type UserSessionResponse } from '~/composables/useUserApi'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePortalToast } from '~/composables/portal/usePortalToast'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage } from './common'

function createWorkspaceAccount() {
  const { t } = usePortalI18n()
  const toast = usePortalToast()
  const { currentUser: user, capabilities, fetchAPI, saveSession, loadCurrentUser } = useUserApi()
  const passwordForm = reactive({ password: '', confirm: '' })
  const passwordError = useWorkspaceState('user:workspace:password-error', () => '')
  const passwordSaving = useWorkspaceState('user:workspace:password-saving', () => false)
  const email = ref('')
  const emailError = useWorkspaceState('user:workspace:email-error', () => '')
  const emailSaving = useWorkspaceState('user:workspace:email-saving', () => false)
  const emailDetail = computed(() => {
    if (capabilities.value.email_verification === false) return t('ws.settings.emailDisabled')
    if (!user.value?.email_status.configured) return t('ws.settings.noEmail')
    return user.value.email_status.verified ? t('ws.settings.emailVerified', { email: user.value.email_status.masked }) : t('ws.settings.emailPending', { email: user.value.email_status.masked })
  })
  async function changePassword() {
    passwordError.value = ''
    if (!passwordForm.password) return void (passwordError.value = t('ws.settings.enterPassword'))
    if (passwordForm.password !== passwordForm.confirm) return void (passwordError.value = t('ws.settings.passwordMismatch'))
    passwordSaving.value = true
    try {
      const session = await fetchAPI<UserSessionResponse>('/password', { method: 'POST', body: { new_password: passwordForm.password } })
      saveSession(session)
      passwordForm.password = ''
      passwordForm.confirm = ''
      toast.add({ title: t('ws.settings.passwordChanged'), color: 'success' })
    } catch (error: any) {
      passwordError.value = errorMessage(error, t('ws.settings.passwordFailed'))
    } finally {
      passwordSaving.value = false
    }
  }
  async function updateEmail() {
    emailError.value = ''
    const value = email.value.trim()
    if (!value) return void (emailError.value = t('ws.settings.enterEmail'))
    emailSaving.value = true
    try {
      await fetchAPI('/email', { method: 'PUT', body: { email: value } })
      await fetchAPI('/email/verification', { method: 'POST', body: {} })
      await loadCurrentUser()
      email.value = ''
      toast.add({ title: t('ws.settings.emailSaved'), description: t('ws.settings.emailQueued'), color: 'success' })
    } catch (error: any) {
      emailError.value = errorMessage(error, t('ws.settings.emailUpdateFailed'))
    } finally {
      emailSaving.value = false
    }
  }
  async function clearEmail() {
    emailError.value = ''
    emailSaving.value = true
    try {
      await fetchAPI('/email', { method: 'DELETE', body: {} })
      await loadCurrentUser()
      email.value = ''
      toast.add({ title: t('ws.settings.emailRemoved'), color: 'success' })
    } catch (error: any) {
      emailError.value = errorMessage(error, t('ws.settings.emailRemoveFailed'))
    } finally {
      emailSaving.value = false
    }
  }
  async function requestVerification() {
    emailError.value = ''
    emailSaving.value = true
    try {
      await fetchAPI('/email/verification', { method: 'POST', body: {} })
      toast.add({ title: t('ws.settings.verificationQueued'), color: 'success' })
    } catch (error: any) {
      emailError.value = errorMessage(error, t('ws.settings.verificationFailed'))
    } finally {
      emailSaving.value = false
    }
  }
  return { passwordForm, passwordError, passwordSaving, email, emailError, emailSaving, emailDetail, changePassword, updateEmail, clearEmail, requestVerification }
}
const accountKey: InjectionKey<ReturnType<typeof createWorkspaceAccount>> = Symbol('workspace-account')
export function provideWorkspaceAccount() {
  const account = createWorkspaceAccount()
  provide(accountKey, account)
  return account
}
export function useWorkspaceAccount() {
  const account = inject(accountKey)
  if (!account) throw new Error('Workspace account is not provided')
  return account
}
