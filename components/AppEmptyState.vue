<template>
  <div class="flex flex-col items-center justify-center px-6 py-10 text-center text-sm text-[var(--ui-text-muted)]">
    <UIcon v-if="icon" :name="icon" class="mb-2 size-6" />
    <p>{{ text }}</p>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/** Base empty state for tables, lists and panels. The default slot holds an optional call to action. */
defineProps<{ icon?: string; text: string }>()
</script>
