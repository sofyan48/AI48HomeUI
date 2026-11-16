<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useConsoleLocale } from '~/composables/useConsoleLocale'

const { locale, languages, setLocale, t } = useConsoleLocale()
const open = ref(false)
const activeLabel = computed(() => languages.find(option => option.value === locale.value)?.label)

function selectLanguage(value: AcceptableValue | AcceptableValue[]) {
  const selected = languages.find(option => option.value === value)
  if (selected) setLocale(selected.value)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <AppButton icon="i-tabler-language" color="neutral" variant="ghost" :aria-label="`${t('language.label')}: ${activeLabel}`" :title="`${t('language.label')}: ${activeLabel}`" />
    </PopoverTrigger>
    <PopoverContent class="w-48 p-1.5">
      <ToggleGroup type="single" :model-value="locale" :spacing="1" orientation="vertical" class="w-full flex-col items-stretch" :aria-label="t('language.label')" @update:model-value="selectLanguage">
        <ToggleGroupItem v-for="option in languages" :key="option.value" :value="option.value" :lang="option.value" class="justify-start">
          {{ option.label }}
        </ToggleGroupItem>
      </ToggleGroup>
    </PopoverContent>
  </Popover>
</template>
