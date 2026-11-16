<template>
  <Card v-bind="$attrs" data-slot="root" :class="cn('gap-0 overflow-hidden rounded-lg py-0 shadow-none', userCard ? ['user-card', { 'user-card--tinted': tinted, 'user-card--emerald': accent === 'emerald' }] : 'admin-card', ui?.root)">
    <CardHeader v-if="$slots.header" data-slot="header" :class="cn('block border-b px-4 py-3.5 sm:px-5 [.border-b]:pb-3.5', ui?.header)">
      <slot name="header" :ui="slotUi" />
    </CardHeader>
    <CardContent data-slot="body" :class="cn('p-4 sm:p-5', ui?.body)">
      <slot :ui="slotUi" />
    </CardContent>
    <CardFooter v-if="$slots.footer" data-slot="footer" :class="cn('block border-t px-4 py-3 sm:px-5', ui?.footer)">
      <slot name="footer" :ui="slotUi" />
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { Card, CardContent, CardFooter, CardHeader } from '~/components/ui/card'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  tinted?: boolean
  accent?: 'neutral' | 'emerald'
  ui?: Partial<Record<'root' | 'header' | 'body' | 'footer', HTMLAttributes['class']>>
}>()
const slotUi = computed(() => Object.fromEntries(['root', 'header', 'body', 'footer'].map(name => [
  name, (options?: { class?: HTMLAttributes['class'] }) => cn(props.ui?.[name as keyof NonNullable<typeof props.ui>], options?.class),
])))
const userCard = inject(Symbol.for('cliproxy-user-card'), false)
provide(Symbol.for('cliproxy-app-card'), true)
</script>

<style scoped>
.user-card {
  --user-card-accent: var(--ui-primary);
  border: 1px solid var(--user-panel-border, var(--ui-border));
  border-radius: var(--user-panel-radius, 1rem);
  background: var(--user-panel-bg, var(--ui-bg));
  box-shadow: var(--user-panel-shadow, none);
}

.user-card :deep(> [data-slot="header"]),
.user-card :deep(> [data-slot="footer"]) {
  border-color: var(--user-panel-border, var(--ui-border));
}

.user-card--emerald { --user-card-accent: var(--ui-success); }

.user-card--tinted {
  background: color-mix(in oklch, var(--user-card-accent) 5%, var(--user-panel-bg, var(--ui-bg)));
}
</style>
