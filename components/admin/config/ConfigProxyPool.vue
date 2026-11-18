<template>
  <AdminDataPanel :title="t('proxy.pool.title')" :description="t('proxy.pool.description')">
    <template #actions><AppButton color="neutral" variant="ghost" icon="i-tabler-refresh" :aria-label="t('common.refresh')" :loading="loading" @click="loadPools" /><AppButton size="sm" icon="i-tabler-plus" :disabled="unsupported" @click="openCreate">{{ t('proxy.pool.new') }}</AppButton></template>

    <div v-if="unsupported || loadError" class="p-4">
    <PortalAlert
      v-if="unsupported"
      color="warning"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('proxy.pool.unsupportedTitle')"
      :description="t('proxy.pool.unsupportedDescription')"
    />
    <PortalAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-circle"
      :title="t('proxy.pool.loadErrorTitle')"
      :description="loadError"
    />
    </div>

        <AppTable :columns="columns" :data="sortedPools" :loading="loading" searchable :search-placeholder="t('proxy.pool.searchPlaceholder')" class="min-w-[1180px]">
          <template #name-cell="{ row }">
            <span class="font-medium text-[var(--ui-text-highlighted)]">{{ rowValue(row).name }}</span>
          </template>

          <template #proxy_url-cell="{ row }">
            <span class="block max-w-80 truncate font-mono text-xs" :title="rowValue(row).proxy_url">{{ rowValue(row).proxy_url }}</span>
          </template>

          <template #state-cell="{ row }">
            <div class="flex items-center gap-2">
              <AdminSwitch
                :model-value="Boolean(rowValue(row).enabled)"
                :disabled="Boolean(togglingId)"
                :aria-label="rowValue(row).enabled ? t('proxy.pool.toggleDisable', { name: rowValue(row).name }) : t('proxy.pool.toggleEnable', { name: rowValue(row).name })"
                @update:model-value="toggleEnabled(rowValue(row), Boolean($event))"
              />
              <span class="text-xs text-[var(--ui-text-muted)]">{{ rowValue(row).enabled ? t('common.enabled') : t('common.disabled') }}</span>
            </div>
          </template>

          <template #scope-cell="{ row }">
            <PortalBadge color="neutral" variant="subtle">{{ rowValue(row).scope || 'global' }}</PortalBadge>
          </template>

          <template #priority-cell="{ row }">
            <span class="tabular-nums">{{ rowValue(row).priority ?? 0 }}</span>
          </template>

          <template #last_test-cell="{ row }">
            <div class="min-w-36">
              <PortalBadge v-if="rowValue(row).last_test_result" :color="testColor(rowValue(row).last_test_result)" variant="subtle">
                {{ testLabel(rowValue(row).last_test_result) }}
              </PortalBadge>
              <span v-else class="text-sm text-[var(--ui-text-muted)]">{{ t('proxy.notTested') }}</span>
              <p class="mt-1 text-xs text-[var(--ui-text-dimmed)]">{{ formatDate(rowValue(row).last_tested_at) }}</p>
            </div>
          </template>

          <template #note-cell="{ row }">
            <span class="block max-w-56 truncate text-sm text-[var(--ui-text-muted)]" :title="rowValue(row).note || ''">{{ rowValue(row).note || '—' }}</span>
          </template>

          <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><AdminTableAction action="test" :label="t('proxy.action.test')" :loading="testingId === rowValue(row).id" :disabled="Boolean(testingId)" @click="testPool(rowValue(row))" /><AdminTableAction action="edit" :label="t('proxy.action.edit')" @click="openEdit(rowValue(row))" /><AdminTableAction action="delete" :label="t('proxy.action.deleteNamed', { name: rowValue(row).name })" destructive @click="confirmDelete(rowValue(row))" /></div></template>

          <template #empty>
            <div class="py-12 text-center text-sm text-[var(--ui-text-muted)]">
              {{ unsupported ? t('proxy.pool.unavailable') : t('proxy.pool.empty') }}
            </div>
          </template>
        </AppTable>

    <AppModal v-model:open="formOpen" :title="editingId ? t('proxy.form.editTitle') : t('proxy.pool.new')" :description="t('proxy.form.description')">
      <template #body>
        <form class="space-y-4" @submit.prevent="savePool">
          <AdminField :label="t('common.name')" required :error="formErrors.name">
            <AdminInput v-model="form.name" class="w-full" autocomplete="off" :placeholder="t('proxy.field.namePlaceholder')" />
          </AdminField>

          <AdminField :label="t('proxy.field.url')" required :error="formErrors.proxy_url" :help="t('proxy.field.urlHelp')">
            <AdminInput v-model="form.proxy_url" class="w-full" autocomplete="off" placeholder="http://127.0.0.1:7890" />
          </AdminField>

          <div class="grid gap-4 sm:grid-cols-2">
            <AdminField :label="t('proxy.field.priority')" required :error="formErrors.priority">
              <AdminInput v-model="form.priority" type="number" step="1" class="w-full" />
            </AdminField>
            <AdminField :label="t('proxy.field.scope')">
              <AdminInput model-value="global" readonly class="w-full" />
            </AdminField>
          </div>

          <AdminField :label="t('proxy.field.note')">
            <AdminTextarea v-model="form.note" :rows="3" class="w-full" :placeholder="t('proxy.field.notePlaceholder')" />
          </AdminField>

          <label class="flex items-center justify-between gap-4 rounded-lg border border-[var(--ui-border)] p-3">
            <span>
              <span class="block text-sm font-medium text-[var(--ui-text-highlighted)]">{{ t('common.enabled') }}</span>
              <span class="block text-xs text-[var(--ui-text-muted)]">{{ t('proxy.field.enabledHint') }}</span>
            </span>
            <AdminSwitch v-model="form.enabled" />
          </label>

          <PortalAlert v-if="formError" color="error" variant="subtle" icon="i-tabler-alert-circle" :title="t('proxy.form.saveFailedTitle')" :description="formError" />

          <div class="flex justify-end gap-2">
            <AppButton type="button" color="neutral" variant="ghost" :disabled="saving" @click="closeForm">{{ t('common.cancel') }}</AppButton>
            <AppButton type="submit" :loading="saving">{{ editingId ? t('proxy.form.saveChanges') : t('proxy.form.create') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="deleteOpen" centered :title="t('proxy.action.delete')">
      <template #body>
        <div class="space-y-5">
          <PortalAlert color="warning" variant="subtle" icon="i-tabler-alert-triangle" :title="t('proxy.delete.warning')" :description="deleteTarget?.name || deleteTarget?.proxy_url" />
          <p class="text-sm text-[var(--ui-text-muted)]">{{ t('proxy.delete.irreversible') }}</p>
          <div class="flex justify-end gap-2">
            <AppButton color="neutral" variant="ghost" :disabled="deleting" @click="closeDelete">{{ t('common.cancel') }}</AppButton>
            <AppButton color="error" :loading="deleting" @click="deletePool">{{ t('common.delete') }}</AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </AdminDataPanel>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import AdminDataPanel from '~/components/admin/general/DataPanel.vue'
import AdminTableAction from '~/components/admin/general/TableAction.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
interface ProxyPool {
  id: string
  name: string
  proxy_url: string
  enabled: boolean
  scope: string
  priority: number
  last_tested_at?: string | null
  last_test_result?: string | null
  note?: string
  updated_at?: string
}

interface ProxyPoolResponse {
  items?: ProxyPool[]
  proxy_pool?: ProxyPool
  result?: string
  message?: string
}

const { fetchAPI } = useApi()
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
const toast = useAdminToast()
const { t, intlLocale } = useAdminI18n()

const columns = computed(() => [
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'proxy_url', header: t('proxy.col.url') },
  { accessorKey: 'state', header: t('proxy.col.state') },
  { accessorKey: 'scope', header: t('proxy.field.scope') },
  { accessorKey: 'priority', header: t('proxy.field.priority') },
  { accessorKey: 'last_test', header: t('proxy.col.lastTest') },
  { accessorKey: 'note', header: t('proxy.field.note') },
  { accessorKey: 'actions', header: t('common.actions'), meta: { class: { th: 'table-action-head', td: 'table-action-cell' } } }
])

const pools = useWorkspaceState<ProxyPool[]>('admin:config:-config-proxy-pool:pools', () => ([]))
const loading = useWorkspaceState('admin:config:-config-proxy-pool:loading', () => (false))
const unsupported = useWorkspaceState('admin:config:-config-proxy-pool:unsupported', () => (false))
const loadError = useWorkspaceState('admin:config:-config-proxy-pool:loadError', () => (''))
const testingId = useWorkspaceState('admin:config:-config-proxy-pool:testingId', () => (''))
const togglingId = useWorkspaceState('admin:config:-config-proxy-pool:togglingId', () => (''))
const formOpen = ref(false)
const saving = useWorkspaceState('admin:config:-config-proxy-pool:saving', () => (false))
const editingId = ref('')
const formError = ref('')
const formErrors = reactive({ name: '', proxy_url: '', priority: '' })
const deleteOpen = ref(false)
const deleting = useWorkspaceState('admin:config:-config-proxy-pool:deleting', () => (false))
const deleteTarget = ref<ProxyPool | null>(null)
const emptyForm = () => ({ name: '', proxy_url: '', enabled: true, priority: '0', note: '' })
const form = reactive(emptyForm())

const sortedPools = computed(() => [...pools.value].sort((left, right) => {
  const priority = Number(left.priority || 0) - Number(right.priority || 0)
  return priority || String(left.name || '').localeCompare(String(right.name || ''))
}))

const rowValue = (row: any): ProxyPool => row?.original ?? row
const errorMessage = (error: any, fallback: string) => error?.data?.message || error?.data?.error || error?.message || fallback
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString(intlLocale.value) : '—'
const testColor = (result?: string | null) => result === 'passed' ? 'success' : result === 'failed' ? 'error' : 'neutral'
const testLabel = (result?: string | null) => result === 'passed' ? t('proxy.test.passed') : result === 'failed' ? t('proxy.test.failed') : result

function isUnsupportedError(error: any) {
  const text = errorMessage(error, '').toLowerCase()
  return error?.statusCode === 404 || text.includes('not found') || text.includes('not-found') || text.includes('not_found')
}

function replacePool(pool: ProxyPool) {
  const index = pools.value.findIndex(item => item.id === pool.id)
  if (index === -1) pools.value = [...pools.value, pool]
  else pools.value = pools.value.map(item => item.id === pool.id ? pool : item)
}

async function loadPools() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await fetchAPI<ProxyPoolResponse>('/proxy/proxy-pools')
    pools.value = Array.isArray(response?.items) ? response.items : []
    unsupported.value = false
  } catch (error: any) {
    if (isUnsupportedError(error)) {
      unsupported.value = true
      pools.value = []
    } else {
      loadError.value = errorMessage(error, t('proxy.error.load'))
    }
  } finally {
    loading.value = false
  }
}

