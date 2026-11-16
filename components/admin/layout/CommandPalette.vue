<template>
  <CommandDialog v-model:open="open" :title="t('shared.commands.title')" :description="t('shared.commands.description')">
    <CommandInput :placeholder="t('shared.commands.placeholder')" :aria-label="t('shared.commands.inputLabel')" />
    <CommandList>
      <CommandEmpty>{{ t('shared.commands.empty') }}</CommandEmpty>
      <CommandGroup v-for="group in groups" :key="group.id" :heading="group.label">
        <CommandItem
          v-for="(item, index) in group.items"
          :key="`${group.id}-${index}`"
          :value="`${item.label} ${item.description || ''} ${group.id}-${index}`"
          :disabled="item.disabled"
          @select="selectCommand(item)"
        >
          <AppIcon v-if="item.icon" :name="item.icon" aria-hidden="true" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span>{{ item.label }}</span>
            <span v-if="item.description" class="text-xs text-muted-foreground">{{ item.description }}</span>
          </span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command'

interface CommandItemData {
  label: string
  description?: string
  icon?: string
  disabled?: boolean
  onSelect?: () => unknown
}
interface CommandGroupData {
  id: string
  label?: string
  items: CommandItemData[]
}

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ groups: CommandGroupData[]; disabled?: boolean }>()
const { t } = useAdminI18n()

function selectCommand(item: CommandItemData) {
  if (item.disabled) return
  open.value = false
  item.onSelect?.()
}

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
