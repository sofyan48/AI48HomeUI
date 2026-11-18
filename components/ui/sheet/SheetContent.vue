<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import { computed, Transition, type HTMLAttributes } from "vue"
import { IconX } from '@tabler/icons-vue'
import { reactiveOmit } from "@vueuse/core"
import { cn } from "cn"
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  injectDialogRootContext,
  useForwardPropsEmits,
} from "reka-ui"
import SheetOverlay from "./SheetOverlay.vue"

interface SheetContentProps extends DialogContentProps {
  class?: HTMLAttributes["class"]
  side?: "top" | "right" | "bottom" | "left" | "center"
  showClose?: boolean
  closeLabel?: string
  overlay?: boolean
  overlayClass?: HTMLAttributes["class"]
  portal?: boolean | string | HTMLElement
}

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SheetContentProps>(), {
  side: "right",
  showClose: true,
  closeLabel: "Close",
  overlay: true,
  portal: true,
})
const emits = defineEmits<DialogContentEmits & {
  afterEnter: []
  afterLeave: []
}>()
const { open } = injectDialogRootContext()

const delegatedProps = reactiveOmit(props, "class", "side", "showClose", "closeLabel", "overlay", "overlayClass", "portal")

const forwardedProps = useForwardPropsEmits(delegatedProps, emits)
// Lifecycle events belong to Transition, not DialogContent's DOM attributes.
const forwarded = computed(() => {
  const { onAfterEnter, onAfterLeave, ...contentProps } = forwardedProps.value
  return contentProps
})

function finishAnimation(element: Element, done: () => void) {
  // getAnimations flushes styles and excludes disabled/reduced-motion animations.
  const animations = element.getAnimations()
  if (!animations.length) done()
  else void Promise.allSettled(animations.map(animation => animation.finished)).then(() => done())
}

function leave(element: Element, done: () => void) {
  // A v-if removal does not patch the outgoing DialogContent's data-state.
  element.setAttribute('data-state', 'closed')
  finishAnimation(element, done)
}
</script>

<template>
  <DialogPortal :disabled="portal === false" :to="typeof portal === 'boolean' ? undefined : portal">
    <SheetOverlay v-if="overlay" :class="overlayClass" />
    <Transition
      appear
      :css="false"
      @enter="finishAnimation"
      @leave="leave"
      @after-enter="emits('afterEnter')"
      @after-leave="emits('afterLeave')"
    >
    <DialogContent
      v-if="open"
      data-slot="sheet-content"
      :class="cn(
        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
        side === 'right'
          && 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
        side === 'left'
          && 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
        side === 'top'
          && 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
        side === 'bottom'
          && 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
        side === 'center'
          && 'top-1/2 left-1/2 h-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border',
        props.class)"
      v-bind="{ ...$attrs, ...forwarded }"
      force-mount
    >
      <slot />

      <DialogClose
        v-if="showClose"
        class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <IconX class="size-4" />
        <span class="sr-only">{{ closeLabel }}</span>
      </DialogClose>
    </DialogContent>
    </Transition>
  </DialogPortal>
</template>
