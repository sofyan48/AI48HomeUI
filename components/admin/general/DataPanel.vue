<template>
  <section class="admin-data-panel min-w-0 max-w-full overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)]" :aria-label="title || t('shared.panel.dataTable')">
    <header v-if="title || description || $slots.actions" class="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="title || description" class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 v-if="title" class="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{{ title }}</h2>
        <span v-if="description" class="text-xs text-muted-foreground [overflow-wrap:anywhere]">{{ description }}</span>
      </div>
      <div v-if="$slots.actions" class="admin-data-panel__actions flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <slot name="actions" />
      </div>
    </header>

    <div v-if="$slots.toolbar" class="admin-data-panel__toolbar border-t border-[var(--ui-border)] px-4 py-2.5">
      <slot name="toolbar" />
    </div>

    <div v-if="$slots.bulk" class="admin-data-panel__bulk border-t border-[var(--ui-border)] px-4 py-2">
      <slot name="bulk" />
    </div>

    <div class="min-w-0 max-w-full overflow-x-auto border-t border-[var(--ui-border)]" :class="contentClass">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="min-w-0 border-t border-[var(--ui-border)] px-4 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string; contentClass?: string }>(), {
  title: '',
  description: '',
  contentClass: ''
})
const { t } = useAdminI18n()
</script>
