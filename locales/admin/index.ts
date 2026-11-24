import type { ConsoleLocale } from '~/composables/useConsoleLocale'
import common from './common'
import shared from './shared'
import dashboard from './dashboard'
import upstream from './upstream'
import credentials from './credentials'
import users from './users'
import accessKeys from './accessKeys'
import usage from './usage'
import logs from './logs'
import billing from './billing'
import config from './config'
import plugins from './plugins'
import routing from './routing'
import alerting from './alerting'
import organizations from './organizations'
import zhCNCommon from './zh-CN/common'
import zhCNShared from './zh-CN/shared'
import zhCNDashboard from './zh-CN/dashboard'
import zhCNUpstream from './zh-CN/upstream'
import zhCNCredentials from './zh-CN/credentials'
import zhCNUsers from './zh-CN/users'
import zhCNAccessKeys from './zh-CN/accessKeys'
import zhCNUsage from './zh-CN/usage'
import zhCNLogs from './zh-CN/logs'
import zhCNBilling from './zh-CN/billing'
import zhCNConfig from './zh-CN/config'
import zhCNPlugins from './zh-CN/plugins'
import zhCNRouting from './zh-CN/routing'
import zhCNAlerting from './zh-CN/alerting'
import zhCNOrganizations from './zh-CN/organizations'
import zhTWCommon from './zh-TW/common'
import zhTWShared from './zh-TW/shared'
import zhTWDashboard from './zh-TW/dashboard'
import zhTWUpstream from './zh-TW/upstream'
import zhTWCredentials from './zh-TW/credentials'
import zhTWUsers from './zh-TW/users'
import zhTWAccessKeys from './zh-TW/accessKeys'
import zhTWUsage from './zh-TW/usage'
import zhTWLogs from './zh-TW/logs'
import zhTWBilling from './zh-TW/billing'
import zhTWConfig from './zh-TW/config'
import zhTWPlugins from './zh-TW/plugins'
import zhTWRouting from './zh-TW/routing'
import zhTWAlerting from './zh-TW/alerting'
import zhTWOrganizations from './zh-TW/organizations'
import ruCommon from './ru/common'
import ruShared from './ru/shared'
import ruDashboard from './ru/dashboard'
import ruUpstream from './ru/upstream'
import ruCredentials from './ru/credentials'
import ruUsers from './ru/users'
import ruAccessKeys from './ru/accessKeys'
import ruUsage from './ru/usage'
import ruLogs from './ru/logs'
import ruBilling from './ru/billing'
import ruConfig from './ru/config'
import ruPlugins from './ru/plugins'
import ruRouting from './ru/routing'
import ruAlerting from './ru/alerting'
import ruOrganizations from './ru/organizations'

export const adminAreas = { common, shared, dashboard, upstream, credentials, users, accessKeys, usage, logs, billing, config, plugins, routing, alerting, organizations }

const en = {
  ...common.en, ...shared.en, ...dashboard.en, ...upstream.en, ...credentials.en, ...users.en, ...accessKeys.en, ...usage.en, ...logs.en, ...billing.en, ...config.en, ...plugins.en, ...routing.en, ...alerting.en, ...organizations.en
}

export type AdminMessageKey = keyof typeof en
type AdminTable = Record<AdminMessageKey, string>

const id: AdminTable = {
  ...common.id, ...shared.id, ...dashboard.id, ...upstream.id, ...credentials.id, ...users.id, ...accessKeys.id, ...usage.id, ...logs.id, ...billing.id, ...config.id, ...plugins.id, ...routing.id, ...alerting.id, ...organizations.id
}
const zhCN: AdminTable = {
  ...zhCNCommon, ...zhCNShared, ...zhCNDashboard, ...zhCNUpstream, ...zhCNCredentials, ...zhCNUsers, ...zhCNAccessKeys, ...zhCNUsage, ...zhCNLogs, ...zhCNBilling, ...zhCNConfig, ...zhCNPlugins, ...zhCNRouting, ...zhCNAlerting, ...zhCNOrganizations
}
const zhTW: AdminTable = {
  ...zhTWCommon, ...zhTWShared, ...zhTWDashboard, ...zhTWUpstream, ...zhTWCredentials, ...zhTWUsers, ...zhTWAccessKeys, ...zhTWUsage, ...zhTWLogs, ...zhTWBilling, ...zhTWConfig, ...zhTWPlugins, ...zhTWRouting, ...zhTWAlerting, ...zhTWOrganizations
}
const ru: AdminTable = {
  ...ruCommon, ...ruShared, ...ruDashboard, ...ruUpstream, ...ruCredentials, ...ruUsers, ...ruAccessKeys, ...ruUsage, ...ruLogs, ...ruBilling, ...ruConfig, ...ruPlugins, ...ruRouting, ...ruAlerting, ...ruOrganizations
}

export const adminMessages: Record<ConsoleLocale, AdminTable> = { en, id, 'zh-CN': zhCN, 'zh-TW': zhTW, ru }
