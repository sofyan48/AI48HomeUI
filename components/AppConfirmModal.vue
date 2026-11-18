<template>
  <AppFormModal
    :open="open"
    :title="title"
    :description="description"
    :error="error"
    :submit-label="confirmLabel || t('common.confirm')"
    :submit-color="confirmColor"
    :submit-icon="confirmIcon"
    :loading="loading"
    :locked="locked"
    centered
    @update:open="emit('update:open', $event)"
    @submit="emit('confirm')"
  >
    <p v-if="message" class="text-sm">{{ message }}</p>
    <slot />
  </AppFormModal>
</template>

<script setup lang="ts">
/** Base confirmation dialog for destructive or irreversible actions. */
type ButtonColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  message?: string
  error?: string
  confirmLabel?: string
  confirmColor?: ButtonColor
  confirmIcon?: string
  loading?: boolean
  locked?: boolean
}>(), {
  description: undefined,
  message: '',
  error: '',
  confirmLabel: '',
  confirmColor: 'error',
  confirmIcon: undefined,
  loading: false,
  locked: false
})

const emit = defineEmits<{ 'update:open': [value: boolean]; confirm: [] }>()
const { t } = useAdminI18n()
</script>
