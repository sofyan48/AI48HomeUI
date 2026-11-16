<template>
  <AdminModalCard as="details" class="space-y-3">
    <summary class="cursor-pointer font-medium">{{ t('upstream.providers.requestHeaders') }}</summary>
    <div class="mt-3 space-y-3">
      <div class="flex justify-end"><AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-plus" @click="headerRows.push({ name: '', value: '' })">{{ t('upstream.providers.addHeader') }}</AppButton></div>
      <div v-for="(header, index) in headerRows" :key="index" class="flex items-end gap-2">
      <UFormField :label="t('upstream.providers.headerName')" class="flex-1"><UInput v-model="header.name" class="w-full" /></UFormField>
      <UFormField :label="t('upstream.providers.headerValue')" class="flex-1"><UInput v-model="header.value" class="w-full" /></UFormField>
      <AppButton type="button" color="error" variant="ghost" icon="i-tabler-trash" :aria-label="t('upstream.providers.removeHeader')" :disabled="headerRows.length <= 1" @click="headerRows.splice(index, 1)" />
    </div>
    </div>
  </AdminModalCard>
  <AdminModalCard v-if="supportsTest" class="space-y-3">
    <UFormField :label="t('upstream.providers.testModel')"><USelect v-model="testModel" :items="testModelOptions" value-key="value" label-key="label" class="w-full" /></UFormField>
    <AppButton type="button" color="neutral" variant="outline" :loading="testingConnection" @click="testProviderConnection">{{ t('upstream.providers.testConnectivity') }}</AppButton>
    <UAlert v-if="testError" color="error" variant="subtle" :title="t('upstream.providers.testFailed')" :description="testError" />
    <UAlert v-if="testSuccess" color="success" variant="subtle" :title="t('upstream.providers.testSucceeded')" />
  </AdminModalCard>
</template>

<script setup>
import AdminModalCard from '~/components/admin/general/ModalCard.vue'
import { useUpstreamProvidersWorkspace } from '~/composables/upstream-providers/useUpstreamProvidersWorkspace'

const { t, headerRows, supportsTest, testModel, testModelOptions, testingConnection, testProviderConnection, testError, testSuccess } = useUpstreamProvidersWorkspace()
</script>
