<template>
  <div class="balance-workspace min-w-0 space-y-6">
    <PortalAlert v-if="pageError" color="error" variant="subtle" :title="t('balance.loadError')" :description="pageError" />

    <div class="balance-wallet-grid">
    <section class="balance-hero min-w-0" aria-labelledby="balance-title">
      <div class="min-w-0">
        <p class="flex items-center gap-2 text-xs font-medium text-[var(--ui-text-muted)]"><AppIcon name="i-tabler-wallet" class="size-4 text-[var(--ui-success)]" aria-hidden="true" /> {{ t('balance.accountCredits') }}</p>
        <h1 id="balance-title" class="mt-2 text-xl font-semibold tracking-tight text-[var(--ui-text-highlighted)]">{{ t('balance.title') }}</h1>

      </div>
      <dl class="balance-totals min-w-0" :aria-busy="loading">
        <div v-for="(metric, index) in metrics" :key="metric.label" class="balance-summary min-w-0">
          <dt class="flex items-center gap-2 text-xs font-medium text-[var(--ui-text-muted)]"><AppIcon :name="index === 0 ? 'i-tabler-wallet' : 'i-tabler-arrow-down-left'" class="size-4 text-[var(--ui-success)]" aria-hidden="true" />{{ metric.label }}</dt>
          <dd class="mt-3 break-words text-3xl font-semibold tracking-tight tabular-nums text-[var(--ui-text-highlighted)]">{{ loading ? '—' : metric.value }}<span class="ml-1 text-xs font-normal tracking-normal text-[var(--ui-text-muted)]">{{ t('balance.creditsUnit') }}</span></dd>
          <dd class="mt-2 text-xs text-[var(--ui-text-muted)]">{{ metric.detail }}</dd>
        </div>
      </dl>
    </section>

    <section class="balance-topup min-w-0" aria-labelledby="topup-title">
      <h2 id="topup-title" class="flex items-center gap-2.5 text-lg font-semibold tracking-tight"><span class="balance-icon flex size-8 items-center justify-center rounded-lg"><AppIcon name="i-tabler-circle-plus" class="size-4" aria-hidden="true" /></span>{{ t('balance.addCredits') }}</h2>
      <p class="mt-2 mb-6 text-sm leading-relaxed text-[var(--ui-text-muted)]">{{ topupApprovalEnabled ? t('balance.topupHintApproval') : t('balance.topupHint') }}</p>
      <div class="min-w-0 space-y-3">

        <form class="space-y-4" @submit.prevent="recharge">
          <PortalAlert v-if="pendingTopup" color="warning" variant="subtle" icon="i-tabler-clock" :title="t('balance.pendingTitle')" :description="t('balance.pendingDescription', { amount: formatCredits(pendingTopup.amount) })" />

          <PortalAlert v-if="rechargeError" color="error" variant="subtle" :title="t('balance.rechargeFailed')" :description="rechargeError" />

          <PortalField :label="t('balance.amountLabel')" required>
            <div class="flex flex-col gap-4">
              <PortalInput v-model="amount" type="number" min="0" step="any" :placeholder="t('balance.amountPlaceholder')" size="xl" class="w-full" :disabled="saving || loading || !requestStateLoaded || !!pendingTopup" required />
              <div class="flex flex-wrap gap-2" role="group" :aria-label="t('balance.quickAmounts')">
                <button v-for="preset in amountPresets" :key="preset" type="button" class="balance-preset" :class="{ 'balance-preset--active': Number(amount) === preset }" :disabled="saving || loading || !requestStateLoaded || !!pendingTopup" @click="amount = String(preset)">{{ formatCredits(preset) }}</button>
              </div>
              <AppButton type="submit" icon="i-tabler-plus" size="lg" class="justify-center rounded-full" :loading="saving" :disabled="!validAmount || !token || loading || !requestStateLoaded || !!pendingTopup">{{ topupApprovalEnabled ? t('balance.requestTopup') : t('balance.topup') }} {{ validAmount ? formatCredits(Number(amount)) : '' }}</AppButton>
            </div>
          </PortalField>
          <AppButton v-if="pendingTopup || !requestStateLoaded" type="button" color="neutral" variant="outline" icon="i-tabler-refresh" :loading="loading" :disabled="saving" @click="refresh">{{ t('balance.refreshStatus') }}</AppButton>
        </form>
      </div>
    </section>
    </div>
    <AppUserWorkspace section="billing" class="min-w-0">
      <template #balance-history>
      <AppCard class="balance-panel flex min-w-0 flex-col overflow-hidden" :ui="{ header: 'min-h-24', body: 'flex-1 p-0' }">
      <template #header>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div><h2 class="flex items-center gap-2 text-sm font-semibold"><AppIcon name="i-tabler-history" class="size-4 text-[var(--ui-primary)]" aria-hidden="true" /> {{ t('balance.historyTitle') }}</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ t('balance.historyCount', { count: formatNumber(recordsTotal) }) }}</p></div>

              </div>
            </template>
      <div class="min-h-64 overflow-x-auto">
        <PortalTable :data="records" :columns="recordColumns" :loading="loading || recordsLoading" :number-offset="(recordPage - 1) * pageSize" :empty="t('balance.empty')" class="min-w-[720px]">
          <template #created_at-cell="{ row }">{{ formatDate(balanceRow(row).created_at) }}</template>
          <template #type-cell="{ row }"><PortalBadge :color="balanceRow(row).type === 'recharge' ? 'success' : 'warning'" variant="subtle">{{ typeLabel(balanceRow(row).type) }}</PortalBadge></template>
          <template #amount-cell="{ row }"><span class="font-mono font-semibold">{{ balanceRow(row).type === 'recharge' ? '+' : '−' }}{{ formatCredits(balanceRow(row).amount) }}</span></template>
          <template #balance_before-cell="{ row }">{{ formatCredits(balanceRow(row).balance_before) }}</template>
          <template #balance_after-cell="{ row }">{{ formatCredits(balanceRow(row).balance_after) }}</template>
        </PortalTable>
      </div>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div class="flex flex-wrap items-center gap-3">
            <PortalField :label="t('balance.rowsPerPage')" orientation="horizontal" class="w-auto shrink-0" :ui="{ container: 'shrink-0', label: 'whitespace-nowrap' }">
              <PortalSelect v-model="pageSize" :items="pageSizeOptions" value-key="value" label-key="label" class="w-20 shrink-0" :disabled="busy" @update:model-value="changeRecordPageSize" />
            </PortalField>
            <span class="text-[var(--ui-text-muted)]">{{ t('balance.showing', { start: recordRangeStart, end: recordRangeEnd, total: formatNumber(recordsTotal) }) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <AppButton size="sm" color="neutral" variant="outline" :disabled="recordPage <= 1 || busy" @click="changeRecordPage(-1)">{{ t('balance.previous') }}</AppButton>
            <span>{{ t('balance.pageOf', { page: recordPage, pages: recordPages }) }}</span>
            <AppButton size="sm" color="neutral" variant="outline" :disabled="recordPage >= recordPages || busy" @click="changeRecordPage(1)">{{ t('balance.next') }}</AppButton>
          </div>
        </div>
      </template>
      </AppCard>
      </template>
    </AppUserWorkspace>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import PortalTable from '~/components/app/general/PortalTable.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import PortalSelect from '~/components/app/general/PortalSelect.vue'
import AppUserWorkspace from '~/components/app/workspace/UserWorkspace.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { usePortalToast } from '~/composables/portal/usePortalToast'
import type { BillingBalanceRecord, BillingOverview, BillingRechargeRequest } from '~/stores/userSession'

definePageMeta({ layout: 'app' })
const { t, intlLocale } = usePortalI18n()
const { currentUser, token, hydrateSession, fetchAPI, loadCurrentUser, capabilities, loadCapabilities } = useUserApi()
const topupApprovalEnabled = computed(() => capabilities.value.topup_approval === true)
const requestStateLoaded = useWorkspaceState('user:balance:request-state-loaded', () => false)
const pendingTopup = useWorkspaceState<BillingRechargeRequest | null>('user:balance:pending-topup', () => null)
const loading = useWorkspaceState('user:balance:loading', () => false)
const saving = useWorkspaceState('user:balance:saving', () => false)
const recordsLoading = useWorkspaceState('user:balance:records-loading', () => false)
const busy = computed(() => loading.value || saving.value || recordsLoading.value)
const pageError = useWorkspaceState('user:balance:page-error', () => '')
const rechargeError = useWorkspaceState('user:balance:recharge-error', () => '')
const toast = usePortalToast()
const amount = ref('')
const amountPresets = [10, 50, 100, 500]
const validAmount = computed(() => Number.isFinite(Number(amount.value)) && Number(amount.value) > 0)
const overview = useWorkspaceState<BillingOverview | null>('user:balance:overview', () => null)
const records = useWorkspaceState<BillingBalanceRecord[]>('user:balance:records', () => [])

const recordsTotal = useWorkspaceState('user:balance:records-total', () => 0)

const recordPage = ref(1)

const pageSize = ref(5)
const pageSizeOptions = [5, 20, 50, 100].map(value => ({ label: String(value), value }))
const recordPages = computed(() => Math.max(1, Math.ceil(recordsTotal.value / pageSize.value)))
const recordRangeStart = computed(() => recordsTotal.value ? (recordPage.value - 1) * pageSize.value + 1 : 0)
const recordRangeEnd = computed(() => Math.min(recordPage.value * pageSize.value, recordsTotal.value))

const formatNumber = (value?: number) => new Intl.NumberFormat(intlLocale.value).format(value ?? 0)
const balanceRow = (row: { original: unknown }) => row.original as BillingBalanceRecord

const formatCredits = (value?: number) => value == null ? '—' : new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2, roundingMode: 'ceil' } as Intl.NumberFormatOptions).format(value)
const formatDate = (value: string) => new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const metrics = computed(() => [
  { label: t('balance.metric.current'), value: formatCredits(overview.value?.current_balance ?? currentUser.value?.credits), detail: t('balance.metric.currentDetail') },
  { label: t('balance.metric.total'), value: formatCredits(overview.value?.total_recharge_amount), detail: t('balance.metric.totalDetail') }
])

