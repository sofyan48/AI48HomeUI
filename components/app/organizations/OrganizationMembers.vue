<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalSwitch from '~/components/app/general/PortalSwitch.vue'
import OrganizationMemberLimitFields from '~/components/app/organizations/OrganizationMemberLimitFields.vue'
import OrganizationMemberAccessFields from '~/components/app/organizations/OrganizationMemberAccessFields.vue'
import { memberLimitsSummary } from '~/composables/organizations/memberLimits'
import { memberKeyUsage } from '~/composables/organizations/memberAccess'
import type { PortalOrgMember } from '~/composables/organizations-portal/types'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

const {
  t, summary, members, memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, pendingAction,
  memberKeysAllowed, settingsSupported, modelGroupOptions, modelGroupName,
  openMemberForm, saveMember, removeMember, setMemberKeysAllowed, createKeyForMember,
} = usePortalOrganizations()

// Issuing a key for a member asks for an optional name first.
const issueFor = ref<PortalOrgMember | null>(null)
const issueName = ref('')
const issueOpen = computed({ get: () => issueFor.value !== null, set: (open: boolean) => { if (!open) issueFor.value = null } })
function openIssueKey(member: PortalOrgMember) { issueFor.value = member; issueName.value = '' }
async function submitIssueKey() {
  const member = issueFor.value
  if (!member) return
  await createKeyForMember(member, issueName.value)
  issueFor.value = null
}

const scopeText = (member: PortalOrgMember) =>
  member.model_groups?.length ? member.model_groups.map(modelGroupName).join(', ') : t('org.inheritModelGroups')

const roleItems = computed(() => [
  { label: t('org.roleMember'), value: 'member' },
  { label: t('org.roleOwner'), value: 'owner' },
])
</script>

<template>
  <AppCard class="finance-panel">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-users" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('org.membersTitle') }}</h3>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('org.membersHint') }}</p>
        </div>
        <AppButton icon="i-tabler-user-plus" size="sm" class="rounded-full" @click="openMemberForm()">{{ t('org.memberAdd') }}</AppButton>
      </div>
    </template>
    <div v-if="settingsSupported" class="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--ui-border)] px-3 py-2.5">
      <div>
        <p class="text-sm font-medium">{{ t('org.allowMemberKeys') }}</p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.allowMemberKeysHint') }}</p>
      </div>
      <PortalSwitch
        :model-value="memberKeysAllowed"
        :aria-label="t('org.allowMemberKeys')"
        :disabled="pendingAction !== null"
        @update:model-value="setMemberKeysAllowed($event === true)"
      />
    </div>
    <ul class="divide-y divide-[var(--ui-border)]">
      <li v-for="member in members" :key="member.user_id" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <p class="flex items-center gap-2 text-sm font-medium">{{ member.username }} <PortalBadge :color="member.role === 'owner' ? 'primary' : 'neutral'" variant="subtle">{{ t(member.role === 'owner' ? 'org.roleOwner' : 'org.roleMember') }}</PortalBadge></p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.memberUsage', { spend: member.spend_30d, requests: member.requests_30d }) }} · {{ memberLimitsSummary(member, t('org.noLimit')) }}</p>
                    <p class="text-xs text-[var(--ui-text-muted)]"><span v-if="modelGroupOptions">{{ scopeText(member) }} · </span>{{ t('org.keysUsed', { usage: memberKeyUsage(member) }) }}</p>
        </div>
        <div class="flex items-center gap-1">
          <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-key" :aria-label="t('org.issueKey')" :loading="pendingAction === `issue:${member.user_id}`" @click="openIssueKey(member)" />
          <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-pencil" :aria-label="t('org.memberEdit')" @click="openMemberForm(member)" />
          <AppButton type="button" size="xs" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('org.memberRemove')" :loading="pendingAction === `member:${member.user_id}`" @click="removeMember(member)" />
        </div>
      </li>
    </ul>
  </AppCard>

  <AppModal v-model:open="issueOpen" :title="t('org.issueKeyTitle')" :description="t('org.issueKeyDescription', { name: issueFor?.username || '' })">
    <template #body>
      <form class="space-y-4" @submit.prevent="submitIssueKey">
        <PortalField :label="t('org.keyName')"><PortalInput v-model="issueName" icon="i-tabler-tag" maxlength="128" autofocus class="w-full" :placeholder="t('org.keyNamePlaceholder')" /></PortalField>
        <div class="flex justify-end gap-2">
          <AppButton type="button" color="neutral" variant="ghost" :disabled="pendingAction !== null" @click="issueFor = null">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" icon="i-tabler-key" :loading="issueFor !== null && pendingAction === `issue:${issueFor.user_id}`">{{ t('org.keyCreate') }}</AppButton>
        </div>
      </form>
    </template>
  </AppModal>

  <AppModal v-model:open="memberFormOpen" :title="editingMember ? t('org.memberEditTitle') : t('org.memberAddTitle')" :description="t('org.memberFormDescription')">
    <template #body>
      <form class="space-y-4" @submit.prevent="saveMember">
        <PortalAlert v-if="memberFormError" color="error" variant="subtle" :description="memberFormError" />
        <PortalField :label="t('org.username')"><PortalInput v-model="memberForm.username" icon="i-tabler-user" class="w-full" :disabled="!!editingMember" /></PortalField>
        <PortalField :label="t('org.role')"><PortalSelect v-model="memberForm.role" :items="roleItems" class="w-full" /></PortalField>
        <OrganizationMemberAccessFields :access="memberForm.access" :options="modelGroupOptions" :disabled="memberSaving" />
        <OrganizationMemberLimitFields :limits="memberForm.limits" :organization="summary?.organization_limits" :disabled="memberSaving" />
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.limitHint') }}</p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" color="neutral" variant="ghost" :disabled="memberSaving" @click="memberFormOpen = false">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" :loading="memberSaving">{{ editingMember ? t('common.save') : t('org.memberAdd') }}</AppButton>
        </div>
      </form>
    </template>
  </AppModal>
</template>
