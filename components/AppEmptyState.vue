<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from '~/components/ui/empty'

/** Base empty state; the default slot holds an optional call to action. */
defineProps<{ icon?: string; text: string }>()
</script>

<template>
  <Empty class="px-6 py-10">
    <EmptyHeader>
      <EmptyMedia v-if="icon" variant="icon"><AppIcon :name="icon" aria-hidden="true" /></EmptyMedia>
      <EmptyDescription>{{ text }}</EmptyDescription>
    </EmptyHeader>
    <EmptyContent v-if="$slots.default"><slot /></EmptyContent>
  </Empty>
</template>
