<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { computed } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import WorkspaceAccountPanels from './WorkspaceAccountPanels.vue'
import WorkspaceTOTPPanel from './WorkspaceTOTPPanel.vue'
import WorkspacePasskeysPanel from './WorkspacePasskeysPanel.vue'

const { t } = usePortalI18n()
const { currentUser: user } = useUserApi()
const settingsSections = computed(() => [
  { id: 'settings-password', label: t('ws.settings.password'), icon: 'i-tabler-lock', done: true },
  { id: 'settings-email', label: t('ws.settings.recoveryEmail'), icon: 'i-tabler-mail', done: Boolean(user.value?.email_status?.verified) },
  { id: 'settings-totp', label: t('ws.settings.authenticator'), icon: 'i-tabler-device-mobile', done: Boolean(user.value?.totp_enabled) },
  { id: 'settings-passkeys', label: t('ws.settings.passkeys'), icon: 'i-tabler-fingerprint', done: Boolean(user.value?.passkey_count) }
])
function scrollToSection(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
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
    <div class="settings-layout">
      <nav class="settings-nav" :aria-label="t('ws.settings.navAria')">
        <a v-for="item in settingsSections" :key="item.id" :href="`#${item.id}`" class="settings-nav-link" @click.prevent="scrollToSection(item.id)">
          <AppIcon :name="item.icon" class="size-4 shrink-0" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <span class="settings-nav-dot" :class="item.done ? 'settings-nav-dot--on' : ''" :title="item.done ? t('ws.settings.configured') : t('ws.settings.notConfigured')" />
        </a>
      </nav>
      <div class="min-w-0 space-y-4">
        <WorkspaceAccountPanels />
        <WorkspaceTOTPPanel />
        <WorkspacePasskeysPanel />
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace-settings { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-settings :deep(.settings-panel h2) { font-size: 1rem; letter-spacing: -0.02em; }
.workspace-settings :deep(.settings-panel) { scroll-margin-top: 1rem; }
.settings-layout { display: grid; gap: 1rem; }
.settings-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0.25rem;
  border: 1px solid var(--user-panel-border);
  border-radius: 0.875rem;
  background: var(--user-panel-bg);
  box-shadow: var(--user-panel-shadow);
}
.settings-nav-link {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 120ms ease, color 120ms ease;
}
.settings-nav-link:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.settings-nav-link:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
.settings-nav-dot { width: 0.5rem; height: 0.5rem; flex-shrink: 0; border-radius: 9999px; background: var(--ui-border-accented); }
.settings-nav-dot--on { background: var(--ui-success); box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-success) 20%, transparent); }
@media (min-width: 1024px) {
  .settings-layout { grid-template-columns: 15rem minmax(0, 1fr); align-items: start; }
  .settings-nav { position: sticky; top: 0; flex-direction: column; overflow: visible; padding: 0.375rem; }
}
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
