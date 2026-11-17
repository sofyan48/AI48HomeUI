// Contracts for Home's /v8/management/alerting endpoints (see AI48Home docs/management/alerting.md).

export type AlertChannelType = 'telegram' | 'teams'

export type AlertRule = 'credential_dead' | 'credential_refresh' | 'credential_cooldown' | 'quota_low' | 'node_offline'

export interface AlertSettings {
  enabled: boolean
  interval_seconds: number
  repeat_minutes: number
  send_resolved: boolean
  credential_dead_enabled: boolean
  credential_refresh_enabled: boolean
  refresh_failure_minutes: number
  credential_cooldown_enabled: boolean
  cooldown_minutes: number
  quota_low_enabled: boolean
  quota_threshold_percent: number
  node_offline_enabled: boolean
  node_offline_seconds: number
  updated_at?: string
}

export interface AlertChannel {
  id: number
  name: string
  type: AlertChannelType
  enabled: boolean
  chat_id: string
  thread_id: string
  bot_token_set: boolean
  bot_token_hint: string
  webhook_url_set: boolean
  webhook_url_hint: string
  created_at: string
  updated_at: string
}

export interface AlertChannelForm {
  name: string
  type: AlertChannelType
  enabled: boolean
  bot_token: string
  chat_id: string
  thread_id: string
  webhook_url: string
}

export interface AlertState {
  key: string
  rule: AlertRule | string
  subject: string
  title: string
  detail: string
  firing: boolean
  first_seen_at: string
  last_notified_at: string | null
  updated_at: string
}

export interface ApiFailure {
  statusCode?: number
  status?: number
  message?: string
  data?: { error?: string, message?: string }
}

export function alertingErrorMessage(error: unknown, fallback: string): string {
  const failure = (error ?? {}) as ApiFailure
  return failure.data?.message || failure.data?.error || failure.message || fallback
}

/** Home builds without the alerting extension answer 404 on these routes. */
export function isAlertingUnsupported(error: unknown): boolean {
  const failure = (error ?? {}) as ApiFailure
  return failure.statusCode === 404 || failure.status === 404
}

export const emptyChannelForm = (): AlertChannelForm => ({
  name: '', type: 'telegram', enabled: true, bot_token: '', chat_id: '', thread_id: '', webhook_url: '',
})
