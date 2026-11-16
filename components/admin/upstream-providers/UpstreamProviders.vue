<template>
  <div class="space-y-4">
    <PortalAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('upstream.providers.loadErrorTitle')"
      :description="pageError"
    />

    <section class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <ProvidersCategoryNav />
      <ProvidersTable />
    </section>

    <ProvidersEditorDialog />
    <ProvidersDeleteDialog />
  </div>
</template>

<script setup>
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { provideUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'
import ProvidersCategoryNav from '~/components/admin/upstream-providers/list/ProvidersCategoryNav.vue'
import ProvidersTable from '~/components/admin/upstream-providers/list/ProvidersTable.vue'
import ProvidersEditorDialog from '~/components/admin/upstream-providers/ProvidersEditorDialog.vue'
import ProvidersDeleteDialog from '~/components/admin/upstream-providers/ProvidersDeleteDialog.vue'

const props = defineProps({ syncRequest: { type: Number, default: 0 } })
const emit = defineEmits(['changed'])
// Owns every upstream-providers workspace key; children read it through useUpstreamProvidersWorkspace().
const { t, pageError } = provideUpstreamProvidersWorkspace(props, emit)
</script>
