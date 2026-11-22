<template>
  <div v-if="scope.supported.value" class="flex w-full flex-wrap items-center gap-2 sm:w-auto" role="group" :aria-label="t('organizations.scope.label')">
    <AdminSearchSelect
      :model-value="organization || ''"
      :items="organizationOptions"
      :placeholder="t('organizations.scope.all')"
      :aria-label="t('organizations.scope.organization')"
      :clear-label="t('common.reset')"
      :empty-text="scope.loading.value ? t('organizations.scope.loading') : t('organizations.scope.none')"
      :class="organizationClass"
      @update:model-value="selectOrganization"
    />
    <AdminSearchSelect
      v-if="organization && withMember"
      :model-value="member || ''"
      :items="memberOptions"
      :placeholder="t('organizations.scope.allMembers')"
      :aria-label="t('organizations.scope.member')"
      :clear-label="t('common.reset')"
      :empty-text="scope.membersLoading.value === organization ? t('organizations.scope.loading') : t('organizations.scope.noMembers')"
      :class="memberClass"
      @update:model-value="member = String($event ?? '')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AdminSearchSelect from '~/components/admin/general/controls/AdminSearchSelect.vue'
import { useAdminI18n } from '~/composables/useAdminI18n'
import type { OrganizationScope } from '~/composables/organizations/useOrganizationScope'

const props = withDefaults(defineProps<{
  scope: OrganizationScope
  organizationClass?: string
  memberClass?: string
  /** Balance ledgers have no member attribution, so they only scope by organization. */
  withMember?: boolean
}>(), { organizationClass: 'w-full sm:w-48', memberClass: 'w-full sm:w-44', withMember: true })

const { t } = useAdminI18n()
const organization = defineModel<string>('organization', { default: '' })
const member = defineModel<string>('member', { default: '' })

// Keep a deep-linked or previously applied ID selectable before the list arrives.
const organizationOptions = computed(() => {
  const items = props.scope.organizationItems.value.map(item => ({ ...item, description: item.description ? t('organizations.scope.memberCount', { count: item.description }) : undefined }))
  if (organization.value && !items.some(item => item.value === organization.value)) items.unshift({ value: organization.value, label: `#${organization.value}`, description: undefined })
  return [{ value: '', label: t('organizations.scope.all') }, ...items]
})
const memberOptions = computed(() => {
  const items = props.scope.memberItems(organization.value).map(item => ({ ...item, description: item.description === 'owner' ? t('organizations.role.owner') : t('organizations.role.member') }))
  if (member.value && !items.some(item => item.value === member.value)) items.unshift({ value: member.value, label: `#${member.value}`, description: '' })
  return [{ value: '', label: t('organizations.scope.allMembers') }, ...items]
})

function selectOrganization(value: string | number | null) {
  const next = String(value ?? '')
  if (next !== organization.value) member.value = ''
  organization.value = next
}

watch(organization, value => { if (value && props.withMember) void props.scope.loadMembers(value) }, { immediate: true })
</script>
