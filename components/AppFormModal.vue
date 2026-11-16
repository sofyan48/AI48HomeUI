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
      <form class="space-y-4" @submit.prevent="emit('submit')">
        <PortalAlert v-if="error" color="error" variant="subtle" :description="error" />
        <slot />
        <div class="flex justify-end gap-2" :class="{ 'border-t border-[var(--ui-border)] pt-4': divided }">
          <slot name="actions">
            <AppButton type="button" color="neutral" variant="outline" :disabled="locked || cancelDisabled" @click="emit('update:open', false)">
              {{ cancelLabel || t('common.cancel') }}
            </AppButton>
            <AppButton type="submit" :color="submitColor" :icon="submitIcon" :loading="loading" :disabled="submitDisabled">
              {{ submitLabel || t('common.save') }}
            </AppButton>
          </slot>
        </div>
      </form>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
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
  // Separator line above the footer, used by long slide-over forms.
  divided?: boolean
  contentClass?: string
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
  contentClass: undefined
})

const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [] }>()
const { t } = useAdminI18n()
</script>
