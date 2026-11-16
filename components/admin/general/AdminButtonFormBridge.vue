<script setup lang="ts">
import { inject, provide } from 'vue'
import { formLoadingInjectionKey } from '@nuxt/ui/composables/useFormField'
import { buttonFormLoadingResolverKey } from '~/composables/ui/buttonForm'

provide(buttonFormLoadingResolverKey, () => inject(formLoadingInjectionKey, undefined))
</script>

<template>
  <slot />
</template>
