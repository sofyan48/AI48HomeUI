<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Skeleton } from '~/components/ui/skeleton'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <Skeleton aria-hidden="true" v-bind="$attrs" :class="cn('motion-reduce:animate-none', props.class)" />
</template>
