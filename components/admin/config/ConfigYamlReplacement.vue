<template>
  <AppButton color="neutral" variant="outline" :disabled="disabled" @click="openEditor">Raw YAML replacement</AppButton>
  <AppModal v-model:open="open" title="Replace full configuration" :description="'Explicit replacement mode: omitted settings and credential families are removed. Unknown keys are retained in the editor, but the backend may reject unsupported keys.'">
    <template #body>
      <div class="space-y-4">
        <UAlert color="warning" title="Full replacement, not a visual save" description="This document includes secrets. Concurrent changes since loading can be overwritten. Preserve credential IDs and Home-owned revisions. Reload the document immediately before editing." />
        <UAlert v-if="error" color="error" title="YAML replacement" :description="error" />
        <UTextarea v-model="text" :disabled="loading || saving" :rows="18" class="w-full font-mono text-xs" aria-label="Complete v8 YAML configuration" spellcheck="false" />
        <UCheckbox v-model="confirmed" :disabled="loading || saving" label="I understand this replaces the complete configuration, including credentials." />
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton color="neutral" variant="outline" :disabled="saving" :loading="loading" @click="load">Reload document (discard edits)</AppButton>
          <AppButton color="error" :loading="saving" :disabled="loading || !confirmed || !text.trim()" @click="replace">Replace full configuration</AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { parseDocument } from 'yaml'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ saved: [] }>()
const { fetchAPI } = useApi()
const open = ref(false)
const text = ref('')
const confirmed = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  confirmed.value = false
  error.value = ''
  try {
    text.value = await fetchAPI<string>('/config.yaml', { responseType: 'text' })
  } catch (failure: any) {
    error.value = failure?.message || 'Unable to load YAML.'
    text.value = ''
  } finally {
    loading.value = false
  }
}
async function openEditor() {
  open.value = true
  await load()
}
async function replace() {
  if (!confirmed.value || saving.value || loading.value) return
  error.value = ''
  try {
    const document = parseDocument(text.value)
    if (document.errors.length) throw new Error()
    const root = document.toJS({ maxAliasCount: 100 })
    if (!root || typeof root !== 'object' || Array.isArray(root) || root['config-version'] !== 8) throw new Error()
  } catch {
    error.value = 'Enter a valid YAML mapping with config-version: 8.'
    return
  }
  saving.value = true
  try {
    // Submit the original text, never a projection of known UI fields.
    await fetchAPI('/config.yaml', { method: 'PUT', body: text.value, headers: { 'Content-Type': 'application/yaml; charset=utf-8' } })
    open.value = false
    text.value = ''
    emit('saved')
  } catch (failure: any) {
    error.value = `${failure?.message || 'Replacement failed.'} The request may have committed before a reload failure. Reload the document and review before retrying; your text is retained.`
  } finally {
    confirmed.value = false
    saving.value = false
  }
}
watch(open, value => {
  if (!value && !saving.value) {
    text.value = ''
    confirmed.value = false
  }
})
</script>
