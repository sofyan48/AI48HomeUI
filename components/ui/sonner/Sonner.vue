<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner"
import { IconCircleCheck, IconInfoCircle, IconLoader2, IconOctagonOff, IconAlertTriangle, IconX } from '@tabler/icons-vue'
import { cn } from "cn"
import { Toaster as Sonner } from "vue-sonner"

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--ui-bg)',
      '--normal-text': 'var(--ui-text-highlighted)',
      '--normal-border': 'var(--ui-border)',
      '--border-radius': '0.5rem',
    }"
    v-bind="props"
  >
    <template #success-icon>
      <IconCircleCheck class="size-4" />
    </template>
    <template #info-icon>
      <IconInfoCircle class="size-4" />
    </template>
    <template #warning-icon>
      <IconAlertTriangle class="size-4" />
    </template>
    <template #error-icon>
      <IconOctagonOff class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <IconLoader2 class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <IconX class="size-4" />
    </template>
  </Sonner>
</template>

<style>
.toaster[data-sonner-toaster] [data-sonner-toast][data-styled='true'] {
  padding-inline-end: 2.75rem;
}

.toaster[data-sonner-toaster] [data-sonner-toast][data-styled='true'] [data-close-button] {
  top: 0.5rem;
  right: 0.5rem;
  left: auto;
  bottom: auto;
  width: 1.5rem;
  height: 1.5rem;
  min-width: 1.5rem;
  min-height: 1.5rem;
  transform: none;
}
</style>
