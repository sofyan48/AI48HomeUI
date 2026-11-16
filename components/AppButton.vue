<script setup lang="ts">
import { computed, inject, ref, useAttrs, useSlots } from 'vue'
import type { HTMLAttributes } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { cn } from 'cn'
import { NuxtLink } from '#components'
import AppIcon from '~/components/AppIcon.vue'
import { buttonFormLoadingResolverKey } from '~/composables/ui/buttonForm'

import { Button } from '~/components/ui/button'
import type { ButtonVariants } from '~/components/ui/button'

defineOptions({ inheritAttrs: false })

type Color = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type Variant = 'solid' | 'soft' | 'subtle' | NonNullable<ButtonVariants['variant']>
type Size = 'md' | 'xl' | NonNullable<ButtonVariants['size']>
type ClickHandler = (event: MouseEvent) => unknown | Promise<unknown>
type SlotStyle = string | string[]

const props = withDefaults(defineProps<{
  label?: string
  color?: Color
  variant?: Variant
  size?: Size
  loading?: boolean
  loadingAuto?: boolean
  disabled?: boolean
  icon?: string
  leading?: boolean
  trailing?: boolean
  leadingIcon?: string
  trailingIcon?: string
  loadingIcon?: string
  square?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
  as?: string
  to?: RouteLocationRaw
  href?: string
  target?: string
  rel?: string | null
  noRel?: boolean
  external?: boolean
  active?: boolean
  activeColor?: Color
  activeVariant?: Variant
  inactiveClass?: string
  activeClass?: string
  class?: HTMLAttributes['class']
  ui?: Partial<Record<'base' | 'label' | 'leadingIcon' | 'trailingIcon', SlotStyle>>
  onClick?: ClickHandler | ClickHandler[]
}>(), {
  color: 'primary', variant: 'solid', size: 'md', type: 'button', as: 'button',
  active: undefined,
})

const attrs = useAttrs()
const slots = useSlots()
const formLoading = inject(buttonFormLoadingResolverKey, undefined)?.()
const pending = ref(false)
const isLoading = computed(() => !!(props.loading || props.loadingAuto && (
  pending.value || props.type === 'submit' && formLoading?.value
)))
const locked = computed(() => props.disabled || isLoading.value)
const destination = computed(() => props.to ?? props.href)
const isLink = computed(() => destination.value !== undefined && destination.value !== null && destination.value !== '')
const externalLink = computed(() => props.external || props.target && props.target !== '_self'
  || typeof destination.value === 'string' && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(destination.value))
const color = computed(() => props.active && props.activeColor || props.color)
const variant = computed(() => props.active && props.activeVariant || props.variant)
const buttonVariant = computed<ButtonVariants['variant']>(() => {
  if (variant.value === 'solid') return color.value === 'error' ? 'destructive' : color.value === 'neutral' ? 'secondary' : 'default'
  if (variant.value === 'soft' || variant.value === 'subtle') return 'secondary'
  return variant.value
})
const buttonSize = computed<ButtonVariants['size']>(() => {
  const size = props.size === 'md' ? 'default' : props.size === 'xl' ? 'lg' : props.size
  if (size.startsWith('icon')) return size as ButtonVariants['size']
  if (props.square || !slots.default && !props.label) {
    return ({ default: 'icon', xs: 'icon-xs', sm: 'icon-sm', lg: 'icon-lg' } as const)[size]
  }
  return size
})
const isLeading = computed(() => !!(props.icon && (props.leading || !props.trailing)
  || isLoading.value && !props.trailing || props.leadingIcon))
const isTrailing = computed(() => !!(props.icon && props.trailing
  || isLoading.value && props.trailing || props.trailingIcon))
const spinner = computed(() => props.loadingIcon || 'i-tabler-loader-2')
const leadingIcon = computed(() => isLoading.value ? spinner.value : props.leadingIcon || props.icon)
const trailingIcon = computed(() => isLoading.value && !isLeading.value ? spinner.value : props.trailingIcon || props.icon)
const iconClass = computed(() => props.size === 'xs' || props.size === 'sm' || props.size === 'icon-xs' || props.size === 'icon-sm' ? 'size-4' : props.size === 'xl' ? 'size-6' : 'size-5')

