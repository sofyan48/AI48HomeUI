import { computed, onScopeDispose, ref, type Ref } from 'vue'
import type { OrganizationForm } from './types'

interface CredentialScope { id: number, channel_name: string, disabled?: boolean, deleted_at?: string | null }
type FetchScopes = <T>(path: string, options?: { signal?: AbortSignal }) => Promise<T>
type Translate = (key: 'organizations.credentialScopesLoadFailed' | 'organizations.unknownCredentialScope', params?: Record<string, string | number>) => string

export function useOrganizationCredentialScopes(fetchAPI: FetchScopes, form: Ref<OrganizationForm>, t: Translate) {
  const groups = ref<CredentialScope[]>([])
  const scopesLoading = ref(false)
  const scopesError = ref('')
  const scopesLoaded = ref(false)
  let version = 0
  let controller: AbortController | undefined

  async function loadCredentialScopes() {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    scopesLoading.value = true
    scopesError.value = ''
    scopesLoaded.value = false
    try {
      const response = await fetchAPI<{ channel_groups: CredentialScope[] }>('/channel-groups', { signal: controller.signal })
      if (current !== version) return
      if (!Array.isArray(response.channel_groups)) throw new Error(t('organizations.credentialScopesLoadFailed'))
      groups.value = response.channel_groups.filter(group => !group.deleted_at)
      scopesLoaded.value = true
    } catch {
      if (current === version) scopesError.value = t('organizations.credentialScopesLoadFailed')
    } finally {
      if (current === version) scopesLoading.value = false
    }
  }

  const credentialScopeName = (id: number) => groups.value.find(group => group.id === id)?.channel_name || t('organizations.unknownCredentialScope', { id })
  const credentialScopeOptions = computed(() => {
    const selected = form.value.channelGroups
    const options = groups.value.filter(group => !group.disabled || selected.includes(group.id))
      .map(group => ({ id: group.id, name: credentialScopeName(group.id), disabled: Boolean(group.disabled) }))
    for (const id of selected) {
      if (!options.some(group => group.id === id)) options.push({ id, name: credentialScopeName(id), disabled: true })
    }
    return options
  })

  function toggleCredentialScope(id: number, checked: boolean) {
    const remaining = form.value.channelGroups.filter(value => value !== id)
    form.value.channelGroups = checked ? [...remaining, id].sort((a, b) => a - b) : remaining
  }

  onScopeDispose(() => { version++; controller?.abort() })
  return { scopesLoading, scopesError, scopesLoaded, loadCredentialScopes, credentialScopeName, credentialScopeOptions, toggleCredentialScope }
}
