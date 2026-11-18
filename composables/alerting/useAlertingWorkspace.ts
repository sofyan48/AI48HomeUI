import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useApi, useAdminI18n } from '#imports'
import { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import {
  alertingErrorMessage, emptyChannelForm, isAlertingUnsupported,
  type AlertChannel, type AlertChannelForm, type AlertSettings, type AlertState,
} from './types'

function createAlertingWorkspace() {
  const { fetchAPI } = useApi()
  const { t } = useAdminI18n()
  const toast = useAdminToast()

  const loading = useWorkspaceState<boolean>('admin:alerting:loading', () => false)
  const unsupported = useWorkspaceState<boolean>('admin:alerting:unsupported', () => false)
  const errorMessage = useWorkspaceState<string>('admin:alerting:errorMessage', () => '')
  const settings = useWorkspaceState<AlertSettings | null>('admin:alerting:settings', () => null)
  const channels = useWorkspaceState<AlertChannel[]>('admin:alerting:channels', () => [])
  const alerts = useWorkspaceState<AlertState[]>('admin:alerting:alerts', () => [])

  // Transient form state stays local to the mounted page.
  const settingsDraft = ref<AlertSettings | null>(null)
  const savingSettings = ref(false)
  const evaluating = ref(false)
  const resolvingKey = ref<string | null>(null)
  const testingId = ref<number | null>(null)
  const channelFormOpen = ref(false)
  const channelSaving = ref(false)
  const channelFormError = ref('')
  const editingChannel = ref<AlertChannel | null>(null)
  const channelForm = ref<AlertChannelForm>(emptyChannelForm())
  const deleteTarget = ref<AlertChannel | null>(null)
  const deleting = ref(false)
  const deleteError = ref('')

  const enabledChannelCount = computed(() => channels.value.filter(channel => channel.enabled).length)

  async function loadAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      const [settingsResponse, channelsResponse, alertsResponse] = await Promise.all([
        fetchAPI<{ settings: AlertSettings }>('/alerting/settings'),
        fetchAPI<{ items: AlertChannel[] }>('/alerting/channels'),
        fetchAPI<{ items: AlertState[] }>('/alerting/alerts'),
      ])
      unsupported.value = false
      settings.value = settingsResponse.settings
      settingsDraft.value = { ...settingsResponse.settings }
      channels.value = Array.isArray(channelsResponse.items) ? channelsResponse.items : []
      alerts.value = Array.isArray(alertsResponse.items) ? alertsResponse.items : []
    } catch (error) {
      if (isAlertingUnsupported(error)) unsupported.value = true
      else errorMessage.value = alertingErrorMessage(error, t('alerting.loadFailed'))
    } finally {
      loading.value = false
    }
  }

  async function loadAlerts() {
    try {
      const response = await fetchAPI<{ items: AlertState[] }>('/alerting/alerts')
      alerts.value = Array.isArray(response.items) ? response.items : []
    } catch (error) {
      errorMessage.value = alertingErrorMessage(error, t('alerting.loadFailed'))
    }
  }

  async function saveSettings() {
    if (!settingsDraft.value || savingSettings.value) return
    savingSettings.value = true
    try {
      const response = await fetchAPI<{ settings: AlertSettings }>('/alerting/settings', { method: 'PUT', body: settingsDraft.value })
      settings.value = response.settings
      settingsDraft.value = { ...response.settings }
      toast.add({ title: t('alerting.settings.saved'), color: 'success' })
    } catch (error) {
      toast.add({ title: t('alerting.settings.saveFailed'), description: alertingErrorMessage(error, ''), color: 'error' })
    } finally {
      savingSettings.value = false
    }
  }

  function resetSettings() {
    if (settings.value) settingsDraft.value = { ...settings.value }
  }

  async function evaluateNow() {
    if (evaluating.value) return
    evaluating.value = true
    try {
      await fetchAPI('/alerting/evaluate', { method: 'POST' })
      await loadAlerts()
      toast.add({ title: t('alerting.evaluate.done'), color: 'success' })
    } catch (error) {
      toast.add({ title: t('alerting.evaluate.failed'), description: alertingErrorMessage(error, ''), color: 'error' })
    } finally {
      evaluating.value = false
    }
  }

  function openCreateChannel() {
    editingChannel.value = null
    channelForm.value = emptyChannelForm()
    channelFormError.value = ''
    channelFormOpen.value = true
  }

  function openEditChannel(channel: AlertChannel) {
    editingChannel.value = channel
    channelForm.value = {
      name: channel.name, type: channel.type, enabled: channel.enabled,
      bot_token: '', chat_id: channel.chat_id, thread_id: channel.thread_id, webhook_url: '',
    }
    channelFormError.value = ''
    channelFormOpen.value = true
  }

  function validateChannelForm(form: AlertChannelForm, editing: AlertChannel | null): string {
    if (!form.name.trim()) return t('alerting.channel.error.name')
    if (form.type === 'telegram') {
      if (!form.chat_id.trim()) return t('alerting.channel.error.chatId')
      if (!form.bot_token.trim() && !editing?.bot_token_set) return t('alerting.channel.error.botToken')
    } else {
      const url = form.webhook_url.trim()
      if (!url && !editing?.webhook_url_set) return t('alerting.channel.error.webhook')
      if (url && !url.toLowerCase().startsWith('https://')) return t('alerting.channel.error.webhookHttps')
    }
    return ''
  }

  async function saveChannel() {
    if (channelSaving.value) return
    const form = channelForm.value
    const editing = editingChannel.value
    const validation = validateChannelForm(form, editing)
    if (validation) { channelFormError.value = validation; return }
    channelSaving.value = true
    channelFormError.value = ''
    const body = form.type === 'telegram'
      ? { name: form.name.trim(), type: form.type, enabled: form.enabled, bot_token: form.bot_token.trim(), chat_id: form.chat_id.trim(), thread_id: form.thread_id.trim() }
      : { name: form.name.trim(), type: form.type, enabled: form.enabled, webhook_url: form.webhook_url.trim() }
    try {
      if (editing) await fetchAPI(`/alerting/channels/${editing.id}`, { method: 'PATCH', body })
      else await fetchAPI('/alerting/channels', { method: 'POST', body })
      channelFormOpen.value = false
      toast.add({ title: editing ? t('alerting.channel.updated') : t('alerting.channel.created'), color: 'success' })
      await loadChannels()
    } catch (error) {
      channelFormError.value = alertingErrorMessage(error, t('alerting.channel.saveFailed'))
    } finally {
      channelSaving.value = false
    }
  }

  async function loadChannels() {
    const response = await fetchAPI<{ items: AlertChannel[] }>('/alerting/channels')
    channels.value = Array.isArray(response.items) ? response.items : []
  }

  async function toggleChannel(channel: AlertChannel, enabled: boolean) {
    try {
      await fetchAPI(`/alerting/channels/${channel.id}`, { method: 'PATCH', body: { enabled } })
      await loadChannels()
    } catch (error) {
      toast.add({ title: t('alerting.channel.saveFailed'), description: alertingErrorMessage(error, ''), color: 'error' })
    }
  }

  async function testChannel(channel: AlertChannel) {
    if (testingId.value !== null) return
    testingId.value = channel.id
    try {
      await fetchAPI(`/alerting/channels/${channel.id}/test`, { method: 'POST' })
      toast.add({ title: t('alerting.channel.testSent'), description: channel.name, color: 'success' })
    } catch (error) {
      toast.add({ title: t('alerting.channel.testFailed'), description: alertingErrorMessage(error, ''), color: 'error' })
    } finally {
      testingId.value = null
    }
  }

  function askDeleteChannel(channel: AlertChannel) {
    deleteError.value = ''
    deleteTarget.value = channel
  }

  async function confirmDeleteChannel() {
    const target = deleteTarget.value
    if (!target || deleting.value) return
    deleting.value = true
    deleteError.value = ''
    try {
      await fetchAPI(`/alerting/channels/${target.id}`, { method: 'DELETE' })
      deleteTarget.value = null
      toast.add({ title: t('alerting.channel.deleted'), color: 'success' })
      await loadChannels()
    } catch (error) {
      deleteError.value = alertingErrorMessage(error, t('alerting.channel.deleteFailed'))
    } finally {
      deleting.value = false
    }
  }

  async function resolveAlert(alert: AlertState) {
    if (resolvingKey.value !== null) return
    resolvingKey.value = alert.key
    try {
      await fetchAPI('/alerting/alerts/resolve', { method: 'POST', body: { key: alert.key } })
      alerts.value = alerts.value.filter(item => item.key !== alert.key)
      toast.add({ title: t('alerting.alerts.resolved'), color: 'success' })
      await loadAlerts()
    } catch (error) {
      toast.add({ title: t('alerting.alerts.resolveFailed'), description: alertingErrorMessage(error, ''), color: 'error' })
    } finally {
      resolvingKey.value = null
    }
  }

  async function forgetNode(alert: AlertState) {
    try {
      await fetchAPI(`/alerting/nodes/${encodeURIComponent(alert.subject)}`, { method: 'DELETE' })
      toast.add({ title: t('alerting.alerts.nodeForgotten'), color: 'success' })
      await loadAlerts()
    } catch (error) {
      toast.add({ title: t('alerting.alerts.forgetFailed'), description: alertingErrorMessage(error, ''), color: 'error' })
    }
  }

  return {
    t, loading, unsupported, errorMessage, settings, settingsDraft, channels, alerts, enabledChannelCount,
    savingSettings, evaluating, testingId, channelFormOpen, channelSaving, channelFormError, editingChannel, channelForm,
    deleteTarget, deleting, deleteError, resolvingKey, resolveAlert,
    loadAll, loadAlerts, saveSettings, resetSettings, evaluateNow,
    openCreateChannel, openEditChannel, saveChannel, toggleChannel, testChannel, askDeleteChannel, confirmDeleteChannel, forgetNode,
  }
}

const alertingWorkspaceKey: InjectionKey<ReturnType<typeof createAlertingWorkspace>> = Symbol('alerting-workspace')

export function provideAlertingWorkspace() {
  // Created once in the page scope so child sections share the same workspace generation.
  const workspace = createAlertingWorkspace()
  provide(alertingWorkspaceKey, workspace)
  return workspace
}

export function useAlertingWorkspace() {
  const workspace = inject(alertingWorkspaceKey)
  if (!workspace) throw new Error('Alerting workspace is not provided')
  return workspace
}
