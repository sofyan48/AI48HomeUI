<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceDashboard } from '~/composables/workspace/useWorkspaceDashboard'
import { useWorkspaceClipboard } from '~/composables/workspace/common'

// Collapsible: the guide is secondary (returning users) and starts behind a toggle.
const props = defineProps<{ collapsible?: boolean }>()
const open = defineModel<boolean>('open', { default: true })

const { t } = usePortalI18n()
const { serverInfo } = useUserApi()
const { curlExample } = useWorkspaceDashboard()
const copyText = useWorkspaceClipboard()
const expanded = computed(() => !props.collapsible || open.value)
</script>

<template>
  <section class="dashboard-connect" :class="{ 'dashboard-connect--compact': collapsible }" aria-labelledby="connect-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <span class="dashboard-connect-icon"><AppIcon name="i-tabler-plug-connected" class="size-5" aria-hidden="true" /></span>
        <div class="min-w-0">
          <h2 id="connect-title" class="text-base font-semibold text-[var(--ui-text-highlighted)]">{{ collapsible ? t('ws.dashboard.guideTitle') : t('ws.dashboard.connectTitle') }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ collapsible ? t('ws.dashboard.guideSubtitle') : t('ws.dashboard.connectSubtitle') }}</p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <AppButton v-if="expanded" to="/app/models" size="xs" color="neutral" variant="ghost" class="rounded-full" trailing-icon="i-tabler-arrow-right">{{ t('ws.dashboard.findModel') }}</AppButton>
        <AppButton
          v-if="collapsible"
          type="button"
          size="xs"
          color="neutral"
          variant="outline"
          :trailing-icon="open ? 'i-tabler-chevron-up' : 'i-tabler-chevron-down'"
          aria-controls="connect-steps"
          :aria-expanded="open"
          @click="open = !open"
        >{{ open ? t('ws.dashboard.hideGuide') : t('ws.dashboard.showGuide') }}</AppButton>
      </div>
    </div>

    <ol v-show="expanded" id="connect-steps" class="dashboard-steps mt-5">
      <li class="dashboard-step">
        <span class="dashboard-step-index" aria-hidden="true">1</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.step1Title') }}</p>
          <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.step1Detail') }}</p>
        </div>
        <AppButton to="/app/api-keys" size="sm" icon="i-tabler-key" class="dashboard-primary-action shrink-0 rounded-full">{{ t('ws.dashboard.apiKeys') }}</AppButton>
      </li>
      <li class="dashboard-step">
        <span class="dashboard-step-index" aria-hidden="true">2</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.step2Title') }}</p>
          <div v-if="serverInfo.cpa_public_url" class="dashboard-endpoint-field mt-2">
            <code class="min-w-0 flex-1 truncate font-mono text-sm text-[var(--ui-text-highlighted)]" :title="serverInfo.cpa_public_url">{{ serverInfo.cpa_public_url }}</code>
            <AppButton type="button" size="xs" class="shrink-0" color="neutral" variant="soft" icon="i-tabler-copy" :aria-label="t('ws.dashboard.copyEndpoint')" @click="copyText(serverInfo.cpa_public_url, t('ws.dashboard.endpointCopied'))">{{ t('common.copy') }}</AppButton>
          </div>
          <p v-else class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.noEndpoint') }}</p>
        </div>
      </li>
      <li class="dashboard-step">
        <span class="dashboard-step-index" aria-hidden="true">3</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">{{ t('ws.dashboard.step3Title') }}</p>
          <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('ws.dashboard.step3Detail') }}</p>
          <div v-if="serverInfo.cpa_public_url" class="dashboard-code mt-2 overflow-hidden rounded-xl">
            <div class="flex items-center justify-between gap-2 border-b px-3 py-1.5">
              <span class="font-mono text-[11px] opacity-70">curl</span>
              <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" class="dashboard-code-copy" :aria-label="t('ws.dashboard.copyCurl')" @click="copyText(curlExample, t('ws.dashboard.exampleCopied'))">{{ t('common.copy') }}</AppButton>
            </div>
            <pre class="overflow-x-auto p-4 text-xs leading-6"><code class="font-mono">{{ curlExample }}</code></pre>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.dashboard-connect {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border: 1px solid var(--user-panel-border);
  border-radius: var(--user-panel-radius);
  background: var(--user-panel-bg);
  box-shadow: var(--user-panel-shadow);
}
.dashboard-connect--compact { padding-block: 1rem; }
.dashboard-connect-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: var(--user-inset-bg);
  color: var(--ui-text-muted);
}
.dashboard-steps { display: grid; gap: 0.25rem; }
.dashboard-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding-block: 0.75rem;
}
.dashboard-step:not(:last-child)::before {
  position: absolute;
  top: 2.5rem;
  bottom: -0.5rem;
  left: 0.8125rem;
  width: 2px;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--brand-from) 18%, var(--ui-border));
  content: '';
}
.dashboard-step-index {
  position: relative;
  z-index: 1;
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklch, var(--brand-from) 30%, var(--ui-border));
  border-radius: 9999px;
  background: var(--user-panel-bg);
  color: var(--ui-primary);
  font-size: 0.75rem;
  font-weight: 700;
}
.dashboard-endpoint-field {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.375rem 0.375rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
  background: var(--user-inset-bg);
}
.user-dashboard .dashboard-primary-action {
  background: var(--ui-primary);
  color: var(--ui-text-inverted);
  box-shadow: none;
}
.user-dashboard .dashboard-primary-action:hover { filter: brightness(1.06); }
.dashboard-code {
  border: 1px solid var(--color-zinc-800);
  background: var(--color-zinc-950);
  color: var(--color-zinc-200);
}
.dashboard-code > div { border-color: var(--color-zinc-800); color: var(--color-zinc-400); }
.dashboard-code :deep(.dashboard-code-copy) { color: var(--color-zinc-400); }
.dashboard-code :deep(.dashboard-code-copy:hover) { background: var(--color-zinc-800); color: white; }
</style>
