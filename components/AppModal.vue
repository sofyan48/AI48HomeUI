<template>
  <Sheet v-slot="{ open: isOpen, close: closeSheet }" v-bind="rootProps()" @update:open="emit('update:open', $event)">
    <SheetTrigger v-if="$slots.default" as-child :class="props.class">
      <slot :open="isOpen" />
    </SheetTrigger>
    <SheetContent
      v-bind="getContentBindings()"
      side="right"
      :show-close="false"
      :close-label="t('common.close')"
      :overlay="overlay"
      :overlay-class="classes.overlay"
      :portal="portal"
      :class="classes.content"
      @after-enter="emit('after:enter')"
      @after-leave="emit('after:leave')"
    >
      <!-- Custom content/header slots do not have to provide dialog semantics themselves. -->
      <SheetTitle v-if="$slots.content || $slots.header || (!title && !$slots.title)" class="sr-only">
        <slot name="title">{{ title || t('common.details') }}</slot>
      </SheetTitle>
      <SheetDescription v-if="$slots.content || $slots.header || (!description && !$slots.description)" class="sr-only">
        <slot name="description">{{ description }}</slot>
      </SheetDescription>
      <slot name="content" :close="closeSheet">
        <SheetHeader v-if="$slots.header || title || $slots.title || description || $slots.description || close || $slots.close" data-slot="header" :class="classes.header">
          <slot name="header" :close="closeSheet">
            <div v-if="title || $slots.title || description || $slots.description" data-slot="wrapper" :class="classes.wrapper">
              <SheetTitle v-if="title || $slots.title" data-slot="title" :class="classes.title">
                <slot name="title">{{ title }}</slot>
              </SheetTitle>
              <SheetDescription v-if="description || $slots.description" data-slot="description" :class="classes.description">
                <slot name="description">{{ description }}</slot>
              </SheetDescription>
            </div>
            <slot name="actions" />
            <SheetClose v-if="close || $slots.close" as-child>
              <slot name="close" :ui="slotUi">
                <AppButton
                  v-if="close"
                  :icon="closeIcon || 'i-tabler-x'"
                  color="neutral"
                  variant="ghost"
                  :aria-label="t('common.close')"
                  v-bind="typeof close === 'object' ? close : {}"
                  data-slot="close"
                  :class="classes.close"
                />
              </slot>
            </SheetClose>
          </slot>
        </SheetHeader>
        <div data-slot="body" :class="classes.body">
          <slot name="body" :close="closeSheet" />
        </div>
        <SheetFooter v-if="$slots.footer" data-slot="footer" :class="classes.footer">
          <slot name="footer" :close="closeSheet" />
        </SheetFooter>
      </slot>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, mergeProps, useAttrs, useSlots } from 'vue'
import { cn } from 'cn'

import type { HTMLAttributes } from 'vue'
import type { DialogContentProps, DialogContentEmits } from 'reka-ui'
import type AppButton from '~/components/AppButton.vue'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { useAdminI18n } from '~/composables/useAdminI18n'

defineOptions({ inheritAttrs: false })

type ContentEvents = { [K in keyof DialogContentEmits as `on${Capitalize<K>}`]?: (...args: DialogContentEmits[K]) => void }
type ModalContent = Omit<DialogContentProps, 'as' | 'asChild' | 'forceMount'> & ContentEvents
type ModalUi = Partial<Record<'overlay' | 'content' | 'header' | 'wrapper' | 'body' | 'footer' | 'title' | 'description' | 'close', HTMLAttributes['class']>>

const props = withDefaults(defineProps<{
  open?: boolean
  defaultOpen?: boolean
  modal?: boolean
  title?: string
  description?: string
  content?: ModalContent
  overlay?: boolean
  transition?: boolean
  portal?: boolean | string | HTMLElement
  close?: boolean | Omit<InstanceType<typeof AppButton>['$props'], 'to' | 'href' | 'target' | 'rel' | 'noRel' | 'external'>
  closeIcon?: string
  dismissible?: boolean
  class?: HTMLAttributes['class']
  fullscreen?: boolean
  scrollable?: boolean
  ui?: ModalUi
}>(), {
  open: undefined,
  defaultOpen: false,
  modal: true,
  overlay: true,
  transition: true,
  portal: true,
  close: true,
  dismissible: true,
})
const emit = defineEmits<{
  'update:open': [value: boolean]
  'after:enter': []
  'after:leave': []
  'close:prevent': []
}>()
const attrs = useAttrs()
const slots = useSlots()
const { t } = useAdminI18n()
function rootProps() {
  return { open: props.open, defaultOpen: props.defaultOpen, modal: props.modal }
}

// Keep the workbench's existing slideover sizing and scroll only its flexible body.
const classes = computed(() => ({
  overlay: cn('bg-elevated/75', props.transition ? 'data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_200ms_ease-in]' : 'animate-none data-[state=open]:animate-none data-[state=closed]:animate-none', props.ui?.overlay),
  content: cn('w-full max-w-full sm:max-w-lg gap-0 bg-default divide-y divide-default border-0 sm:ring ring-default sm:shadow-lg focus:outline-none', props.transition ? 'data-[state=open]:animate-[slide-in-from-right_200ms_ease-in-out] data-[state=closed]:animate-[slide-out-to-right_200ms_ease-in-out]' : 'animate-none data-[state=open]:animate-none data-[state=closed]:animate-none', !slots.default && props.class, props.ui?.content, props.fullscreen && 'max-w-none sm:max-w-none'),
  header: cn('relative shrink-0 flex-row items-center gap-1.5 px-4 py-3 sm:px-5 min-h-(--ui-header-height)', props.ui?.header),
  wrapper: cn('min-w-0 pr-10', props.ui?.wrapper),
  body: cn('min-h-0 flex-1 overflow-y-auto p-4 sm:p-5', props.ui?.body),
  footer: cn('mt-0 shrink-0 flex-row items-center gap-1.5 px-4 py-3 sm:px-5', props.ui?.footer),
  title: cn('text-base font-semibold text-highlighted', props.ui?.title),
  description: cn('mt-1 text-muted text-sm', props.ui?.description),
  close: cn('absolute top-4 end-4', props.ui?.close),
}))
const slotUi = computed(() => Object.fromEntries(Object.entries(classes.value).map(([name, value]) => [name, (options?: { class?: HTMLAttributes['class'] }) => cn(value, options?.class)])))

function preventDismiss(event: Event) {
  if (!props.dismissible) {
    event.preventDefault()
    emit('close:prevent')
  }
}

function pointerDownOutside(event: CustomEvent<{ originalEvent: PointerEvent }>) {
  // Match the previous wrapper: a removed target must not dismiss the drawer.
  if (!(event.detail.originalEvent.target as HTMLElement | null)?.isConnected) event.preventDefault()
  if (!props.dismissible) event.preventDefault()
}

// Do not let consumer content handlers replace the locked-dismissal guards.
// useAttrs is intentionally read during render (attrs are not computed dependencies).
function getContentBindings() {
  const { side, inset, unmountOnHide, ...contentAttrs } = attrs
  return mergeProps(contentAttrs, props.content || {}, {
    onEscapeKeyDown: preventDismiss,
    onInteractOutside: preventDismiss,
    onPointerDownOutside: pointerDownOutside,
  })
}
</script>
