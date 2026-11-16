<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { computed, ref } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { usePlaygroundWorkspace } from '~/composables/playground/usePlaygroundWorkspace'
import { groupConversations, type ConversationGroup } from '~/composables/playground/history'

const props = defineProps<{ collapsible?: boolean }>()
const emit = defineEmits<{ navigate: []; collapse: [] }>()
const { t } = usePortalI18n()
const {
  conversations, activeConversationId, sending, historyMode, historyLoading, historySyncError, openingId,
  newChat, openConversation, deleteConversation, clearHistory, reloadHistory
} = usePlaygroundWorkspace()

const search = ref('')
const clearOpen = ref(false)
const clearing = ref(false)
const groupLabels = computed<Record<ConversationGroup, string>>(() => ({
  today: t('playground.historyToday'),
  yesterday: t('playground.historyYesterday'),
  week: t('playground.historyWeek'),
  month: t('playground.historyMonth'),
  older: t('playground.historyOlder')
}))
const groups = computed(() => {
  const query = search.value.trim().toLowerCase()
  const matches = query
    // Server lists carry summaries only, so message text is searched once a chat has been opened.
    ? conversations.value.filter(item => item.title.toLowerCase().includes(query) || item.messages?.some(message => message.content.toLowerCase().includes(query)))
    : conversations.value
  return groupConversations(matches)
})

function startNew() {
  newChat()
  emit('navigate')
}
async function open(id: string) {
  emit('navigate')
  await openConversation(id)
}
async function confirmClear() {
  clearing.value = true
  const cleared = await clearHistory()
  clearing.value = false
  if (!cleared) return
  clearOpen.value = false
  search.value = ''
}
</script>

<template>
  <nav class="playground-history flex h-full min-h-0 flex-col" :aria-label="t('playground.historyTitle')">
    <div class="flex items-center gap-1.5 p-3 pb-2">
      <AppButton icon="i-tabler-edit" color="neutral" variant="outline" class="flex-1 justify-start rounded-xl" @click="startNew">{{ t('playground.newChat') }}</AppButton>
      <AppButton v-if="props.collapsible" icon="i-tabler-layout-sidebar-left-collapse" color="neutral" variant="ghost" :aria-label="t('playground.hideHistory')" :title="t('playground.hideHistory')" @click="emit('collapse')" />
    </div>
    <div v-if="conversations.length" class="px-3 pb-2">
      <PortalInput v-model="search" icon="i-tabler-search" size="sm" class="w-full" :placeholder="t('playground.historySearch')" :aria-label="t('playground.historySearch')" />
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2" :aria-busy="historyLoading">
      <div v-if="historySyncError" class="mx-1 mb-2 rounded-lg border border-[color-mix(in_oklch,var(--ui-error)_35%,var(--ui-border))] px-3 py-2 text-xs text-[var(--ui-error)]" role="alert">
        <p>{{ historySyncError }}</p>
        <button type="button" class="mt-1 font-medium underline underline-offset-2" @click="reloadHistory">{{ t('common.retry') }}</button>
      </div>
      <div v-if="historyLoading" class="space-y-1.5 px-1 pt-2">
        <PortalSkeleton v-for="index in 6" :key="index" class="h-8 w-full rounded-lg" />
      </div>
      <p v-else-if="!conversations.length" class="px-3 py-6 text-center text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('playground.historyEmpty') }}</p>
      <p v-else-if="!groups.length" class="px-3 py-6 text-center text-xs text-[var(--ui-text-muted)]">{{ t('playground.historyNoMatch') }}</p>
      <section v-for="group in groups" :key="group.key" class="mt-2 first:mt-0">
        <h3 class="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">{{ groupLabels[group.key] }}</h3>
        <ul class="space-y-0.5">
          <li v-for="item in group.items" :key="item.id" class="playground-history__item group" :class="{ 'is-active': item.id === activeConversationId }">
            <button type="button" class="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 text-left text-sm" :aria-current="item.id === activeConversationId ? 'page' : undefined" :aria-busy="openingId === item.id || undefined" :title="item.title" @click="open(item.id)">
              <span class="min-w-0 flex-1 truncate">{{ item.title || t('playground.untitled') }}</span>
              <AppIcon v-if="openingId === item.id" name="i-tabler-loader-2" class="size-3.5 shrink-0 animate-spin text-[var(--ui-text-muted)]" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="playground-history__delete"
              :disabled="sending && item.id === activeConversationId"
              :aria-label="`${t('playground.deleteChat')}: ${item.title}`"
              :title="t('playground.deleteChat')"
              @click="deleteConversation(item.id)"
            >
              <AppIcon name="i-tabler-trash" class="size-4" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <div class="border-t border-[var(--ui-border)] p-3">
      <p class="flex items-center gap-1.5 px-1 text-[11px] text-[var(--ui-text-muted)]">
        <AppIcon :name="historyMode === 'server' ? 'i-tabler-cloud' : 'i-tabler-lock'" class="size-3.5 shrink-0" aria-hidden="true" />
        {{ historyMode === 'server' ? t('playground.historyServer') : t('playground.historyLocal') }}
      </p>
      <AppButton v-if="conversations.length" icon="i-tabler-trash" color="neutral" variant="ghost" size="sm" class="mt-2 w-full justify-start" @click="clearOpen = true">{{ t('playground.clearHistory') }}</AppButton>
    </div>
  </nav>

  <AppModal v-model:open="clearOpen" :title="t('playground.clearHistoryTitle')" :description="historyMode === 'server' ? t('playground.clearHistoryServerDetail') : t('playground.clearHistoryDetail')">
    <template #body>
      <div class="flex justify-end gap-2">
        <AppButton color="neutral" variant="ghost" :disabled="clearing" @click="clearOpen = false">{{ t('common.cancel') }}</AppButton>
        <AppButton color="error" icon="i-tabler-trash" :loading="clearing" @click="confirmClear">{{ t('playground.clearHistory') }}</AppButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.playground-history__item {
  display: flex;
  align-items: center;
  border-radius: 0.625rem;
  color: var(--ui-text-toned);
  transition: background-color 120ms ease;
}
.playground-history__item:hover { background: var(--ui-bg-elevated); }
.playground-history__item.is-active { background: var(--user-selected); color: var(--ui-text-highlighted); font-weight: 500; }
.playground-history__item button:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: -2px; border-radius: 0.5rem; }
.playground-history__delete {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-right: 0.25rem;
  border-radius: 0.5rem;
  color: var(--ui-text-muted);
  opacity: 0;
}
.playground-history__item:hover .playground-history__delete,
.playground-history__item.is-active .playground-history__delete,
.playground-history__delete:focus-visible { opacity: 1; }
.playground-history__delete:hover { color: var(--ui-error); }
.playground-history__delete:disabled { opacity: 0.3; pointer-events: none; }
@media (hover: none) {
  .playground-history__delete { opacity: 1; }
}
</style>
