<template>
  <fieldset class="grid gap-2">
    <legend class="text-sm font-medium">{{ title }}</legend>
    <div v-if="items.length" class="grid max-h-52 gap-1 overflow-y-auto rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-2">
      <label
        v-for="item in items"
        :key="item.value"
        class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-[var(--ui-bg-muted)] has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-60"
      >
        <AdminCheckbox
          :id="`${pickerId}-${item.value}`"
          :model-value="selected.includes(item.value)"
          :aria-label="item.label"
          class="shrink-0"
          @update:model-value="$emit('toggle', item.value)"
        />
        <span class="min-w-0 truncate">{{ item.label }}</span>
      </label>
    </div>
    <div v-else class="rounded-md border border-[var(--ui-border)] px-3 py-3 text-sm text-[var(--ui-text-muted)]">{{ emptyLabel }}</div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'

type ScopeItem = { value: number; label: string }

const props = defineProps<{
  title: string
  emptyLabel: string
  items: ScopeItem[]
  selected: number[]
}>()

defineEmits<{ toggle: [value: number] }>()

const pickerId = computed(() => `scope-picker-${props.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
</script>
