<script setup lang="ts">
import { Switch } from '~/components/ui/switch'

defineOptions({ inheritAttrs: false })
defineProps<{
  modelValue?: boolean
  id?: string
  disabled?: boolean
  ui?: Record<string, string>
}>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <Switch
    v-bind="$attrs"
    :id="id"
    :model-value="modelValue"
    :disabled="disabled"
    :class="ui?.base"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
