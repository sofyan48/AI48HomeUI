<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import type { AcceptableValue } from 'reka-ui'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { Separator } from '~/components/ui/separator'
import { useThemeColor } from '~/composables/layout/useThemeColor'

const { color, colors, setColor } = useThemeColor()
const colorMode = useColorMode()
const { t: themeT } = useAdminI18n()
const options = computed(() => [
  { label: themeT('shared.theme.light'), value: 'light', icon: 'i-tabler-sun' },
  { label: themeT('shared.theme.dark'), value: 'dark', icon: 'i-tabler-moon' },
  { label: themeT('shared.theme.system'), value: 'system', icon: 'i-tabler-device-desktop' }
])
const themeIcon = computed(() => options.value.find(option => option.value === colorMode.preference)?.icon || 'i-tabler-device-desktop')
const themeLabel = computed(() => options.value.find(option => option.value === colorMode.preference)?.label || themeT('shared.theme.system'))
const colorName = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
function setTheme(value: AcceptableValue | AcceptableValue[]) {
  if (typeof value === 'string' && options.value.some(option => option.value === value)) colorMode.preference = value
}
function selectColor(value: AcceptableValue | AcceptableValue[]) {
  const selected = colors.find(option => option === value)
  if (selected) setColor(selected)
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <AppButton color="neutral" variant="ghost" :icon="themeIcon" :aria-label="themeT('shared.theme.label', { name: themeLabel })" :title="themeT('shared.theme.label', { name: themeLabel })" />
    </PopoverTrigger>
    <PopoverContent class="grid w-72 max-w-[calc(100vw-2rem)] gap-3 p-3">
      <p class="text-xs font-medium text-muted-foreground">{{ themeT('shared.theme.mode') }}</p>
      <ToggleGroup type="single" :model-value="colorMode.preference" :spacing="1" :aria-label="themeT('shared.theme.mode')" class="w-full flex-col items-stretch" orientation="vertical" @update:model-value="setTheme">
        <ToggleGroupItem v-for="option in options" :key="option.value" :value="option.value" class="justify-start gap-2">
          <AppIcon :name="option.icon" aria-hidden="true" />
          {{ option.label }}
        </ToggleGroupItem>
      </ToggleGroup>
      <Separator />
      <p class="text-xs font-medium text-muted-foreground">{{ themeT('shared.theme.accent') }}</p>
      <ToggleGroup type="single" :model-value="color" :spacing="1" :aria-label="themeT('shared.theme.accent')" class="grid w-full grid-cols-5 gap-2" @update:model-value="selectColor">
        <ToggleGroupItem v-for="option in colors" :key="option" :value="option" :aria-label="themeT('shared.theme.color', { name: colorName(option) })" :title="colorName(option)" class="px-1">
          <span class="flex size-6 items-center justify-center rounded-sm" :style="{ backgroundColor: `var(--color-${option}-600)` }">
            <AppIcon v-if="color === option" name="i-tabler-check" class="text-white" aria-hidden="true" />
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
    </PopoverContent>
  </Popover>
</template>
