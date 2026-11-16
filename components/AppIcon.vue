<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { resolveAppIcon } from '~/composables/icons/tabler'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ name?: string }>()
const attrs = useAttrs()
const icon = computed(() => resolveAppIcon(props.name))
</script>

<template>
  <component
    :is="icon"
    size="1em"
    v-bind="attrs"
    :aria-hidden="attrs['aria-label'] ? undefined : true"
    :role="attrs['aria-label'] ? 'img' : undefined"
    focusable="false"
  />
</template>
