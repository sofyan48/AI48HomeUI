<template>
  <div class="admin-rail__footer" :class="collapsed ? 'lg:flex-col lg:px-1.5' : ''">
    <button
      type="button"
      :aria-label="tc('shell.manageConnection')"
      class="admin-connection-status flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left"
      :class="collapsed ? 'lg:w-full lg:justify-center lg:px-0' : ''"
      :title="status.label"
      @click="emit('manage')"
    >
      <span class="admin-rail__avatar" aria-hidden="true">
        <UIcon name="i-tabler-shield-check" class="size-4" />
        <span class="admin-status-dot absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-[var(--admin-rail-bg)]" :class="status.dot" />
      </span>
      <span class="min-w-0 leading-tight" :class="collapsed ? 'lg:sr-only' : ''">
        <span class="block truncate text-xs font-semibold text-[var(--ui-text-highlighted)]">{{ tc('shell.management') }}</span>
        <span role="status" class="block truncate text-[11px] text-[var(--ui-text-muted)]">{{ status.label }}</span>
      </span>
    </button>
    <AppButton icon="i-tabler-plug-off" color="neutral" variant="ghost" size="sm" :aria-label="tc('shell.disconnect')" :title="tc('shell.disconnect')" :disabled="!connected" @click="emit('disconnect')" />
  </div>
</template>

<script setup lang="ts">
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import type { ConnectionStatus } from '~/composables/layout/useAdminConnection'

defineProps<{
  status: ConnectionStatus
  collapsed: boolean
  connected: boolean
}>()
const emit = defineEmits<{ manage: []; disconnect: [] }>()

const { t: tc } = useConsoleLocale()
</script>

<style scoped>
.admin-rail__footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  margin: 0.625rem;
  padding: 0.25rem;
  border: 1px solid rgb(255 255 255 / 7%);
  border-radius: 1rem;
  background: rgb(255 255 255 / 4%);
}
.admin-rail__avatar {
  position: relative;
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: rgb(255 255 255 / 8%);
  color: var(--color-violet-200);
}
.admin-connection-status:focus-visible {
  outline: 2px solid var(--color-violet-300);
  outline-offset: 2px;
}
.admin-connection-status:hover { background: var(--ui-hover); }
</style>
