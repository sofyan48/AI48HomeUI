<template>
  <div class="space-y-4">
    <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('proxy.net.requestFailed')" :description="errorMessage" />

    <div class="grid items-stretch gap-4 lg:grid-cols-12">
      <AppCard class="lg:col-span-8">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-selected)] text-[var(--ui-primary)]" aria-hidden="true"><UIcon name="i-tabler-world-share" class="size-4.5" /></span>
              <div class="min-w-0">
                <h2 class="font-semibold">{{ t('proxy.net.globalTitle') }}</h2>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ t('proxy.net.globalDescription') }}</p>
              </div>
            </div>
            <UBadge :color="globalProxy ? 'success' : 'neutral'" variant="subtle" class="shrink-0">{{ globalProxy ? t('proxy.net.configured') : t('proxy.net.direct') }}</UBadge>
          </div>
        </template>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="saveGlobalProxy">
          <UFormField :label="t('proxy.field.url')" class="flex-1">
            <UInput v-model="globalProxy" icon="i-tabler-link" placeholder="http://127.0.0.1:7890" class="w-full" />
          </UFormField>
          <AppButton type="submit" icon="i-tabler-check" :loading="savingGlobal">{{ t('common.save') }}</AppButton>
          <AppButton color="neutral" variant="outline" icon="i-tabler-x" :loading="savingGlobal" @click="clearGlobalProxy">{{ t('proxy.net.clear') }}</AppButton>
          <AppButton color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="loading" :aria-label="t('proxy.net.refresh')" @click="loadAll" />
        </form>
      </AppCard>

      <AppCard class="lg:col-span-4" :ui="{ body: 'flex h-full flex-col justify-between gap-3' }">
        <div>
          <p class="text-xs font-medium text-[var(--ui-text-muted)]">{{ t('proxy.pool.title') }}</p>
          <div class="mt-2 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg bg-[var(--ui-bg-muted)] px-2 py-2"><p class="text-base font-semibold tabular-nums">{{ pools.length }}</p><p class="text-[11px] text-[var(--ui-text-muted)]">{{ t('proxy.net.records') }}</p></div>
            <div class="rounded-lg bg-[var(--ui-bg-muted)] px-2 py-2"><p class="text-base font-semibold tabular-nums">{{ pools.filter(pool => pool.enabled).length }}</p><p class="text-[11px] text-[var(--ui-text-muted)]">{{ t('common.enabled') }}</p></div>
            <div class="rounded-lg bg-[var(--ui-bg-muted)] px-2 py-2"><p class="text-base font-semibold tabular-nums">{{ pools.filter(pool => pool.last_test_result === 'passed').length }}</p><p class="text-[11px] text-[var(--ui-text-muted)]">{{ t('proxy.net.passedTest') }}</p></div>
          </div>
        </div>
        <p class="flex gap-2 text-xs text-[var(--ui-text-muted)]"><UIcon name="i-tabler-info-circle" class="mt-0.5 size-3.5 shrink-0 text-[var(--ui-info)]" />{{ t('proxy.net.info') }}</p>
      </AppCard>
    </div>

    <AppCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold">{{ t('proxy.pool.title') }}</h2>
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('proxy.net.storedCount', { count: pools.length }) }}</p>
          </div>
          <AppButton icon="i-tabler-plus" @click="openCreate">{{ t('proxy.net.add') }}</AppButton>
        </div>
      </template>
      <AppTable :columns="columns" :data="pools" :loading="loading" searchable :search-placeholder="t('proxy.net.search')">
        <template #identity-cell="{ row }">
          <div class="min-w-48">
            <p class="font-medium">{{ value(row).name }}</p>
            <p class="font-mono text-xs text-[var(--ui-text-muted)]">{{ value(row).proxy_url }}</p>
          </div>
        </template>
        <template #status-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge :color="value(row).enabled ? 'success' : 'neutral'" variant="subtle">{{ value(row).enabled ? t('common.enabled') : t('common.disabled') }}</UBadge>
            <UBadge v-if="value(row).last_test_result" :color="value(row).last_test_result === 'passed' ? 'success' : 'error'" variant="subtle">{{ testLabel(value(row).last_test_result) }}</UBadge>
          </div>
          <p v-if="value(row).last_tested_at" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ formatDate(value(row).last_tested_at) }}</p>
        </template>
        <template #priority-cell="{ row }"><span class="tabular-nums">{{ value(row).priority }}</span></template>
        <template #note-cell="{ row }"><span class="text-sm text-[var(--ui-text-muted)]">{{ value(row).note || '—' }}</span></template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <AdminTableAction action="test" :label="t('proxy.action.test')" :loading="testingId === value(row).id" @click="testPool(value(row))" />
            <AdminTableAction action="edit" :label="t('proxy.action.edit')" @click="openEdit(value(row))" />
            <AdminTableAction action="delete" :label="t('proxy.action.delete')" destructive @click="removePool(value(row))" />
          </div>
        </template>
        <template #empty><div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">{{ t('proxy.pool.empty') }}</div></template>
      </AppTable>
    </AppCard>

    <AppModal v-model:open="formOpen" :title="editing ? t('proxy.net.editTitle') : t('proxy.net.addTitle')" :description="t('proxy.net.formDescription')">
      <template #body>
        <form class="space-y-4" @submit.prevent="savePool">
          <UFormField :label="t('common.name')" required><UInput v-model="form.name" class="w-full" /></UFormField>
          <UFormField :label="t('proxy.field.url')" required><UInput v-model="form.proxy_url" placeholder="http://127.0.0.1:7890" class="w-full" /></UFormField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="t('proxy.field.priority')"><UInput v-model.number="form.priority" type="number" class="w-full" /></UFormField>
            <UFormField :label="t('proxy.field.scope')"><UInput model-value="global" disabled class="w-full" /></UFormField>
          </div>
          <UFormField :label="t('proxy.field.note')"><UTextarea v-model="form.note" :rows="3" class="w-full" /></UFormField>
          <label class="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3">
            <span class="text-sm font-medium">{{ t('common.enabled') }}</span><USwitch v-model="form.enabled" />
          </label>
          <p v-if="formError" class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
          <div class="flex justify-end gap-2">
            <AppButton color="neutral" variant="ghost" @click="formOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton type="submit" :loading="savingPool">{{ editing ? t('proxy.form.saveChanges') : t('proxy.form.create') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'

