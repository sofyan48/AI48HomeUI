<template>
  <AppButton color="neutral" variant="outline" icon="i-tabler-list-details" @click="start">
    {{ t('keys.replace.button') }}
  </AppButton>
  <USlideover
    v-model:open="open"
    :title="t('keys.replace.title')"
    :description="t('keys.replace.description')"
    :dismissible="!saving"
    :close="saving ? false : { 'aria-label': t('keys.replace.closeAria') }"
    :ui="{ content: 'w-full sm:max-w-2xl', body: 'min-h-0 overflow-y-auto', footer: 'shrink-0' }"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert color="warning" variant="subtle" :title="t('keys.replace.alertTitle')" :description="t('keys.replace.alertDescription')" />
        <p class="text-sm text-[var(--ui-text-muted)]">
          {{ t('keys.replace.explanation') }}
        </p>
        <UAlert v-if="error" role="alert" color="error" variant="subtle" :description="error" />
        <p v-if="loading" role="status" class="text-sm text-[var(--ui-text-muted)]">{{ t('keys.replace.loadingSnapshot') }}</p>
        <AppButton v-if="error && !saving" color="neutral" variant="outline" :loading="loading" @click="loadSnapshot(true)">
          {{ t('keys.replace.reloadKeepDraft') }}
        </AppButton>
        <UFormField :label="t('keys.replace.fieldLabel')" :hint="t('keys.replace.fieldHint')" :error="validationError || undefined">
          <UTextarea v-model="draft" :rows="14" class="w-full font-mono" autocomplete="off" autocapitalize="off" :spellcheck="false" :disabled="!snapshot || loading || saving || reviewing" />
        </UFormField>
        <p v-if="plan" role="status" class="text-sm">
          {{ t('keys.replace.planSummary', { kept: plan.kept, added: plan.added, removed: plan.removed, total: plan.total }) }}
        </p>
        <template v-if="reviewing && plan">
          <UAlert color="warning" variant="subtle" :title="plan.total === 0 ? t('keys.replace.confirmRevokeAllTitle') : t('keys.replace.confirmReplaceTitle')" :description="t('keys.replace.confirmDescription', { removed: plan.removed, added: plan.added })" />
          <UCheckbox v-model="acknowledged" :disabled="saving" :label="plan.total === 0 ? t('keys.replace.ackAll') : t('keys.replace.ackReview')" />
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton color="neutral" variant="outline" :disabled="saving" @click="open = false">{{ t('common.cancel') }}</AppButton>
        <AppButton v-if="reviewing" color="neutral" variant="outline" :disabled="saving" @click="reviewing = false; acknowledged = false">{{ t('keys.replace.backToEditor') }}</AppButton>
        <AppButton v-if="reviewing" color="error" :loading="saving" :disabled="!acknowledged || blocked" @click="replaceList">{{ t('keys.replace.confirm') }}</AppButton>
        <AppButton v-else color="error" :disabled="blocked || !plan?.changed" @click="reviewing = true; acknowledged = false">{{ t('keys.replace.review') }}</AppButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { readReplacementSnapshot, planReplacement, type AccessKeySnapshot } from './replacement'

const emit = defineEmits<{ replaced: [] }>()
const { fetchRaw, fetchAPI, token } = useApi()
const toast = useToast()
const { t } = useAdminI18n()
const open = ref(false)
const snapshot = shallowRef<AccessKeySnapshot | null>(null)
const draft = ref('')
const loading = ref(false)
const saving = ref(false)
const reviewing = ref(false)
const acknowledged = ref(false)
const stale = ref(false)
// Error state stores a translation key (or a raw message) so the text follows language switches.
const errorState = ref('')
const error = computed(() => translateError(errorState.value))
let generation = 0

