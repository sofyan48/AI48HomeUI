<template>
  <span class="app-brand-mark" :class="`app-brand-mark--${size}`" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 23 15.2 8.6a.9.9 0 0 1 1.6 0L23 23" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M11.6 17.4h8.8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="24.5" cy="8.5" r="2.5" fill="currentColor" opacity="0.85" />
    </svg>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
</script>

<style scoped>
.app-brand-mark {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--color-violet-600), var(--color-fuchsia-500));
  color: white;
  box-shadow: 0 6px 16px -6px color-mix(in oklch, var(--color-violet-600) 70%, transparent), inset 0 1px 0 rgb(255 255 255 / 25%);
}
.app-brand-mark svg { width: 62%; height: 62%; }
.app-brand-mark--sm { width: 1.75rem; height: 1.75rem; border-radius: 0.5rem; }
.app-brand-mark--md { width: 2.25rem; height: 2.25rem; }
.app-brand-mark--lg { width: 3rem; height: 3rem; border-radius: 0.9rem; }
</style>
