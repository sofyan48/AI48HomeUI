<template>
  <section v-if="supported" class="limit-reset" :aria-label="t('ws.reset.aria')" :aria-busy="loading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h3 class="flex items-center gap-2 text-xs font-medium"><UIcon name="i-tabler-refresh" class="size-4 text-primary" aria-hidden="true" /> {{ t('ws.reset.available', { count: loading ? '…' : loadError ? '—' : allowance?.available ?? '—' }) }}</h3>
        <p v-if="allowance && allowance.available > 0" class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ t('ws.reset.hint') }}</p>
        <p v-if="allowance && !loadError && allowance.available > 0" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ allowance.mode === 'monthly' ? t('ws.reset.monthly', { amount: allowance.amount }) : allowance.mode === 'one_time' ? t('ws.reset.oneTime') : t('ws.reset.none') }}</p>
        <p v-if="!loadError && (allowance?.renews_at || allowance?.expires_at)" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ allowance?.mode === 'monthly' ? t('ws.reset.renews', { date: formatDate(allowance?.renews_at || allowance?.expires_at || '') }) : t('ws.reset.expires', { date: formatDate(allowance?.renews_at || allowance?.expires_at || '') }) }}</p>
        <p v-if="!loading && !loadError && limits && !enabledWindows.length" class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('ws.reset.noWindows') }}</p>
      </div>
      <AppButton v-if="!loading && !loadError && allowance && allowance.available > 0" size="sm" variant="soft" class="rounded-full" icon="i-tabler-refresh" :disabled="pending || !enabledWindows.length" @click="resetError = ''; confirmOpen = true">{{ t('ws.reset.button') }}</AppButton>
    </div>
    <UAlert v-if="loadError" class="mt-3" color="error" variant="subtle" :title="t('ws.reset.loadError')" :description="loadError" />
    <AppButton v-if="loadError" class="mt-2" size="sm" color="neutral" variant="outline" :loading="loading" @click="loadLimits">{{ t('common.retry') }}</AppButton>
    <UModal v-model:open="confirmOpen" :title="t('ws.reset.confirmTitle')" :dismissible="!pending" :close="!pending" :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm">{{ t('ws.reset.confirmBody') }}</p>
          <UAlert v-if="resetError" color="error" variant="subtle" :description="resetError" />
          <div class="flex justify-end gap-2"><AppButton color="neutral" variant="outline" :disabled="pending" @click="confirmOpen = false">{{ t('common.cancel') }}</AppButton><AppButton :loading="pending" :disabled="pending" @click="resetLimits">{{ t('ws.reset.use') }}</AppButton></div>
        </div>
      </template>
    </UModal>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits<{ reset: [] }>()
const { capabilities, fetchAPI } = useUserApi()
const toast = useToast()
const { t, intlLocale } = usePortalI18n()
const supported = computed(() => capabilities.value.user_reset_allowance === true)
type Allowance = { mode: string; amount: number; available: number; expires_at: string | null; renews_at: string | null }
type Limits = { windows?: { enabled: boolean; limit: number | null }[]; reset_allowance?: Allowance }
const limits = ref<Limits | null>(null)
const allowance = computed(() => limits.value?.reset_allowance)
const enabledWindows = computed(() => (limits.value?.windows || []).filter(window => window.enabled && window.limit != null))
const loading = ref(false)
const loadError = ref('')
const confirmOpen = ref(false)
const pending = ref(false)
const resetError = ref('')
const controller = new AbortController()
onScopeDispose(() => controller.abort())
const formatDate = (value: string) => new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
async function loadLimits() {
  if (!supported.value || controller.signal.aborted || loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const response = await fetchAPI<Limits>('/period-limits', { signal: controller.signal })
    if (!response.reset_allowance) throw new Error(t('ws.reset.missingAllowance'))
    if (!controller.signal.aborted) limits.value = response
  } catch (cause: any) {
    if (!controller.signal.aborted) loadError.value = cause?.message || t('ws.reset.loadFailed')
  } finally { loading.value = false }
}
async function resetLimits() {
  if (pending.value || !supported.value || !allowance.value || allowance.value.available <= 0 || !enabledWindows.value.length) return
  pending.value = true
  resetError.value = ''
  try {
    const response = await fetchAPI<{ limits: Limits }>('/period-limits/reset', { method: 'POST', signal: controller.signal })
    if (controller.signal.aborted) return
    limits.value = response.limits
    confirmOpen.value = false
    emit('reset')
    toast.add({ title: t('ws.reset.done'), description: t('ws.reset.doneDetail'), color: 'success' })
  } catch (cause: any) {
    if (controller.signal.aborted) return
    resetError.value = cause?.message || t('ws.reset.failed')
    await loadLimits()
  } finally { pending.value = false }
}
watch(supported, value => { if (value) void loadLimits() }, { immediate: true })
</script>

<style scoped>
.limit-reset { padding: 0.875rem 0; color: var(--ui-text-muted); }
</style>
