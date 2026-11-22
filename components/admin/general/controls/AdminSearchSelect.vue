<template>
  <Combobox
    :model-value="selectedItem"
    :ignore-filter="true"
    :open-on-click="true"
    :open-on-focus="true"
    :reset-search-term-on-blur="true"
    :disabled="disabled"
    by="value"
    @update:model-value="onSelect"
  >
    <ComboboxAnchor :class="cn('relative w-full', props.class)">
      <ComboboxInputRaw
        v-model="search"
        :display-value="displayValue"
        :placeholder="placeholder"
        :aria-label="ariaLabel || placeholder"
        :disabled="disabled"
        class="h-9 w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] pl-9 pr-16 text-sm text-[var(--ui-text-highlighted)] outline-none placeholder:text-[var(--ui-text-muted)] focus:border-[var(--ui-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <AppIcon name="i-tabler-search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ui-text-muted)]" aria-hidden="true" />
      <div class="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        <button
          v-if="clearable && modelValue !== null && modelValue !== undefined && !disabled"
          type="button"
          class="rounded p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-highlighted)]"
          :aria-label="clearLabel"
          @click.stop="clear"
        >
          <AppIcon name="i-tabler-x" class="size-4" aria-hidden="true" />
        </button>
        <ComboboxTrigger class="rounded p-1 text-[var(--ui-text-muted)]" :aria-label="ariaLabel || placeholder">
          <AppIcon name="i-tabler-chevron-down" class="size-4" aria-hidden="true" />
        </ComboboxTrigger>
      </div>
    </ComboboxAnchor>
    <ComboboxList class="w-[var(--reka-combobox-trigger-width)] min-w-56 p-1" :side-offset="4" align="start">
      <ComboboxViewport class="max-h-64 overflow-y-auto">
        <ComboboxEmpty class="py-4 text-xs text-[var(--ui-text-muted)]">{{ emptyText }}</ComboboxEmpty>
        <ComboboxItem v-for="item in visibleItems" :key="String(item.value)" :value="item" :disabled="item.disabled" class="flex items-center justify-between gap-3">
          <span class="min-w-0">
            <span class="block truncate">{{ item.label }}</span>
            <span v-if="item.description" class="block truncate text-xs text-[var(--ui-text-muted)]">{{ item.description }}</span>
          </span>
          <ComboboxItemIndicator><AppIcon name="i-tabler-check" class="size-4" aria-hidden="true" /></ComboboxItemIndicator>
        </ComboboxItem>
        <p v-if="hiddenCount > 0" class="px-2 py-1.5 text-xs text-[var(--ui-text-muted)]">{{ moreText.replace('{count}', String(hiddenCount)) }}</p>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { ComboboxInput as ComboboxInputRaw } from 'reka-ui'
import AppIcon from '~/components/AppIcon.vue'
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger, ComboboxViewport } from '~/components/ui/combobox'

export interface AdminSearchSelectItem {
  value: string | number
  label: string
  description?: string
  /** Extra text matched by the search but not displayed. */
  keywords?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  items: AdminSearchSelectItem[]
  placeholder?: string
  ariaLabel?: string
  emptyText?: string
  moreText?: string
  clearLabel?: string
  clearable?: boolean
  disabled?: boolean
  limit?: number
  class?: HTMLAttributes['class']
}>(), { placeholder: '', ariaLabel: '', emptyText: '—', moreText: '+{count}', clearLabel: 'Clear', clearable: true, disabled: false, limit: 50 })

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>()

const search = ref('')
const selectedItem = computed(() => props.items.find(item => item.value === props.modelValue) ?? null)
const matches = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return props.items
  return props.items.filter(item => `${item.label} ${item.description || ''} ${item.keywords || ''}`.toLowerCase().includes(query))
})
// Render a bounded list so large user directories stay responsive.
const visibleItems = computed(() => matches.value.slice(0, props.limit))
const hiddenCount = computed(() => Math.max(0, matches.value.length - visibleItems.value.length))

const displayValue = (item: unknown) => (item && typeof item === 'object' && 'label' in item ? String((item as AdminSearchSelectItem).label) : '')

function onSelect(item: unknown) {
  const next = item && typeof item === 'object' && 'value' in item ? (item as AdminSearchSelectItem).value : null
  search.value = ''
  emit('update:modelValue', next)
}

function clear() {
  search.value = ''
  emit('update:modelValue', null)
}
</script>
