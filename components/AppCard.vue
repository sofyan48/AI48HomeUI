<template>
  <UCard v-bind="$attrs" :class="userCard ? ['user-card', { 'user-card--tinted': tinted, 'user-card--emerald': accent === 'emerald' }] : 'admin-card'">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </UCard>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{
  tinted?: boolean
  accent?: 'neutral' | 'emerald'
}>()
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
