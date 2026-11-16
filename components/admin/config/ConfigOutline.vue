<template>
      <aside
        class="hidden min-w-0 self-start xl:sticky xl:top-0 xl:block xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:overscroll-contain"
      >
        <AppCard :ui="{ body: 'p-2 sm:p-2' }">
          <p
            class="px-2 pb-2 text-xs font-semibold uppercase text-[var(--ui-text-muted)]"
          >
            {{ t('config.page.outlineTitle') }}
          </p>
          <button
            v-for="section in outline"
            :key="section.id"
            type="button"
            class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--ui-bg-elevated)]"
            @click="scrollToSection(section.id)"
          >
            <span>{{ section.short }}</span
            ><span
              v-if="sectionDirty(section.keys)"
              class="size-2 rounded-full bg-[var(--ui-primary)]"
            />
          </button>
        </AppCard>
      </aside>
</template>

<script setup lang="ts">
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const { t, outline, scrollToSection, sectionDirty } = useConfigWorkspace()
</script>
