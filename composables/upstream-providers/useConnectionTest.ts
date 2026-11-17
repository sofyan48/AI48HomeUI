import type { Ref } from 'vue'
import { errorMessage, type ProviderRequestOptions, type ProxyResponse } from './types'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { automaticTestModel, upstreamStatusError } from '~/composables/upstream-providers/categories'

// Connectivity test for Claude and OpenAI-compatible providers.
export function useConnectionTest({ t, fetchAPI, selectedProviderRoute, editor, discoveryAuthIndex }: ProviderRequestOptions & { discoveryAuthIndex: Readonly<Ref<string>> }) {
  const { testModel, providerForm, primaryProviderKey, headerRows, isCompat } = editor
  const testError = useWorkspaceState('admin:upstream-providers:testError', () => (''))
  const testSuccess = useWorkspaceState('admin:upstream-providers:testSuccess', () => (false))
  const testingConnection = useWorkspaceState('admin:upstream-providers:testingConnection', () => (false))

  async function testProviderConnection() {
    testError.value = ''
    testSuccess.value = false
    const selectedTestModel = testModel.value === automaticTestModel ? '' : testModel.value.trim()
    const model = selectedTestModel || providerForm.value.models.find(item => String(item.name || '').trim())?.name.trim()
    const authIndex = discoveryAuthIndex.value
    const key = primaryProviderKey.value
    const headers = Object.fromEntries(headerRows.value.filter(row => row.name.trim()).map(row => [row.name.trim(), row.value]))
    const hasAuthHeader = Object.entries(headers).some(([name, value]) =>
      (selectedProviderRoute.value === 'claude-api-key' ? name.toLowerCase() === 'x-api-key' : name.toLowerCase() === 'authorization') && String(value).trim())
    if (!model) { testError.value = t('upstream.providers.selectTestModel'); return }
    if (!key && !authIndex && !hasAuthHeader) { testError.value = t('upstream.providers.needAuth'); return }
    const base = String(providerForm.value['base-url'] || '').trim().replace(/\/+$/, '')
    if (isCompat.value && !base) { testError.value = t('upstream.providers.baseUrlRequired'); return }
    const claude = selectedProviderRoute.value === 'claude-api-key'
    const endpoint = claude
      ? `${(base || 'https://api.anthropic.com').replace(/\/v1\/messages$/i, '').replace(/\/v1(?:\/.*)?$/i, '')}/v1/messages`
      : /\/chat\/completions$/i.test(base) ? base : /\/v1$/i.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`
    try {
      const url = new URL(endpoint)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error()
    } catch { testError.value = t('upstream.providers.invalidBaseUrl'); return }
    const header: Record<string, string> = { 'Content-Type': 'application/json', ...headers }
    const authHeader = claude ? 'x-api-key' : 'Authorization'
    if (!Object.keys(header).some(name => name.toLowerCase() === authHeader.toLowerCase())) header[authHeader] = key ? claude ? key : `Bearer ${key}` : '$TOKEN$'
    if (claude && !Object.keys(header).some(name => name.toLowerCase() === 'anthropic-version')) header['anthropic-version'] = '2023-06-01'
    const data = claude ? { model, max_tokens: 8, messages: [{ role: 'user', content: 'Hi' }] } : { model, messages: [{ role: 'user', content: 'Hi' }], stream: false, max_tokens: 5 }
    testingConnection.value = true
    try {
      const response = await fetchAPI<ProxyResponse>('/requests/api-call', { method: 'POST', body: { auth_index: authIndex || undefined, method: 'POST', url: endpoint, header, data: JSON.stringify(data) } })
      if (!response?.status_code || response.status_code < 200 || response.status_code >= 300) throw new Error(upstreamStatusError(t, response))
      testSuccess.value = true
    } catch (error) {
      testError.value = errorMessage(error, t('upstream.providers.connectionFailed'))
    } finally {
      testingConnection.value = false
    }
  }

  return { testError, testSuccess, testingConnection, testProviderConnection }
}
