import { useWorkspaceState } from '~/composables/useWorkspaceState'
import type { UsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'
import { credentialAuthId, flattenModels, mergeModelCandidates } from '~/composables/users/normalize'

const providerCandidateRoutes = [
  { id: 'gemini', path: '/config/api-keys/gemini' },
  { id: 'interactions', path: '/config/api-keys/interactions' },
  { id: 'claude', path: '/config/api-keys/claude' },
  { id: 'codex', path: '/config/api-keys/codex' },
  { id: 'vertex', path: '/config/api-keys/vertex' },
  { id: 'xai', path: '/config/api-keys/xai' },
  { id: 'meta', path: '/config/api-keys/meta' },
  { id: 'openaiCompatibility', path: '/config/api-keys/openai-compatibility' }
]

/** Loads the credentials and models that can be bound to a credential or model scope. */
export function useBindingCandidates({ fetchAPI, errorMessage }: Pick<UsersWorkspace, 'fetchAPI' | 'errorMessage'>) {
  const credentials = useWorkspaceState<AnyRecord[]>('admin:users:credentialsData', () => [])
  const runtimeModels = useWorkspaceState<AnyRecord[]>('admin:users:runtimeModelsData', () => [])
  const staticModels = useWorkspaceState<AnyRecord[]>('admin:users:staticModelsData', () => [])
  const credentialPending = useWorkspaceState('admin:users:credentialCandidatesPending', () => false)
  const credentialIssue = useWorkspaceState('admin:users:credentialCandidatesIssue', () => '')
  const credentialError = useWorkspaceState('admin:users:credentialCandidatesError', () => '')
  const modelPending = useWorkspaceState('admin:users:modelCandidatesPending', () => false)
  const modelIssue = useWorkspaceState('admin:users:modelCandidatesIssue', () => '')
  const modelError = useWorkspaceState('admin:users:modelCandidatesError', () => '')

  const models = () => mergeModelCandidates(runtimeModels.value, staticModels.value)

  async function loadCredentials() {
    credentialPending.value = true
    credentialIssue.value = ''
    credentialError.value = ''
    const results = await Promise.allSettled([
      fetchAPI('/credentials'),
      ...providerCandidateRoutes.map(route => fetchAPI(route.path))
    ])
    const failures = results.flatMap(result => result.status === 'rejected' ? [errorMessage(result.reason)] : [])
    const first = results[0]?.status === 'fulfilled' ? results[0].value : null
    // Home's /credentials returns { files: [...] }; keep the other shapes for older deployments.
    const credentialEntries: AnyRecord[] = Array.isArray(first) ? first : first?.files || first?.credentials || first?.items || []
    const providerEntries = providerCandidateRoutes.flatMap((route, index) => {
      const result = results[index + 1]
      if (result?.status !== 'fulfilled' || !Array.isArray(result.value)) return []
      return result.value.flatMap((group: AnyRecord) => {
        const keys: AnyRecord[] = Array.isArray(group?.keys) ? group.keys : []
        // Keyless compatibility groups carry their credential ID on the group itself.
        if (!keys.length) return [{ ...group, keys: undefined, source: 'provider', providerId: route.id }]
        return keys.map((item: AnyRecord) => ({
          ...group, ...item, keys: undefined, source: 'provider', providerId: route.id
        }))
      })
    })
    const seen = new Set<string>()
    credentials.value = [
      ...credentialEntries.map(item => ({ ...item, source: 'credential' })),
      ...providerEntries
    ].filter((item) => {
      const id = credentialAuthId(item)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    if (!credentials.value.length && failures.length) credentialError.value = failures.join(' · ')
    else if (failures.length) credentialIssue.value = failures.join(' · ')
    credentialPending.value = false
  }

  async function loadModels() {
    modelPending.value = true
    modelIssue.value = ''
    modelError.value = ''
    const results = await Promise.allSettled([
      fetchAPI('/models', { query: { scope: 'available' } }),
      fetchAPI('/models', { query: { scope: 'static' } })
    ])
    const [available, catalog] = results
    runtimeModels.value = available.status === 'fulfilled' ? flattenModels(available.value?.models) : []
    staticModels.value = catalog.status === 'fulfilled' ? flattenModels(catalog.value?.models) : []
    const failures = results.flatMap(result => result.status === 'rejected' ? [errorMessage(result.reason)] : [])
    if (failures.length === 2 && !models().length) modelError.value = failures.join(' · ')
    else if (failures.length) modelIssue.value = failures.join(' · ')
    modelPending.value = false
  }

  return {
    credentials, models, loadCredentials, loadModels,
    credentialPending, credentialIssue, credentialError,
    modelPending, modelIssue, modelError
  }
}