// replacement.ts throws fixed English messages (asserted by its tests); map them to translations here.
function translateReplacementError(message: string) {
  if (/strong ETag/.test(message)) return t('keys.replace.errStrongEtag')
  if (message.startsWith('The key collection could not be read safely')) return t('keys.replace.errUnreadableCollection')
  if (message.startsWith('The key collection contains an unreadable value')) return t('keys.replace.errUnreadableValue')
  if (message.startsWith('The key collection contains duplicate values')) return t('keys.replace.errDuplicateCollection')
  if (message.startsWith('The key collection contains inconsistent lists')) return t('keys.replace.errInconsistent')
  if (message.startsWith('Duplicate key values are not allowed')) return t('keys.replace.errDuplicateInput')
  if (/1 MiB/.test(message)) return t('keys.replace.errTooLarge')
  return message
}

function translateError(value: string) {
  switch (value) {
    case '': return ''
    case 'notExposed': return t('keys.replace.notExposed')
    case 'loadFailed': return t('keys.replace.loadFailed')
    case 'readFailed': return t('keys.replace.readFailed')
    case 'conflict': return t('keys.replace.conflict')
    case 'unavailable': return t('keys.replace.unavailable')
    case 'unconfirmed': return t('keys.replace.unconfirmed')
    default: return translateReplacementError(value)
  }
}
let readController: AbortController | undefined

const result = computed(() => {
  if (!snapshot.value) return { plan: null, error: '' }
  try {
    return { plan: planReplacement(draft.value, snapshot.value), error: '' }
  } catch (error) {
    return { plan: null, error: error instanceof Error ? translateReplacementError(error.message) : t('keys.replace.invalidList') }
  }
})
const plan = computed(() => result.value.plan)
const validationError = computed(() => result.value.error)
const blocked = computed(() => !snapshot.value || !plan.value || loading.value || saving.value || stale.value)

function start() {
  draft.value = ''
  snapshot.value = null
  open.value = true
  void loadSnapshot(false)
}

async function loadSnapshot(keepDraft: boolean) {
  if (loading.value || saving.value) return
  const requestGeneration = ++generation
  readController = new AbortController()
  loading.value = true
  reviewing.value = false
  acknowledged.value = false
  stale.value = true
  errorState.value = ''
  try {
    const response = await fetchRaw('/access/api-keys', { signal: readController.signal })
    const next = readReplacementSnapshot(response._data, response.headers.get('etag'))
    if (requestGeneration !== generation) return
    const hadSnapshot = snapshot.value !== null
    snapshot.value = next
    if (!keepDraft || !hadSnapshot) draft.value = next.values.join('\n')
    stale.value = false
  } catch (cause: any) {
    if (requestGeneration !== generation) return
    errorState.value = cause?.statusCode === 404 || cause?.statusCode === 405
      ? 'notExposed'
      : cause?.statusCode ? 'loadFailed'
        : cause instanceof Error ? cause.message : 'readFailed'
  } finally {
    if (requestGeneration === generation) loading.value = false
  }
}

async function replaceList() {
  if (blocked.value || !reviewing.value || !acknowledged.value || !plan.value) return
  const requestGeneration = generation
  const replacement = plan.value
  saving.value = true
  errorState.value = ''
  try {
    await fetchAPI('/access/api-keys', { method: 'PUT', headers: replacement.headers, body: replacement.body })
    if (requestGeneration !== generation) return
    open.value = false
    toast.add({ title: t('keys.replace.replaced'), color: 'success' })
    emit('replaced')
  } catch (cause: any) {
    if (requestGeneration !== generation) return
    // Never retry an uncertain write or strip If-Match. Reload and review again.
    stale.value = true
    reviewing.value = false
    acknowledged.value = false
    errorState.value = cause?.statusCode === 412
      ? 'conflict'
      : cause?.statusCode === 404 || cause?.statusCode === 405
        ? 'unavailable'
        : 'unconfirmed'
  } finally {
    if (requestGeneration === generation) saving.value = false
  }
}

function clear() {
  generation++
  readController?.abort()
  snapshot.value = null
  draft.value = ''
  errorState.value = ''
  loading.value = false
  saving.value = false
  reviewing.value = false
  acknowledged.value = false
}
watch(open, value => { if (!value) clear() })
watch(token, () => { open.value = false; clear() })
onScopeDispose(clear)
</script>
