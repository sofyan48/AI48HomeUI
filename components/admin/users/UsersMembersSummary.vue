<template>
  <section class="members" :aria-label="t('users.summaryAria')" :aria-busy="loading && !users.length">
    <div class="members__lead">
      <span class="members__icon" aria-hidden="true"><UIcon name="i-tabler-users" class="size-4" /></span>
      <div class="min-w-0">
        <p class="members__count">{{ loading && !users.length ? '—' : compactNumber(liveUsers.length) }}<span> {{ t('users.membersSuffix') }}</span></p>
        <p class="truncate text-[11px] text-[var(--ui-text-muted)]">
          {{ t('users.membersSummary', { credits: formatCredits(totalCredits), keys: compactNumber(keys.length), unassigned: compactNumber(unassignedKeyCount) }) }}
        </p>
      </div>
    </div>
    <div class="members__segments" role="group" :aria-label="t('users.filterByStatus')">
      <button
        v-for="segment in segments"
        :key="segment.value"
        type="button"
        class="members__segment"
        :class="[`members__segment--${segment.tone}`, { 'members__segment--active': userSegment === segment.value }]"
        :aria-pressed="userSegment === segment.value"
        :disabled="segment.value !== 'all' && !segment.count"
        @click="select(segment.value)"
      >
        <span class="members__dot" aria-hidden="true" />
        <span>{{ segment.label }}</span>
        <strong class="tabular-nums">{{ compactNumber(segment.count) }}</strong>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { useUserSegments } from '~/composables/users/useUserSegments'

const { t, loading, users, keys, activeTab, userSegment, compactNumber, formatCredits } = useUsersWorkspace()
const { segments } = useUserSegments()

const liveUsers = computed(() => users.value.filter(user => !user.deleted_at))
const totalCredits = computed(() => liveUsers.value.reduce((sum, user) => sum + (Number(user.credits) || 0), 0))
const unassignedKeyCount = computed(() => keys.value.filter(key => key.user_id == null || Number(key.user_id) === 0).length)

function select(value: string) {
  userSegment.value = value
  activeTab.value = 'users'
}
</script>

<style scoped>
/* Users signature: compact lead plus status segments that double as table filters.
   Fixed-size content, so it stays the same with ten users or ten thousand. */
.members {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--page-accent) 6%, transparent), transparent 55%),
    var(--admin-panel-bg);
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
.members__lead { display: flex; min-width: 0; align-items: center; gap: 0.75rem; }
.members__icon { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.625rem; background: color-mix(in oklch, var(--page-accent) 12%, transparent); color: var(--page-accent); }
.members__count { font-size: 1.1875rem; line-height: 1.5rem; font-weight: 650; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--ui-text-highlighted); }
.members__count span { font-size: 0.8125rem; font-weight: 500; letter-spacing: normal; color: var(--ui-text-muted); }
.members__segments { display: flex; min-width: 0; flex-wrap: wrap; gap: 0.375rem; }
.members__segment {
  --seg: var(--color-zinc-400);
  display: inline-flex;
  min-height: 2rem !important;
  align-items: center;
  gap: 0.375rem;
  padding: 0 0.75rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 9999px !important;
  background: var(--admin-panel-bg);
  font-size: 0.75rem;
  color: var(--ui-text-toned);
  transition: background-color 140ms ease, border-color 140ms ease;
}
.members__segment strong { color: var(--ui-text-highlighted); }
.members__segment--emerald { --seg: var(--color-emerald-500); }
.members__segment--amber { --seg: var(--color-amber-500); }
.members__segment--blue { --seg: var(--color-blue-500); }
.members__segment--rose { --seg: var(--color-rose-500); }
.members__dot { width: 0.4375rem; height: 0.4375rem; border-radius: 9999px; background: var(--seg); }
.members__segment:hover:not(:disabled) { border-color: color-mix(in oklch, var(--seg) 45%, var(--admin-panel-border)); }
.members__segment:disabled { opacity: 0.5; cursor: default; }
.members__segment--active {
  border-color: color-mix(in oklch, var(--seg) 55%, transparent);
  background: color-mix(in oklch, var(--seg) 12%, var(--admin-panel-bg));
}
.members__segment:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .members__segment { transition: none; } }
</style>
