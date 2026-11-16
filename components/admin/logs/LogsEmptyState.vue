<template>
  <div class="flex flex-col items-center justify-center py-12">
    <AppIcon :name="icon" class="mb-3 size-8 text-[var(--ui-text-muted)]" />
    <span class="text-sm text-[var(--ui-text-muted)]">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
defineProps<{ icon?: string; message?: string }>()
</script>
