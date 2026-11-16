<template>
  <form class="space-y-4" @submit.prevent="importVertex">
    <div class="rounded-lg border border-dashed border-[var(--ui-border)] p-5" @dragover.prevent @drop.prevent="vertexFile = $event.dataTransfer.files?.[0] || null">
      <UFormField :label="t('cred.vertex.file')" required><input type="file" accept="application/json,.json" class="block w-full text-sm" @change="vertexFile = $event.target.files?.[0] || null" /></UFormField>
      <p v-if="vertexFile" class="mt-2 text-xs">{{ vertexFile.name }} <AppButton size="xs" variant="ghost" @click="vertexFile = null">{{ t('common.remove') }}</AppButton></p>
    </div>
    <UFormField :label="t('cred.vertex.location')"><UInput v-model="vertexLocation" class="w-full" placeholder="us-central1" /></UFormField>
    <UAlert v-if="vertexError" color="error" variant="subtle" :description="vertexError" />
    <div v-if="vertexResult" class="rounded-md border border-[var(--ui-border)] p-3 text-sm"><p>{{ t('cred.vertex.status', { value: vertexResult.status }) }}</p><p>{{ t('cred.vertex.project', { value: vertexResult.project_id }) }}</p><p>{{ t('cred.vertex.email', { value: vertexResult.email }) }}</p><p>{{ t('cred.vertex.locationValue', { value: vertexResult.location }) }}</p><p>{{ t('cred.vertex.authFile', { value: vertexResult['auth-file'] }) }}</p></div>
    <div class="flex justify-end"><AppButton type="submit" :loading="importingVertex">{{ t('cred.vertex.import') }}</AppButton></div>
  </form>
</template>

<script setup lang="ts">
import { useUpstreamAccounts } from '~/composables/upstream-accounts/useUpstreamAccounts'

const { t, importVertex, vertexFile, vertexLocation, vertexError, vertexResult, importingVertex } = useUpstreamAccounts()
</script>
