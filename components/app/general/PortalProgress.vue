<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Progress } from '~/components/ui/progress'

const props = withDefaults(defineProps<{
  modelValue: number
  color?: 'primary' | 'warning' | 'error'
  minVisible?: boolean
  class?: HTMLAttributes['class']
}>(), { color: 'primary', minVisible: false })

const percent = computed(() => Number.isNaN(props.modelValue) ? 0 : Math.max(0, Math.min(100, props.modelValue)))
</script>

<template>
  <Progress
    :model-value="percent"
    :max="100"
    :class="cn('portal-progress', props.class)"
    :data-color="color"
    :data-min-visible="minVisible && percent > 0"
    :style="{ '--portal-progress-value': `${percent}%` }"
  />
</template>

<style scoped>
.portal-progress { --portal-progress-color: var(--ui-primary); background: var(--ui-bg-muted); }
.portal-progress[data-color='warning'] { --portal-progress-color: var(--ui-warning); }
.portal-progress[data-color='error'] { --portal-progress-color: var(--ui-error); }
.portal-progress :deep([data-slot='progress-indicator']) { background: var(--portal-progress-color); border-radius: inherit; }
/* Keep small nonzero usage visible without changing the accessible percentage. */
.portal-progress[data-min-visible='true'] :deep([data-slot='progress-indicator']) {
  transform: translateX(calc(-100% + max(4px, var(--portal-progress-value)))) !important;
}
</style>
