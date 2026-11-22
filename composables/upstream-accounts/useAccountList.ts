import { computed, ref, watch } from 'vue'
import { isQuotaAttention } from '~/composables/upstreamQuota'
import { credentialWebsocketState } from '~/composables/credentialTransport'
import { ALL_FILTER } from './format'

import type { AccountShared, AccountCredential } from './types'

// Accounts table: filters, selection, bulk actions, inline toggles and single delete.
export function useAccountList(ctx: AccountShared) {
  const {
    t, fetchAPI, toast, route, props, message, credentialRoute, credentialStatus, credentials, selectedIDs, pending,
    pageError, quotaByID, refreshData, busy, changing, inlineChanging, deleting, bulkBusy, bulkAction
  } = ctx
  const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
  const providerFilter = ref(ALL_FILTER)
  const statusFilter = ref(ALL_FILTER)
  const websocketsFilter = ref(ALL_FILTER)
  const attentionOnly = ref(false)
  watch(() => props.attentionRequest, () => { attentionOnly.value = true })

  const columns = computed(() => [{ id: 'select', header: '' }, { accessorKey: 'identity', header: t('cred.col.credential') }, { accessorKey: 'provider', header: t('common.provider') }, { accessorKey: 'status', header: t('cred.col.enabled') }, { accessorKey: 'quota', header: t('cred.col.quota') }, { accessorKey: 'websockets', header: t('cred.col.ws') }, { accessorKey: 'cooling', header: t('cred.col.cooling') }, { accessorKey: 'priority', header: t('cred.col.priority') }, { id: 'actions', header: t('common.actions'), meta: { class: { th: 'w-px whitespace-nowrap text-right', td: 'w-px whitespace-nowrap text-right' } } }])
  const providerOptions = computed(() => [{ label: t('quota.allProviders'), value: ALL_FILTER }, ...[...new Set(credentials.value.map(item => item.provider).filter(Boolean))].sort().map(value => ({ label: value, value }))])
  const statusOptions = computed(() => [
    { label: t('cred.status.all'), value: ALL_FILTER }, { label: t('cred.status.active'), value: 'active' },
    { label: t('cred.status.disabled'), value: 'disabled' }, { label: t('cred.status.unavailable'), value: 'unavailable' },
    { label: t('cred.status.error'), value: 'error' }
  ])
  const websocketsOptions = computed(() => [
    { label: t('cred.ws.all'), value: ALL_FILTER }, { label: t('cred.ws.on'), value: 'on' }, { label: t('cred.ws.off'), value: 'off' }, { label: t('cred.ws.unknown'), value: 'unknown' }, { label: t('cred.ws.unsupported'), value: 'unsupported' }
  ])
  const needsAttention = (item: AccountCredential) => isQuotaAttention(quotaByID.value.get(item.id))
  const filteredCredentials = computed(() => {
    const q = search.value.trim().toLowerCase()
    return credentials.value.filter(item =>
      (!q || [item.id, item.name, item.label, item.email, item.provider].some(v => String(v || '').toLowerCase().includes(q))) &&
      (providerFilter.value === ALL_FILTER || item.provider === providerFilter.value) &&
      (statusFilter.value === ALL_FILTER || credentialStatus(item) === statusFilter.value) &&
      (websocketsFilter.value === ALL_FILTER || credentialWebsocketState(item) === websocketsFilter.value) &&
      (!attentionOnly.value || needsAttention(item))
    )
  })
  const hasActiveFilters = computed(() => Boolean(search.value.trim()) || providerFilter.value !== ALL_FILTER || statusFilter.value !== ALL_FILTER || websocketsFilter.value !== ALL_FILTER || attentionOnly.value)
  const selectedEnabledCount = computed(() => credentials.value.filter(item => selectedIDs.value.has(item.id) && !item.disabled).length)
  const selectedDisabledCount = computed(() => credentials.value.filter(item => selectedIDs.value.has(item.id) && item.disabled).length)
  function clearFilters() {
    search.value = ''
    providerFilter.value = ALL_FILTER
    statusFilter.value = ALL_FILTER
    websocketsFilter.value = ALL_FILTER
    attentionOnly.value = false
  }
  const page = ref(1)
  const pageSize = ref(20)
  const pageCount = computed(() => Math.max(1, Math.ceil(filteredCredentials.value.length / pageSize.value)))
  const pagedCredentials = computed(() => filteredCredentials.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
  watch(pageSize, () => { page.value = 1 })
  watch(pageCount, count => { if (page.value > count) page.value = count })
  // "Visible" selection refers to the rows on the current page.
  const allVisibleSelected = computed(() => pagedCredentials.value.length > 0 && pagedCredentials.value.every(item => selectedIDs.value.has(item.id)))
  const someVisibleSelected = computed(() => pagedCredentials.value.some(item => selectedIDs.value.has(item.id)))
  watch([search, providerFilter, statusFilter, websocketsFilter, attentionOnly], () => { selectedIDs.value = new Set(); page.value = 1 })
  watch(() => route.query.q, q => { search.value = typeof q === 'string' ? q : '' })
  function toggleSelected(id: string, checked: boolean) {
    const next = new Set(selectedIDs.value)
    if (checked) next.add(id)
    else next.delete(id)
    selectedIDs.value = next
  }
  function toggleAllVisible(checked: boolean) {
    const next = new Set(selectedIDs.value)
    for (const item of pagedCredentials.value) {
      if (checked) next.add(item.id)
      else next.delete(item.id)
    }
    selectedIDs.value = next
  }

  const bulkDeleteOpen = ref(false)
  async function runBulk(action: 'Enable' | 'Disable' | 'Delete', items: AccountCredential[], request: (item: AccountCredential) => Promise<unknown>) {
    if (bulkBusy.value || pending.value || changing.value || deleting.value || !items.length) return
    bulkBusy.value = true
    bulkAction.value = action
    let succeeded = 0
    let failed = 0
    try {
      for (const item of items) {
        try { await request(item); succeeded++ } catch { failed++ }
      }
      try { await refreshData() } catch { pageError.value = t('cred.bulk.refreshFailed') }
      const counts = { succeeded, failed }
      toast.add({
        title: action === 'Enable' ? t('cred.bulk.enableDone', counts) : action === 'Disable' ? t('cred.bulk.disableDone', counts) : t('cred.bulk.deleteDone', counts),
        description: pageError.value ? t('cred.bulk.refreshHint') : undefined,
        color: failed || pageError.value ? 'warning' : 'success'
      })
    } finally {
      bulkBusy.value = false
      bulkAction.value = ''
    }
  }
  async function bulkStatus(disabled: boolean) {
    const items = credentials.value.filter(item => selectedIDs.value.has(item.id) && item.disabled !== disabled)
    if (!items.length) { selectedIDs.value = new Set(); return }
    await runBulk(disabled ? 'Disable' : 'Enable', items, item => fetchAPI(credentialRoute('/status'), { method: 'PATCH', body: { name: item.id, disabled } }))
  }
  async function bulkDelete() {
    if (!selectedIDs.value.size || bulkBusy.value) return
    const items = credentials.value.filter(item => selectedIDs.value.has(item.id))
    bulkDeleteOpen.value = false
    await runBulk('Delete', items, item => fetchAPI(`${credentialRoute('')}?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' }))
  }

  async function setInlineField(item: AccountCredential, field: string, nextValue: string | number | boolean | null) {
    if (!item.id || busy.value) return
    inlineChanging.value = item.id
    try {
      await fetchAPI(credentialRoute('/fields'), { method: 'PATCH', body: { id: item.id, [field]: nextValue } })
      await refreshData()
      toast.add({ title: t('cred.toast.updated'), color: 'success' })
    } catch (error) { toast.add({ title: t('cred.toast.updateFailed'), description: message(error), color: 'error' }) }
    finally { inlineChanging.value = '' }
  }
  async function toggleStatus(item: AccountCredential) { changing.value = item.id; try { await fetchAPI(credentialRoute('/status'), { method: 'PATCH', body: { name: item.id, disabled: !item.disabled } }); await refreshData() } catch (error) { toast.add({ title: t('cred.toast.statusFailed'), description: message(error), color: 'error' }) } finally { changing.value = '' } }

  const deleteOpen = ref(false)
  const deleteTarget = ref<AccountCredential | null>(null)
  function confirmDelete(item: AccountCredential) { deleteTarget.value = item; deleteOpen.value = true }
  async function deleteCredential() { if (!deleteTarget.value) return; deleting.value = true; try { await fetchAPI(`${credentialRoute('')}?id=${encodeURIComponent(deleteTarget.value.id)}`, { method: 'DELETE' }); deleteOpen.value = false; await refreshData(); toast.add({ title: t('cred.toast.deleted'), color: 'success' }) } catch (error) { toast.add({ title: t('cred.toast.deleteFailed'), description: message(error), color: 'error' }) } finally { deleting.value = false } }

  return {
    search, providerFilter, statusFilter, websocketsFilter, attentionOnly, columns, providerOptions, statusOptions,
    websocketsOptions, filteredCredentials, pagedCredentials, page, pageSize, hasActiveFilters, selectedEnabledCount, selectedDisabledCount, clearFilters,
    allVisibleSelected, someVisibleSelected, toggleSelected, toggleAllVisible, bulkDeleteOpen, bulkStatus, bulkDelete,
    setInlineField, toggleStatus, deleteOpen, deleteTarget, confirmDelete, deleteCredential
  }
}
