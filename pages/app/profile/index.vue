<template>
  <div class="user-profile mx-auto min-w-0 max-w-[80rem] space-y-5 py-3" :aria-busy="loading">
    <section class="profile-hero" aria-labelledby="profile-title">
      <div class="profile-cover" aria-hidden="true" />
      <div class="relative flex flex-wrap items-end justify-between gap-4 px-5 pb-5 sm:px-6">
        <div class="flex min-w-0 items-end gap-4">
          <span class="profile-avatar" aria-hidden="true">{{ (user?.username || '?').charAt(0).toUpperCase() }}</span>
          <div class="min-w-0 pb-1"><h1 id="profile-title" class="break-words text-xl font-bold tracking-tight text-[var(--ui-text-highlighted)]">{{ user?.username || t('profile.userFallback') }}</h1><p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">{{ t('profile.subtitle', { id: user?.id || '—' }) }}</p></div>
        </div>
        <div class="flex flex-wrap gap-2 pb-1">
          <ProfileEditDialog @saved="loadProfile" />
          <AppButton to="/app/settings" class="rounded-full" color="neutral" variant="outline" size="sm" icon="i-tabler-settings">{{ t('profile.settings') }}</AppButton>
          <AppButton class="rounded-full" color="neutral" variant="ghost" size="sm" icon="i-tabler-refresh" :loading="loading" :aria-label="t('profile.refreshAria')" @click="loadProfile">{{ t('common.refresh') }}</AppButton>
        </div>
      </div>
      <dl class="profile-stats" :aria-label="t('profile.summaryAria')">
        <div v-for="(stat, index) in stats" :key="stat.label" class="profile-stat min-w-0">
          <dt class="flex items-center gap-2 text-xs font-medium text-[var(--ui-text-muted)]"><AppIcon :name="profileStatIcons[index]" class="size-4 text-[var(--ui-primary)]" aria-hidden="true" />{{ stat.label }}</dt>
          <dd class="mt-1.5 break-words text-lg font-bold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">{{ stat.value }}</dd>
          <dd class="text-xs text-[var(--ui-text-dimmed)]">{{ stat.detail }}</dd>
        </div>
      </dl>
    </section>

    <PortalAlert v-if="error" color="error" variant="subtle" :title="t('profile.loadError')" :description="error" />

    <AppCard v-if="activePeriods.length" class="profile-panel"><template #header><div class="flex items-center gap-3"><span class="profile-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-gauge" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('profile.periodTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('profile.periodDescription') }}</p></div></div></template><div class="grid gap-x-6 gap-y-4 sm:grid-cols-2"><div v-for="window in activePeriods" :key="window.id" class="min-w-0"><div class="flex items-center justify-between"><span class="font-medium">{{ periodLabel(window.id) }}</span><span class="text-xs font-semibold">{{ percent(window) }}%</span></div><PortalProgress :model-value="percent(window)" class="mt-2" :aria-label="periodLabel(window.id)" /><p class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ t('profile.periodUsage', { used: credits(window.used), remaining: credits(window.remaining) }) }}</p></div></div></AppCard>


    <div class="grid items-start gap-5 lg:grid-cols-2">
      <AppCard class="profile-panel"><template #header><div class="flex items-center gap-3"><span class="profile-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-id" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('profile.accountTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('profile.accountDescription') }}</p></div></div></template><dl class="divide-y divide-[var(--ui-border)]/50"><div v-for="item in accountDetails" :key="item.label" class="grid min-w-0 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4"><dt class="text-xs font-medium text-[var(--ui-text-muted)]">{{ item.label }}</dt><dd class="min-w-0 break-words text-sm" :class="item.mono ? 'font-mono text-xs' : ''">{{ item.value }}</dd></div></dl></AppCard>
      <AppCard class="profile-panel"><template #header><div class="flex items-center gap-3"><span class="profile-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-shield-lock" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('profile.securityTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('profile.securityDescription') }}</p></div></div></template><div class="divide-y divide-[var(--ui-border)]/50"><div v-for="item in securityDetails" :key="item.label" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div class="min-w-0"><p class="text-sm font-medium">{{ item.label }}</p><p class="text-xs text-[var(--ui-text-muted)]">{{ item.detail }}</p></div><PortalBadge :color="item.enabled ? 'success' : 'neutral'" variant="subtle">{{ item.enabled ? t('profile.enabled') : t('profile.notEnabled') }}</PortalBadge></div></div><template #footer><div class="flex justify-end"><AppButton to="/app/settings" size="sm" color="neutral" variant="outline" icon="i-tabler-settings" class="rounded-xl">{{ t('profile.manageSecurity') }}</AppButton></div></template></AppCard>
    </div>


    <AppCard class="profile-panel" :ui="{ body: 'p-0' }">
      <template #header><div class="flex items-center gap-3"><span class="profile-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><AppIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">{{ t('profile.passkeysTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('profile.passkeysDescription') }}</p></div></div></template>
      <div class="overflow-x-auto">
        <PortalTable :data="user?.passkeys || []" :columns="passkeyColumns" :empty="t('profile.passkeysEmpty')" class="min-w-[560px]">
          <template #empty><Empty class="p-0 md:p-0"><EmptyHeader><EmptyDescription>{{ t('profile.passkeysEmpty') }}</EmptyDescription></EmptyHeader></Empty></template>
          <template #name-cell="{ row }"><span class="font-medium">{{ row.original.name || t('profile.unnamedPasskey') }}</span></template>
          <template #id-cell="{ row }"><span class="font-mono text-xs">{{ row.original.id }}</span></template>
          <template #created_at-cell="{ row }">{{ date(row.original.created_at) }}</template>
          <template #updated_at-cell="{ row }">{{ date(row.original.updated_at) }}</template>
        </PortalTable>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import ProfileEditDialog from '~/components/app/profile/ProfileEditDialog.vue'
