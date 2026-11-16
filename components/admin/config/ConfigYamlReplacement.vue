<template>
  <AppButton color="neutral" variant="outline" :disabled="disabled" @click="openEditor">{{ t('config.yaml.open') }}</AppButton>
  <AppModal v-model:open="open" :title="t('config.yaml.title')" :description="t('config.yaml.description')">
    <template #body>
      <div class="space-y-4">
        <PortalAlert color="warning" :title="t('config.yaml.warningTitle')" :description="t('config.yaml.warningDescription')" />
        <PortalAlert v-if="error" color="error" :title="t('config.yaml.errorTitle')" :description="error" />
        <AdminTextarea v-model="text" :disabled="loading || saving" :rows="18" class="w-full font-mono text-xs" :aria-label="t('config.yaml.textareaLabel')" spellcheck="false" />
        <AdminCheckbox v-model="confirmed" :disabled="loading || saving" :label="t('config.yaml.confirm')" />
        <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton color="neutral" variant="outline" :disabled="saving" :loading="loading" @click="load">{{ t('config.yaml.reload') }}</AppButton>
          <AppButton color="error" :loading="saving" :disabled="loading || !confirmed || !text.trim()" @click="replace">{{ t('config.yaml.title') }}</AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import { parseDocument } from 'yaml'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ saved: [] }>()
const { fetchAPI } = useApi()
const { t } = useAdminI18n()
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
    error.value = failure?.message || t('config.yaml.loadFailed')
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
    error.value = t('config.yaml.invalid')
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
    error.value = t('config.yaml.replaceFailedDetail', { error: failure?.message || t('config.yaml.replaceFailed') })
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
