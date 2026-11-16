<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { cn } from 'cn'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { portalControlSizes, usePortalControl, usePortalFocus } from './portalField'
import type { PortalSize } from './portalField'

defineOptions({ inheritAttrs: false })
type Value = string | number | boolean | null | undefined
type Item = Value | Record<string, unknown>
const props = withDefaults(defineProps<{
  modelValue?: Value
  items?: Item[]
  valueKey?: string
  labelKey?: string
  id?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  placeholder?: string
  size?: PortalSize
  ui?: Record<string, string>
}>(), { items: () => [], valueKey: 'value', labelKey: 'label', size: 'md' })
const emit = defineEmits<{ 'update:modelValue': [value: Value] }>()
const attrs = useAttrs()
const { accessibility } = usePortalControl(props)
const { root, element, focus, blur } = usePortalFocus()
const options = computed(() => props.items.map((item, index) => {
  const object = item !== null && typeof item === 'object' ? item : undefined
  const value = object ? object[props.valueKey] as Value : item as Value
  return { key: `option-${index}`, value, label: String((object ? object[props.labelKey] : item) ?? ''), disabled: !!object?.disabled }
}))
const selected = computed(() => options.value.find(option => Object.is(option.value, props.modelValue))?.key ?? '')
function update(value: unknown) {
  if (props.disabled || props.readonly) return
  const option = options.value.find(option => option.key === value)
  // An option with an undefined value is still a real, selectable option.
  if (option && !option.disabled) emit('update:modelValue', option.value)
}
defineExpose({ selectRef: element, focus, blur })
</script>

<template>
  <div :class="cn('min-w-0', attrs.class, ui?.root)">
    <NativeSelect
      ref="root"
      v-bind="{ ...attrs, ...accessibility(attrs) }"
      :class="cn('w-full', portalControlSizes[size], ui?.base)"
      :model-value="selected"
      :disabled="disabled"
      :aria-readonly="readonly || undefined"
      :data-readonly="readonly || undefined"
      @pointerdown="readonly && $event.preventDefault()"
      @keydown="readonly && $event.key !== 'Tab' && $event.preventDefault()"
      @update:model-value="update"
    >
      <NativeSelectOption v-if="!selected" value="" disabled hidden>{{ placeholder ?? '' }}</NativeSelectOption>
      <NativeSelectOption v-for="option in options" :key="option.key" :value="option.key" :disabled="option.disabled">{{ option.label }}</NativeSelectOption>
    </NativeSelect>
  </div>
</template>

<style scoped>
[data-slot="native-select-wrapper"] { width: 100%; }
</style>
