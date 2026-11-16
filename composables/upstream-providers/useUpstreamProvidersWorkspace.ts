import { inject, provide, type InjectionKey } from 'vue'
import { useApi, useAdminI18n, useToast } from '#imports'
import { useProviderList } from './useProviderList'
import { useProviderEditorState } from './useProviderEditorState'
import { useModelDiscovery } from './useModelDiscovery'
import { useConnectionTest } from './useConnectionTest'
import { useProviderPayload } from './useProviderPayload'
import { useProviderActions } from './useProviderActions'
import { splitModelList } from './categories'

type ProvidersProps = { syncRequest: number }
type ProvidersEmit = (event: 'changed') => void

/**
 * Shared state for the upstream providers panel (components/admin/upstream-providers/UpstreamProviders.vue).
 *
 * The entry component calls `provideUpstreamProvidersWorkspace()` once; sections and dialogs call
 * `useUpstreamProvidersWorkspace()`. Workspace keys are created only here, once per owner.
 */
function createUpstreamProvidersWorkspace(props: ProvidersProps, emit: ProvidersEmit) {
  const { fetchAPI } = useApi()
  const toast = useToast()
  const { t } = useAdminI18n()
  const list = useProviderList({ t, fetchAPI, props })
  const editor = useProviderEditorState({ t, selectedProviderRoute: list.selectedProviderRoute })
  const discovery = useModelDiscovery({ t, fetchAPI, selectedProviderRoute: list.selectedProviderRoute, editor })
  const test = useConnectionTest({ t, fetchAPI, selectedProviderRoute: list.selectedProviderRoute, editor, discoveryAuthIndex: discovery.discoveryAuthIndex })
  const payload = useProviderPayload({ t, selectedProviderRoute: list.selectedProviderRoute, providerEntries: list.providerEntries, editor, clearDiscoveryResults: discovery.clearDiscoveryResults, testError: test.testError, testSuccess: test.testSuccess })
  const actions = useProviderActions({ t, fetchAPI, toast, emit, list, editor, loadGuidedEntry: payload.loadGuidedEntry, guidedEntry: payload.guidedEntry })
  return { t, splitModelList, ...list, ...editor, ...discovery, ...test, ...payload, ...actions }
}

const upstreamProvidersWorkspaceKey: InjectionKey<ReturnType<typeof createUpstreamProvidersWorkspace>> = Symbol('upstream-providers-workspace')

export function provideUpstreamProvidersWorkspace(props: ProvidersProps, emit: ProvidersEmit) {
  const workspace = createUpstreamProvidersWorkspace(props, emit)
  provide(upstreamProvidersWorkspaceKey, workspace)
  return workspace
}

export function useUpstreamProvidersWorkspace() {
  const workspace = inject(upstreamProvidersWorkspaceKey)
  if (!workspace) throw new Error('Upstream providers workspace is not provided')
  return workspace
}
