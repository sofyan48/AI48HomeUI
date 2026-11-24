<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'

defineProps<{
  ids?: number[]
  name: (id: number) => string
  unrestricted: string
  unsupported: string
}>()
</script>

<template>
  <div class="flex min-w-40 max-w-64 flex-wrap gap-1 whitespace-normal">
    <Badge v-if="ids === undefined" variant="outline" class="max-w-full whitespace-normal break-words">{{ unsupported }}</Badge>
    <Badge v-else-if="!ids.length" variant="secondary" class="max-w-full whitespace-normal break-words">{{ unrestricted }}</Badge>
    <template v-else>
      <Badge v-for="id in ids" :key="id" variant="outline" class="max-w-full whitespace-normal [overflow-wrap:anywhere]">{{ name(id) }}</Badge>
    </template>
  </div>
</template>
