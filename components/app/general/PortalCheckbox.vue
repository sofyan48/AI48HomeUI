<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { cn } from 'cn'
import { Checkbox } from '~/components/ui/checkbox'
import { Field, FieldLabel, FieldDescription, FieldError } from '~/components/ui/field'
import { usePortalControl, usePortalFocus } from './portalField'
import type { PortalSize } from './portalField'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  modelValue?: boolean | 'indeterminate'
  id?: string
  label?: string
  description?: string
  help?: string
  error?: string | boolean
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  size?: PortalSize
  ui?: Record<string, string>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean | 'indeterminate'] }>()
const attrs = useAttrs()
const { id, accessibility } = usePortalControl(props)
const { root, element, focus, blur } = usePortalFocus()
const controlAttrs = computed(() => {
  const inherited = accessibility(attrs)
  return {
    ...attrs,
    ...inherited,
    'aria-invalid': !!props.error || inherited['aria-invalid'],
    'aria-describedby': [inherited['aria-describedby'], (props.description || props.help) && `${id.value}-description`, typeof props.error === 'string' && props.error && `${id.value}-error`].filter(Boolean).join(' ') || undefined,
  }
})
function update(value: boolean | 'indeterminate') {
  if (!props.disabled && !props.readonly) emit('update:modelValue', value)
}
defineExpose({ checkboxRef: element, focus, blur })
</script>

<template>
  <Field :class="cn(attrs.class, ui?.root)" :data-invalid="!!controlAttrs['aria-invalid'] || undefined" :data-disabled="disabled || undefined">
    <div ref="root" class="flex items-center gap-2">
      <Checkbox v-bind="controlAttrs" :class="ui?.base" :model-value="modelValue ?? false" :disabled="disabled" :aria-readonly="readonly || undefined" @click="readonly && $event.preventDefault()" @update:model-value="update" />
      <FieldLabel v-if="label || $slots.label" :for="id" :class="ui?.label"><slot name="label">{{ label }}</slot></FieldLabel>
    </div>
    <FieldDescription v-if="description || help" :id="`${id}-description`" :class="ui?.description">{{ description || help }}</FieldDescription>
    <FieldError v-if="typeof error === 'string' && error" :id="`${id}-error`" :class="ui?.error">{{ error }}</FieldError>
  </Field>
</template>