const recordColumns = computed(() => [
  { accessorKey: 'created_at', header: t('balance.col.time') }, { accessorKey: 'id', header: t('balance.col.id') },
  { accessorKey: 'type', header: t('balance.col.type') }, { accessorKey: 'amount', header: t('balance.col.amount') },
  { accessorKey: 'balance_before', header: t('balance.col.before') }, { accessorKey: 'balance_after', header: t('balance.col.after') }
])
const typeLabel = (type: string) => type === 'recharge' ? t('balance.type.recharge') : type === 'deduct' ? t('balance.type.deduct') : type

type PageResponse<T> = { items: T[]; total: number }
async function loadRecords() {
  recordsLoading.value = true
  try {
    const response = await fetchAPI<PageResponse<BillingBalanceRecord>>('/billing/balance-records', { query: { limit: pageSize.value, offset: (recordPage.value - 1) * pageSize.value } })
    records.value = response.items
    recordsTotal.value = response.total
  } finally { recordsLoading.value = false }
}

async function refresh() {
  if (!token.value || loading.value) return
  loading.value = true
  pageError.value = ''
  try {
    const results = await Promise.allSettled([
      loadTopupRequest(),
      fetchAPI<{ overview: BillingOverview }>('/billing/overview').then(response => { overview.value = response.overview }),
      loadCurrentUser(), loadRecords()
    ])
    const failure = results.find(result => result.status === 'rejected')
    if (failure?.status === 'rejected') pageError.value = failure.reason?.message || t('balance.refreshError')
  } finally { loading.value = false }
}
async function loadTopupRequest() {
  requestStateLoaded.value = false
  try {
    await loadCapabilities()
  } catch (error: any) {
    if (error?.statusCode !== 404) throw error
  }
  if (topupApprovalEnabled.value) {
    const response = await fetchAPI<{ request: BillingRechargeRequest | null }>('/billing/recharge-request')
    pendingTopup.value = response.request
  } else {
    pendingTopup.value = null
  }
  requestStateLoaded.value = true
}
async function recharge() {
  if (!validAmount.value || saving.value || loading.value || !requestStateLoaded.value || pendingTopup.value) return
  saving.value = true
  rechargeError.value = ''

  const rechargeAmount = Number(amount.value)
  try {
    const response = await fetchAPI<{ request?: BillingRechargeRequest; record?: BillingBalanceRecord; current_balance: number }>('/billing/recharge', { method: 'POST', body: { amount: rechargeAmount } })
    if (response.request) {
      pendingTopup.value = response.request
      toast.add({ title: t('balance.toast.requestedTitle'), description: t('balance.toast.requestedDescription', { amount: formatCredits(response.request.amount) }), color: 'warning', icon: 'i-tabler-clock' })
    } else if (response.record) {
      if (currentUser.value) currentUser.value.credits = response.current_balance
      if (overview.value) overview.value.current_balance = response.current_balance
      toast.add({
        title: t('balance.toast.completedTitle'),
        description: t('balance.toast.completedDescription', { amount: formatCredits(rechargeAmount), balance: formatCredits(response.current_balance), id: response.record.id }),
        color: 'success',
        icon: 'i-tabler-circle-check'
      })
    }
    amount.value = ''
    recordPage.value = 1
    await refresh()
  } catch (error: any) {
    rechargeError.value = error?.message || t('balance.rechargeErrorFallback')
    requestStateLoaded.value = false
    await refresh()
  } finally { saving.value = false }
}
async function changeRecordPageSize() {
  recordPage.value = 1
  pageError.value = ''
  try { await loadRecords() } catch (error: any) { pageError.value = error?.message || t('balance.historyError') }
}
async function changeRecordPage(delta: number) {
  const previous = recordPage.value
  recordPage.value += delta
  pageError.value = ''
  try { await loadRecords() } catch (error: any) { recordPage.value = previous; pageError.value = error?.message || t('balance.historyError') }
}

