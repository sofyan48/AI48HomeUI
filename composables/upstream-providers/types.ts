import type { Ref } from 'vue'
import type { useApi } from '~/composables/useApi'
import type { useAdminI18n } from '~/composables/useAdminI18n'
import type { useAdminToast } from '~/composables/admin-feedback/useAdminToast'
import type { useProviderEditorState } from './useProviderEditorState'

export type Translate = ReturnType<typeof useAdminI18n>['t']
export type FetchAPI = ReturnType<typeof useApi>['fetchAPI']
export type AdminToast = ReturnType<typeof useAdminToast>
export type ProviderEditor = ReturnType<typeof useProviderEditorState>
export type ProviderRoute = 'gemini-api-key' | 'interactions-api-key' | 'claude-api-key' | 'codex-api-key' | 'xai-api-key' | 'meta-api-key' | 'vertex-api-key' | 'openai-compatibility'
export type NumericInput = number | string
export type InheritedPolicy = 'inherit' | 'enabled' | 'disabled'

export interface ConnectionPool {
  [field: string]: unknown
  enabled?: boolean
  'idle-conn-timeout'?: string
  'max-idle-conns-per-host'?: number
}
export interface Cloak {
  [field: string]: unknown
  mode?: string
  'strict-mode'?: boolean
  'cache-user-id'?: boolean
  'sensitive-words'?: string[]
  'sensitive-words-replace'?: Record<string, string>
  'sensitive-patterns-replace'?: Array<{ pattern: string; replacement?: string }>
}
export interface ProviderModel {
  [field: string]: unknown
  name: string
  alias?: string
  'display-name'?: string
  'force-mapping'?: boolean
  'max-context-length'?: NumericInput
  'input-modalities'?: string[]
  'output-modalities'?: string[]
  thinking?: { [field: string]: unknown; min?: NumericInput; max?: NumericInput }
}

// Retain unexposed API fields when editing and regrouping credentials.
export interface ProviderCredential {
  [field: string]: unknown
  id?: string
  uuid?: string
  auth_index?: string
  'auth-index'?: string
  identifier?: string
  name?: string
  'api-key'?: string
  'base-url'?: string
  base_url?: string
  'proxy-url'?: string
  proxy_url?: string
  priority?: NumericInput
  weight?: NumericInput
  disabled?: boolean
  prefix?: string
  headers?: Record<string, unknown>
  models?: ProviderModel[]
  'excluded-models'?: string[]
  'request-retry'?: number | null
  'request-scoped-errors'?: Array<Record<string, unknown>> | null
  'disable-cooling'?: boolean | null
  'disable-codex-cloaking'?: boolean | null
  'support-prompt-cache-key'?: boolean
  websockets?: boolean
  'test-model'?: string
  cloak?: Cloak
  'connection-pool'?: ConnectionPool
  interactions?: boolean
}
export interface ProviderGroup extends ProviderCredential {
  keys?: ProviderCredential[]
}
export interface ProviderEntry extends ProviderCredential {
  'api-key-entries'?: ProviderCredential[]
  __v8Group?: ProviderGroup
  __v8Key?: ProviderCredential | null
  __v8GroupIndex?: number
  __v8KeyIndex?: number
  '__set:connection-pool'?: ConnectionPool | null
  '__set:interactions'?: boolean | null
}
export type ProviderForm = ProviderEntry & { models: ProviderModel[] }
export interface ProviderCategory {
  value: ProviderRoute
  path: string
  template: ProviderForm
  mark?: string
}
export interface CompatKeyRow {
  rowId: number
  source: ProviderCredential
  secret: string
  proxy: string
  weight: NumericInput
}
export interface EditorOptions {
  t: Translate
  selectedProviderRoute: Ref<ProviderRoute>
}
export interface ProviderRequestOptions extends EditorOptions {
  fetchAPI: FetchAPI
  editor: ProviderEditor
}
export interface ProxyResponse {
  status_code?: number
  body: string
}
export interface DiscoveredModel {
  name: string
  displayName: string
  description: string
}

export function errorMessage(error: unknown, fallback: string, includeData = false): string {
  const record = error != null && typeof error === 'object' ? error as Record<string, unknown> : undefined
  const data = includeData && record?.data != null && typeof record.data === 'object' ? record.data as Record<string, unknown> : undefined
  const message = data?.message || data?.error || record?.message
  return typeof message === 'string' && message ? message : fallback
}
