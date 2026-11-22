<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-arrow-left" to="/admin/organizations">{{ t('organizations.backToList') }}</AppButton>
      <div v-if="selected" class="flex flex-wrap gap-2">
        <AppButton size="sm" color="neutral" variant="ghost" icon="i-tabler-chart-bar" :to="{ path: '/admin/usage', query: { organization: selected.id } }">{{ t('organizations.viewUsage') }}</AppButton>
        <AppButton size="sm" color="neutral" variant="outline" icon="i-tabler-pencil" @click="openEditOrg(selected)">{{ t('organizations.edit') }}</AppButton>
        <AppButton size="sm" color="error" variant="outline" icon="i-tabler-trash" @click="askDeleteOrg(selected, backToList)">{{ t('organizations.delete') }}</AppButton>
      </div>
    </div>

    <PortalAlert v-if="unsupported" color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('organizations.unsupported.title')" :description="t('organizations.unsupported.description')" />
    <PortalAlert v-else-if="invalidId" color="error" variant="subtle" icon="i-tabler-alert-circle" :description="t('organizations.notFound')" />
    <PortalAlert v-else-if="detailError && !selected" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('organizations.loadFailed')" :description="detailError" />

    <div v-else-if="!selected" class="grid gap-3"><PortalSkeleton class="h-24 rounded-xl" /><PortalSkeleton class="h-72 rounded-xl" /></div>

    <template v-else>
      <AppCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <h1 class="flex items-center gap-2 truncate text-xl font-semibold"><AppIcon name="i-tabler-building" class="size-5 text-[var(--ui-text-muted)]" aria-hidden="true" />{{ selected.name }}</h1>
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">#{{ selected.id }} · {{ t('organizations.detailDescription') }}</p>
          </div>
          <dl class="grid grid-cols-3 gap-6 text-right">
            <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.col.credits') }}</dt><dd class="text-lg font-semibold tabular-nums">{{ selected.credits_unlimited ? '∞' : selected.credits }}</dd></div>
            <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.col.members') }}</dt><dd class="text-lg font-semibold tabular-nums">{{ selected.members?.length ?? selected.member_count ?? 0 }}</dd></div>
            <div><dt class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.keysTitle') }}</dt><dd class="text-lg font-semibold tabular-nums">{{ selectedKeys.length }}</dd></div>
          </dl>
        </div>
      </AppCard>

      <AppPanelTabs :model-value="detailTab" :items="tabItems" :label="t('organizations.tabsAria')" @update:model-value="selectTab" />
      <AppCard>
        <div class="min-w-0" role="tabpanel">
          <OrganizationsDetailOverview v-if="detailTab === 'overview'" />
          <OrganizationsDetailMembers v-else-if="detailTab === 'members'" />
          <OrganizationsDetailKeys v-else-if="detailTab === 'keys'" />
          <OrganizationsDetailCharges v-else-if="detailTab === 'charges'" :key="selected.id" />
        </div>
      </AppCard>
    </template>

    <OrganizationsFormDialog />
    <OrganizationsMemberDialog />
    <OrganizationsKeyDialog />
    <AppConfirmModal
      :open="deleteTarget !== null" :title="t('organizations.deleteTitle')" :message="deleteMessage"
      :confirm-label="t('organizations.delete')" confirm-icon="i-tabler-trash" :error="deleteError" :loading="deleting" :locked="deleting"
      @update:open="open => { if (!open) deleteTarget = null }" @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '~/components/AppIcon.vue'
import AppPanelTabs from '~/components/AppPanelTabs.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import OrganizationsFormDialog from '~/components/admin/organizations/OrganizationsFormDialog.vue'
import OrganizationsMemberDialog from '~/components/admin/organizations/OrganizationsMemberDialog.vue'
import OrganizationsKeyDialog from '~/components/admin/organizations/OrganizationsKeyDialog.vue'
import OrganizationsDetailOverview from '~/components/admin/organizations/detail/OrganizationsDetailOverview.vue'
import OrganizationsDetailMembers from '~/components/admin/organizations/detail/OrganizationsDetailMembers.vue'
import OrganizationsDetailKeys from '~/components/admin/organizations/detail/OrganizationsDetailKeys.vue'
import OrganizationsDetailCharges from '~/components/admin/organizations/detail/OrganizationsDetailCharges.vue'
import { useDataSync } from '~/composables/useDataSync'
import { provideOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import { organizationDetailTabs, type OrganizationDetailTab } from '~/composables/organizations/types'

const route = useRoute()
const router = useRouter()
const {
  t, unsupported, selected, selectedKeys, detailError, detailTab, setDetailTab, openDetail,
  openEditOrg, askDeleteOrg, deleteTarget, deleting, deleteError, confirmDelete,
} = provideOrganizationsWorkspace()

const orgId = computed(() => {
  const id = Number(route.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
})
const invalidId = computed(() => orgId.value === null)
const tabFromQuery = (): OrganizationDetailTab => {
  const requested = route.query.tab
  return organizationDetailTabs.find(tab => tab === requested) ?? 'overview'
}

const icons: Record<OrganizationDetailTab, string> = {
  overview: 'i-tabler-layout-dashboard', members: 'i-tabler-users', keys: 'i-tabler-key', charges: 'i-tabler-receipt',
}
const tabItems = computed(() => organizationDetailTabs.map(tab => ({
  value: tab,
  icon: icons[tab],
  label: tab === 'members'
    ? t('organizations.tab.membersCount', { count: selected.value?.members?.length ?? 0 })
    : tab === 'keys' ? t('organizations.tab.keysCount', { count: selectedKeys.value.length }) : t(`organizations.tab.${tab}`),
})))

// The tab lives in ?tab= so each section can be linked and survives reloads.
function selectTab(value: string) {
  if (!(organizationDetailTabs as string[]).includes(value)) return
  void router.replace({ query: { ...route.query, tab: value === 'overview' ? undefined : value } })
}
watch(() => route.query.tab, () => { if (selected.value) setDetailTab(tabFromQuery()) })
watch(orgId, id => { if (id) void openDetail(id, tabFromQuery()) }, { immediate: true })

const backToList = () => { void router.push('/admin/organizations') }

const deleteMessage = computed(() => {
  const target = deleteTarget.value
  if (!target) return ''
  if (target.kind === 'org') return t('organizations.deleteOrgMessage', { name: target.label })
  if (target.kind === 'member') return t('organizations.removeMemberMessage', { name: target.label })
  return t('organizations.deleteKeyMessage', { name: target.label })
})

useDataSync('admin:organizations:detail:sync', () => { if (orgId.value) void openDetail(orgId.value, detailTab.value) })
</script>
