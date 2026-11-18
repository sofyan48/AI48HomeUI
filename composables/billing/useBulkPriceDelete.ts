import { computed, ref, watch, type Ref } from 'vue'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import type { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import type { BillingPriceRule } from './types'

interface BulkPriceDeleteOptions {
  deleteRule: (id: string) => Promise<unknown>
  t: ReturnType<typeof useAdminI18n>['t']
  toast: Pick<ReturnType<typeof useAdminToast>, 'add'>
}

export function useBulkPriceDelete(rules: Readonly<Ref<BillingPriceRule[]>>, visible: Readonly<Ref<BillingPriceRule[]>>, reload: () => Promise<unknown>, { deleteRule, t, toast }: BulkPriceDeleteOptions) {
  const selectedIDs = ref(new Set<string>())
  const open = ref(false)
  const busy = ref(false)
  const error = ref('')
  const targets = ref<BillingPriceRule[]>([])
  const allSelected = computed(() => visible.value.length > 0 && visible.value.every(rule => selectedIDs.value.has(rule.id)))
  const someSelected = computed(() => !allSelected.value && visible.value.some(rule => selectedIDs.value.has(rule.id)))
  watch(rules, values => {
    const existing = new Set(values.map(rule => rule.id))
    selectedIDs.value = new Set([...selectedIDs.value].filter(id => existing.has(id)))
  })

  function select(id: string, checked: boolean) {
    if (busy.value) return
    const next = new Set(selectedIDs.value)
    if (checked) next.add(id)
    else next.delete(id)
    selectedIDs.value = next
  }
  function selectAll(checked: boolean) {
    if (busy.value) return
    for (const rule of visible.value) select(rule.id, checked)
  }
  function clear() { if (!busy.value) selectedIDs.value = new Set() }
  function confirm() {
    if (busy.value) return
    targets.value = rules.value.filter(rule => selectedIDs.value.has(rule.id))
    if (!targets.value.length) return
    error.value = ''
    open.value = true
  }
  async function remove() {
    if (busy.value || !targets.value.length) return
    busy.value = true
    error.value = ''
    const failed: BillingPriceRule[] = []
    let deleted = 0
    try {
      for (const rule of targets.value) {
        try {
          await deleteRule(rule.id)
          const next = new Set(selectedIDs.value)
          next.delete(rule.id)
          selectedIDs.value = next
          deleted++
        } catch {
          failed.push(rule)
        }
      }
      targets.value = failed
      if (deleted) toast.add({ title: t('billing.bulkDelete.deleted', { count: deleted }), color: 'success' })
      if (failed.length) error.value = t('billing.bulkDelete.failed', { count: failed.length })
      else open.value = false
      try { await reload() }
      catch { toast.add({ title: t('billing.bulkDelete.refreshFailed'), color: 'warning' }) }
    } finally {
      busy.value = false
    }
  }
  return { selectedIDs, open, busy, error, targets, allSelected, someSelected, select, selectAll, clear, confirm, remove }
}
