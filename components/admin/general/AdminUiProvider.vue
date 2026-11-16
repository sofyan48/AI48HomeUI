<script setup lang="ts">
import { provide } from 'vue'
import { useColorMode } from '~/composables/useColorMode'
import { ConfigProvider } from 'reka-ui'
import { Toaster } from '~/components/ui/sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
import { buttonFormLoadingResolverKey } from '~/composables/ui/buttonForm'
import 'vue-sonner/style.css'

// Native admin forms own their pending state and pass it explicitly to buttons.
provide(buttonFormLoadingResolverKey, () => undefined)
const colorMode = useColorMode()
const toastTheme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
</script>

<template>
  <ConfigProvider dir="ltr">
    <TooltipProvider :delay-duration="250">
      <slot />
      <Toaster :theme="toastTheme" position="bottom-right" />
    </TooltipProvider>
  </ConfigProvider>
</template>
