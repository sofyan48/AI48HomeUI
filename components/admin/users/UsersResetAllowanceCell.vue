<template>
  <div class="min-w-0">
    <p class="tabular-nums">
      {{ t('users.resetsAvailable', { count: allowance.available }) }}
      <span class="text-xs text-[var(--ui-text-muted)]">· {{ monthly ? t('users.perMonth', { count: allowance.amount }) : t('users.oneTimeLower') }}</span>
    </p>
    <p v-if="nextDate" class="truncate text-xs text-[var(--ui-text-muted)]" :title="formatDate(nextDate)">
      {{ monthly ? t('users.renews') : t('users.expires') }} {{ formatDate(nextDate) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'

const props = defineProps<{ allowance: AnyRecord }>()
const { t, formatDate } = useUsersWorkspace()

const monthly = computed(() => props.allowance.mode === 'monthly')
const nextDate = computed(() => props.allowance.renews_at || props.allowance.expires_at)
</script>
