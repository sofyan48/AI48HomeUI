<template>
  <component :is="uiProvider">
    <div>
      <NuxtLayout>
        <NuxtPage :key="route.path.startsWith('/admin') ? managementGeneration : undefined" />
      </NuxtLayout>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import PortalProvider from '~/components/app/general/PortalProvider.vue'
import { useManagementSessionStore } from '~/stores/managementSession'
import { useThemeColorHead } from '~/composables/layout/useThemeColor'

useThemeColorHead()
const route = useRoute()
const AdminUiProvider = defineAsyncComponent(() => import('~/components/admin/general/AdminUiProvider.vue'))
const uiProvider = computed(() => /^\/app(?:\/|$)/.test(route.path) ? PortalProvider : AdminUiProvider)
// Document scope also covers Nuxt UI overlays teleported outside the shell.
useHead(() => {
  const adminConsole = /^\/admin(?:\/|$)/.test(route.path) ? '' : undefined
  return {
    htmlAttrs: { 'data-admin-console': adminConsole },
    bodyAttrs: { 'data-admin-console': adminConsole }
  }
})
const { token } = storeToRefs(useManagementSessionStore())
const managementGeneration = ref(0)
// Token changes invalidate workspace owners; remount pages to acquire fresh refs.
watch(token, () => { managementGeneration.value++ }, { flush: 'sync' })
</script>
