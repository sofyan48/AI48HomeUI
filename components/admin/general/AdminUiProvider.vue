<script setup lang="ts">
import AdminButtonFormBridge from './AdminButtonFormBridge.vue'
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right' }">
    <AdminButtonFormBridge>
      <slot />
    </AdminButtonFormBridge>
  </UApp>
</template>
