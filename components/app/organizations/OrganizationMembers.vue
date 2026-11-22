<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

const {
  t, members, memberFormOpen, memberForm, memberFormError, memberSaving, editingMember, pendingAction,
  openMemberForm, saveMember, removeMember,
} = usePortalOrganizations()

const roleItems = computed(() => [
  { label: t('org.roleMember'), value: 'member' },
  { label: t('org.roleOwner'), value: 'owner' },
])
const limit = (value: number | null) => (value === null ? '∞' : value)
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
    <ul class="divide-y divide-[var(--ui-border)]">
      <li v-for="member in members" :key="member.user_id" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <p class="flex items-center gap-2 text-sm font-medium">{{ member.username }} <PortalBadge :color="member.role === 'owner' ? 'primary' : 'neutral'" variant="subtle">{{ t(member.role === 'owner' ? 'org.roleOwner' : 'org.roleMember') }}</PortalBadge></p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.memberUsage', { spend: member.spend_30d, requests: member.requests_30d }) }} · {{ t('org.memberLimits', { d1: limit(member.limit_1d_credits), d7: limit(member.limit_7d_credits), d30: limit(member.limit_30d_credits) }) }}</p>
        </div>
        <div class="flex items-center gap-1">
          <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-pencil" :aria-label="t('org.memberEdit')" @click="openMemberForm(member)" />
          <AppButton type="button" size="xs" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('org.memberRemove')" :loading="pendingAction === `member:${member.user_id}`" @click="removeMember(member)" />
        </div>
      </li>
    </ul>
  </AppCard>

  <AppModal v-model:open="memberFormOpen" :title="editingMember ? t('org.memberEditTitle') : t('org.memberAddTitle')" :description="t('org.memberFormDescription')">
    <template #body>
      <form class="space-y-4" @submit.prevent="saveMember">
        <PortalAlert v-if="memberFormError" color="error" variant="subtle" :description="memberFormError" />
        <PortalField :label="t('org.username')"><PortalInput v-model="memberForm.username" icon="i-tabler-user" class="w-full" :disabled="!!editingMember" /></PortalField>
        <PortalField :label="t('org.role')"><PortalSelect v-model="memberForm.role" :items="roleItems" class="w-full" /></PortalField>
        <div class="grid gap-3 sm:grid-cols-3">
          <PortalField :label="t('org.window1d')"><PortalInput v-model="memberForm.limit1d" inputmode="decimal" placeholder="∞" class="w-full" /></PortalField>
          <PortalField :label="t('org.window7d')"><PortalInput v-model="memberForm.limit7d" inputmode="decimal" placeholder="∞" class="w-full" /></PortalField>
          <PortalField :label="t('org.window30d')"><PortalInput v-model="memberForm.limit30d" inputmode="decimal" placeholder="∞" class="w-full" /></PortalField>
        </div>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('org.limitHint') }}</p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" color="neutral" variant="ghost" :disabled="memberSaving" @click="memberFormOpen = false">{{ t('common.cancel') }}</AppButton>
          <AppButton type="submit" :loading="memberSaving">{{ editingMember ? t('common.save') : t('org.memberAdd') }}</AppButton>
        </div>
      </form>
    </template>
  </AppModal>
</template>
