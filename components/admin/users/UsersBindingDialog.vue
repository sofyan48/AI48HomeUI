<template>
  <AppFormModal
    v-model:open="open"
    :title="kind === 'credential' ? t('users.addCredentialBinding') : t('users.addModelBinding')"
    :description="kind === 'credential' ? t('users.addCredentialBindingDescription') : t('users.addModelBindingDescription')"
    :error="formError"
    :submit-label="t('users.addBinding')"
    :loading="saving"
    :submit-disabled="submitDisabled"
    :cancel-disabled="saving"
    content-class="sm:max-w-xl"
    divided
    @submit="submit"
  >
    <div>
      <p class="text-sm font-medium">{{ t('users.scope') }}</p>
      <div class="mt-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2 text-sm">{{ groupName }}</div>
    </div>
    <UsersCandidatePicker
      :kind="kind"
      :items="candidates"
      :selected="selection"
      :search="search"
      :source-filter="sourceFilter"
      :pending="kind === 'model' ? modelPending : credentialPending"
      :issue-message="kind === 'model' ? modelIssue : credentialIssue"
      :error-message="kind === 'model' ? modelError : credentialError"
      :mutating="saving"
      @update:search="search = $event"
      @update:source-filter="sourceFilter = $event"
      @update:selected="selection = Array.isArray($event) ? [...$event] : []"
      @retry="kind === 'model' ? loadModels() : loadCredentials()"
      @clear-error="formError = ''"
    />
    <template v-if="kind === 'model' && modelChannelBindingsSupported">
      <UsersScopePicker
        :title="t('users.credentialScope')"
        :empty-label="t('users.noCredentialScopes')"
        :items="channelOptions"
        :selected="channels"
        @toggle="toggleId(channels, $event)"
      />
      <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.inheritScopeHint') }}</p>
    </template>
  </AppFormModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UsersCandidatePicker from './UsersCandidatePicker.vue'
import UsersScopePicker from './UsersScopePicker.vue'
import { useBindingCandidates } from '~/composables/users/useBindingCandidates'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import { listFrom, toggleId, uniquePositiveIds, type AnyRecord } from '~/composables/users/common'
import { credentialAuthId } from '~/composables/users/normalize'

type BindingKind = 'credential' | 'model'

const workspace = useUsersWorkspace()
const {
  t, fetchAPI, toast, saving, modelChannelBindingsSupported, channelOptions, modelGroupsData, modelDetailsData,
  channelDetailsFor, modelDetailsFor, errorMessage, syncAll
} = workspace
const {
  credentials, models, loadCredentials, loadModels,
  credentialPending, credentialIssue, credentialError, modelPending, modelIssue, modelError
} = useBindingCandidates(workspace)

const open = ref(false)
const kind = ref<BindingKind>('credential')
const group = ref<AnyRecord | null>(null)
const search = ref('')
const selection = ref<string[]>([])
const channels = ref<number[]>([])
const sourceFilter = ref('all')
const formError = ref('')

const groupName = computed(() => group.value ? (kind.value === 'credential' ? group.value.channel_name : group.value.group_name) : '')

const candidates = computed(() => {
  if (!group.value) return []
  if (kind.value === 'credential') {
    const bound = new Set(channelDetailsFor(group.value.id).map(item => String(item.auth_id)))
    return credentials.value.map((item) => {
      const value = credentialAuthId(item)
      const unavailable = Boolean(item.disabled || item.unavailable)
      const provider = item.provider || item.providerId || item.type || 'credential'
      return {
        id: `${item.source || 'credential'}:${value}`,
        value,
        label: item.label || item.email || item.account || item.name || item.identifier || value,
        description: value,
        provider,
        type: item.type || '',
        status: item.status || '',
        scopes: [],
        disabled: bound.has(value) || unavailable,
        // Badge values stay English: UsersCandidatePicker maps them to colors and translations.
        badges: [provider, ...(bound.has(value) ? ['Bound'] : unavailable ? ['Unavailable'] : [])]
      }
    }).filter(item => item.value)
  }
  const bound = new Set(modelDetailsFor(group.value.id).map(item => String(item.model_id)))
  return models().map(item => ({
    ...item,
    value: item.modelId,
    description: item.modelId,
    disabled: bound.has(item.modelId),
    badges: [
      ...item.scopes.map(scope => scope === 'available' ? 'Available' : 'Static catalog'),
      ...(item.channel ? [item.channel] : []),
      ...(bound.has(item.modelId) ? ['Bound'] : [])
    ]
  }))
})

