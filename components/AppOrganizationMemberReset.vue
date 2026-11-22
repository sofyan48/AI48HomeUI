<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import AppButton from '~/components/AppButton.vue'
import AppModal from '~/components/AppModal.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { FieldGroup } from '~/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { localResetExpiry, memberCanReset, memberResetPolicy, type MemberResetPolicy, type MemberResetRecord } from '~/composables/organizations/memberResetAllowance'
import { enabledSpendWindows } from '~/composables/organizations/memberLimits'
import { organizationErrorMessage } from '~/composables/organizations/types'

const props = defineProps<{
  member: MemberResetRecord
  canConfigure?: boolean
  inlineConfigure?: boolean
  save: (body: MemberResetPolicy, signal: AbortSignal) => Promise<unknown>
  reset: (signal: AbortSignal) => Promise<unknown>
}>()
const { t, intlLocale } = usePortalI18n()
const configureOpen = ref(false)
const confirmOpen = ref(false)
const pending = ref(false)
const error = ref('')
const success = ref('')
const mode = ref('one_time')
const amount = ref('0')
const expiry = ref('')
const invalid = ref<'amount' | 'expiry' | null>(null)
const controller = new AbortController()
onScopeDispose(() => controller.abort())
const allowance = computed(() => props.member.reset_allowance)
const windows = computed(() => enabledSpendWindows(props.member.spend_windows ?? []))
const canReset = computed(() => memberCanReset(props.member))
const oneTime = computed(() => allowance.value?.mode === 'one_time')
const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—'
}
watch(() => props.inlineConfigure || configureOpen.value, open => {
  if (!open) return
  mode.value = allowance.value?.mode === 'monthly' ? 'monthly' : 'one_time'
  amount.value = String(allowance.value?.amount ?? 0)
  expiry.value = localResetExpiry(allowance.value?.expires_at)
  error.value = ''; invalid.value = null; success.value = ''
}, { immediate: true })
async function submit() {
  if (pending.value || !props.canConfigure) return
  const result = memberResetPolicy(mode.value, amount.value, expiry.value)
  invalid.value = result.ok ? null : result.field
  if (!result.ok) return
  await run(() => props.save(result.body, controller.signal), 'org.reset.saved')
}
async function consume() {
  if (pending.value || !canReset.value) return
  await run(() => props.reset(controller.signal), 'ws.reset.done')
}
async function run(action: () => Promise<unknown>, message: 'org.reset.saved' | 'ws.reset.done') {
  pending.value = true; error.value = ''; success.value = ''
  try {
    await action()
    if (controller.signal.aborted) return
    configureOpen.value = false; confirmOpen.value = false
    success.value = t(message)
  } catch (cause) {
    if (!controller.signal.aborted) error.value = organizationErrorMessage(cause, t('org.reset.failed'))
  } finally { pending.value = false }
}
</script>