import AppIcon from '~/components/AppIcon.vue'
import PortalProgress from '~/components/app/general/PortalProgress.vue'
import { Empty, EmptyDescription, EmptyHeader } from '~/components/ui/empty'
import PortalTable from '~/components/app/general/PortalTable.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
definePageMeta({ layout: 'app' })
const { t, intlLocale } = usePortalI18n()
const { currentUser: user, tokenExpiresAt, fetchAPI, loadCurrentUser, loadCapabilities } = useUserApi()
const loading = useWorkspaceState('user:profile:loading', () => false)
const error = useWorkspaceState('user:profile:error', () => '')
const keys = useWorkspaceState<any[]>('user:profile:keys', () => [])
const periodLimits = useWorkspaceState<any>('user:profile:period-limits', () => null)
const activePeriods = computed(() => (periodLimits.value?.windows || []).filter((window: any) => window.enabled && window.limit != null))
const passkeyColumns = computed(() => [
  { accessorKey: 'name', header: t('profile.col.name') },
  { accessorKey: 'id', header: t('profile.col.id') },
  { accessorKey: 'created_at', header: t('profile.col.created') },
  { accessorKey: 'updated_at', header: t('profile.col.updated') }
])
const profileStatIcons = ['i-tabler-wallet', 'i-tabler-key', 'i-tabler-fingerprint', 'i-tabler-clock']
const stats = computed(() => [
  { label: t('profile.stat.credits'), value: credits(user.value?.credits), detail: t('profile.stat.creditsDetail') },
  { label: t('profile.stat.apiKeys'), value: String(keys.value.length), detail: t('profile.stat.apiKeysDetail') },
  { label: t('profile.stat.passkeys'), value: String(user.value?.passkey_count || 0), detail: t('profile.stat.passkeysDetail') },
  { label: t('profile.stat.session'), value: date(tokenExpiresAt.value || undefined), detail: t('profile.stat.sessionDetail') }
])
const accountDetails = computed(() => [
  { label: t('profile.detail.userId'), value: user.value?.id || '—', mono: true }, { label: t('profile.detail.username'), value: user.value?.username || '—' },
  { label: t('profile.timezone'), value: user.value?.timezone || '—' },
  { label: t('profile.detail.created'), value: date(user.value?.created_at) }, { label: t('profile.detail.updated'), value: date(user.value?.updated_at) },
  { label: t('profile.detail.recoveryEmail'), value: user.value?.email_status.masked || t('profile.notConfigured') }, { label: t('profile.detail.emailVerification'), value: user.value?.email_status.verified ? t('profile.verified') : user.value?.email_status.configured ? t('profile.pending') : t('profile.notConfigured') }
])
const securityDetails = computed(() => [
  { label: t('profile.security.authenticator'), enabled: Boolean(user.value?.totp_enabled), detail: user.value?.totp_enabled ? t('profile.security.totpOn') : t('profile.security.totpOff') },
  { label: t('profile.security.passkeys'), enabled: Boolean(user.value?.passkey_count), detail: t('profile.security.passkeyCount', { count: user.value?.passkey_count || 0 }) },
  { label: t('profile.security.recoveryEmail'), enabled: Boolean(user.value?.email_status.verified), detail: user.value?.email_status.verified ? t('profile.security.emailOn') : t('profile.security.emailOff') }
])
async function loadProfile() {
  loading.value = true; error.value = ''
  try {
    const [, keyResponse, limits] = await Promise.all([loadCurrentUser(), fetchAPI<any>('/api-keys'), fetchAPI<any>('/period-limits').catch((cause: any) => cause?.statusCode === 404 ? null : Promise.reject(cause))])
    keys.value = Array.isArray(keyResponse) ? keyResponse : keyResponse?.api_keys || keyResponse?.['api-keys'] || keyResponse?.items || keyResponse?.data || []
    periodLimits.value = limits
    await loadCapabilities()
  } catch (cause: any) { error.value = cause?.message || t('profile.loadErrorFallback') }
  finally { loading.value = false }
}
function credits(value: unknown) { const number = Number(value); return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2, roundingMode: 'ceil' } as Intl.NumberFormatOptions).format(Number.isFinite(number) ? number : 0) }
function date(value?: string) { if (!value) return '—'; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed) : '—' }
function periodLabel(id: string) { return id === '5h' ? t('profile.period.5h') : id === '1d' ? t('profile.period.1d') : id === '7d' ? t('profile.period.7d') : id === '30d' ? t('profile.period.30d') : id }
function percent(window: any) { const limit = Number(window.limit); return limit > 0 ? Math.round(Math.max(0, Math.min(1, Number(window.used || 0) / limit)) * 100) : 100 }
onMounted(loadProfile)
</script>

