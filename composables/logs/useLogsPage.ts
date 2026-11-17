import { inject, provide, type InjectionKey } from 'vue'
import { useAdminI18n } from '~/composables/useAdminI18n'
import { useApi } from '~/composables/useApi'
import { useDataSync } from '~/composables/useDataSync'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { createLogFormatters, levelColor, rowValue, validErrorLogName } from './format'
import { createLogsWorkspace } from './useLogsWorkspace'

/**
 * Shared state for the admin logs page (/admin/logs).
 *
 * The page calls `provideLogsPage()` once; sections and dialogs call `useLogsPage()`.
 * Workspace refs are created only inside `createLogsWorkspace`, once per page owner.
 */
function createLogsPage() {
  const { fetchAPI, token } = useApi()
  const { t, intlLocale } = useAdminI18n()
  const workspace = createLogsWorkspace({ fetchAPI, token, t, useWorkspaceState, useDataSync })
  return { t, rowValue, levelColor, validErrorLogName, ...createLogFormatters({ t, intlLocale }), ...workspace }
}

const logsPageKey: InjectionKey<ReturnType<typeof createLogsPage>> = Symbol('logs-page')

export function provideLogsPage() {
  const page = createLogsPage()
  provide(logsPageKey, page)
  return page
}

export function useLogsPage() {
  const page = inject(logsPageKey)
  if (!page) throw new Error('useLogsPage() must be used inside pages/admin/logs.vue')
  return page
}
