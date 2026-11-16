<template>
  <div class="grid gap-3 rounded-md border border-[var(--ui-border)] p-4">
    <div>
      <h3 class="text-sm font-semibold">{{ t('users.periodLimits') }}</h3>
      <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.periodLimitsHint') }}</p>
    </div>
    <div class="flex items-center justify-between gap-3 rounded-md border border-[var(--ui-border)] px-3 py-2.5">
      <div>
        <p class="text-sm font-medium">{{ t('users.unlimitedBalance') }}</p>
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.unlimitedBalanceHint') }}</p>
      </div>
      <AdminSwitch v-model="form.credits_unlimited" :disabled="disabled" />
    </div>
    <div v-for="window in periodWindowIds" :key="window" class="grid gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2.5">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{{ periodWindowLabel(window) }}</span>
        <AdminSwitch v-model="form.periods[window].enabled" :disabled="disabled" />
      </div>
      <div v-if="form.periods[window].enabled" class="grid gap-3 sm:grid-cols-2">
        <AdminField :label="t('users.creditsLimit')">
          <AdminInput v-model="form.periods[window].limit" type="text" inputmode="decimal" class="w-full" />
        </AdminField>
        <AdminField :label="t('users.windowMode')">
          <AdminSelect v-model="form.periods[window].mode" :items="periodModeOptions(window)" value-key="value" label-key="label" class="w-full" />
        </AdminField>
      </div>
      <p
        v-if="form.periods[window].enabled && parseLocalizedNumber(form.periods[window].limit) === 0"
        class="text-xs text-amber-600 dark:text-amber-400"
      >
        {{ t('users.zeroLimitWarning') }}
      </p>
      <div
        v-if="window === '7d' && form.periods[window].enabled && form.periods[window].mode === 'calendar'"
        class="grid gap-3 sm:grid-cols-2"
      >
        <AdminField :label="t('users.weekStartsOn')">
          <AdminSelect v-model="form.week_reset_day" :items="weekDayOptions" value-key="value" label-key="label" class="w-full" />
        </AdminField>
        <AdminField :label="t('users.weekStartHour')">
          <AdminInput v-model="form.week_reset_hour" type="number" min="0" max="23" step="1" class="w-full" />
        </AdminField>
      </div>
    </div>
    <AdminField :label="t('users.timezone')">
      <AdminInputMenu v-model="form.timezone" :items="timezoneOptions" class="w-full" :search-input="{ placeholder: t('users.searchTimezones') }" />
      <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.timezoneHint') }}</p>
    </AdminField>
  </div>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInputMenu from '~/components/admin/general/controls/AdminInputMenu.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import { computed } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { parseLocalizedNumber } from '~/composables/users/common'
import { periodWindowIds, timezoneOptions, type UserForm } from '~/composables/users/periods'

// The parent owns the form object; this component edits its period fields in place.
defineProps<{ form: UserForm; disabled?: boolean }>()

const { t, periodWindowLabel, periodModeLabel } = useUsersWorkspace()

const weekDayOptions = computed(() => [
  t('users.monday'), t('users.tuesday'), t('users.wednesday'), t('users.thursday'),
  t('users.friday'), t('users.saturday'), t('users.sunday')
].map((label, index) => ({ label, value: index + 1 })))

const periodModeOptions = (id: string) =>
  (id === '5h' ? ['first_use', 'sliding'] : ['first_use', 'sliding', 'calendar'])
    .map(value => ({ value, label: periodModeLabel(value) }))
</script>
