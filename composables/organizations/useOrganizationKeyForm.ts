import { computed, ref, type Ref } from 'vue'
import type { useAdminI18n } from '#imports'
import type { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { organizationErrorMessage, type Organization, type OrganizationAPIKey, type OrganizationMember } from './types'

/** Home rejects longer names (APIKeyDisplayNameMaxLength). */
export const organizationKeyNameMaxLength = 128

type Options = {
  fetchAPI: <T = unknown>(path: string, options?: Record<string, unknown>) => Promise<T>
  t: ReturnType<typeof useAdminI18n>['t']
  toast: ReturnType<typeof useAdminToast>
  selected: Ref<Organization | null>
  supports: (name: string, fallback?: boolean) => boolean
  reload: (id: number) => Promise<void>
}

/** Validates a key name the same way Home does; returns the normalized value or an error key. */
export function normalizeOrganizationKeyName(value: string): { ok: true, name: string | null } | { ok: false, reason: 'length' | 'control' } {
  const name = value.trim()
  if ([...name].length > organizationKeyNameMaxLength) return { ok: false, reason: 'length' }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) return { ok: false, reason: 'control' }
  return { ok: true, name: name || null }
}

/** Create-with-name and rename dialog for organization API keys (admin). */
export function useOrganizationKeyForm({ fetchAPI, t, toast, selected, supports, reload }: Options) {
  const keyFormOpen = ref(false)
  const keyFormMember = ref<OrganizationMember | null>(null)
  const editingKey = ref<OrganizationAPIKey | null>(null)
  const keyFormName = ref('')
  const keyFormError = ref('')
  const keySaving = ref(false)
  const createdKeyValue = ref('')
  // Older Home builds have no admin rename route.
  const canRenameKeys = computed(() => supports('organization_api_key_rename', false))

  function openCreateKey(member: OrganizationMember) {
    keyFormMember.value = member
    editingKey.value = null
    keyFormName.value = ''
    keyFormError.value = ''
    createdKeyValue.value = ''
    keyFormOpen.value = true
  }

  function openRenameKey(key: OrganizationAPIKey) {
    keyFormMember.value = null
    editingKey.value = key
    keyFormName.value = key.display_name || ''
    keyFormError.value = ''
    createdKeyValue.value = ''
    keyFormOpen.value = true
  }

  async function saveKey() {
    const org = selected.value
    if (!org || keySaving.value) return
    const normalized = normalizeOrganizationKeyName(keyFormName.value)
    if (!normalized.ok) {
      keyFormError.value = normalized.reason === 'length'
        ? t('organizations.key.nameTooLong', { max: organizationKeyNameMaxLength })
        : t('organizations.key.nameInvalid')
      return
    }
    const editing = editingKey.value
    const member = keyFormMember.value
    keySaving.value = true
    keyFormError.value = ''
    try {
      if (editing) {
        await fetchAPI(`/organizations/${org.id}/api-keys/${editing.id}`, { method: 'PATCH', body: { display_name: normalized.name } })
        keyFormOpen.value = false
        toast.add({ title: t('organizations.key.renamed'), color: 'success' })
      } else if (member) {
        const body: Record<string, unknown> = { member_user_id: member.user_id }
        if (normalized.name) body.display_name = normalized.name
        const response = await fetchAPI<{ api_key?: OrganizationAPIKey }>(`/organizations/${org.id}/api-keys`, { method: 'POST', body })
        // Keep the dialog open once so the administrator can copy the new secret.
        createdKeyValue.value = response?.api_key?.api_key || ''
        if (!createdKeyValue.value) keyFormOpen.value = false
        toast.add({ title: t('organizations.key.created'), description: normalized.name || member.username, color: 'success' })
      }
      await reload(org.id)
    } catch (error) {
      keyFormError.value = organizationErrorMessage(error, editing ? t('organizations.key.renameFailed') : t('organizations.key.createFailed'))
    } finally {
      keySaving.value = false
    }
  }

  return {
    keyFormOpen, keyFormMember, editingKey, keyFormName, keyFormError, keySaving, createdKeyValue, canRenameKeys,
    openCreateKey, openRenameKey, saveKey,
  }
}
