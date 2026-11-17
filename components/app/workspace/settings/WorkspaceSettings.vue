<script setup lang="ts">
import AppPanelTabs from '~/components/AppPanelTabs.vue'
import { computed, ref } from 'vue'

import { usePortalI18n } from '~/composables/usePortalI18n'

import WorkspaceAccountPanels from './WorkspaceAccountPanels.vue'
import WorkspaceTOTPPanel from './WorkspaceTOTPPanel.vue'
import WorkspacePasskeysPanel from './WorkspacePasskeysPanel.vue'

const { t } = usePortalI18n()

const settingsSections = computed(() => [
  { value: 'settings-password', label: t('ws.settings.password'), icon: 'i-tabler-lock' },
  { value: 'settings-email', label: t('ws.settings.recoveryEmail'), icon: 'i-tabler-mail' },
  { value: 'settings-totp', label: t('ws.settings.authenticator'), icon: 'i-tabler-device-mobile' },
  { value: 'settings-passkeys', label: t('ws.settings.passkeys'), icon: 'i-tabler-fingerprint' }
])
const activeSection = ref('settings-password')
</script>

<template>
  <section class="workspace-settings min-w-0 space-y-5" aria-labelledby="security-title">
    <AppCard :ui="{ body: 'flex flex-wrap items-center justify-between gap-3' }">
      <div>
        <h1 id="security-title" class="text-base font-semibold tracking-tight">{{ t('ws.settings.title') }}</h1>
        <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('ws.settings.subtitle') }}</p>
      </div>
      <AppButton to="/app/profile" color="neutral" variant="ghost" size="sm" class="rounded-full" trailing-icon="i-tabler-arrow-right">{{ t('ws.settings.viewProfile') }}</AppButton>
    </AppCard>
    <AppPanelTabs v-model="activeSection" :items="settingsSections" :label="t('ws.settings.navAria')" />
    <div class="min-w-0">
      <WorkspaceAccountPanels :section="activeSection" />
      <WorkspaceTOTPPanel v-show="activeSection === 'settings-totp'" />
      <WorkspacePasskeysPanel v-show="activeSection === 'settings-passkeys'" />
    </div>
  </section>
</template>

<style scoped>
.workspace-settings { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-settings :deep(.settings-panel h2) { font-size: 1rem; letter-spacing: -0.02em; }

.workspace-settings :deep(.settings-icon) { border-radius: 0.625rem; }
.workspace-settings :deep(.settings-panel [data-slot="header"]) {
  border-bottom: 0;
  padding: 1.5rem 1.5rem 0;
}
.workspace-settings :deep(.settings-panel [data-slot="body"]) {
  padding: 1.25rem 1.5rem 1.5rem;
}
.workspace-settings :deep(.settings-passkeys [data-slot="body"]) { padding: 0; }
.workspace-settings :deep(.settings-passkey-form) { padding: 1.25rem 1.5rem; }
.workspace-settings :deep(.settings-passkey-empty) { padding: 0 1.5rem 1.5rem; }
@media (min-width: 640px) {
  .workspace-settings :deep(.settings-panel [data-slot="header"]) { padding: 1.75rem 1.75rem 0; }
  .workspace-settings :deep(.settings-panel [data-slot="body"]) { padding: 1.5rem 1.75rem 1.75rem; }
  .workspace-settings :deep(.settings-passkeys [data-slot="body"]) { padding: 0; }
  .workspace-settings :deep(.settings-passkey-form) { padding: 1.5rem 1.75rem; }
  .workspace-settings :deep(.settings-passkey-empty) { padding: 0 1.75rem 1.75rem; }
}
.workspace-settings :deep(.settings-icon) {
  color: var(--ui-primary);
  background: var(--user-selected);
}
.workspace-settings :deep(.settings-setup) {
  border-color: color-mix(in oklch, var(--ui-primary) 18%, var(--ui-border));
  background: color-mix(in oklch, var(--ui-primary) 4%, var(--ui-bg));
}
</style>
