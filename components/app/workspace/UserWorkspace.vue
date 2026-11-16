<template>
  <div :class="section === 'dashboard' ? 'user-dashboard space-y-5' : 'space-y-8'">
    <UAlert v-if="pageError" color="error" variant="subtle" icon="i-tabler-alert-triangle" :title="t('ws.pageError')" :description="pageError" />
    <WorkspaceDashboard v-if="section === 'dashboard'" />
    <WorkspaceBilling v-if="section === 'billing'">
      <template #balance-history><slot name="balance-history" /></template>
    </WorkspaceBilling>
    <WorkspaceKeys v-if="section === 'api-keys'" />
    <WorkspaceSettings v-if="section === 'settings'" />
    <WorkspaceKeyDialogs />
    <WorkspaceSecurityDialogs />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { errorMessage } from '~/composables/workspace/common'
import { provideWorkspaceBilling } from '~/composables/workspace/useWorkspaceBilling'
import { provideWorkspaceDashboard } from '~/composables/workspace/useWorkspaceDashboard'
import { provideWorkspaceKeys } from '~/composables/workspace/useWorkspaceKeys'
import { provideWorkspaceAccount } from '~/composables/workspace/useWorkspaceAccount'
import { provideWorkspaceTOTP } from '~/composables/workspace/useWorkspaceTOTP'
import { provideWorkspacePasskeys } from '~/composables/workspace/useWorkspacePasskeys'
import WorkspaceDashboard from './dashboard/WorkspaceDashboard.vue'
import WorkspaceBilling from './billing/WorkspaceBilling.vue'
import WorkspaceKeys from './keys/WorkspaceKeys.vue'
import WorkspaceKeyDialogs from './keys/WorkspaceKeyDialogs.vue'
import WorkspaceSettings from './settings/WorkspaceSettings.vue'
import WorkspaceSecurityDialogs from './settings/WorkspaceSecurityDialogs.vue'

const props = withDefaults(defineProps<{ section?: 'dashboard' | 'api-keys' | 'settings' | 'billing' }>(), { section: 'dashboard' })
const section = computed(() => props.section)
const { t } = usePortalI18n()
const { loadCapabilities, loadCurrentUser } = useUserApi()
const pageError = useWorkspaceState('user:workspace:page-error', () => '')
// Keep every state owner in this scope, including forms for temporarily hidden sections.
const { loadBilling, loadDashboardBilling } = provideWorkspaceBilling(section)
const { loadPeriodLimits } = provideWorkspaceDashboard()
const { loadKeys } = provideWorkspaceKeys()
const { email } = provideWorkspaceAccount()
provideWorkspaceTOTP()
provideWorkspacePasskeys()

async function loadWorkspace() {
  pageError.value = ''
  const tasks: Promise<unknown>[] = []
  if (section.value === 'billing') tasks.push(loadBilling())
  else {
    tasks.push(loadCapabilities(), loadCurrentUser())
    if (section.value === 'api-keys') tasks.push(loadKeys())
    if (section.value === 'dashboard') tasks.push(loadPeriodLimits(), loadDashboardBilling())
  }
  const results = await Promise.allSettled(tasks)
  const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
  if (failures.length) pageError.value = failures.map(result => errorMessage(result.reason, t('ws.loadFailed'))).join(' · ')
  email.value = ''
}
onMounted(() => { void loadWorkspace() })
</script>

<style scoped>
.user-dashboard {
  --dashboard-accent: var(--ui-primary);
  max-width: 80rem;
  margin-inline: auto;
  padding-block: 0.25rem 1rem;
}
</style>
