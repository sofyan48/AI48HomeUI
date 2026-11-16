<template>
  <AdminModalForm
    v-model:open="providerEditorOpen"
    :title="providerEditorMode === 'detail' ? t('upstream.providers.detailsTitle') : isCompat ? (providerEditorMode === 'edit' ? t('upstream.providers.editCompat') : t('upstream.providers.newCompat')) : providerEditorMode === 'edit' ? t('upstream.providers.editKey', { provider: selectedProviderLabel }) : t('upstream.providers.newKey', { provider: selectedProviderLabel })"
    :description="t('upstream.providers.modalDescription')"
  >
      <ProvidersDetailView v-if="providerEditorMode === 'detail' && editingProviderEntry" />
      <form v-else novalidate class="max-h-[75vh] space-y-4 overflow-y-auto pr-1" @submit.prevent="saveProviderEntry">
        <PortalAlert
          v-if="editorError"
          color="error"
          variant="subtle"
          icon="i-tabler-alert-circle"
          :title="t('upstream.providers.invalidEntry')"
          :description="editorError"
        />

          <ProvidersBasicFields />
          <ProvidersAdvancedFields />
          <ProvidersModelsSection />
          <ProvidersHeadersAndTest />
        <div class="flex items-center justify-between border-t border-[var(--ui-border)] pt-4">
          <span class="text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.keepKeyFooter') }}</span>
          <div class="flex gap-3">
            <AppButton color="neutral" variant="ghost" type="button" @click="providerEditorOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="primary" type="submit" :loading="savingProvider">{{ t('upstream.providers.saveEntry') }}</AppButton>
          </div>
        </div>
      </form>
  </AdminModalForm>
</template>

<script setup>
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AdminModalForm from '~/components/admin/general/ModalForm.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'
import ProvidersDetailView from '~/components/admin/upstream-providers/editor/ProvidersDetailView.vue'
import ProvidersBasicFields from '~/components/admin/upstream-providers/editor/ProvidersBasicFields.vue'
import ProvidersAdvancedFields from '~/components/admin/upstream-providers/editor/ProvidersAdvancedFields.vue'
import ProvidersModelsSection from '~/components/admin/upstream-providers/editor/ProvidersModelsSection.vue'
import ProvidersHeadersAndTest from '~/components/admin/upstream-providers/editor/ProvidersHeadersAndTest.vue'

const { t, providerEditorOpen, providerEditorMode, isCompat, selectedProviderLabel, editingProviderEntry, editorError, saveProviderEntry, savingProvider } = useUpstreamProvidersWorkspace()
</script>
