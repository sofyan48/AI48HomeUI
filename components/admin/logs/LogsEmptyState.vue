<template>
  <div class="flex flex-col items-center justify-center py-12">
    <UIcon :name="icon" class="mb-3 size-8 text-[var(--ui-text-muted)]" />
    <span class="text-sm text-[var(--ui-text-muted)]">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon?: string; message?: string }>()
</script>