<template>
  <section class="flex flex-col gap-2" :aria-label="t('org.reset.title')" :aria-busy="pending">
    <p class="text-xs">{{ t('org.reset.title') }} · {{ t('ws.reset.available', { count: allowance?.available ?? '—' }) }}</p>
    <p v-if="allowance" class="text-xs text-muted-foreground">{{ allowance.mode === 'monthly' ? t('ws.reset.monthly', { amount: allowance.amount }) : allowance.mode === 'one_time' ? t('ws.reset.oneTime') : t('ws.reset.none') }}</p>
    <p v-if="oneTime" class="text-xs text-muted-foreground">{{ t('org.reset.amount') }}: {{ allowance?.amount }}</p>
    <p v-if="allowance?.renews_at" class="text-xs text-muted-foreground">{{ t('ws.reset.renews', { date: formatDate(allowance.renews_at) }) }}</p>
    <p v-if="allowance?.expires_at" class="text-xs text-muted-foreground">{{ t('ws.reset.expires', { date: formatDate(allowance.expires_at) }) }}</p>
    <p v-for="window in windows" :key="window.id" class="text-xs text-muted-foreground">{{ window.id }} · {{ window.used }} / {{ window.limit ?? '∞' }}</p>

    <div v-if="!inlineConfigure" class="flex flex-wrap gap-2">
      <AppButton v-if="canConfigure" size="xs" color="neutral" variant="outline" :disabled="pending" @click="configureOpen = true">{{ t('org.reset.configure') }}</AppButton>
      <AppButton size="xs" variant="outline" :disabled="pending || !canReset" @click="error = ''; success = ''; confirmOpen = true">{{ t('ws.reset.button') }}</AppButton>
    </div>
    <p v-if="success" role="status" class="text-xs">{{ success }}</p>
    <div v-if="inlineConfigure && canConfigure">
        <p class="mb-3 text-xs text-muted-foreground">{{ t('org.reset.replaceHint') }}</p>
        <FieldGroup>
          <PortalField :label="t('org.reset.mode')">
            <ToggleGroup v-model="mode" type="single" variant="outline" :disabled="pending" :aria-label="t('org.reset.mode')">
              <ToggleGroupItem value="one_time">{{ t('org.reset.oneTime') }}</ToggleGroupItem>
              <ToggleGroupItem value="monthly">{{ t('org.reset.monthly') }}</ToggleGroupItem>
            </ToggleGroup>
          </PortalField>
          <PortalField :label="t('org.reset.amount')" :error="invalid === 'amount' ? t('org.reset.invalidAmount') : undefined">
            <PortalInput v-model="amount" type="number" min="0" step="1" :disabled="pending" />
          </PortalField>
          <PortalField v-if="mode === 'one_time'" :label="t('org.reset.expiry')" :description="t('org.reset.localTime')" :error="invalid === 'expiry' ? t('org.reset.invalidExpiry') : undefined">
            <PortalInput v-model="expiry" type="datetime-local" :disabled="pending" />
          </PortalField>
        </FieldGroup>
        <PortalAlert v-if="error" class="mt-3" color="error" :description="error" />
        <AppButton type="button" class="mt-3" size="sm" :loading="pending" :disabled="pending" @click="submit">{{ t('org.reset.configure') }}</AppButton>
    </div>
    <AppModal v-else v-model:open="configureOpen" :title="t('org.reset.configure')" :dismissible="!pending" :close="!pending">
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <p class="text-sm text-muted-foreground">{{ t('org.reset.replaceHint') }}</p>
          <FieldGroup>
            <PortalField :label="t('org.reset.mode')">
              <ToggleGroup v-model="mode" type="single" variant="outline" :disabled="pending" :aria-label="t('org.reset.mode')">
                <ToggleGroupItem value="one_time">{{ t('org.reset.oneTime') }}</ToggleGroupItem>
                <ToggleGroupItem value="monthly">{{ t('org.reset.monthly') }}</ToggleGroupItem>
              </ToggleGroup>
            </PortalField>
            <PortalField :label="t('org.reset.amount')" :error="invalid === 'amount' ? t('org.reset.invalidAmount') : undefined">
              <PortalInput v-model="amount" type="number" min="0" step="1" :disabled="pending" />
            </PortalField>
            <PortalField v-if="mode === 'one_time'" :label="t('org.reset.expiry')" :description="t('org.reset.localTime')" :error="invalid === 'expiry' ? t('org.reset.invalidExpiry') : undefined">
              <PortalInput v-model="expiry" type="datetime-local" :disabled="pending" />
            </PortalField>
          </FieldGroup>
          <PortalAlert v-if="error" color="error" :description="error" />
          <div class="flex justify-end gap-2">
            <AppButton type="button" color="neutral" variant="outline" :disabled="pending" @click="configureOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton type="submit" :loading="pending" :disabled="pending">{{ t('common.save') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>
    <AppModal v-model:open="confirmOpen" :title="t('ws.reset.confirmTitle')" :dismissible="!pending" :close="!pending">
      <template #body>
        <div class="flex flex-col gap-4">
          <p>{{ t('org.reset.confirm') }}</p>
          <PortalAlert v-if="error" color="error" :description="error" />
          <div class="flex justify-end gap-2">
            <AppButton color="neutral" variant="outline" :disabled="pending" @click="confirmOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton :loading="pending" :disabled="pending || !canReset" @click="consume">{{ t('ws.reset.use') }}</AppButton>
          </div>
        </div>
      </template>
    </AppModal>
  </section>
</template>
