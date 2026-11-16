<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed, onMounted, useAttrs, useSlots } from 'vue'
import { cn } from 'cn'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupInput, InputGroupAddon } from '~/components/ui/input-group'
import { portalControlSizes, usePortalControl, usePortalFocus } from './portalField'
import type { PortalSize } from './portalField'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  id?: string
  type?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  autofocus?: boolean
  icon?: string
  size?: PortalSize
  ui?: Record<string, string>
}>(), { type: 'text', size: 'md' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const attrs = useAttrs()
const slots = useSlots()
const { accessibility } = usePortalControl(props)
const { root, element, focus, blur } = usePortalFocus()
const grouped = computed(() => !!props.icon || !!slots.leading || !!slots.trailing)
const controlProps = computed(() => ({
  ...attrs,
  ...accessibility(attrs),
  type: props.type,
  disabled: props.disabled,
  readonly: props.readonly,
  autofocus: props.autofocus,
  modelValue: props.modelValue ?? '',
  class: cn(portalControlSizes[props.size], props.ui?.base, !grouped.value && attrs.class),
}))
// Read the DOM value instead of the primitive's number-coercing v-model update.
function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
// SPA navigation and conditionally mounted TOTP fields need explicit focus.
onMounted(() => { if (props.autofocus && !props.disabled) focus() })
defineExpose({ inputRef: element, focus, blur })
</script>

<template>
  <InputGroup v-if="grouped" :class="cn(portalControlSizes[size], attrs.class, ui?.root)" :data-disabled="disabled || undefined">
    <InputGroupInput ref="root" v-bind="controlProps" @input="onInput" />
    <InputGroupAddon v-if="icon || $slots.leading" :class="ui?.leading">
      <slot name="leading"><AppIcon v-if="icon" :name="icon" aria-hidden="true" /></slot>
    </InputGroupAddon>
    <InputGroupAddon v-if="$slots.trailing" align="inline-end" :class="ui?.trailing"><slot name="trailing" /></InputGroupAddon>
  </InputGroup>
  <Input v-else ref="root" v-bind="controlProps" @input="onInput" />
</template>
