<template>
  <AppModal v-model:open="detailOpen" :title="selected?.name || t('organizations.title')" :description="t('organizations.detailDescription')" :ui="{ content: 'sm:max-w-4xl' }">
    <template #body>
      <div v-if="selected" class="grid gap-4">
        <AppPanelTabs :model-value="detailTab" :items="tabItems" :label="t('organizations.tabsAria')" @update:model-value="selectTab" />
        <div class="min-w-0" role="tabpanel">
          <OrganizationsDetailOverview v-if="detailTab === 'overview'" />
          <OrganizationsDetailMembers v-else-if="detailTab === 'members'" />
          <OrganizationsDetailKeys v-else-if="detailTab === 'keys'" />
          <OrganizationsDetailCharges v-else-if="detailTab === 'charges'" />
        </div>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppPanelTabs from '~/components/AppPanelTabs.vue'
import OrganizationsDetailOverview from '~/components/admin/organizations/detail/OrganizationsDetailOverview.vue'
import OrganizationsDetailMembers from '~/components/admin/organizations/detail/OrganizationsDetailMembers.vue'
import OrganizationsDetailKeys from '~/components/admin/organizations/detail/OrganizationsDetailKeys.vue'
import OrganizationsDetailCharges from '~/components/admin/organizations/detail/OrganizationsDetailCharges.vue'
import { useOrganizationsWorkspace } from '~/composables/organizations/useOrganizationsWorkspace'
import { organizationDetailTabs, type OrganizationDetailTab } from '~/composables/organizations/types'

const { t, selected, selectedKeys, detailOpen, detailTab, setDetailTab } = useOrganizationsWorkspace()

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

function selectTab(value: string) {
  if ((organizationDetailTabs as string[]).includes(value)) setDetailTab(value as OrganizationDetailTab)
}
</script>
