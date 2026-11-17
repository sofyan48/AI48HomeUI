<template>
  <AdminModalForm
    v-model:open="providerEditorOpen"
    :title="providerEditorMode === 'detail' ? t('upstream.providers.detailsTitle') : isCompat ? (providerEditorMode === 'edit' ? t('upstream.providers.editCompat') : t('upstream.providers.newCompat')) : providerEditorMode === 'edit' ? t('upstream.providers.editKey', { provider: selectedProviderLabel }) : t('upstream.providers.newKey', { provider: selectedProviderLabel })"
    :description="t('upstream.providers.modalDescription')"
  >
      <ProvidersDetailView v-if="providerEditorMode === 'detail' && editingProviderEntry" />
      <form v-else :id="providerFormId" novalidate class="flex flex-col gap-4" @submit.prevent="saveProviderEntry">
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
      </form>
      <template v-if="providerEditorMode !== 'detail'" #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span class="min-w-0 text-xs text-[var(--ui-text-muted)]">{{ t('upstream.providers.keepKeyFooter') }}</span>
          <div class="flex shrink-0 justify-end gap-3">
            <AppButton color="neutral" variant="ghost" type="button" @click="providerEditorOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton color="primary" type="submit" :form="providerFormId" :loading="savingProvider">{{ t('upstream.providers.saveEntry') }}</AppButton>
          </div>
        </div>
      </template>
  </AdminModalForm>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import AdminModalForm from '~/components/admin/general/ModalForm.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'
import ProvidersDetailView from '~/components/admin/upstream-providers/editor/ProvidersDetailView.vue'
import ProvidersBasicFields from '~/components/admin/upstream-providers/editor/ProvidersBasicFields.vue'
import ProvidersAdvancedFields from '~/components/admin/upstream-providers/editor/ProvidersAdvancedFields.vue'
import ProvidersModelsSection from '~/components/admin/upstream-providers/editor/ProvidersModelsSection.vue'
import ProvidersHeadersAndTest from '~/components/admin/upstream-providers/editor/ProvidersHeadersAndTest.vue'

const providerFormId = useId()
const { t, providerEditorOpen, providerEditorMode, isCompat, selectedProviderLabel, editingProviderEntry, editorError, saveProviderEntry, savingProvider } = useUpstreamProvidersWorkspace()
</script>
