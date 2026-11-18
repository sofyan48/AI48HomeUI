<template>
  <AppModal
    :open="open"
    :title="title"
    :description="description"
    :dismissible="!locked"
    :close="!locked"
    :ui="contentClass ? { content: contentClass } : undefined"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form :id="formId" :class="formClass || 'grid gap-5'" @submit.prevent="emit('submit')">
        <PortalAlert v-if="error" color="error" variant="subtle" :description="error" />
        <slot />
      </form>
    </template>
    <!-- Actions live in the sheet footer so they stay pinned to the bottom instead of floating mid-sheet. -->
    <template #footer>
      <slot name="actions">
        <AppButton type="button" color="neutral" variant="outline" :disabled="locked || cancelDisabled" @click="emit('update:open', false)">
          {{ cancelLabel || t('common.cancel') }}
        </AppButton>
        <AppButton type="submit" :form="formId" :color="submitColor" :icon="submitIcon" :loading="loading" :disabled="submitDisabled">
          {{ submitLabel || t('common.save') }}
        </AppButton>
      </slot>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
/**
 * Base form dialog: title, optional error alert, body slot and a cancel/submit footer.
 * Use it for every create/edit/confirm flow so footers, spacing and pending states stay consistent.
 */
type ButtonColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  error?: string
  submitLabel?: string
  submitColor?: ButtonColor
  submitIcon?: string
  cancelLabel?: string
  loading?: boolean
  submitDisabled?: boolean
  cancelDisabled?: boolean
  // Blocks closing (overlay, escape, close button and cancel) while a request is in flight.
  locked?: boolean
  // Kept for compatibility; the footer is always separated now that it is pinned to the sheet bottom.
  divided?: boolean
  contentClass?: string
  formClass?: string
}>(), {
  description: undefined,
  error: '',
  submitLabel: '',
  submitColor: 'primary',
  submitIcon: undefined,
  cancelLabel: '',
  loading: false,
  submitDisabled: false,
  cancelDisabled: false,
  locked: false,
  divided: false,
  contentClass: undefined,
  formClass: undefined
})

const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [] }>()
const formId = `app-form-modal-${useId()}`
const { t } = useAdminI18n()
</script>
