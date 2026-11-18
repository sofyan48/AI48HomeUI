<template>
  <AppCard>
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">{{ t('alerting.settings.title') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('alerting.settings.description') }}</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-medium">
          {{ t('alerting.settings.enabled') }}
          <AdminSwitch v-if="settingsDraft" v-model="settingsDraft.enabled" />
        </label>
      </div>
    </template>

    <form v-if="settingsDraft" class="space-y-5" @submit.prevent="saveSettings">
      <div class="grid items-start gap-4 sm:grid-cols-3">
        <AdminField :label="t('alerting.settings.interval')" :help="t('alerting.settings.intervalHelp')" :ui="{ container: 'min-h-10' }">
          <AdminInput v-model.number="settingsDraft.interval_seconds" type="number" min="15" max="3600" class="w-full" />
        </AdminField>
        <AdminField :label="t('alerting.settings.repeat')" :help="t('alerting.settings.repeatHelp')" :ui="{ container: 'min-h-10' }">
          <AdminInput v-model.number="settingsDraft.repeat_minutes" type="number" min="0" class="w-full" />
        </AdminField>
        <label class="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] p-3 sm:self-start sm:mt-10">
          <span class="text-sm font-medium">{{ t('alerting.settings.sendResolved') }}</span>
          <AdminSwitch v-model="settingsDraft.send_resolved" />
        </label>
      </div>

      <div class="divide-y divide-[var(--ui-border)] rounded-lg border border-[var(--ui-border)]">
        <div v-for="rule in rules" :key="rule.toggle" class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <AdminSwitch v-model="settingsDraft[rule.toggle]" :aria-label="rule.label" class="mt-0.5" />
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ rule.label }}</p>
              <p class="text-xs text-[var(--ui-text-muted)]">{{ rule.help }}</p>
            </div>
          </div>
          <div v-if="rule.threshold" class="flex shrink-0 items-center gap-2 sm:w-48">
            <AdminInput
              v-model.number="settingsDraft[rule.threshold]"
              type="number"
              :min="rule.min"
              :max="rule.max"
              :step="rule.step"
              :disabled="!settingsDraft[rule.toggle]"
              :aria-label="rule.label"
              class="w-24"
            />
            <span class="text-xs text-[var(--ui-text-muted)]">{{ rule.unit }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <AppButton color="neutral" variant="ghost" :disabled="savingSettings || !dirty" @click="resetSettings">{{ t('alerting.settings.reset') }}</AppButton>
        <AppButton type="submit" icon="i-tabler-check" :loading="savingSettings" :disabled="!dirty">{{ t('common.save') }}</AppButton>
      </div>
    </form>
    <div v-else class="py-8 text-center text-sm text-[var(--ui-text-muted)]">{{ t('alerting.loading') }}</div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import { useAlertingWorkspace } from '~/composables/alerting/useAlertingWorkspace'
import type { AlertSettings } from '~/composables/alerting/types'

type ToggleKey = 'credential_dead_enabled' | 'credential_refresh_enabled' | 'credential_cooldown_enabled' | 'quota_low_enabled' | 'node_offline_enabled'
type ThresholdKey = 'refresh_failure_minutes' | 'cooldown_minutes' | 'quota_threshold_percent' | 'node_offline_seconds'

interface RuleRow {
  toggle: ToggleKey
  label: string
  help: string
  threshold?: ThresholdKey
  unit?: string
  min?: number
  max?: number
  step?: number
}

const { t, settings, settingsDraft, savingSettings, saveSettings, resetSettings } = useAlertingWorkspace()

const rules = computed<RuleRow[]>(() => [
  { toggle: 'credential_dead_enabled', label: t('alerting.rule.credentialDead'), help: t('alerting.rule.credentialDeadHelp') },
  { toggle: 'credential_refresh_enabled', label: t('alerting.rule.credentialRefresh'), help: t('alerting.rule.credentialRefreshHelp'), threshold: 'refresh_failure_minutes', unit: t('alerting.unit.minutes'), min: 0 },
  { toggle: 'credential_cooldown_enabled', label: t('alerting.rule.credentialCooldown'), help: t('alerting.rule.credentialCooldownHelp'), threshold: 'cooldown_minutes', unit: t('alerting.unit.minutes'), min: 1 },
  { toggle: 'quota_low_enabled', label: t('alerting.rule.quotaLow'), help: t('alerting.rule.quotaLowHelp'), threshold: 'quota_threshold_percent', unit: '%', min: 1, max: 99, step: 1 },
  { toggle: 'node_offline_enabled', label: t('alerting.rule.nodeOffline'), help: t('alerting.rule.nodeOfflineHelp'), threshold: 'node_offline_seconds', unit: t('alerting.unit.seconds'), min: 10 },
])

const dirty = computed(() => {
  const current = settings.value
  const draft = settingsDraft.value
  if (!current || !draft) return false
  return (Object.keys(draft) as (keyof AlertSettings)[]).some(key => key !== 'updated_at' && draft[key] !== current[key])
})
</script>
