<template>
  <UModal v-model:open="open" :title="t('shared.commands.title')" :description="t('shared.commands.description')" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <UCommandPalette
        :groups="groups"
        :placeholder="t('shared.commands.placeholder')"
        :input="{ 'aria-label': t('shared.commands.inputLabel') }"
        :fuse="{ fuseOptions: { keys: ['label', 'description'], threshold: 0.3, ignoreLocation: true } }"
        close
        @update:open="open = $event"
      >
        <template #empty>
          <p class="p-4 text-sm text-[var(--ui-text-muted)]">{{ t('shared.commands.empty') }}</p>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CommandPaletteGroup } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ groups: CommandPaletteGroup[]; disabled?: boolean }>()
const { t } = useAdminI18n()

function handleShortcut(event: KeyboardEvent) {
  if (props.disabled || event.defaultPrevented || event.isComposing || event.repeat || event.altKey) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    open.value = !open.value
  }
}

onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>
