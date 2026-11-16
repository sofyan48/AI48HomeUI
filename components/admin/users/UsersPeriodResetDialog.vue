<template>
  <AppFormModal
    v-model:open="open"
    :title="t('users.resetPeriodCounters')"
    :description="t('users.resetPeriodDescription', { name: user?.username || '' })"
    :error="formError"
    :submit-label="t('users.resetCounters')"
    :loading="saving"
    @submit="submit"
  >
    <div>
      <p class="mb-2 text-sm font-medium">{{ t('users.windowsToReset') }}</p>
      <div class="grid gap-2 sm:grid-cols-2">
        <label v-for="window in periodWindowIds" :key="window" class="flex items-center gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm">
          <AdminCheckbox :model-value="windows.has(window)" :disabled="saving" @update:model-value="toggleWindow(window)" />
          <span class="flex-1">{{ periodWindowLabel(window) }}</span>
          <span v-if="findPeriodWindow(periods, window)?.enabled" class="text-xs text-[var(--ui-text-muted)]">{{ t('users.enabledLower') }}</span>
        </label>
      </div>
    </div>
    <div>
      <p class="mb-2 text-sm font-medium">{{ t('users.resetMode') }}</p>
      <div class="grid gap-2">
        <label v-for="option in modeOptions" :key="option.value" class="flex items-start gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2">
          <input v-model="mode" type="radio" :value="option.value" class="mt-1">
          <span>
            <span class="text-sm font-medium">{{ option.label }}</span>
            <span class="block text-xs text-[var(--ui-text-muted)]">{{ option.hint }}</span>
          </span>
        </label>
      </div>
    </div>
  </AppFormModal>
</template>

<script setup lang="ts">
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import { computed, ref } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'
import { findPeriodWindow, periodWindowIds } from '~/composables/users/periods'

defineProps<{ periods: AnyRecord | null }>()
const emit = defineEmits<{ reset: [periods: AnyRecord | null] }>()

const { t, fetchAPI, toast, saving, errorMessage, periodWindowLabel, syncAll } = useUsersWorkspace()

const open = ref(false)
const user = ref<AnyRecord | null>(null)
const windows = ref(new Set<string>(periodWindowIds))
const mode = ref('counter')
const formError = ref('')

const modeOptions = computed(() => [
  { label: t('users.resetCounters'), value: 'counter', hint: t('users.resetCountersHint') },
  { label: t('users.resetWindowStartOnly'), value: 'window_only', hint: t('users.resetWindowStartOnlyHint') }
])

function openFor(target: AnyRecord) {
  user.value = target
  windows.value = new Set(periodWindowIds)
  mode.value = 'counter'
  formError.value = ''
  open.value = true
}

function toggleWindow(window: string) {
  const next = new Set(windows.value)
  if (next.has(window)) next.delete(window)
  else next.add(window)
  windows.value = next
}

async function submit() {
  if (!user.value) return
  if (!windows.value.size) {
    formError.value = t('users.selectAtLeastOneWindow')
    return
  }
  saving.value = true
  try {
    const response = await fetchAPI(`/users/${encodeURIComponent(user.value.id)}/period-limits/reset`, {
      method: 'POST',
      body: { windows: periodWindowIds.filter(id => windows.value.has(id)), mode: mode.value }
    })
    emit('reset', response?.limits || response || null)
    open.value = false
    await syncAll()
    toast.add({ title: t('users.periodCountersReset'), color: 'success' })
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    saving.value = false
  }
}

defineExpose({ openFor })
</script>
