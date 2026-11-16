<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Badge } from '~/components/ui/badge'

type Color = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type Variant = 'solid' | 'soft' | 'subtle' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
const props = withDefaults(defineProps<{
  color?: Color
  variant?: Variant
  size?: Size
  class?: HTMLAttributes['class']
}>(), { color: 'primary', variant: 'solid', size: 'md' })

const badgeVariant = computed(() => props.variant === 'outline' ? 'outline'
  : props.variant === 'soft' || props.variant === 'subtle' ? 'secondary'
    : props.color === 'error' ? 'destructive' : 'default')
const sizes: Record<Size, string> = {
  xs: 'px-1 py-0.5 text-[10px]',
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2 py-1 text-sm',
  xl: 'px-2.5 py-1 text-base',
}
</script>

<template>
  <Badge :variant="badgeVariant" :class="cn('portal-badge', sizes[size], props.class)" :data-color="color" :data-variant="variant">
    <slot />
  </Badge>
</template>

<style scoped>
.portal-badge {
  --portal-badge-color: var(--ui-primary);
  background: var(--portal-badge-color);
  color: var(--ui-text-inverted);
  border-color: transparent;
}
.portal-badge[data-color='secondary'] { --portal-badge-color: var(--ui-secondary); }
.portal-badge[data-color='success'] { --portal-badge-color: var(--ui-success); }
.portal-badge[data-color='info'] { --portal-badge-color: var(--ui-info); }
.portal-badge[data-color='warning'] { --portal-badge-color: var(--ui-warning); }
.portal-badge[data-color='error'] { --portal-badge-color: var(--ui-error); }
.portal-badge[data-color='neutral'] { --portal-badge-color: var(--ui-text-highlighted); }
.portal-badge[data-variant='soft'], .portal-badge[data-variant='subtle'] {
  background: color-mix(in oklch, var(--portal-badge-color) 10%, var(--ui-bg));
  color: var(--portal-badge-color);
}
.portal-badge[data-variant='subtle'] { border-color: color-mix(in oklch, var(--portal-badge-color) 25%, transparent); }
.portal-badge[data-variant='outline'] { background: transparent; color: var(--portal-badge-color); border-color: var(--portal-badge-color); }
</style>
