<template>
  <AdminInput
    v-bind="$attrs"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </AdminInput>
</template>

<script setup lang="ts">
import AdminInput from './AdminInput.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ modelValue?: string | number | null }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