// Slot functions retain the Nuxt Button slot API without depending on its renderer/theme.
const ui = computed(() => ({
  base: (options?: { class?: HTMLAttributes['class'] }) => cn(props.ui?.base, options?.class),
  label: (options?: { class?: HTMLAttributes['class'] }) => cn('truncate', props.ui?.label, options?.class),
  leadingIcon: (options?: { class?: HTMLAttributes['class'] }) => cn('shrink-0', iconClass.value, props.ui?.leadingIcon, options?.class),
  trailingIcon: (options?: { class?: HTMLAttributes['class'] }) => cn('shrink-0', iconClass.value, props.block && 'ms-auto', props.ui?.trailingIcon, options?.class),
}))
const rootClass = computed(() => cn(
  'app-button', props.block && 'w-full', locked.value && 'cursor-not-allowed opacity-75',
  props.active === true && props.activeClass, props.active === false && props.inactiveClass,
  props.ui?.base, props.class,
))
const rootProps = computed(() => {
  const { onClickCapture, ...rest } = attrs
  if (!isLink.value) return { ...rest, type: props.type, disabled: locked.value || undefined }
  if (locked.value) {
    // No href/to means neither keyboard, middle-click, nor context-menu navigation can escape the lock.
    const navigation = ['to', 'href', 'replace', 'prefetch', 'prefetchOn', 'noPrefetch', 'external', 'custom', 'download']
    return {
      ...Object.fromEntries(Object.entries(rest).filter(([key]) => !navigation.includes(key))),
      role: 'link', tabindex: -1, 'aria-disabled': 'true', target: props.target, rel: props.rel,
    }
  }
  return {
    ...rest, to: destination.value, external: props.external, target: props.target,
    rel: props.noRel ? null : props.rel ?? (externalLink.value ? 'noopener noreferrer' : undefined),
    noRel: props.noRel, activeClass: props.activeClass,
  }
})
function guardClick(event: MouseEvent) {
  if (locked.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  const handlers = attrs.onClickCapture
  for (const handler of Array.isArray(handlers) ? handlers : [handlers]) {
    if (typeof handler === 'function') handler(event)
  }
}
async function handleClick(event: MouseEvent) {
  if (locked.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  pending.value = true
  try {
    const handlers = Array.isArray(props.onClick) ? props.onClick : [props.onClick]
    await Promise.all(handlers.map(handler => handler?.(event)))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Button
    v-bind="rootProps"
    :as="isLink ? locked ? 'a' : NuxtLink : as"
    :variant="buttonVariant"
    :size="buttonSize"
    :class="rootClass"
    :data-color="color"
    :data-compat-variant="variant"
    :data-loading="isLoading || undefined"
    :aria-busy="isLoading || undefined"
    @click.capture="guardClick"
    @click="handleClick"
  >
    <slot name="leading" :ui="ui">
      <AppIcon
        v-if="isLeading && leadingIcon"
        :name="leadingIcon"
        data-slot="leadingIcon"
        data-icon="inline-start"
        aria-hidden="true"
        :class="cn(ui.leadingIcon(), isLoading && 'animate-spin')"
      />
    </slot>
    <slot :ui="ui">
      <span v-if="label != null" data-slot="label" :class="ui.label()">{{ label }}</span>
    </slot>
    <slot name="trailing" :ui="ui">
      <AppIcon
        v-if="isTrailing && trailingIcon"
        :name="trailingIcon"
        data-slot="trailingIcon"
        data-icon="inline-end"
        aria-hidden="true"
        :class="cn(ui.trailingIcon(), isLoading && !isLeading && 'animate-spin')"
      />
    </slot>
  </Button>
</template>

<style scoped>
/* Bridge the existing Nuxt semantic palette until the application theme is migrated. */
.app-button {
  --app-button-color: var(--ui-primary);
  --app-button-foreground: var(--ui-text-inverted);
  --app-button-soft: color-mix(in oklch, var(--app-button-color) 10%, var(--ui-bg));
  outline-color: var(--app-button-color);
  --ring: var(--app-button-color);
}
.app-button[data-color='secondary'] { --app-button-color: var(--ui-secondary); }
.app-button[data-color='success'] { --app-button-color: var(--ui-success); }
.app-button[data-color='info'] { --app-button-color: var(--ui-info); }
.app-button[data-color='warning'] { --app-button-color: var(--ui-warning); }
.app-button[data-color='error'] { --app-button-color: var(--ui-error); }
.app-button[data-color='neutral'] { --app-button-color: var(--ui-text-highlighted); }
.app-button[data-compat-variant='solid'],
.app-button[data-compat-variant='default'] {
  background-color: var(--app-button-color);
  color: var(--app-button-foreground);
}
.app-button[data-compat-variant='destructive'] {
  --app-button-color: var(--ui-error);
  background-color: var(--app-button-color);
  color: var(--ui-text-inverted);
}
.app-button[data-compat-variant='solid']:hover,
.app-button[data-compat-variant='default']:hover,
.app-button[data-compat-variant='destructive']:hover {
  background-color: color-mix(in oklch, var(--app-button-color) 90%, transparent);
}
.app-button[data-compat-variant='outline'] {
  background-color: transparent;
  border-color: var(--app-button-color);
  color: var(--app-button-color);
}
.app-button[data-compat-variant='outline'][data-color='neutral'] { border-color: var(--ui-border-accented); }
.app-button[data-compat-variant='soft'],
.app-button[data-compat-variant='subtle'] {
  background-color: var(--app-button-soft);
  color: var(--app-button-color);
}
.app-button[data-compat-variant='subtle'] { box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--app-button-color) 25%, transparent); }
.app-button[data-compat-variant='secondary'] {
  background-color: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
}
.app-button[data-compat-variant='ghost'],
.app-button[data-compat-variant='link'] {
  background-color: transparent;
  color: var(--app-button-color);
}
.app-button[data-compat-variant='outline']:hover,
.app-button[data-compat-variant='soft']:hover,
.app-button[data-compat-variant='subtle']:hover,
.app-button[data-compat-variant='ghost']:hover,
.app-button[data-compat-variant='secondary']:hover { background-color: var(--app-button-soft); }
</style>
