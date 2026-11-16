<template>
  <div role="tablist" :aria-label="label || t('shared.tabs.sections')" class="app-panel-tabs">
    <AppButton
      v-for="item in items"
      :key="item.value"
      role="tab"
      :aria-selected="modelValue === item.value"
      :color="modelValue === item.value ? 'primary' : 'neutral'"
      :variant="modelValue === item.value ? 'soft' : 'ghost'"
      :icon="item.icon"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  items: Array<{ label: string; value: string; icon?: string }>
  label?: string
}>(), {
  items: () => [],
  label: ''
})
const { t } = useAdminI18n()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped>
.app-panel-tabs {
  display: inline-flex;
  max-width: 100%;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.625rem;
  background: var(--ui-bg-muted);
}
.app-panel-tabs :deep(button) {
  flex-shrink: 0;
  border-radius: 0.4375rem;
  background: transparent;
  color: var(--ui-text-muted);
  box-shadow: none;
}
.app-panel-tabs :deep(button:hover:not([aria-selected="true"])) {
  background: color-mix(in oklch, var(--ui-bg) 60%, transparent);
  color: var(--ui-text-highlighted);
}
.app-panel-tabs :deep(button[aria-selected="true"]) {
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  box-shadow: 0 1px 2px rgb(24 24 27 / 8%), 0 0 0 1px var(--ui-border);
}
.app-panel-tabs :deep(button[aria-selected="true"] [data-slot="leadingIcon"]) {
  color: var(--ui-primary);
}
</style>
