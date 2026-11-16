<script setup lang="ts">
import { computed, provide, ref, useId, useSlots } from 'vue'
import { Field, FieldLabel, FieldDescription, FieldError } from '~/components/ui/field'
import { portalFieldKey } from './portalField'

const props = defineProps<{
  id?: string
  name?: string
  label?: string
  hint?: string
  description?: string
  help?: string
  error?: string | boolean
  required?: boolean
  disabled?: boolean
  ui?: Record<string, string>
}>()
const slots = useSlots()
const generatedId = useId()
const id = props.id ?? generatedId
const controlId = ref(id)
const invalid = computed(() => !!props.error || !!slots.error)
const describedBy = computed(() => [
  (props.hint || slots.hint) && `${id}-hint`,
  (props.description || slots.description) && `${id}-description`,
  !invalid.value && (props.help || slots.help) && `${id}-help`,
  invalid.value && (typeof props.error === 'string' || slots.error) && `${id}-error`,
].filter(Boolean).join(' ') || undefined)
provide(portalFieldKey, { id, controlId, required: computed(() => !!props.required), invalid, describedBy })
</script>

<template>
  <Field :data-invalid="invalid || undefined" :data-disabled="disabled || undefined" :class="ui?.root">
    <div v-if="label || $slots.label || hint || $slots.hint" class="flex items-center justify-between gap-2" :class="ui?.container">
      <FieldLabel v-if="label || $slots.label" :for="controlId" :class="ui?.label">
        <slot name="label">{{ label }}</slot><span v-if="required" aria-hidden="true">*</span>
      </FieldLabel>
      <FieldDescription v-if="hint || $slots.hint" :id="`${id}-hint`" :class="ui?.hint"><slot name="hint">{{ hint }}</slot></FieldDescription>
    </div>
    <FieldDescription v-if="description || $slots.description" :id="`${id}-description`" :class="ui?.description"><slot name="description">{{ description }}</slot></FieldDescription>
    <slot :id="controlId" :error="error" />
    <FieldError v-if="invalid && (typeof error === 'string' || $slots.error)" :id="`${id}-error`" :class="ui?.error"><slot name="error">{{ error }}</slot></FieldError>
    <FieldDescription v-else-if="!invalid && (help || $slots.help)" :id="`${id}-help`" :class="ui?.help"><slot name="help">{{ help }}</slot></FieldDescription>
  </Field>
</template>
