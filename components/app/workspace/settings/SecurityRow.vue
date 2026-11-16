<template>
  <div class="security-row flex flex-wrap items-center gap-3 rounded-xl border p-3 sm:p-4">
    <div class="security-row__icon flex size-9 shrink-0 items-center justify-center rounded-xl">
      <AppIcon :name="icon" class="size-5" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-1 basis-40">
      <p class="text-sm font-medium text-[var(--ui-text-highlighted)]">{{ title }}</p>
      <p class="mt-0.5 break-words text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ detail }}</p>
    </div>
    <AppButton class="shrink-0 rounded-lg" color="neutral" variant="soft" size="sm" :aria-label="t('ws.security.actionAria', { action, title })" @click="$emit('action')">{{ action }}</AppButton>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
defineProps<{ icon: string; title: string; detail: string; action: string }>()
defineEmits<{ action: [] }>()
const { t } = usePortalI18n()
</script>

<style scoped>
.security-row {
  border-color: var(--ui-border);
  background: var(--user-inset-bg);
}
.security-row__icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
</style>
