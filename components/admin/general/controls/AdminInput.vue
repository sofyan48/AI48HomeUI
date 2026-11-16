<template>
  <PortalInput
    v-bind="$attrs"
    :model-value="modelValue"
    :id="id"
    :type="type"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :autofocus="autofocus"
    :icon="icon"
    :size="size"
    :ui="ui"
    @update:model-value="update"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </PortalInput>
</template>

<script setup lang="ts">
import PortalInput from '~/components/app/general/PortalInput.vue'
import type { PortalSize } from '~/components/app/general/portalField'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  modelModifiers?: { trim?: boolean; number?: boolean }
  id?: string
  type?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  autofocus?: boolean
  icon?: string
  size?: PortalSize
  ui?: Record<string, string>
}>(), { modelModifiers: () => ({}) })

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
function update(value: string) {
  const normalized = props.modelModifiers.trim ? value.trim() : value
  emit('update:modelValue', props.modelModifiers.number ? Number(normalized) : normalized)
}
</script>
