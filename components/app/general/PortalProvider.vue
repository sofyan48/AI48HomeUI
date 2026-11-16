<script setup lang="ts">
import { ConfigProvider } from 'reka-ui'
import { useColorMode } from '~/composables/useColorMode'
import { Toaster } from '~/components/ui/sonner'
import 'vue-sonner/style.css'

const colorMode = useColorMode()
const toastTheme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')
</script>

<template>
  <ConfigProvider dir="ltr">
    <slot />
    <Toaster :theme="toastTheme" position="bottom-right" />
  </ConfigProvider>
</template>
