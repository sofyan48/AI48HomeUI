import type { ConsoleLocale } from '~/composables/useConsoleLocale'
import shell from './shell'
import workspace from './workspace'
import models from './models'
import account from './account'
import auth from './auth'
import playground from './playground'
import zhCNShell from './zh-CN/shell'
import zhCNWorkspace from './zh-CN/workspace'
import zhCNModels from './zh-CN/models'
import zhCNAccount from './zh-CN/account'
import zhCNAuth from './zh-CN/auth'
import zhCNPlayground from './zh-CN/playground'
import zhTWShell from './zh-TW/shell'
import zhTWWorkspace from './zh-TW/workspace'
import zhTWModels from './zh-TW/models'
import zhTWAccount from './zh-TW/account'
import zhTWAuth from './zh-TW/auth'
import zhTWPlayground from './zh-TW/playground'
import ruShell from './ru/shell'
import ruWorkspace from './ru/workspace'
import ruModels from './ru/models'
import ruAccount from './ru/account'
import ruAuth from './ru/auth'
import ruPlayground from './ru/playground'

const en = { ...shell.en, ...workspace.en, ...models.en, ...account.en, ...auth.en, ...playground.en }

export type PortalMessageKey = keyof typeof en
type PortalTable = Record<PortalMessageKey, string>

const id: PortalTable = { ...shell.id, ...workspace.id, ...models.id, ...account.id, ...auth.id, ...playground.id }
const zhCN: PortalTable = { ...zhCNShell, ...zhCNWorkspace, ...zhCNModels, ...zhCNAccount, ...zhCNAuth, ...zhCNPlayground }
const zhTW: PortalTable = { ...zhTWShell, ...zhTWWorkspace, ...zhTWModels, ...zhTWAccount, ...zhTWAuth, ...zhTWPlayground }
const ru: PortalTable = { ...ruShell, ...ruWorkspace, ...ruModels, ...ruAccount, ...ruAuth, ...ruPlayground }

export const portalMessages: Record<ConsoleLocale, PortalTable> = { en, id, 'zh-CN': zhCN, 'zh-TW': zhTW, ru }
