import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import { useManagementSessionStore } from '~/stores/managementSession'
import { useManagementConfigStore } from '~/stores/managementConfig'
import { useWorkspaceStore } from '~/stores/workspace'

export interface ConnectionStatus {
  label: string
  dot: string
}

/** Management connection status, global sync and session reset for the admin shell. */
export function useAdminConnection() {
  const { t: tc } = useConsoleLocale()
  const { token } = useApi()
  const { rememberSession: managementRemember } = storeToRefs(useManagementSessionStore())
  const {
    loading: capabilitiesLoading,
    loaded: capabilitiesLoaded,
    error: capabilitiesError,
    refreshCapabilities,
    resetCapabilities
  } = useCapabilities()
  const workspace = useWorkspaceStore()
  const managementConfig = useManagementConfigStore()
  const toast = useAdminToast()

  const connectionStatus = computed<ConnectionStatus>(() => {
    if (!token.value) return { label: tc('connection.disconnected'), dot: 'bg-[var(--ui-text-dimmed)]' }
    if (capabilitiesLoading.value) return { label: tc('connection.checking'), dot: 'motion-safe:animate-pulse bg-[var(--ui-primary)]' }
    if (capabilitiesError.value) return { label: tc('connection.failed'), dot: 'bg-[var(--ui-warning)]' }
    if (capabilitiesLoaded.value) return { label: tc('connection.connected'), dot: 'bg-[var(--ui-success)]' }
    return { label: tc('connection.checking'), dot: 'motion-safe:animate-pulse bg-[var(--ui-primary)]' }
  })

  const syncing = ref(false)
  const syncData = async () => {
    if (syncing.value || !token.value) return
    syncing.value = true
    try {
      managementConfig.invalidate()
      const results = await Promise.allSettled([refreshCapabilities(true), workspace.sync('admin:')])
      const failed = results.find(result => result.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
      toast.add({ title: tc('shell.syncSuccess'), color: 'success' })
    } catch (cause: any) {
      toast.add({ title: tc('shell.syncFailed'), description: cause?.message || tc('shell.syncError'), color: 'error' })
    } finally {
      syncing.value = false
    }
  }

  const clearSession = () => {
    token.value = null
    managementRemember.value = false
    resetCapabilities()
  }

  return { token, capabilitiesError, connectionStatus, syncing, syncData, refreshCapabilities, clearSession }
}
