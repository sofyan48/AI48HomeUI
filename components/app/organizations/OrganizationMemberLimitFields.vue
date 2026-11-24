<script setup lang="ts">
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { memberLimitWindows, memberWindowModes, type MemberLimitRecord, type MemberLimitWindow, type MemberLimitsForm } from '~/composables/organizations/memberLimits'

// The parent owns the form; this component edits its limit drafts in place.
const props = defineProps<{ limits: MemberLimitsForm, organization?: MemberLimitRecord | null, disabled?: boolean }>()

const { t } = usePortalI18n()

const windowLabel = (window: MemberLimitWindow) => t(`org.limitWindow${window}`)
const modeLabel = (mode: string) => t(mode === 'first_use' ? 'org.modeFirstUse' : mode === 'calendar' ? 'org.modeCalendar' : 'org.modeSliding')
const modeItems = (window: MemberLimitWindow) => memberWindowModes(window).map(mode => ({ value: mode, label: modeLabel(mode) }))

// Shows the organization cap so owners keep member limits within it.
function capPlaceholder(window: MemberLimitWindow) {
  const cap = props.organization?.[`limit_${window}_credits`]
  return typeof cap === 'number' ? t('org.maxPlaceholder', { cap }) : '∞'
}
</script>

<template>
  <div class="grid gap-2">
    <div v-for="window in memberLimitWindows" :key="window" class="grid gap-3 rounded-2xl border border-[var(--ui-border)] p-3 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
      <span class="text-sm font-medium sm:pb-2">{{ windowLabel(window) }}</span>
      <PortalField :label="t('org.limitAmount')">
        <PortalInput v-model="limits[window].limit" inputmode="decimal" :placeholder="capPlaceholder(window)" class="w-full" :disabled="disabled" />
      </PortalField>
      <PortalField :label="t('org.limitMode')">
        <PortalSelect v-model="limits[window].mode" :items="modeItems(window)" class="w-full" :disabled="disabled" />
      </PortalField>
    </div>
  </div>
</template>
