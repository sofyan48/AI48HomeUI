import { isConfigJsonField } from '~/composables/configParity'
import { sharedConfigFields } from './schema'
import type { ConfigDraft } from './types'

export function parseJSON(value: unknown, fallback: any) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}
function lines(value: unknown) {
  return [
    ...new Set(
      String(value || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
export function buildDraft(config: ConfigDraft, yamlRoot: ConfigDraft): ConfigDraft {
  const server = yamlRoot.server || config.server || {};
  const remote = yamlRoot.management || config.management || {};
  const plugins = yamlRoot.plugins || config.plugins || {};
  const routing = config.routing || yamlRoot.routing || {};
  const retry = routing.retry || {};
  const cooldown = routing.cooldown || {};
  const requests = config.requests || yamlRoot.requests || {};
  const observability = config.observability || yamlRoot.observability || {};
  const logs = observability.logs || {};

  const oauth = config.oauth || yamlRoot.oauth || {};
  const antigravity = oauth.providers?.antigravity || {};
  const devin = oauth.providers?.devin || {};
  const models = config.models || yamlRoot.models || {};
  const email = config["user-email"] || yamlRoot["user-email"] || {};
  const smtp = email.sender?.smtp || {};
  return {
    // Read shared settings from YAML so omitted/null, false and empty strings stay distinct.
    ...Object.fromEntries(sharedConfigFields.map(field => {
      const value = (field.path as string[]).reduce((node: any, part: string) => node?.[part], yamlRoot) ?? null;
      return [field.key, isConfigJsonField(field.type) && value !== null ? JSON.stringify(value, null, 2) : value];
    })),
    debug: Boolean(logs.debug),
    port: Number(server.port || 8317),
    cpaPublicUrl: (config["user-panel"] || yamlRoot["user-panel"])?.["cpa-public-url"] || "",
    tlsEnable: Boolean(server.tls?.enable),
    tlsCert: server.tls?.cert || "",
    tlsKey: server.tls?.key || "",
    remoteManagementAllowRemote: Boolean(remote["allow-remote"]),
    remoteManagementSecretKey: remote["secret-key"] || "",
    remoteManagementDisableControlPanel: Boolean(
      remote["disable-control-panel"],
    ),

    userEmailEnabled: Boolean(email.enabled),
    userEmailPublicUrl: email["public-user-url"] || "",
    userEmailFromAddress: email["from-address"] || "",
    userEmailFromName: email["from-name"] || "",
    userEmailSenderType: email.sender?.type || "smtp",
    userEmailSmtpHost: smtp.host || "",
    userEmailSmtpPort: Number(smtp.port ?? 587),
    userEmailSmtpUsername: smtp.username || "",
    userEmailSmtpPasswordEnv: smtp["password-env"] || "HOME_USER_EMAIL_SMTP_PASSWORD",
    userEmailSmtpStarttls: smtp.starttls ?? true,
    userEmailVerificationTtl: email["verification-token-ttl"] || "24h",
    userEmailResetTtl: email["reset-token-ttl"] || "30m",
    pluginsEnabled: Boolean(plugins.enabled),
    pluginsDir: plugins.dir || "plugins",
    pluginStoreSourcesJson: (plugins["store-sources"] || []).join("\n"),
    oauthExcludedModelsJson: JSON.stringify(
      oauth["excluded-models"] || {},
      null,
      2,
    ),
    oauthModelAliasJson: JSON.stringify(oauth["model-alias"] || {}, null, 2),
    requestLog: Boolean(logs["request-log"]),

    loggingToFile: Boolean(logs["logging-to-file"]),
    logsMaxTotalSizeMb: Number(logs["logs-max-total-size-mb"] || 0),
    errorLogsMaxFiles: Number(logs["error-logs-max-files"] ?? 10),
    proxyUrl: requests["proxy-url"] || "",
    tlsHandshakeTimeoutSeconds: Number(requests["tls-handshake-timeout-seconds"] ?? 0),
    modelsCatalog: models.catalog || "",
    modelsCodexCatalog: models["codex-catalog"] || "",
    modelsDevinCatalog: models["devin-catalog"] || "",
    devinSensitiveWordsJson: (devin["sensitive-words"] || []).join("\n"),
    quotaSwitchProject: Boolean(config["quota-exceeded"]?.["switch-project"]),
    quotaSwitchPreviewModel: Boolean(
      config["quota-exceeded"]?.["switch-preview-model"],
    ),
    requestRetry: Number(retry["request-retry"] || 0),
    maxRetryCredentials: Number(retry["max-retry-credentials"] || 0),
    maxRetryInterval: Number(retry["max-retry-interval"] || 0),
    disableCooling: Boolean(cooldown["disable-cooling"]),
    forceModelPrefix: Boolean(
      routing["force-model-prefix"] ?? config["force-model-prefix"],
    ),
    routingStrategy: routing.strategy || "round-robin",
    payloadJson: JSON.stringify(requests.payload || {}, null, 2),
    antigravitySensitiveWordsJson: (antigravity["sensitive-words"] || []).join(
      "\n",
    ),
  };
}
export const v8YamlPaths: Record<string, string[]> = {
  ...Object.fromEntries(sharedConfigFields.map(field => [field.key, field.path])),
  debug: ["observability", "logs", "debug"],
  port: ["server", "port"],
  cpaPublicUrl: ["user-panel", "cpa-public-url"],
  tlsEnable: ["server", "tls", "enable"],
  tlsCert: ["server", "tls", "cert"],
  tlsKey: ["server", "tls", "key"],
  remoteManagementAllowRemote: ["management", "allow-remote"],
  remoteManagementSecretKey: ["management", "secret-key"],
  remoteManagementDisableControlPanel: ["management", "disable-control-panel"],

  userEmailEnabled: ["user-email", "enabled"],
  userEmailPublicUrl: ["user-email", "public-user-url"],
  userEmailFromAddress: ["user-email", "from-address"],
  userEmailFromName: ["user-email", "from-name"],
  userEmailSenderType: ["user-email", "sender", "type"],
  userEmailSmtpHost: ["user-email", "sender", "smtp", "host"],
  userEmailSmtpPort: ["user-email", "sender", "smtp", "port"],
  userEmailSmtpUsername: ["user-email", "sender", "smtp", "username"],
  userEmailSmtpPasswordEnv: ["user-email", "sender", "smtp", "password-env"],
  userEmailSmtpStarttls: ["user-email", "sender", "smtp", "starttls"],
  userEmailVerificationTtl: ["user-email", "verification-token-ttl"],
  userEmailResetTtl: ["user-email", "reset-token-ttl"],
  pluginsEnabled: ["plugins", "enabled"],
  pluginsDir: ["plugins", "dir"],
  pluginStoreSourcesJson: ["plugins", "store-sources"],
  oauthExcludedModelsJson: ["oauth", "excluded-models"],
  oauthModelAliasJson: ["oauth", "model-alias"],
  requestLog: ["observability", "logs", "request-log"],

  loggingToFile: ["observability", "logs", "logging-to-file"],
  logsMaxTotalSizeMb: ["observability", "logs", "logs-max-total-size-mb"],
  errorLogsMaxFiles: ["observability", "logs", "error-logs-max-files"],
  proxyUrl: ["requests", "proxy-url"],
  tlsHandshakeTimeoutSeconds: ["requests", "tls-handshake-timeout-seconds"],
  modelsCatalog: ["models", "catalog"],
  modelsCodexCatalog: ["models", "codex-catalog"],
  modelsDevinCatalog: ["models", "devin-catalog"],
  devinSensitiveWordsJson: ["oauth", "providers", "devin", "sensitive-words"],
  quotaSwitchProject: ["quota-exceeded", "switch-project"],
  quotaSwitchPreviewModel: ["quota-exceeded", "switch-preview-model"],
  requestRetry: ["routing", "retry", "request-retry"],
  maxRetryCredentials: ["routing", "retry", "max-retry-credentials"],
  maxRetryInterval: ["routing", "retry", "max-retry-interval"],
  disableCooling: ["routing", "cooldown", "disable-cooling"],
  forceModelPrefix: ["routing", "force-model-prefix"],
  routingStrategy: ["routing", "strategy"],
  payloadJson: ["requests", "payload"],
  antigravitySensitiveWordsJson: [
    "oauth",
    "providers",
    "antigravity",
    "sensitive-words",
  ],
};
export function configWriteValue(draft: ConfigDraft, key: string) {
  const value = draft[key];
  if (value === null) return null;
  const field = sharedConfigFields.find(field => field.key === key);
  if (field && isConfigJsonField(field.type)) return JSON.parse(value);
  if (["pluginStoreSourcesJson", "antigravitySensitiveWordsJson", "devinSensitiveWordsJson"].includes(key)) return lines(value);
  if (["oauthExcludedModelsJson", "oauthModelAliasJson", "payloadJson"].includes(key)) return JSON.parse(value);
  if (["port", "userEmailSmtpPort", "logsMaxTotalSizeMb", "errorLogsMaxFiles", "requestRetry", "maxRetryCredentials", "maxRetryInterval", "tlsHandshakeTimeoutSeconds"].includes(key)) return Number(value);
  if (["proxyUrl", "cpaPublicUrl", "modelsCatalog", "modelsCodexCatalog", "modelsDevinCatalog"].includes(key)) return String(value).trim();
  return value;
}
