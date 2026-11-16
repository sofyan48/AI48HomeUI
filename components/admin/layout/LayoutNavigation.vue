<template>
  <nav :aria-label="tc('shell.management')" class="admin-rail__nav min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
    <div v-for="section in sections" :key="section.label" class="mb-4 last:mb-0">
      <p class="admin-rail__section" :class="collapsed ? 'lg:sr-only' : ''">
        {{ section.label }}
      </p>
      <div class="space-y-0.5" :class="collapsed && section.label !== tc('nav.operate') ? 'lg:border-t lg:border-[var(--ui-border)] lg:pt-2' : ''">
        <NuxtLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="admin-rail__item"
          :data-tone="section.tone"
          :class="[collapsed ? 'lg:justify-center lg:px-0' : '', { 'admin-rail__item--active': isActive(item) }]"
          :aria-label="item.label"
          :aria-current="isActive(item) ? 'page' : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate')"
        >
          <span class="admin-rail__glyph" aria-hidden="true"><UIcon :name="item.icon" class="size-[1.0625rem]" /></span>
          <span class="min-w-0 flex-1 truncate" :class="collapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
          <UIcon v-if="isActive(item)" name="i-tabler-chevron-right" class="size-3.5 shrink-0 opacity-70" :class="collapsed ? 'lg:hidden' : ''" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useConsoleLocale } from '~/composables/useConsoleLocale'
import type { NavigationItem, NavigationSection } from '~/composables/layout/useAdminNavigation'

defineProps<{
  sections: NavigationSection[]
  collapsed: boolean
  isActive: (item: NavigationItem) => boolean
}>()
const emit = defineEmits<{ navigate: [] }>()

const { t: tc } = useConsoleLocale()
</script>

<style scoped>
.admin-rail__section {
  margin-bottom: 0.375rem;
  padding-inline: 0.75rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
}
.admin-rail__item {
  position: relative;
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3125rem 0.625rem 0.3125rem 0.3125rem;
  border-radius: 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ui-text);
  transition: background-color 140ms ease, color 140ms ease;
}
.admin-rail__glyph {
  display: flex;
  width: 1.875rem;
  height: 1.875rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: rgb(255 255 255 / 5%);
  color: var(--ui-text-muted);
  transition: background-color 140ms ease, color 140ms ease;
}
.admin-rail__item:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.admin-rail__item:hover .admin-rail__glyph { color: var(--ui-text-highlighted); }
.admin-rail__item:focus-visible { outline: 2px solid var(--color-violet-300); outline-offset: 1px; }
.admin-rail__item--active,
.admin-rail__item--active:hover {
  background: linear-gradient(90deg, color-mix(in oklch, var(--item-a) 30%, transparent), color-mix(in oklch, var(--item-b) 10%, transparent)) !important;
  color: var(--color-white) !important;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 8%);
}
.admin-rail__item--active .admin-rail__glyph {
  background: linear-gradient(135deg, var(--item-a), var(--item-b));
  color: var(--color-white);
  box-shadow: 0 6px 16px -6px color-mix(in oklch, var(--item-b) 70%, transparent);
}

/* Section tones: one accent per console area. */
.admin-rail__item[data-tone="blue"] { --item-a: var(--color-blue-500); --item-b: var(--color-cyan-400); }
.admin-rail__item[data-tone="emerald"] { --item-a: var(--color-emerald-500); --item-b: var(--color-teal-400); }
.admin-rail__item[data-tone="amber"] { --item-a: var(--color-amber-500); --item-b: var(--color-orange-500); }
.admin-rail__item { --item-a: var(--color-violet-500); --item-b: var(--color-fuchsia-500); }

@media (prefers-reduced-motion: reduce) {
  .admin-rail__item, .admin-rail__glyph { transition: none; }
}
</style>
