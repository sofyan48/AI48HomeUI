<template>
  <div class="space-y-6">
    <AppCard v-for="section in sections" :id="`config-${section.id}`" :key="section.id">
      <template #header>
        <div>
          <h2 class="font-semibold text-[var(--ui-text-highlighted)]">{{ section.title }}</h2>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ section.description }}</p>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('config.shared.note') }}</p>
        </div>
      </template>
      <div class="divide-y divide-[var(--ui-border-muted)]">
        <UFormField
          v-for="field in section.fields"
          :key="field.key"
          :label="field.label"
          :description="field.description"
          :error="validationErrors[field.key]"
          class="px-1 py-3"
        >
          <p class="mb-2 break-all font-mono text-xs text-[var(--ui-text-muted)]">{{ field.path.join('.') }}</p>
          <USelect
            v-if="field.type === 'boolean'"
            :model-value="draft[field.key] == null ? 'default' : draft[field.key] === true ? 'true' : 'false'"
            :items="booleanOptions"
            :disabled="loading"
            :aria-label="field.label"
            class="w-full sm:max-w-sm"
            @update:model-value="updateField(field.key, $event === 'default' ? null : $event === 'true')"
          />
          <div v-else class="flex flex-col gap-2 sm:flex-row">
            <USelect
              :model-value="draft[field.key] == null ? 'default' : 'configured'"
              :items="textOptions"
              :disabled="loading"
              :aria-label="t('config.shared.source', { label: field.label })"
              class="w-full sm:w-48"
              @update:model-value="updateField(field.key, $event === 'default' ? null : field.type === 'number' ? 0 : isConfigJsonField(field.type) ? (field.type === 'json' ? '{}' : '[]') : field.type === 'image-mode' ? false : '')"
            />
            <UTextarea
              v-if="isConfigJsonField(field.type) && draft[field.key] != null"
              :model-value="String(draft[field.key])"
              :disabled="loading"
              :aria-label="field.label"
              :rows="8"
              class="min-w-0 flex-1 font-mono text-xs"
              spellcheck="false"
              @update:model-value="updateField(field.key, String($event ?? ''))"
            />
            <USelect
              v-else-if="field.type === 'image-mode' && draft[field.key] != null"
              :model-value="String(draft[field.key])"
              :items="imageOptions"
              :disabled="loading"
              :aria-label="field.label"
              class="min-w-0 flex-1"
              @update:model-value="updateField(field.key, $event === 'true' ? true : $event === 'false' ? false : $event)"
            />
            <UInput
              v-else-if="draft[field.key] != null"
              :model-value="String(draft[field.key])"
              :disabled="loading"
              :aria-label="field.label"
              :type="field.type === 'number' ? 'number' : 'text'"
              :step="field.type === 'number' ? 1 : undefined"
              :placeholder="field.placeholder || (field.type === 'duration' ? t('config.shared.durationPlaceholder') : t('config.shared.explicitPlaceholder'))"
              class="min-w-0 flex-1"
              @update:model-value="updateField(field.key, field.type === 'number' && $event !== '' && $event != null ? Number($event) : String($event ?? ''))"
            />
          </div>
        </UFormField>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { isConfigJsonField } from '~/composables/configParity'

const { t } = useAdminI18n()
const imageOptions = computed(() => [
  { label: t('config.shared.image.enabled'), value: 'false' },
  { label: t('config.shared.image.disabled'), value: 'true' },
  { label: t('config.shared.image.chat'), value: 'chat' },
  { label: t('config.shared.image.passthrough'), value: 'passthrough' },
])
type DraftValue = string | number | boolean | null | undefined
type SharedSection = {
  id: string
  title: string
  description: string
  fields: Array<{
    key: string
    path: string[]
    label: string
    description: string
    type: string
    placeholder?: string
  }>
}

withDefaults(defineProps<{
  sections: SharedSection[]
  validationErrors?: Record<string, string>
  loading?: boolean
}>(), {
  validationErrors: () => ({}),
  loading: false
})

const draft = defineModel<Record<string, DraftValue>>('draft', { required: true })
const booleanOptions = computed(() => [
  { label: t('config.changes.unset'), value: 'default' },
  { label: t('config.shared.optTrue'), value: 'true' },
  { label: t('config.shared.optFalse'), value: 'false' }
])
const textOptions = computed(() => [
  { label: t('config.changes.unset'), value: 'default' },
  { label: t('config.shared.optConfigured'), value: 'configured' }
])

function updateField(key: string, value: DraftValue) {
  draft.value = { ...draft.value, [key]: value }
}
</script>
