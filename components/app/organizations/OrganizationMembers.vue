<script setup lang="ts">
import { computed, ref } from 'vue'
import AppOrganizationMemberReset from '~/components/AppOrganizationMemberReset.vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import PortalSwitch from '~/components/app/general/PortalSwitch.vue'
import OrganizationMemberLimitFields from '~/components/app/organizations/OrganizationMemberLimitFields.vue'
import OrganizationMemberAccessFields from '~/components/app/organizations/OrganizationMemberAccessFields.vue'
import { memberLimitsSummary } from '~/composables/organizations/memberLimits'
import { memberKeyUsage } from '~/composables/organizations/memberAccess'
import type { PortalOrgMember } from '~/composables/organizations-portal/types'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

const {
  memberResetSupported, updateMemberReset, selectedId,
  t, summary, members, memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, pendingAction,
  memberKeysAllowed, settingsSupported, modelGroupOptions,
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

const { t: sharedText } = useAdminI18n()
const columns = computed(() => [
  { accessorKey: 'username', header: t('org.username') },
  { accessorKey: 'role', header: t('org.role') },
  { accessorKey: 'spend_30d', header: `${t('org.usage.charged')} · ${t('org.limitWindow30d')}` },
  { accessorKey: 'requests_30d', header: t('org.usage.requests') },
  { id: 'limits', header: t('org.limitAmount') },
  { id: 'keys', header: t('org.tab.keys') },
  { id: 'actions', header: sharedText('common.actions') },
])
const currentEditingMember = computed(() => members.value.find(member => member.user_id === editingMember.value?.user_id))


const roleItems = computed(() => [
  { label: t('org.roleMember'), value: 'member' },
  { label: t('org.roleOwner'), value: 'owner' },
])
</script>

<template>
  <AppCard class="finance-panel" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-users" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> {{ t('org.membersTitle') }}</h3>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('org.membersHint') }}</p>
        </div>
        <AppButton icon="i-tabler-user-plus" size="sm" class="rounded-full" @click="openMemberForm()">{{ t('org.memberAdd') }}</AppButton>
      </div>
    </template>
    <div v-if="settingsSupported" class="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
      <div>
        <p class="text-xs font-medium">{{ t('org.allowMemberKeys') }}</p>
        <p class="mt-1 text-xs text-muted-foreground">{{ t('org.allowMemberKeysHint') }}</p>
      </div>
      <PortalSwitch :model-value="memberKeysAllowed" :aria-label="t('org.allowMemberKeys')" :disabled="pendingAction !== null" class="shrink-0" @update:model-value="setMemberKeysAllowed($event === true)" />
    </div>
    <PortalTable :data="members" :columns="columns" :numbered="false" searchable :aria-label="t('org.membersTitle')">
      <template #username-cell="{ row }">
        <span class="font-medium">{{ row.original.username }}</span>
      </template>
      <template #role-cell="{ row }">
        <PortalBadge :color="row.original.role === 'owner' ? 'primary' : 'neutral'" variant="subtle">{{ t(row.original.role === 'owner' ? 'org.roleOwner' : 'org.roleMember') }}</PortalBadge>
      </template>
      <template #limits-cell="{ row }">
        <span class="text-xs tabular-nums">{{ memberLimitsSummary(row.original, t('org.noLimit')) }}</span>
        <AppOrganizationMemberReset v-if="memberResetSupported" :key="`${selectedId}:${row.original.user_id}`" :member="row.original" can-configure
          :save="(body, signal) => updateMemberReset(row.original.user_id, signal, body)"
          :reset="signal => updateMemberReset(row.original.user_id, signal)" />
      </template>
      <template #keys-cell="{ row }"><span class="tabular-nums">{{ memberKeyUsage(row.original) }}</span></template>
      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-1 whitespace-nowrap">
          <AppButton size="xs" color="neutral" variant="outline" :disabled="pendingAction !== null" @click="openMemberForm(row.original)">{{ t('org.memberEdit') }}</AppButton>
          <AppButton size="xs" color="neutral" variant="ghost" icon="i-tabler-key" :aria-label="t('org.issueKey')" :title="t('org.issueKey')" :disabled="pendingAction !== null" @click="openIssueKey(row.original)" />

          <AppButton size="xs" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('org.memberRemove')" :title="t('org.memberRemove')" :disabled="pendingAction !== null" :loading="pendingAction === `member:${row.original.user_id}`" @click="removeMember(row.original)" />
        </div>
      </template>
    </PortalTable>

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
      <AppOrganizationMemberReset
        v-if="memberResetSupported && currentEditingMember" :key="`${selectedId}:${currentEditingMember.user_id}`"
        class="mt-5 border-t border-border pt-4" :member="currentEditingMember" can-configure inline-configure
        :save="(body, signal) => updateMemberReset(currentEditingMember!.user_id, signal, body)"
        :reset="signal => updateMemberReset(currentEditingMember!.user_id, signal)"
      />
    </template>
  </AppModal>
</template>
