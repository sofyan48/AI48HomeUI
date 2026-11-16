<script setup lang="ts">
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps<{
  rows: Record<string, any>[]
  following: boolean
  pendingCount: number
  busy: boolean
  canLoadOlder: boolean
  disabled: boolean
  truncated: boolean
}>()
const emit = defineEmits(['following', 'accept', 'older', 'detail'])
const { t } = useAdminI18n()
const viewport = ref<HTMLElement | null>(null)
const chronologicalRows = computed(() => [...props.rows].reverse())
watch(() => props.rows, async (rows, previous) => {
  const element = viewport.value
  if (!element) return
  const height = element.scrollHeight
  const top = element.scrollTop
  const prepended = rows.at(-1)?.id !== previous?.at(-1)?.id && rows[0]?.id === previous?.[0]?.id
  await nextTick()
  if (props.following) element.scrollTop = element.scrollHeight
  else if (prepended) element.scrollTop = top + element.scrollHeight - height
})
watch(() => props.following, async following => {
  await nextTick()
  if (following && viewport.value) viewport.value.scrollTop = viewport.value.scrollHeight
})
const onScroll = () => {
  const element = viewport.value
  if (props.following && element && element.scrollHeight - element.scrollTop - element.clientHeight > 24) emit('following', false)
}
</script>

<template>
  <div class="space-y-3 p-4">
    <div class="flex flex-wrap items-center gap-2">
      <AppButton color="neutral" variant="outline" :aria-pressed="following" :disabled="disabled" @click="emit('following', !following)">
        {{ following ? t('logs.tail.followOn') : t('logs.tail.followOff') }}
      </AppButton>
      <AppButton color="neutral" variant="outline" :disabled="disabled || !canLoadOlder" :loading="busy" @click="emit('older')">{{ t('logs.tail.loadOlder') }}</AppButton>
      <AppButton v-if="pendingCount" color="primary" variant="outline" :disabled="disabled" @click="emit('accept')">{{ t('logs.tail.showNew', { count: pendingCount }) }}</AppButton>
      <span role="status" class="text-xs text-[var(--ui-text-muted)]">{{ following ? t('logs.tail.statusFollowing', { count: rows.length }) : t('logs.tail.statusPreserved', { count: rows.length }) }}</span>
    </div>
    <p class="text-xs text-[var(--ui-text-muted)]">{{ t('logs.tail.pollNote') }}</p>
    <p v-if="truncated" role="status" class="text-xs text-amber-600 dark:text-amber-400">{{ t('logs.tail.truncated') }}</p>
    <div ref="viewport" tabindex="0" role="region" :aria-label="t('logs.tail.regionLabel')" class="h-96 overflow-auto rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] [overflow-anchor:none]" @scroll.passive="onScroll">
      <p v-if="!rows.length" class="p-4 text-sm text-[var(--ui-text-muted)]">{{ busy ? t('logs.tail.loading') : t('logs.applicationEmpty') }}</p>
      <div v-for="row in chronologicalRows" :key="String(row.id)" class="border-b border-[var(--ui-border)] p-3 last:border-0">
        <div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ui-text-muted)]">
          <span>{{ row.timestamp }}</span>
          <PortalBadge color="neutral" variant="subtle" size="sm">{{ row.level || t('common.unknown') }}</PortalBadge>
          <span>{{ row.home_ip || t('logs.unknownHome') }} · {{ row.request_id || t('logs.noRequestId') }}</span>
          <AdminTableAction action="view" :label="t('logs.viewLogDetails')" @click="emit('detail', row)" />
        </div>
        <p class="whitespace-pre-wrap break-words font-mono text-xs">{{ row.line || '—' }}</p>
      </div>
    </div>
  </div>
</template>