const { fetchAPI } = useApi()
const toast = useToast()
const { t, intlLocale } = useAdminI18n()
const loading = useWorkspaceState('admin:proxy-network:loading', () => (false))
const savingGlobal = useWorkspaceState('admin:proxy-network:savingGlobal', () => (false))
const savingPool = useWorkspaceState('admin:proxy-network:savingPool', () => (false))
const testingId = useWorkspaceState('admin:proxy-network:testingId', () => (''))
const errorMessage = useWorkspaceState('admin:proxy-network:errorMessage', () => (''))
const formError = ref('')
const globalProxy = ref('')
const poolsResponse = useWorkspaceState('admin:proxy-network:poolsResponse', () => (null))
const formOpen = ref(false)
const editing = ref(null)
const emptyForm = () => ({ name: '', proxy_url: '', enabled: true, priority: 0, note: '' })
const form = ref(emptyForm())
const pools = computed(() => Array.isArray(poolsResponse.value?.items) ? poolsResponse.value.items : [])
const columns = computed(() => [
  { accessorKey: 'identity', header: t('proxy.col.proxy') }, { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'priority', header: t('proxy.field.priority') }, { accessorKey: 'note', header: t('proxy.field.note') }, { accessorKey: 'actions', header: '', meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])
const value = row => row?.original || row
const formatDate = input => input ? new Date(input).toLocaleString(intlLocale.value) : '—'
const testLabel = result => result === 'passed' ? t('proxy.test.passed') : result === 'failed' ? t('proxy.test.failed') : result
const message = (error, fallback) => error?.data?.message || error?.data?.error || error?.message || fallback

async function loadAll(preserveDraft = false) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [proxy, pool] = await Promise.all([fetchAPI('/proxy-url'), fetchAPI('/proxy/proxy-pools')])
    if (preserveDraft !== true) globalProxy.value = proxy?.['proxy-url'] || ''
    poolsResponse.value = pool
  } catch (error) { errorMessage.value = message(error, t('proxy.net.loadFailed')) }
  finally { loading.value = false }
}
async function saveGlobalProxy() {
  savingGlobal.value = true
  try {
    if (!globalProxy.value.trim()) await fetchAPI('/proxy-url', { method: 'DELETE' })
    else await fetchAPI('/proxy-url', { method: 'PATCH', body: { value: globalProxy.value.trim() } })
    toast.add({ title: t('proxy.net.globalSaved'), color: 'success' })
    await loadAll()
  } catch (error) { errorMessage.value = message(error, t('proxy.net.globalSaveFailed')) }
  finally { savingGlobal.value = false }
}
async function clearGlobalProxy() { globalProxy.value = ''; await saveGlobalProxy() }
function openCreate() { editing.value = null; form.value = emptyForm(); formError.value = ''; formOpen.value = true }
function openEdit(pool) {
  editing.value = pool
  form.value = { name: pool.name || '', proxy_url: pool.proxy_url || '', enabled: Boolean(pool.enabled), priority: Number(pool.priority) || 0, note: pool.note || '' }
  formError.value = ''; formOpen.value = true
}
async function savePool() {
  if (!form.value.name.trim() || !form.value.proxy_url.trim()) { formError.value = t('proxy.net.formRequired'); return }
  savingPool.value = true; formError.value = ''
  const body = { ...form.value, name: form.value.name.trim(), proxy_url: form.value.proxy_url.trim(), scope: 'global', note: form.value.note.trim() }
  try {
    if (editing.value) await fetchAPI(`/proxy/proxy-pools/${encodeURIComponent(editing.value.id)}`, { method: 'PATCH', body })
    else await fetchAPI('/proxy/proxy-pools', { method: 'POST', body })
    formOpen.value = false; toast.add({ title: editing.value ? t('proxy.toast.updated') : t('proxy.toast.created'), color: 'success' }); await loadAll()
  } catch (error) { formError.value = message(error, t('proxy.net.saveFailed')) }
  finally { savingPool.value = false }
}
async function testPool(pool) {
  testingId.value = pool.id; errorMessage.value = ''
  try {
    const result = await fetchAPI(`/proxy/proxy-pools/${encodeURIComponent(pool.id)}/test`, { method: 'POST' })
    toast.add({ title: result?.result === 'passed' ? t('proxy.toast.testPassed') : t('proxy.toast.testFailed'), description: result?.message, color: result?.result === 'passed' ? 'success' : 'error' })
    await loadAll()
  } catch (error) { errorMessage.value = message(error, t('proxy.error.test')) }
  finally { testingId.value = '' }
}
async function removePool(pool) {
  if (!window.confirm(t('proxy.net.confirmDelete', { name: pool.name }))) return
  try { await fetchAPI(`/proxy/proxy-pools/${encodeURIComponent(pool.id)}`, { method: 'DELETE' }); toast.add({ title: t('proxy.toast.deleted'), color: 'success' }); await loadAll() }
  catch (error) { errorMessage.value = message(error, t('proxy.error.delete')) }
}
useDataSync('admin:proxy-network:sync', () => loadAll(true))
onMounted(loadAll)
</script>
