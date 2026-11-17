import { computed, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

// Mutation flags shared by the list, details and dialogs, plus the combined `busy` guard.
export function useAccountBusy() {
  const changing = useWorkspaceState('admin:upstream-accounts:changing', () => (''))
  const inlineChanging = useWorkspaceState('admin:upstream-accounts:inlineChanging', () => (''))
  const deleting = useWorkspaceState('admin:upstream-accounts:deleting', () => (false))
  const bulkBusy = useWorkspaceState('admin:upstream-accounts:bulkBusy', () => (false))
  const bulkAction = ref('')
  const savingFields = ref(false)
  const savingPolicy = ref(false)
  const credentialAction = ref('')
  const busy = computed(() => bulkBusy.value || deleting.value || Boolean(changing.value) || Boolean(inlineChanging.value) || savingFields.value || savingPolicy.value)
  return { changing, inlineChanging, deleting, bulkBusy, bulkAction, savingFields, savingPolicy, credentialAction, busy }
}
