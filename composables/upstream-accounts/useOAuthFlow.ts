import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

import type { AccountShared, OAuthSession, OAuthStatus } from './types'
import type { useCredentialUpload } from './useCredentialUpload'

// Add-account dialog: OAuth sessions, status polling and manual callback submission.
export function useOAuthFlow(ctx: AccountShared & ReturnType<typeof useCredentialUpload>) {
  const { t, fetchAPI, toast, message, refreshData, fileInput, uploadResults, uploadActive } = ctx
  const createOpen = ref(false)
  const createMode = ref('oauth')
  const createModes = computed(() => [{ value: 'oauth', label: 'OAuth' }, { value: 'upload', label: t('cred.create.upload') }, { value: 'vertex', label: 'Vertex' }])
  const oauthError = useWorkspaceState('admin:upstream-accounts:oauthError', () => (''))
  const startingOAuth = useWorkspaceState('admin:upstream-accounts:startingOAuth', () => (''))
  const oauthSessions = useWorkspaceState<Record<string, OAuthSession>>('admin:upstream-accounts:oauthSessions', () => ({}))
  const checkingOAuth = useWorkspaceState('admin:upstream-accounts:checkingOAuth', () => (''))
  let oauthGeneration = 0
  function stopOAuthPolling() { oauthGeneration++ }
  onBeforeUnmount(stopOAuthPolling)

  const submittingCallback = useWorkspaceState('admin:upstream-accounts:submittingCallback', () => (''))
  const oauthProviders = [
    { label: 'Claude', value: 'claude' }, { label: 'Codex', value: 'codex' },
    { label: 'Antigravity', value: 'antigravity' }, { label: 'Kimi', value: 'kimi' },
    { label: 'xAI', value: 'xai' }, { label: 'Devin', value: 'devin' }, { label: 'Meta', value: 'meta' }
  ]
  function handleCreateOpen(open: boolean) {
    if (!open && uploadActive.value) { nextTick(() => { createOpen.value = true }); return }
    if (!open) { stopOAuthPolling(); oauthSessions.value = {}; uploadResults.value = []; if (fileInput.value) fileInput.value.value = '' }
  }

  async function startOAuth(provider: string) {
    if (startingOAuth.value) return
    startingOAuth.value = provider; oauthError.value = ''
    try {
      const result = await fetchAPI<{ url?: string; auth_url?: string; state?: string }>('/oauth/auth-url', { query: { provider, is_webui: true } })
      const url = result?.url || result?.auth_url
      if (!url) throw new Error(t('cred.err.noAuthUrl'))
      stopOAuthPolling()
      const sessions = { ...oauthSessions.value, [provider]: { url, state: result.state || '', status: '', code: '', redirect_url: '', callback_error: '' } }
      oauthSessions.value = sessions
    } catch (error) { oauthError.value = message(error) }
    finally { startingOAuth.value = '' }
  }
  async function copyOAuthLink(provider: string) {
    try { await navigator.clipboard.writeText(oauthSessions.value[provider]!.url); toast.add({ title: t('cred.toast.linkCopied'), color: 'success' }) }
    catch (error) { oauthError.value = message(error) }
  }
  function openOAuthLink(provider: string) { window.open(oauthSessions.value[provider]!.url, '_blank', 'noopener,noreferrer') }
  async function completeOAuth() {
    stopOAuthPolling()
    await refreshData()
    toast.add({ title: t('cred.toast.oauthCompleted'), color: 'success' })
    createOpen.value = false
    oauthSessions.value = {}
  }
  async function checkOAuthStatus(provider: string, notify = true) {
    const session = oauthSessions.value[provider]
    if (!session?.state || checkingOAuth.value === provider) return
    checkingOAuth.value = provider
    try {
      const result = await fetchAPI<OAuthStatus>('/oauth/status', { query: { state: session.state.trim() || undefined } })
      session.status = result.status || 'unknown'; session.error = result.error || ''
      if (String(session.status).trim().toLowerCase() === 'ok') await completeOAuth()
      else if (notify) toast.add({ title: t('cred.toast.oauthChecked'), color: 'neutral' })
    } catch (error) { if (notify) oauthError.value = message(error) }
    finally { checkingOAuth.value = '' }
  }
  async function pollOAuth(provider: string, state: string) {
    const generation = ++oauthGeneration
    let failures = 0
    for (let attempt = 0; attempt < 150; attempt++) {
      try {
        const result = await fetchAPI<OAuthStatus>('/oauth/status', { query: { state } })
        if (generation !== oauthGeneration) return
        failures = 0
        const session = oauthSessions.value[provider]
        if (session) { session.status = result.status || 'unknown'; session.error = result.error || '' }
        const status = String(result.status || 'unknown').trim().toLowerCase()
        if (status === 'ok') { await completeOAuth(); return }
        if (status === 'error') { toast.add({ title: t('cred.toast.oauthFailed'), description: result.error || result.status, color: 'error' }); return }
      } catch (error) {
        if (generation !== oauthGeneration) return
        failures++
        if (failures >= 3) { toast.add({ title: t('cred.toast.oauthStatusFailed'), description: message(error), color: 'error' }); return }
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    if (generation === oauthGeneration) toast.add({ title: t('cred.toast.oauthStopped'), color: 'neutral' })
  }
  function extractOAuthCode(text: string) { const value = String(text || '').trim(); return value.match(/\bcode\s*[:=]\s*([^\s&]+)/i)?.[1]?.trim() || value }
  function normalizeXaiCallback(source: string, fallbackState: string) {
    const value = String(source || '').trim()
    if (!value) return ''
    try { return new URL(value).toString() } catch {}
    const query = value.includes('?') ? value.slice(value.indexOf('?') + 1) : value.includes('#') ? value.slice(value.indexOf('#') + 1) : value
    if (/(^|[&#?])(code|state|error)=/i.test(query)) {
      const params = new URLSearchParams(query.replace(/^[?#]/, ''))
      const state = (params.get('state') || fallbackState || '').trim()
      if (!state) return ''
      const url = new URL('http://127.0.0.1:56121/callback'); url.searchParams.set('state', state)
      for (const key of ['code', 'error', 'error_description']) if (params.get(key)?.trim()) url.searchParams.set(key, params.get(key)!.trim())
      return url.toString()
    }
    const code = extractOAuthCode(value)
    if (!code || !fallbackState) return ''
    const url = new URL('http://127.0.0.1:56121/callback'); url.searchParams.set('code', code); url.searchParams.set('state', fallbackState); return url.toString()
  }
  async function submitCallback(provider: string) {
    const session = oauthSessions.value[provider]
    if (!session || provider === 'kimi') return
    oauthError.value = ''
    let redirectURL = session.redirect_url.trim()
    let code = session.code.trim()
    const state = session.state.trim()
    const errorText = session.callback_error.trim()
    try {
      if (provider === 'xai' && !state && !/(?:^|[?&#])state=/i.test(redirectURL)) throw new Error(t('cred.err.xaiState'))
      if ((!state && !redirectURL) || (!code && !errorText && !redirectURL)) throw new Error(t('cred.err.callbackInput'))
      if (provider === 'xai') {
        const normalized = normalizeXaiCallback(redirectURL || code, state)
        code = normalized ? '' : extractOAuthCode(code)
        redirectURL = normalized || redirectURL
      }
      submittingCallback.value = provider
      await fetchAPI('/oauth/callback', { method: 'POST', body: { provider, redirect_url: redirectURL, code, state, error: errorText } })
      toast.add({ title: t('cred.toast.callbackSubmitted'), color: 'success' })
      let pollState = state
      if (!pollState) { const match = session.redirect_url.match(/(?:^|[?&#])state=([^&]+)/i); if (match) { try { pollState = decodeURIComponent(match[1]!) } catch { pollState = match[1]! } } }
      if (pollState) { session.status = 'wait'; void pollOAuth(provider, pollState) }
    } catch (error) { oauthError.value = message(error) }
    finally { submittingCallback.value = '' }
  }

  return {
    createOpen, createMode, createModes, oauthError, startingOAuth, oauthSessions, checkingOAuth, submittingCallback,
    oauthProviders, handleCreateOpen, startOAuth, copyOAuthLink, openOAuthLink, checkOAuthStatus, submitCallback
  }
}
