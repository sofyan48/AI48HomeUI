import { computed, nextTick, ref } from 'vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'

// Codex reset-credit consumption from the Quota tab, with an idempotency key kept per credential.
export function useResetCredit(ctx) {
  const { t, fetchAPI, supports, toast, message, detailsTarget, accountQuotaDetail, accountQuotaLoading, collectAccountQuota, refreshAccountQuota } = ctx
  const resetCreditOpen = ref(false)
  const resetCreditTarget = ref(null)
  const resetCreditAttempts = useWorkspaceState('admin:upstream-accounts:resetCreditAttempts', () => ({}))
  const resetCreditAttempt = computed(() => resetCreditAttempts.value[resetCreditTarget.value?.id] || null)
  const resetCreditSubmitting = useWorkspaceState('admin:upstream-accounts:resetCreditSubmitting', () => (false))
  const resetCreditError = ref('')
  const resetCreditNotice = ref('')
  const resetCreditNoticeColor = ref('success')
  const resetCreditNoticeCredential = ref('')
  const resetCreditSupported = computed(() => supports('codex_reset_credit_consume', false) &&
    String(accountQuotaDetail.value?.credential?.provider || detailsTarget.value?.provider || '').toLowerCase() === 'codex')
  const canResetCredit = computed(() => resetCreditSupported.value &&
    Number(accountQuotaDetail.value?.reset_credits?.available_count) > 0)
  const resetCreditDisabledReason = computed(() => {
    if (!resetCreditSupported.value) return ''
    const detail = accountQuotaDetail.value
    if (resetCreditAttempts.value[detailsTarget.value?.id]) return t('cred.reset.previousAttempt')
    if (!detail?.reset_credits || detail.reset_credits.available_count == null) return t('cred.reset.notReported')
    if (Number(detail.reset_credits.available_count) <= 0) return t('cred.reset.noneAvailable')
    return ''
  })
  const canConfirmResetCredit = computed(() => !resetCreditSubmitting.value && !accountQuotaLoading.value &&
    !resetCreditAttempts.value[resetCreditTarget.value?.id] && resetCreditTarget.value?.id === detailsTarget.value?.id && canResetCredit.value)

  function openResetCredit() {
    if (!canResetCredit.value || !detailsTarget.value?.id || resetCreditSubmitting.value || resetCreditAttempts.value[detailsTarget.value.id]) return
    resetCreditTarget.value = detailsTarget.value
    resetCreditError.value = ''
    resetCreditOpen.value = true
  }
  function handleResetCreditOpen(open) {
    if (!open && resetCreditSubmitting.value) nextTick(() => { resetCreditOpen.value = true })
  }
  async function redeemResetCredit() {
    if (!canConfirmResetCredit.value) return
    const id = resetCreditTarget.value.id
    resetCreditSubmitting.value = true
    resetCreditError.value = ''
    resetCreditNotice.value = ''
    try {
      if (!resetCreditAttempt.value) {
        resetCreditAttempts.value = { ...resetCreditAttempts.value, [id]: { credentialId: id, id: crypto.randomUUID() } }
      }
      const result = await fetchAPI(`/quota/credentials/${encodeURIComponent(id)}/reset-credits/consume`, {
        method: 'POST', body: { idempotency_key: resetCreditAttempt.value.id }
      })
      resetCreditAttempts.value = Object.fromEntries(Object.entries(resetCreditAttempts.value).filter(([credentialId]) => credentialId !== id))
      resetCreditOpen.value = false
      resetCreditNoticeCredential.value = id
      resetCreditNoticeColor.value = 'success'
      resetCreditNotice.value = result?.outcome === 'alreadyRedeemed' ? t('cred.resetModal.alreadyRedeemed') : t('cred.resetModal.accepted')
      toast.add({ title: t('cred.resetModal.completed'), description: resetCreditNotice.value, color: 'success' })
      if (detailsTarget.value?.id === id) accountQuotaDetail.value = null
      await collectAccountQuota()
      if (detailsTarget.value?.id === id) await refreshAccountQuota()
    } catch (error) {
      resetCreditError.value = resetCreditAttempt.value
        ? t('cred.resetModal.mayHaveConsumed', { error: message(error) })
        : message(error)
    } finally { resetCreditSubmitting.value = false }
  }

  return {
    resetCreditOpen, resetCreditTarget, resetCreditAttempts, resetCreditSubmitting, resetCreditError, resetCreditNotice,
    resetCreditNoticeColor, resetCreditNoticeCredential, resetCreditSupported, canResetCredit, resetCreditDisabledReason,
    canConfirmResetCredit, openResetCredit, handleResetCreditOpen, redeemResetCredit
  }
}
