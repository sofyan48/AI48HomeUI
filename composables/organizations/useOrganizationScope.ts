import { computed, ref, watch } from 'vue'
import { useApi } from '~/composables/useApi'
import { useCapabilities } from '~/composables/useCapabilities'
import type { Organization, OrganizationMember } from './types'
import { positiveId, type OrganizationScopeItem } from './organizationScope'

/**
 * Organization and member options for billing/usage filters.
 * Home builds without `capabilities.organization_usage_filters` would silently ignore the
 * parameters, so the filter stays hidden there instead of showing misleading totals.
 */
export function useOrganizationScope() {
  const { fetchAPI } = useApi()
  const { supports, loaded } = useCapabilities()
  const supported = computed(() => supports('organization_usage_filters', false) && supports('organizations', false))
  const organizations = ref<Organization[]>([])
  const members = ref<Record<string, OrganizationMember[]>>({})
  const loading = ref(false)
  const membersLoading = ref('')
  let version = 0

  async function load() {
    if (!supported.value) { organizations.value = []; return }
    const current = ++version
    loading.value = true
    try {
      const response = await fetchAPI<{ organizations?: Organization[] }>('/organizations')
      if (current === version) organizations.value = Array.isArray(response?.organizations) ? response.organizations : []
    } catch {
      // The filter is optional; a failed list simply leaves no organization choices.
      if (current === version) organizations.value = []
    } finally {
      if (current === version) loading.value = false
    }
  }

  async function loadMembers(organizationId: string) {
    const id = positiveId(organizationId)
    if (!id || members.value[id] || !supported.value) return
    membersLoading.value = id
    try {
      const response = await fetchAPI<{ organization?: Organization }>(`/organizations/${id}`)
      members.value = { ...members.value, [id]: response?.organization?.members || [] }
    } catch {
      members.value = { ...members.value, [id]: [] }
    } finally {
      if (membersLoading.value === id) membersLoading.value = ''
    }
  }

  function reset() {
    version++
    organizations.value = []
    members.value = {}
    loading.value = false
    membersLoading.value = ''
  }

  const organizationItems = computed<OrganizationScopeItem[]>(() => organizations.value
    .map(org => ({ value: String(org.id), label: org.name, keywords: `#${org.id} ${(org.owners || []).join(' ')}`, description: org.member_count != null ? String(org.member_count) : undefined }))
    .sort((left, right) => left.label.localeCompare(right.label)))

  function memberItems(organizationId: string): OrganizationScopeItem[] {
    return (members.value[positiveId(organizationId)] || [])
      .map(member => ({ value: String(member.user_id), label: member.username, description: member.role, keywords: `#${member.user_id}` }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }

  function organizationName(id: unknown) {
    const key = positiveId(id)
    return key ? organizations.value.find(org => String(org.id) === key)?.name || '' : ''
  }

  function memberName(organizationId: unknown, memberId: unknown) {
    const key = positiveId(memberId)
    return key ? (members.value[positiveId(organizationId)] || []).find(member => String(member.user_id) === key)?.username || '' : ''
  }

  watch([supported, loaded], ([enabled]) => { if (enabled) void load(); else organizations.value = [] }, { immediate: true })

  return { supported, organizations, organizationItems, memberItems, loading, membersLoading, load, loadMembers, reset, organizationName, memberName }
}

export type OrganizationScope = ReturnType<typeof useOrganizationScope>
