import { storeToRefs } from 'pinia'
import { useManagementCapabilitiesStore } from '~/stores/managementCapabilities'


export const useCapabilities = () => {
  const store = useManagementCapabilitiesStore()
  const { capabilities, serverInfo, loaded, loading, error } = storeToRefs(store)

  return {
    capabilities,
    serverInfo,
    loaded,
    loading,
    error,
    supports: store.supports,
    refreshCapabilities: store.refreshCapabilities,
    resetCapabilities: store.resetCapabilities
  }
}
