<template>
  <UPopover>
    <AppButton
      color="neutral"
      variant="ghost"
      :icon="themeIcon"
      :aria-label="t('shared.theme.label', { name: themeLabel })"
      :title="t('shared.theme.label', { name: themeLabel })"
    />
    <template #content>
      <div class="grid w-72 max-w-[calc(100vw-2rem)] gap-1 p-2">
        <p class="px-2 py-1 text-xs font-medium text-muted">{{ t('shared.theme.mode') }}</p>
        <AppButton
          v-for="option in options"
          :key="option.value"
          color="neutral"
          :variant="colorMode.preference === option.value ? 'soft' : 'ghost'"
          :icon="option.icon"
          class="justify-start"
          :aria-pressed="colorMode.preference === option.value"
          @click="setTheme(option.value)"
        >
          {{ option.label }}
        </AppButton>
        <fieldset class="mt-2 border-t border-default px-2 pt-3 pb-1">
          <legend class="sr-only">{{ t('shared.theme.accent') }}</legend>
          <p class="mb-2 text-xs font-medium text-muted">{{ t('shared.theme.accent') }}</p>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="option in colors"
              :key="option"
              type="button"
              class="flex size-8 items-center justify-center rounded-md border border-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :style="{ backgroundColor: `var(--color-${option}-600)` }"
              :aria-label="t('shared.theme.color', { name: colorName(option) })"
              :aria-pressed="color === option"
              :title="colorName(option)"
              @click="setColor(option)"
            >
              <UIcon v-if="color === option" name="i-tabler-check" class="size-4 text-white" aria-hidden="true" />
            </button>
          </div>
        </fieldset>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { useThemeColor } from '~/composables/layout/useThemeColor'

const { color, colors, setColor } = useThemeColor()
const colorName = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const colorMode = useColorMode()
const { t } = useAdminI18n()
const options = computed(() => [
  { label: t('shared.theme.light'), value: 'light', icon: 'i-tabler-sun' },
  { label: t('shared.theme.dark'), value: 'dark', icon: 'i-tabler-moon' },
  { label: t('shared.theme.system'), value: 'system', icon: 'i-tabler-device-desktop' }
])
const activeTheme = computed(() => colorMode.preference === 'system' ? colorMode.value : colorMode.preference)
const themeIcon = computed(() => colorMode.preference === 'system' ? 'i-tabler-device-desktop' : activeTheme.value === 'dark' ? 'i-tabler-moon' : 'i-tabler-sun')
const themeLabel = computed(() => options.value.find(option => option.value === colorMode.preference)?.label || t('shared.theme.system'))
function setTheme(value: string) {
  colorMode.preference = value
}
</script>
