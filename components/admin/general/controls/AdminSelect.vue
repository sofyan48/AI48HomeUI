<template>
  <select
    v-if="multiple"
    v-bind="$attrs"
    :id="id"
    :name="name"
    :multiple="true"
    :disabled="disabled"
    :required="required"
    :aria-readonly="readonly || undefined"
    :class="ui?.base"
    :value="selectedValues"
    @change="updateMultiple"
  >
    <option v-for="option in options" :key="option.key" :value="option.key" :disabled="option.disabled">{{ option.label }}</option>
  </select>
  <PortalSelect
    v-else
    v-bind="$attrs"
    :model-value="modelValue as ScalarValue"
    :items="items"
    :value-key="valueKey"
    :label-key="labelKey"
    :id="id"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :placeholder="placeholder"
    :size="size"
    :ui="ui"
    @update:model-value="updateScalar"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import type { PortalSize } from '~/components/app/general/portalField'

defineOptions({ inheritAttrs: false })
type ScalarValue = string | number | boolean | null | undefined
type Value = ScalarValue | ScalarValue[]
type Item = ScalarValue | Record<string, unknown>

const props = withDefaults(defineProps<{
  modelValue?: Value
  modelModifiers?: { number?: boolean }
  items?: Item[]
  valueKey?: string
  labelKey?: string
  id?: string
  name?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  placeholder?: string
  size?: PortalSize
  multiple?: boolean
  ui?: Record<string, string>
}>(), { items: () => [], valueKey: 'value', labelKey: 'label', size: 'md', multiple: false, modelModifiers: () => ({}) })

const emit = defineEmits<{ 'update:modelValue': [value: Value] }>()
const options = computed(() => props.items.map((item, index) => {
  const object = item !== null && typeof item === 'object' ? item : undefined
  const value = object ? object[props.valueKey!] as ScalarValue : item as ScalarValue
  return { key: `option-${index}`, value, label: String((object ? object[props.labelKey!] : item) ?? ''), disabled: !!object?.disabled }
}))
function updateScalar(value: ScalarValue) {
  emit('update:modelValue', props.modelModifiers.number && typeof value === 'string' ? Number(value) : value)
}
const selectedValues = computed(() => {
  const selected = Array.isArray(props.modelValue) ? props.modelValue : props.modelValue == null ? [] : [props.modelValue]
  return options.value.filter(option => selected.some(value => Object.is(value, option.value))).map(option => option.key)
})
function updateMultiple(event: Event) {
  if (props.disabled || props.readonly) return
  const selected = new Set(Array.from((event.target as HTMLSelectElement).selectedOptions, option => option.value))
  emit('update:modelValue', options.value.filter(option => selected.has(option.key) && !option.disabled).map(option => option.value))
}
</script>
