<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import type { ButtonVariants } from '~/components/ui/button'
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationFirst,
  PaginationItem, PaginationLast, PaginationNext, PaginationPrevious,
} from '~/components/ui/pagination'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  page?: number
  defaultPage?: number
  total?: number
  itemsPerPage?: number
  siblingCount?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  showEdges?: boolean
  class?: HTMLAttributes['class']
}>(), { defaultPage: 1, total: 0, itemsPerPage: 10, siblingCount: 2, size: 'md', showEdges: true })
const emit = defineEmits<{ 'update:page': [page: number] }>()
const buttonSize = computed<ButtonVariants['size']>(() => ({
  xs: 'icon-xs', sm: 'icon-sm', md: 'icon', lg: 'icon-lg', xl: 'icon-lg',
} as const)[props.size])
</script>

<template>
  <Pagination
    v-slot="{ page: currentPage }"
    aria-label="Pagination"
    v-bind="$attrs"
    :page="page"
    :default-page="defaultPage"
    :total="total"
    :items-per-page="itemsPerPage"
    :sibling-count="siblingCount"
    :disabled="disabled"
    :show-edges="showEdges"
    :class="cn('mx-0 w-auto', props.class)"
    @update:page="emit('update:page', $event)"
  >
    <PaginationContent v-slot="{ items }">
      <PaginationFirst :size="buttonSize" aria-label="First page"><AppIcon name="i-tabler-chevrons-left" aria-hidden="true" /></PaginationFirst>
      <PaginationPrevious :size="buttonSize" aria-label="Previous page"><AppIcon name="i-tabler-chevron-left" aria-hidden="true" /></PaginationPrevious>
      <template v-for="(item, index) in items" :key="item.type === 'page' ? `page-${item.value}` : `ellipsis-${index}`">
        <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === currentPage" :size="buttonSize">
          {{ item.value }}
        </PaginationItem>
        <PaginationEllipsis v-else :index="index" :class="cn(size === 'xs' ? 'size-6' : size === 'sm' ? 'size-8' : size === 'lg' || size === 'xl' ? 'size-10' : 'size-9')" />
      </template>
      <PaginationNext :size="buttonSize" aria-label="Next page"><AppIcon name="i-tabler-chevron-right" aria-hidden="true" /></PaginationNext>
      <PaginationLast :size="buttonSize" aria-label="Last page"><AppIcon name="i-tabler-chevrons-right" aria-hidden="true" /></PaginationLast>
    </PaginationContent>
  </Pagination>
</template>
