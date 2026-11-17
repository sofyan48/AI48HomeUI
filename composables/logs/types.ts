import type { Ref } from 'vue'
import type { useApi } from '../useApi'
import type { useAdminI18n } from '../useAdminI18n'
import type { useWorkspaceState } from '../useWorkspaceState'
import type { useDataSync } from '../useDataSync'

export type LogsView = 'events' | 'request-logs' | 'error-logs' | 'application'
export type ApplicationLogMode = 'pages' | 'tail'
export type LogRecordId = string | number
export type LogTranslator = ReturnType<typeof useAdminI18n>['t']

export interface LogsDependencies {
  fetchAPI: ReturnType<typeof useApi>['fetchAPI']
  useWorkspaceState: typeof useWorkspaceState
}

export interface PagedLogsDependencies extends LogsDependencies {
  pageSize: Readonly<Ref<number>>
}

export interface LogActionDependencies extends LogsDependencies {
  t: LogTranslator
  errorMessage: Ref<string>
}

export interface LogsWorkspaceDependencies extends LogsDependencies {
  token: ReturnType<typeof useApi>['token']
  t: LogTranslator
  useDataSync: typeof useDataSync
}

export interface RequestFilters {
  from: string
  to: string
  provider: string
  model: string
  status: string
  search: string
}

export interface ApplicationFilters {
  search: string
  after: string
  before: string
  level: string
  home_ip: string
  client_ip: string
  request_id: string
}

export interface ApplicationLog {
  id: LogRecordId
  timestamp: string
  line?: string
  level?: string
  home_ip?: string
  home_port?: number | null
  client_ip?: string
  request_id?: string
  created_at?: string
}

// Older Home versions may omit cursor/search metadata or return empty collections as null.
export interface ApplicationLogsResponse {
  logs?: ApplicationLog[] | null
  total?: number
  anchor_id?: LogRecordId
  before_id?: LogRecordId
  after_id?: LogRecordId
  search?: string
  limit?: number
  offset?: number
}

export interface LogListResponse<T> {
  items?: T[] | null
  total?: number
  limit?: number
  offset?: number
  sort?: string
}

export interface RequestLog {
  request_id?: string
  timestamp?: string
  file_name?: string | null
  provider?: string
  model?: string
  status?: string
  home_ip?: string | null
  home_port?: number | null
  available?: boolean
  download_url?: string | null
}

export interface RequestEvent {
  id: string
  timestamp?: string
  request_id?: string
  event_type?: string
  status?: string
  failed?: boolean
  status_code?: number | null
  provider?: string
  model?: string
  endpoint?: string
  stream?: boolean
  runtime?: {
    home_ip?: string | null
    home_port?: number | null
    home_id?: string | null
    cpa_label?: string | null
    cpa_node_id?: string | null
    cpa_ip?: string | null
    cpa_port?: number | null
  }
  credential?: {
    credential_type?: string
    credential_id?: string
    label?: string
  }
  client?: {
    username?: string
    client_key_label?: string
    client_ip?: string | null
  }
  error?: {
    message?: string | null
    reason?: string | null
    body_preview?: string | null
    status_code?: number | null
    upstream_status_code?: number | null
  }
  tokens?: {
    input_tokens?: number
    output_tokens?: number
    reasoning_tokens?: number
    cached_tokens?: number
    cache_read_tokens?: number
    cache_creation_tokens?: number
    total_tokens?: number
  }
  performance?: {
    latency_ms?: number
    ttft_ms?: number | null
    tps?: number | null
  }
  billing?: {
    amount?: number | null
    currency?: string | null
  }
  related?: {
    usage_record_id?: string
    request_log?: RequestLog
  }
}

export interface RequestEventDetail {
  event?: RequestEvent
  payload_summary?: {
    method?: string
    stream?: boolean
    message_count?: number
    tool_count?: number
  } | null
  log_excerpt?: string[]
}

export interface ErrorLogFile {
  name: string
  size?: number | null
  modified?: number
}

export interface ErrorLogsResponse {
  files?: ErrorLogFile[] | null
}

// Error values are untrusted at catch boundaries; this describes only the fields used by logs.
export interface LogApiError {
  statusCode?: number
  data?: { message?: string; error?: string } | null
  message?: string
}
