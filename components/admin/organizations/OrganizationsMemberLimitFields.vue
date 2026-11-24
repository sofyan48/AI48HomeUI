<template>
  <div class="grid gap-2">
    <div>
      <p class="text-sm font-medium">{{ t('organizations.member.limitsTitle') }}</p>
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('organizations.member.limitHelp') }}</p>
    </div>
    <div v-for="window in memberLimitWindows" :key="window" class="grid gap-3 rounded-md border border-[var(--ui-border)] px-3 py-2.5 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
      <span class="text-sm font-medium sm:pb-2">{{ t(`organizations.member.window${window}`) }}</span>
      <AdminField :label="t('organizations.member.creditsLimit')">
        <AdminInput v-model="limits[window].limit" inputmode="decimal" class="w-full" :placeholder="capPlaceholder(window)" :disabled="disabled" />
      </AdminField>
      <AdminField :label="t('organizations.member.windowMode')">
        <AdminSelect v-model="limits[window].mode" :items="modeItems(window)" class="w-full" :disabled="disabled" />
      </AdminField>
    </div>
  </div>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import { useAdminI18n } from '#imports'
import { memberLimitWindows, memberWindowModes, type MemberLimitRecord, type MemberLimitWindow, type MemberLimitsForm } from '~/composables/organizations/memberLimits'

// The parent owns the form; this component edits its limit drafts in place.
const props = defineProps<{ limits: MemberLimitsForm, organization?: MemberLimitRecord | null, disabled?: boolean }>()

const { t } = useAdminI18n()

const modeItems = (window: MemberLimitWindow) =>
  memberWindowModes(window).map(mode => ({ value: mode, label: t(`organizations.member.mode.${mode}`) }))

// Shows the organization cap so owners can keep member limits within it.
function capPlaceholder(window: MemberLimitWindow) {
  const cap = props.organization?.[`limit_${window}_credits`]
  return typeof cap === 'number' ? t('organizations.member.maxPlaceholder', { cap }) : '∞'
}
</script>
