<template>
  <Switch
    v-bind="$attrs"
    :model-value="modelValue"
    :id="id"
    :disabled="disabled"
    :required="required"
    :class="ui?.base"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { Switch } from '~/components/ui/switch'

defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: boolean
  id?: string
  disabled?: boolean
  required?: boolean
  ui?: Record<string, string>
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
