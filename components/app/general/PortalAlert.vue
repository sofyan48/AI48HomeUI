<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed, ref, useAttrs } from 'vue'
import type { ComponentPublicInstance, HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'

defineOptions({ inheritAttrs: false })

type Color = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type Variant = 'solid' | 'soft' | 'subtle' | 'outline'
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  color?: Color
  variant?: Variant
  class?: HTMLAttributes['class']
}>(), { color: 'primary', variant: 'solid' })

const attrs = useAttrs()
const root = ref<ComponentPublicInstance | null>(null)
const element = computed(() => root.value?.$el as HTMLElement | undefined)
// Login's existing HTMLElement-typed template ref calls focus() directly.
function focus(options?: FocusOptions) { element.value?.focus(options) }
defineExpose({ focus, el: element })
</script>

<template>
  <Alert
    ref="root"
    v-bind="attrs"
    :variant="color === 'error' ? 'destructive' : 'default'"
    :class="cn('portal-alert', props.class)"
    :data-color="color"
    :data-variant="variant"
  >
    <div v-if="icon || $slots.leading" class="portal-alert-leading">
      <slot name="leading"><AppIcon v-if="icon" :name="icon" class="size-5 shrink-0" aria-hidden="true" /></slot>
    </div>
    <div class="portal-alert-content flex min-w-0 flex-col gap-1">
      <AlertTitle v-if="title || $slots.title" class="line-clamp-none break-words">
        <slot name="title">{{ title }}</slot>
      </AlertTitle>
      <AlertDescription v-if="description || $slots.description" class="portal-alert-description break-words">
        <slot name="description">{{ description }}</slot>
      </AlertDescription>
      <slot />
      <div v-if="$slots.actions" class="mt-2 flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.trailing" class="portal-alert-trailing"><slot name="trailing" /></div>
  </Alert>
</template>

<style scoped>
/* Keep the semantic palette and leading-icon layout across both themes. */
.portal-alert {
  --portal-alert-color: var(--ui-primary);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-color: transparent;
  background: var(--portal-alert-color);
  color: var(--ui-text-inverted);
}
.portal-alert[data-color='secondary'] { --portal-alert-color: var(--ui-secondary); }
.portal-alert[data-color='success'] { --portal-alert-color: var(--ui-success); }
.portal-alert[data-color='info'] { --portal-alert-color: var(--ui-info); }
.portal-alert[data-color='warning'] { --portal-alert-color: var(--ui-warning); }
.portal-alert[data-color='error'] { --portal-alert-color: var(--ui-error); }
.portal-alert[data-color='neutral'] { --portal-alert-color: var(--ui-text-highlighted); }
.portal-alert-content { flex: 1; }
.portal-alert-leading, .portal-alert-trailing { display: flex; flex-shrink: 0; }
.portal-alert-leading { padding-top: 0.125rem; }
.portal-alert .portal-alert-description { color: inherit; }
.portal-alert[data-variant='soft'], .portal-alert[data-variant='subtle'] {
  background: color-mix(in oklch, var(--portal-alert-color) 10%, var(--ui-bg));
  color: var(--portal-alert-color);
}
.portal-alert[data-variant='subtle'] { border-color: color-mix(in oklch, var(--portal-alert-color) 25%, transparent); }
.portal-alert[data-variant='outline'] { background: var(--ui-bg); color: var(--portal-alert-color); border-color: var(--portal-alert-color); }
.portal-alert:focus-visible { outline: 2px solid var(--portal-alert-color); outline-offset: 2px; }
</style>
