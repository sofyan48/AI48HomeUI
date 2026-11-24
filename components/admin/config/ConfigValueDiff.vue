<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '~/components/AppButton.vue'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { buildValueDiff, diffBlocks, type DiffLine } from '~/composables/config/valueDiff'

const props = withDefaults(defineProps<{
  before: string
  after: string
  format?: 'text' | 'json'
}>(), { format: 'text' })
const { t } = useAdminI18n()
const diff = computed(() => buildValueDiff(props.before, props.after, props.format))
const expanded = ref<Set<number>>(new Set())
watch(() => [props.before, props.after, props.format], () => { expanded.value = new Set() })
type DisplayItem = { key: string; line: DiffLine } | { key: string; start: number; count: number }
const items = computed<DisplayItem[]>(() => diffBlocks(diff.value.lines).flatMap(block => {
  const row = (line: DiffLine, index: number): DisplayItem => ({ key: `${block.start}-${index}`, line })
  const result = block.lines.map(row)
  if (block.hidden.length) {
    result.push({ key: `toggle-${block.start}`, start: block.start, count: block.hidden.length })
    if (expanded.value.has(block.start)) result.push(...block.hidden.map((line, index) => row(line, index + block.lines.length)))
  }
  result.push(...block.tail.map((line, index) => row(line, index + block.lines.length + block.hidden.length)))
  return result
}))
function toggle(start: number) {
  const next = new Set(expanded.value)
  if (next.has(start)) next.delete(start)
  else next.add(start)
  expanded.value = next
}
const marker = { context: ' ', removed: '−', added: '+' }
</script>

<template>
  <!-- Equal display strings may represent two masked secrets, not equal underlying values. -->
  <p v-if="before === after" class="p-3 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">{{ before }}</p>
  <div v-else-if="diff.fallback" class="flex min-w-0 flex-col gap-2 p-3">
    <div v-for="value in [{ label: t('common.from'), text: before }, { label: t('common.to'), text: after }]" :key="value.label" class="min-w-0">
      <p class="text-xs font-medium text-muted-foreground">{{ value.label }}</p>
      <pre class="font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">{{ value.text }}</pre>
    </div>
  </div>
  <div v-else class="min-w-0 py-1">
    <template v-for="item in items" :key="item.key">
      <div
        v-if="'line' in item"
        class="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 px-3 py-0.5 font-mono text-xs"
        :class="[
          diff.numbered && 'grid-cols-[2.5rem_2.5rem_1rem_minmax(0,1fr)]',
          item.line.kind === 'removed' && 'bg-destructive/10',
          item.line.kind === 'added' && 'bg-success/10',
        ]"
      >
        <template v-if="diff.numbered">
          <span aria-hidden="true" class="text-right text-muted-foreground select-none">{{ item.line.oldLine }}</span>
          <span aria-hidden="true" class="text-right text-muted-foreground select-none">{{ item.line.newLine }}</span>
        </template>
        <span aria-hidden="true" class="text-center select-none">{{ marker[item.line.kind] }}</span>
        <code class="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
          <span v-if="item.line.kind !== 'context'" class="sr-only">{{ item.line.kind === 'removed' ? t('common.from') : t('common.to') }}: </span>
          <component :is="item.line.kind === 'removed' ? 'del' : item.line.kind === 'added' ? 'ins' : 'span'" class="no-underline">
            <template v-if="item.line.words">
              <template v-for="(word, index) in item.line.words" :key="index"><mark v-if="word.changed" class="rounded-sm font-semibold text-inherit" :class="item.line.kind === 'added' ? 'bg-success/25' : 'bg-destructive/20'">{{ word.value }}</mark><template v-else>{{ word.value }}</template></template>
            </template>
            <template v-else>{{ item.line.value || '\u00a0' }}</template>
          </component>
        </code>
      </div>
      <AppButton
        v-else
        type="button"
        color="neutral"
        variant="ghost"
        size="sm"
        class="w-full justify-start"
        :icon="expanded.has(item.start) ? 'i-tabler-chevron-up' : 'i-tabler-chevron-down'"
        :aria-expanded="expanded.has(item.start)"
        :aria-label="`${t('common.details')} (${item.count})`"
        @click="toggle(item.start)"
      >{{ t('common.details') }} ({{ item.count }})</AppButton>
    </template>
  </div>
</template>
