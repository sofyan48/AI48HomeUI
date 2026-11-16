<template>
  <PortalCheckbox
    v-bind="$attrs"
    :model-value="modelValue"
    :id="id"
    :label="label"
    :description="description"
    :help="help"
    :error="error"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :size="size"
    :ui="ui"
    :indeterminate="indeterminate"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </PortalCheckbox>
</template>

<script setup lang="ts">
import PortalCheckbox from '~/components/app/general/PortalCheckbox.vue'
import type { PortalSize } from '~/components/app/general/portalField'

defineOptions({ inheritAttrs: false })

defineProps<{
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
  indeterminate?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: boolean | 'indeterminate'] }>()
</script>
