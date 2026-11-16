<template>
  <AppModal v-model:open="detailsOpen" :dismissible="!savingFields && !savingPolicy && !credentialAction" :title="detailsTarget?.label || detailsTarget?.name || t('cred.details.title')" :description="detailsTarget?.id || ''" :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div v-if="detailsTarget" class="space-y-5">
        <div class="-mx-4 flex flex-wrap gap-1 border-b border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2" role="tablist" :aria-label="t('cred.details.title')"><AppButton v-for="section in detailSections" :key="section" role="tab" :aria-selected="detailsTab === section" size="sm" color="neutral" :variant="detailsTab === section ? 'soft' : 'ghost'" :disabled="savingFields || savingPolicy || Boolean(credentialAction)" @click="selectDetailSection(section)">{{ detailSectionLabel(section) }}</AppButton></div>
        <DetailsOverviewTab v-if="detailsTab === 'Overview'" />
        <DetailsMetadataTab v-else-if="detailsTab === 'Metadata'" />
        <DetailsQuotaTab v-else-if="detailsTab === 'Quota'" />
        <DetailsConcurrencyTab v-else-if="detailsTab === 'Concurrency'" />
        <DetailsModelsTab v-else-if="detailsTab === 'Models'" />
        <DetailsRecoveryTab v-else-if="detailsTab === 'Recovery'" />
        <DetailsDangerTab v-else />
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppModal from '~/components/AppModal.vue'
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'
import DetailsOverviewTab from '~/components/admin/upstream-accounts/details/DetailsOverviewTab.vue'
import DetailsMetadataTab from '~/components/admin/upstream-accounts/details/DetailsMetadataTab.vue'
import DetailsQuotaTab from '~/components/admin/upstream-accounts/details/DetailsQuotaTab.vue'
import DetailsConcurrencyTab from '~/components/admin/upstream-accounts/details/DetailsConcurrencyTab.vue'
import DetailsModelsTab from '~/components/admin/upstream-accounts/models/DetailsModelsTab.vue'
import DetailsRecoveryTab from '~/components/admin/upstream-accounts/recovery/DetailsRecoveryTab.vue'
import DetailsDangerTab from '~/components/admin/upstream-accounts/recovery/DetailsDangerTab.vue'

const {
  t, detailsOpen, savingFields, savingPolicy, credentialAction, detailsTarget, detailSections, detailsTab,
  selectDetailSection, detailSectionLabel
} = useUpstreamAccounts()
</script>
