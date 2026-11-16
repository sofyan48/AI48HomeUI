<template>
  <PortalField
    v-bind="$attrs"
    :id="id"
    :name="name"
    :label="label"
    :hint="hint"
    :description="description"
    :help="help"
    :error="error"
    :required="required"
    :disabled="disabled"
    :ui="ui"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps || {}" />
    </template>
  </PortalField>
</template>

<script setup lang="ts">
import PortalField from '~/components/app/general/PortalField.vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  id?: string
  name?: string
  label?: string
  hint?: string
  description?: string
  help?: string
  error?: string | boolean
  required?: boolean
  disabled?: boolean
  ui?: Record<string, string>
}>(), { required: false, disabled: false })
</script>