<style scoped>
.profile-icon { color: var(--ui-primary); background: var(--user-selected); }
.profile-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--user-panel-border);
  border-radius: 1.25rem;
  background: var(--user-panel-bg);
  box-shadow: var(--user-panel-shadow);
}
.profile-cover {
  height: 6rem;
  background:
    radial-gradient(circle at 20% 120%, color-mix(in oklch, white 22%, transparent), transparent 45%),
    var(--brand-gradient);
}
.profile-avatar {
  display: flex;
  width: 4.5rem;
  height: 4.5rem;
  flex-shrink: 0;
  margin-top: -2.25rem;
  align-items: center;
  justify-content: center;
  border: 4px solid var(--user-panel-bg);
  border-radius: 1.25rem;
  background: var(--brand-gradient);
  color: white;
  font-size: 1.75rem;
  font-weight: 800;
  box-shadow: 0 8px 20px -8px color-mix(in oklch, var(--brand-from) 60%, transparent);
}
.profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--ui-border);
}
.profile-stat { padding: 1rem 1.25rem; }
.profile-stat:nth-child(odd) { border-right: 1px solid var(--ui-border); }
.profile-stat:nth-child(-n + 2) { border-bottom: 1px solid var(--ui-border); }
@media (min-width: 1024px) {
  .profile-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .profile-stat { border-bottom: 0 !important; }
  .profile-stat:not(:last-child) { border-right: 1px solid var(--ui-border); }
  .profile-stat { padding-inline: 1.5rem; }
}
</style>
