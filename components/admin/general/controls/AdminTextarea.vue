<template>
  <Textarea
    v-bind="$attrs"
    :id="id"
    :model-value="modelValue"
    :disabled="disabled"
    :readonly="readonly"
    :required="required"
    :class="ui?.base"
    @update:model-value="update"
  />
</template>

<script setup lang="ts">
import { Textarea } from '~/components/ui/textarea'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string | number
  modelModifiers?: { trim?: boolean; number?: boolean }
  id?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  ui?: Record<string, string>
}>(), { modelModifiers: () => ({}) })

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
function update(value: string | number) {
  const normalized = String(value)
  const trimmed = props.modelModifiers.trim ? normalized.trim() : normalized
  emit('update:modelValue', props.modelModifiers.number ? Number(trimmed) : trimmed)
}
</script>
