<template>
    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('billing.requestFailed')"
      :description="pageError"
    />

    <div class="flex items-end justify-between gap-3 border-b border-[var(--ui-border)]">
      <AppPanelTabs v-model="activeSection" :items="sections" :label="t('billing.sectionsLabel')" class="!border-b-0" />
      <div class="flex shrink-0 items-center gap-1 pb-1.5">
        <span class="hidden items-center gap-1 text-xs text-[var(--ui-text-muted)] md:inline-flex" :title="t('billing.timezoneHint')"><UIcon name="i-tabler-world" class="size-3.5" />{{ savedReportTimezone }}</span>
        <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-refresh" :aria-label="t('common.refresh')" :title="t('common.refresh')" :loading="loading" @click="refreshCurrent" />
        <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-settings" :aria-label="t('billing.settings')" :title="t('billing.settings')" :loading="settingsLoading" :disabled="settingsLoading || settingsSaving" @click="openMatchingSettings" />
      </div>
    </div>

</template>

<script setup lang="ts">
import { useBillingWorkspace } from "~/composables/billing/useBillingWorkspace"
const { t, pageError, activeSection, sections, savedReportTimezone, loading, refreshCurrent, settingsLoading, settingsSaving, openMatchingSettings } = useBillingWorkspace()
</script>