function resetValidation() {
  formError.value = ''
  formErrors.name = ''
  formErrors.proxy_url = ''
  formErrors.priority = ''
}

function openCreate() {
  if (unsupported.value) return
  editingId.value = ''
  Object.assign(form, emptyForm())
  resetValidation()
  formOpen.value = true
}

function openEdit(pool: ProxyPool) {
  editingId.value = pool.id
  Object.assign(form, {
    name: pool.name || '',
    proxy_url: pool.proxy_url || '',
    enabled: Boolean(pool.enabled),
    priority: String(pool.priority ?? 0),
    note: pool.note || ''
  })
  resetValidation()
  formOpen.value = true
}

function validateForm() {
  resetValidation()
  const name = form.name.trim()
  const proxyURL = form.proxy_url.trim()
  const priority = Number(form.priority)

  if (!name) formErrors.name = t('proxy.validation.nameRequired')
  if (!proxyURL) {
    formErrors.proxy_url = t('proxy.validation.urlRequired')
  } else {
    try {
      const parsed = new URL(proxyURL)
      if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(parsed.protocol)) formErrors.proxy_url = t('proxy.validation.scheme')
      else if (!parsed.hostname) formErrors.proxy_url = t('proxy.validation.host')
    } catch {
      formErrors.proxy_url = t('proxy.validation.url')
    }
  }
  if (!Number.isInteger(priority)) formErrors.priority = t('proxy.validation.priority')

  return !formErrors.name && !formErrors.proxy_url && !formErrors.priority
}