onMounted(() => { hydrateSession(); void refresh() })
</script>

<style scoped>
.balance-workspace { max-width: 80rem; margin-inline: auto; padding-block: 0.25rem; }
.balance-wallet-grid { display: grid; gap: 1rem; }
.balance-hero {
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  background: radial-gradient(ellipse at 100% 0%, color-mix(in oklch, var(--ui-success) 14%, transparent), transparent 70%), var(--user-panel-bg) !important;
  border-color: color-mix(in oklch, var(--ui-success) 25%, var(--ui-border)) !important;
}
.balance-totals { display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem 2rem; margin-top: 1.25rem; }
.balance-summary:first-child dt { display: none; }
.balance-summary:first-child dd:first-of-type { margin-top: 0; font-size: clamp(2.5rem, 4vw, 3rem); line-height: 1.15; letter-spacing: -0.05em; }
.balance-summary:first-child dd:first-of-type span { margin-left: 0.5rem; font-size: 0.875rem; }
.balance-summary + .balance-summary { padding-left: 1.25rem; border-left: 1px solid var(--ui-border); }
.balance-summary + .balance-summary dd:first-of-type { margin-top: 0.5rem; font-size: 1.5rem; }
.balance-summary + .balance-summary dd:last-child { display: none; }
.balance-topup { padding: 1.5rem; }
.balance-topup > p { margin-bottom: 1rem; }
.balance-topup form > * + * { margin-top: 0.75rem; }
.balance-hero::after {
  position: absolute;
  right: -4rem;
  bottom: -6rem;
  width: 14rem;
  height: 14rem;
  border: 1.75rem solid color-mix(in oklch, var(--ui-success) 8%, transparent);
  border-radius: 9999px;
  content: '';
  pointer-events: none;
}
.balance-hero > * { position: relative; z-index: 1; }
.balance-preset {
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 9999px;
  background: var(--user-inset-bg);
  color: var(--ui-text);
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition: border-color 120ms ease, background-color 120ms ease, color 120ms ease;
}
.balance-preset:hover:not(:disabled) { border-color: color-mix(in oklch, var(--ui-primary) 40%, var(--ui-border)); color: var(--ui-primary); }
.balance-preset--active { border-color: var(--ui-primary); background: var(--user-selected); color: var(--ui-primary); }
.balance-preset:disabled { cursor: not-allowed; opacity: 0.5; }
.balance-preset:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
@media (min-width: 1024px) {
  .balance-wallet-grid { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); align-items: stretch; }
}

.balance-workspace .balance-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}
</style>
