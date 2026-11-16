<template>
  <AdminSelect
    v-bind="$attrs"
    :model-value="modelValue"
    :items="items"
    :value-key="valueKey"
    :label-key="labelKey"
    :multiple="multiple"
    :placeholder="placeholder"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import AdminSelect from './AdminSelect.vue'

defineOptions({ inheritAttrs: false })
type ScalarValue = string | number | boolean | null | undefined
type Value = ScalarValue | ScalarValue[]
type Item = ScalarValue | Record<string, unknown>

withDefaults(defineProps<{
  modelValue?: Value
  items?: Item[]
  valueKey?: string
  labelKey?: string
  multiple?: boolean
  placeholder?: string
}>(), { items: () => [], valueKey: 'value', labelKey: 'label', multiple: false })

defineEmits<{ 'update:modelValue': [value: Value] }>()
</script>