async function savePool() {
  if (!validateForm()) return
  saving.value = true
  formError.value = ''
  const body = {
    name: form.name.trim(),
    proxy_url: form.proxy_url.trim(),
    enabled: Boolean(form.enabled),
    priority: Number(form.priority),
    scope: 'global',
    note: form.note.trim()
  }

  try {
    const response = editingId.value
      ? await fetchAPI<ProxyPoolResponse>(`/proxy/proxy-pools/${encodeURIComponent(editingId.value)}`, { method: 'PATCH', body })
      : await fetchAPI<ProxyPoolResponse>('/proxy/proxy-pools', { method: 'POST', body })
    if (response?.proxy_pool) replacePool(response.proxy_pool)
    formOpen.value = false
    toast.add({ title: editingId.value ? t('proxy.toast.updated') : t('proxy.toast.created'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error: any) {
    formError.value = errorMessage(error, t('proxy.error.save'))
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(pool: ProxyPool, enabled: boolean) {
  if (togglingId.value || pool.enabled === enabled) return
  togglingId.value = pool.id
  try {
    const response = await fetchAPI<ProxyPoolResponse>(`/proxy/proxy-pools/${encodeURIComponent(pool.id)}`, { method: 'PATCH', body: { enabled } })
    replacePool(response?.proxy_pool || { ...pool, enabled })
    toast.add({ title: enabled ? t('proxy.toast.enabled') : t('proxy.toast.disabled'), color: 'success' })
  } catch (error: any) {
    toast.add({ title: t('proxy.toast.stateFailed'), description: errorMessage(error, t('proxy.error.state')), color: 'error' })
  } finally {
    togglingId.value = ''
  }
}

async function testPool(pool: ProxyPool) {
  if (testingId.value) return
  testingId.value = pool.id
  try {
    const response = await fetchAPI<ProxyPoolResponse>(`/proxy/proxy-pools/${encodeURIComponent(pool.id)}/test`, { method: 'POST' })
    const result = response?.result || 'failed'
    replacePool({ ...pool, last_test_result: result, last_tested_at: new Date().toISOString() })
    toast.add({
      title: result === 'passed' ? t('proxy.toast.testPassed') : t('proxy.toast.testFailed'),
      description: response?.message,
      color: result === 'passed' ? 'success' : 'error'
    })
  } catch (error: any) {
    toast.add({ title: t('proxy.toast.testFailed'), description: errorMessage(error, t('proxy.error.test')), color: 'error' })
  } finally {
    testingId.value = ''
  }
}

function closeForm() {
  formOpen.value = false
}

function closeDelete() {
  deleteOpen.value = false
}

function confirmDelete(pool: ProxyPool) {
  deleteTarget.value = pool
  deleteOpen.value = true
}

async function deletePool() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  const target = deleteTarget.value
  try {
    await fetchAPI(`/proxy/proxy-pools/${encodeURIComponent(target.id)}`, { method: 'DELETE' })
    pools.value = pools.value.filter(pool => pool.id !== target.id)
    deleteOpen.value = false
    deleteTarget.value = null
    toast.add({ title: t('proxy.toast.deleted'), color: 'success', icon: 'i-tabler-circle-check' })
  } catch (error: any) {
    toast.add({ title: t('proxy.toast.deleteFailed'), description: errorMessage(error, t('proxy.error.delete')), color: 'error' })
  } finally {
    deleting.value = false
  }
}

useDataSync('admin:config-proxy-pool:sync', loadPools)
onMounted(loadPools)
</script>
