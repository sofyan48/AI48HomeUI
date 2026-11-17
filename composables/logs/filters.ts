// Filter defaults and query builders for the admin logs page (/admin/logs).

import type { ApplicationFilters, RequestFilters } from './types'

export const allOptionValue = '__all__'

const dateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// The default 7-day window is fixed when the page owner is created, not when this module loads.
export function createRequestFilterDefaults() {
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)
  return (): RequestFilters => ({
    from: dateInputValue(sevenDaysAgo),
    to: dateInputValue(today),
    provider: '',
    model: '',
    status: '',
    search: '',
  })
}

export const defaultApplicationFilters = (): ApplicationFilters => ({
  search: '',
  after: '',
  before: '',
  level: '',
  home_ip: '',
  client_ip: '',
  request_id: '',
})

export const buildRequestParams = (source: RequestFilters, timezone?: string) => {
  const params = new URLSearchParams()
  if (source.from) params.set('from', source.from)
  if (source.to) params.set('to', source.to)
  if (timezone) params.set('timezone', timezone)
  if (source.provider.trim()) params.set('provider', source.provider.trim())
  if (source.model.trim()) params.set('model', source.model.trim())
  if (source.status) params.set('status', source.status)
  if (source.search.trim()) params.set('search', source.search.trim())
  return params
}

export const buildApplicationParams = (source: ApplicationFilters) => {
  const params = new URLSearchParams()
  if (source.search.trim()) params.set('search', source.search.trim())
  if (source.after) params.set('after', new Date(source.after).toISOString())
  if (source.before) params.set('before', new Date(source.before).toISOString())
  if (source.level) params.set('level', source.level)
  if (source.home_ip.trim()) params.set('home_ip', source.home_ip.trim())
  if (source.client_ip.trim()) params.set('client_ip', source.client_ip.trim())
  if (source.request_id.trim()) params.set('request_id', source.request_id.trim())
  return params
}