const submitDisabled = computed(() => saving.value || !group.value?.id || (kind.value === 'model'
  ? modelPending.value || !!modelError.value
  : credentialPending.value || !!credentialError.value))

function openFor(nextKind: BindingKind, target: AnyRecord) {
  kind.value = nextKind
  group.value = target
  search.value = ''
  selection.value = []
  channels.value = []
  sourceFilter.value = 'all'
  formError.value = ''
  open.value = true
  if (nextKind === 'model') void loadModels()
  else void loadCredentials()
}

async function loadModelGroupDetails(groupId: number) {
  const response = await fetchAPI('/model-group-details', { query: { model_group_id: groupId } })
  const details = listFrom(response, ['model_group_details', 'items'])
  modelDetailsData.value = [...modelDetailsData.value.filter(item => Number(item.model_group_id) !== groupId), ...details]
  return details
}

async function refreshModelScope(groupId: number) {
  const [, groups] = await Promise.allSettled([loadModelGroupDetails(groupId), fetchAPI('/model-groups')])
  if (groups.status === 'fulfilled') modelGroupsData.value = listFrom(groups.value, ['model_groups', 'items'])
}

async function addModelBindings(targets: string[]) {
  const groupId = Number(group.value!.id)
  await loadModelGroupDetails(groupId)
  const nowBound = new Set(modelDetailsFor(groupId).map(item => String(item.model_id).trim()))
  if (targets.some(target => nowBound.has(target))) throw new Error(t('users.modelAlreadyBound'))
  const scopeChannels = modelChannelBindingsSupported.value ? uniquePositiveIds(channels.value) : []
  const bodies = targets.map(modelId => ({
    model_group_id: groupId,
    model_id: modelId,
    ...(scopeChannels.length ? { channels: scopeChannels } : {})
  }))
  if (bodies.length === 1) {
    await fetchAPI('/model-group-details', { method: 'POST', body: bodies[0] })
    await refreshModelScope(groupId)
    open.value = false
    toast.add({ title: t('users.bindingAdded'), color: 'success' })
    return
  }
  const results = await Promise.allSettled(bodies.map(body => fetchAPI('/model-group-details', { method: 'POST', body })))
  await refreshModelScope(groupId)
  const failed = results.flatMap((result, index) =>
    result.status === 'rejected' ? [{ target: targets[index], message: errorMessage(result.reason) }] : [])
  const created = results.length - failed.length
  if (failed.length) {
    if (created) toast.add({ title: t('users.bindingsPartiallyAdded', { created, failed: failed.length }), color: 'warning' })
    throw new Error(t('users.bindingsFailedDetail', { count: failed.length, target: failed[0].target, message: failed[0].message }))
  }
  open.value = false
  toast.add({ title: t('users.bindingsAdded', { count: created }), color: 'success' })
}

async function addCredentialBindings(targets: string[]) {
  const failed: string[] = []
  let created = 0
  for (const target of targets) {
    try {
      await fetchAPI('/channel-group-details', {
        method: 'POST',
        body: { channel_group_id: Number(group.value!.id), auth_id: target }
      })
      created++
    } catch (error) {
      failed.push(`${target}: ${errorMessage(error)}`)
    }
  }
  await syncAll()
  if (failed.length) {
    if (created) {
      toast.add({ title: t('users.bindingsAddedCount', { count: created }), description: t('users.failedCount', { count: failed.length }), color: 'warning' })
    }
    formError.value = failed.join(' | ')
    return
  }
  open.value = false
  toast.add({ title: created === 1 ? t('users.bindingAdded') : t('users.bindingsAdded', { count: created }), color: 'success' })
}

async function submit() {
  if (!group.value?.id) {
    formError.value = t('users.selectValidScope')
    return
  }
  const targets = [...new Set(selection.value.map(value => String(value || '').trim()).filter(Boolean))]
  if (!targets.length) {
    formError.value = kind.value === 'credential' ? t('users.selectAtLeastOneCredential') : t('users.selectAtLeastOneModel')
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (kind.value === 'model') await addModelBindings(targets)
    else await addCredentialBindings(targets)
  } catch (error) {
    formError.value = errorMessage(error)
  } finally {
    saving.value = false
  }
}

defineExpose({ openFor })
</script>
