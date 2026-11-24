<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '~/components/AppIcon.vue'
import AppPanelTabs from '~/components/AppPanelTabs.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import OrganizationOwnerOverview from '~/components/app/organizations/OrganizationOwnerOverview.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import OrganizationSummary from '~/components/app/organizations/OrganizationSummary.vue'
import OrganizationKeys from '~/components/app/organizations/OrganizationKeys.vue'
import OrganizationMembers from '~/components/app/organizations/OrganizationMembers.vue'
import OrganizationCharges from '~/components/app/organizations/OrganizationCharges.vue'
import OrganizationCreatedKey from '~/components/app/organizations/OrganizationCreatedKey.vue'
import { useDataSync } from '~/composables/useDataSync'
import { providePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'
import { organizationTabs, type OrganizationTab } from '~/composables/organizations-portal/tabs'

const { t, memberships, selectedId, summary, loading, unsupported, loadError, isOwner, loadMemberships, selectOrganization } = providePortalOrganizations()
const route = useRoute()
const router = useRouter()

const tabItems = computed(() => organizationTabs(isOwner.value).map(tab => ({
  value: tab,
  label: t(`org.tab.${tab}`),
  icon: { overview: 'i-tabler-layout-dashboard', keys: 'i-tabler-key', members: 'i-tabler-users', charges: 'i-tabler-receipt' }[tab],
})))

// The tab lives in ?tab= so sections can be linked; members cannot open the owner-only tab.
const activeTab = computed<OrganizationTab>({
  get() {
    const requested = route.query.tab
    return organizationTabs(isOwner.value).find(tab => tab === requested) ?? 'overview'
  },
  set(tab) {
    void router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } })
  },
})


const onSelect = (value: unknown) => {
  const id = Number(value)
  if (Number.isInteger(id) && id > 0) void selectOrganization(id)
}

useDataSync('user:organizations:sync', () => loadMemberships())
onMounted(loadMemberships)
</script>

<template>
  <section class="organization-workspace flex min-w-0 flex-col gap-4" aria-labelledby="org-title">
    <PortalAlert v-if="unsupported" color="warning" variant="subtle" :title="t('org.unsupportedTitle')" :description="t('org.unsupportedDescription')" />
    <PortalAlert v-else-if="loadError" color="error" variant="subtle" :title="t('org.loadFailed')" :description="loadError" />

    <template v-if="!unsupported">
      <div v-if="loading && !memberships.length" class="grid gap-4"><PortalSkeleton class="h-28 rounded-3xl" /><PortalSkeleton class="h-56 rounded-3xl" /></div>

      <AppCard v-else-if="!memberships.length" class="finance-panel">
        <div class="flex flex-col items-center gap-3 py-8 text-center">
          <AppIcon name="i-tabler-building" class="size-8 text-[var(--ui-text-muted)]" aria-hidden="true" />
          <h2 id="org-title" class="text-sm font-semibold">{{ t('org.emptyTitle') }}</h2>
          <p class="max-w-md text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('org.emptyDetail') }}</p>
        </div>
      </AppCard>

      <template v-else>
        <AppCard>
        <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">

            <div class="min-w-0">
              <p class="mb-1 text-xs text-muted-foreground">{{ t('org.title') }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <h2 id="org-title" class="flex min-w-0 items-center gap-2 break-words text-xl font-semibold tracking-tight"><AppIcon name="i-tabler-building" class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />{{ summary?.name || memberships.find(item => item.id === selectedId)?.name }}</h2>
                <PortalBadge v-if="summary" :color="isOwner ? 'primary' : 'neutral'" variant="subtle">{{ t(isOwner ? 'org.roleOwner' : 'org.roleMember') }}</PortalBadge>
              </div>
            </div>
          </div>
          <PortalSelect
            v-if="memberships.length > 1"
            :model-value="selectedId ?? undefined"
            :items="memberships.map(item => ({ label: `${item.name} · ${t(item.role === 'owner' ? 'org.roleOwner' : 'org.roleMember')}`, value: item.id }))"
            :aria-label="t('org.switch')"
            class="w-full sm:w-64"
            :disabled="loading"
            @update:model-value="onSelect"
          />
        </header>
        </AppCard>
        <AppPanelTabs v-model="activeTab" :items="tabItems" :label="t('org.tabsAria')" />
        <OrganizationCreatedKey />
        <div v-if="loading" class="grid gap-4" :aria-label="t('org.title')" aria-busy="true"><PortalSkeleton class="h-28 rounded-xl" /><PortalSkeleton class="h-56 rounded-xl" /></div>
        <div v-else-if="summary" class="flex min-w-0 flex-col gap-4" role="tabpanel" :aria-label="t(`org.tab.${activeTab}`)">

          <template v-if="activeTab === 'overview'">
            <OrganizationOwnerOverview v-if="isOwner" @navigate="activeTab = $event" />
            <OrganizationSummary />
          </template>
          <OrganizationKeys v-else-if="activeTab === 'keys'" />
          <OrganizationMembers v-else-if="activeTab === 'members' && isOwner" />
          <OrganizationCharges v-else-if="activeTab === 'charges'" />
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.organization-workspace {
  max-width: 80rem;
  margin-inline: auto;
}
</style>
