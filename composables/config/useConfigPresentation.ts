import { computed } from 'vue'
import { sharedConfigSections } from './schema'
import type { ConfigTranslator } from './types'

export function useConfigPresentation(t: ConfigTranslator) {
// Display text for shared sections, keyed by section id (`<id>.title`/`<id>.description`) and field key (`<key>`/`<key>.desc`).
function sharedText(): Record<string, string> {
  return {
    "server-network.title": t('config.shared.server-network.title'), "server-network.description": t('config.shared.server-network.description'),
    serverHost: t('config.shared.serverHost'), serverAllowHostJson: t('config.shared.serverAllowHostJson'), serverTrustedProxiesJson: t('config.shared.serverTrustedProxiesJson'),
    serverCommercialMode: t('config.shared.serverCommercialMode'), managementBaseUrl: t('config.shared.managementBaseUrl'),
    "discovery.title": t('config.shared.discovery.title'), "discovery.description": t('config.shared.discovery.description'),
    discoveryEnabled: t('config.shared.discoveryEnabled'), discoveryServiceName: t('config.shared.discoveryServiceName'),
    discoveryServiceType: t('config.shared.discoveryServiceType'), "discoveryServiceType.desc": t('config.shared.discoveryServiceType.desc'),
    discoverySubtypesJson: t('config.shared.discoverySubtypesJson'), discoveryInterfacesIncludeJson: t('config.shared.discoveryInterfacesIncludeJson'),
    discoveryInterfacesExcludeJson: t('config.shared.discoveryInterfacesExcludeJson'), discoveryAuthRequired: t('config.shared.discoveryAuthRequired'),
    "discoveryAuthRequired.desc": t('config.shared.discoveryAuthRequired.desc'), discoveryAdvertiseManagement: t('config.shared.discoveryAdvertiseManagement'),
    "response-diagnostics.title": t('config.shared.response-diagnostics.title'), "response-diagnostics.description": t('config.shared.response-diagnostics.description'),
    passthroughHeaders: t('config.shared.passthroughHeaders'), pprofEnable: t('config.shared.pprofEnable'), pprofAddr: t('config.shared.pprofAddr'),
    "multimedia.title": t('config.shared.multimedia.title'), "multimedia.description": t('config.shared.multimedia.description'),
    multimediaDisableImageGeneration: t('config.shared.multimediaDisableImageGeneration'), "multimediaDisableImageGeneration.desc": t('config.shared.multimediaDisableImageGeneration.desc'),
    multimediaGptImage2BaseModel: t('config.shared.multimediaGptImage2BaseModel'), multimediaVideoResultAuthCacheTtl: t('config.shared.multimediaVideoResultAuthCacheTtl'),
    "oauth-defaults.title": t('config.shared.oauth-defaults.title'), "oauth-defaults.description": t('config.shared.oauth-defaults.description'),
    oauthAuthDir: t('config.shared.oauthAuthDir'), oauthCodexHeaderUserAgent: t('config.shared.oauthCodexHeaderUserAgent'), oauthCodexHeaderBetaFeatures: t('config.shared.oauthCodexHeaderBetaFeatures'),
    "live-media-relay.title": t('config.shared.live-media-relay.title'), "live-media-relay.description": t('config.shared.live-media-relay.description'),
    liveMediaRelayEnabled: t('config.shared.liveMediaRelayEnabled'), liveMediaRelayDisablePrivateRemoteIps: t('config.shared.liveMediaRelayDisablePrivateRemoteIps'),
    liveMediaRelayMaxSessions: t('config.shared.liveMediaRelayMaxSessions'), liveMediaRelayUdpPortMin: t('config.shared.liveMediaRelayUdpPortMin'),
    liveMediaRelayUdpPortMax: t('config.shared.liveMediaRelayUdpPortMax'), liveMediaRelayPublicIp: t('config.shared.liveMediaRelayPublicIp'),
    liveMediaRelayIceServersJson: t('config.shared.liveMediaRelayIceServersJson'), "liveMediaRelayIceServersJson.desc": t('config.shared.liveMediaRelayIceServersJson.desc'),
    "antigravity-runtime.title": t('config.shared.antigravity-runtime.title'), "antigravity-runtime.description": t('config.shared.antigravity-runtime.description'),
    antigravityCredits: t('config.shared.antigravityCredits'), antigravitySignatureCacheEnabled: t('config.shared.antigravitySignatureCacheEnabled'),
    antigravitySignatureBypassStrict: t('config.shared.antigravitySignatureBypassStrict'), antigravityConnPoolEnabled: t('config.shared.antigravityConnPoolEnabled'),
    antigravityConnPoolIdleTimeout: t('config.shared.antigravityConnPoolIdleTimeout'), "antigravityConnPoolIdleTimeout.desc": t('config.shared.antigravityConnPoolIdleTimeout.desc'),
    antigravityConnPoolMaxIdleConnsPerHost: t('config.shared.antigravityConnPoolMaxIdleConnsPerHost'), "antigravityConnPoolMaxIdleConnsPerHost.desc": t('config.shared.antigravityConnPoolMaxIdleConnsPerHost.desc'),
    "session-streaming.title": t('config.shared.session-streaming.title'), "session-streaming.description": t('config.shared.session-streaming.description'),
    sessionAffinity: t('config.shared.sessionAffinity'), "sessionAffinity.desc": t('config.shared.sessionAffinity.desc'),
    sessionAffinityTtl: t('config.shared.sessionAffinityTtl'), "sessionAffinityTtl.desc": t('config.shared.sessionAffinityTtl.desc'), "sessionAffinityTtl.placeholder": t('config.shared.sessionAffinityTtl.placeholder'),
    sessionAffinitySubagents: t('config.shared.sessionAffinitySubagents'), "sessionAffinitySubagents.desc": t('config.shared.sessionAffinitySubagents.desc'),
    streamingKeepaliveSeconds: t('config.shared.streamingKeepaliveSeconds'), "streamingKeepaliveSeconds.desc": t('config.shared.streamingKeepaliveSeconds.desc'),
    streamingSendKeepaliveBeforeFt: t('config.shared.streamingSendKeepaliveBeforeFt'), "streamingSendKeepaliveBeforeFt.desc": t('config.shared.streamingSendKeepaliveBeforeFt.desc'),
    streamingBootstrapRetries: t('config.shared.streamingBootstrapRetries'), "streamingBootstrapRetries.desc": t('config.shared.streamingBootstrapRetries.desc'),
    nonstreamKeepaliveInterval: t('config.shared.nonstreamKeepaliveInterval'), "nonstreamKeepaliveInterval.desc": t('config.shared.nonstreamKeepaliveInterval.desc'),
    "oauth-request-errors.title": t('config.shared.oauth-request-errors.title'), "oauth-request-errors.description": t('config.shared.oauth-request-errors.description'),
    oauthRequestScopedErrorsJson: t('config.shared.oauthRequestScopedErrorsJson'), "oauthRequestScopedErrorsJson.desc": t('config.shared.oauthRequestScopedErrorsJson.desc'),
    "upstream-claude.title": t('config.shared.upstream-claude.title'), "upstream-claude.description": t('config.shared.upstream-claude.description'),
    claudeToolSearch: t('config.shared.claudeToolSearch'), "claudeToolSearch.desc": t('config.shared.claudeToolSearch.desc'),
    claudeModelLevelCooling: t('config.shared.claudeModelLevelCooling'), "claudeModelLevelCooling.desc": t('config.shared.claudeModelLevelCooling.desc'),
    claudeDisableCloakMode: t('config.shared.claudeDisableCloakMode'), "claudeDisableCloakMode.desc": t('config.shared.claudeDisableCloakMode.desc'),
    claudeDisableCloakingModelList: t('config.shared.claudeDisableCloakingModelList'), "claudeDisableCloakingModelList.desc": t('config.shared.claudeDisableCloakingModelList.desc'),
    claudeHeaderUserAgent: t('config.shared.claudeHeaderUserAgent'), "claudeHeaderUserAgent.desc": t('config.shared.claudeHeaderUserAgent.desc'),
    claudeHeaderPackageVersion: t('config.shared.claudeHeaderPackageVersion'), "claudeHeaderPackageVersion.desc": t('config.shared.claudeHeaderPackageVersion.desc'),
    claudeHeaderRuntimeVersion: t('config.shared.claudeHeaderRuntimeVersion'), "claudeHeaderRuntimeVersion.desc": t('config.shared.claudeHeaderRuntimeVersion.desc'),
    claudeHeaderOs: t('config.shared.claudeHeaderOs'), "claudeHeaderOs.desc": t('config.shared.claudeHeaderOs.desc'),
    claudeHeaderArch: t('config.shared.claudeHeaderArch'), "claudeHeaderArch.desc": t('config.shared.claudeHeaderArch.desc'),
    claudeHeaderTimeout: t('config.shared.claudeHeaderTimeout'), "claudeHeaderTimeout.desc": t('config.shared.claudeHeaderTimeout.desc'),
    claudeHeaderTimezone: t('config.shared.claudeHeaderTimezone'), "claudeHeaderTimezone.desc": t('config.shared.claudeHeaderTimezone.desc'),
    claudeHeaderStabilizeDeviceProfile: t('config.shared.claudeHeaderStabilizeDeviceProfile'), "claudeHeaderStabilizeDeviceProfile.desc": t('config.shared.claudeHeaderStabilizeDeviceProfile.desc'),
    "upstream-codex.title": t('config.shared.upstream-codex.title'), "upstream-codex.description": t('config.shared.upstream-codex.description'),
    codexResponseSteering: t('config.shared.codexResponseSteering'), "codexResponseSteering.desc": t('config.shared.codexResponseSteering.desc'),
    codexDisableCloaking: t('config.shared.codexDisableCloaking'), "codexDisableCloaking.desc": t('config.shared.codexDisableCloaking.desc'),
    codexStreamBootstrapBuffering: t('config.shared.codexStreamBootstrapBuffering'), "codexStreamBootstrapBuffering.desc": t('config.shared.codexStreamBootstrapBuffering.desc'),
    codexStreamBootstrapTimeout: t('config.shared.codexStreamBootstrapTimeout'), "codexStreamBootstrapTimeout.desc": t('config.shared.codexStreamBootstrapTimeout.desc'),
    codexOrphanDelegationCompatibility: t('config.shared.codexOrphanDelegationCompatibility'), "codexOrphanDelegationCompatibility.desc": t('config.shared.codexOrphanDelegationCompatibility.desc'),
    codexModelLevelCooling: t('config.shared.codexModelLevelCooling'), "codexModelLevelCooling.desc": t('config.shared.codexModelLevelCooling.desc'),
    "client-codex.title": t('config.shared.client-codex.title'), "client-codex.description": t('config.shared.client-codex.description'),
    codexOptimizeMultiAgentV2: t('config.shared.codexOptimizeMultiAgentV2'), "codexOptimizeMultiAgentV2.desc": t('config.shared.codexOptimizeMultiAgentV2.desc'),
    "upstream-xai.title": t('config.shared.upstream-xai.title'), "upstream-xai.description": t('config.shared.upstream-xai.description'),
    xaiInjectXSearch: t('config.shared.xaiInjectXSearch'), "xaiInjectXSearch.desc": t('config.shared.xaiInjectXSearch.desc'),
  };
}
const displaySharedSections = computed(() => {
  const text = sharedText();
  return sharedConfigSections.map(section => ({
    ...section,
    title: text[`${section.id}.title`] || section.title,
    description: text[`${section.id}.description`] || section.description,
    fields: section.fields.map(field => ({
      ...field,
      label: text[field.key] || field.label,
      // Descriptions only exist where the source has one; an empty source stays empty.
      description: field.description ? text[`${field.key}.desc`] || field.description : field.description,
      placeholder: field.placeholder ? text[`${field.key}.placeholder`] || field.placeholder : field.placeholder,
    })),
  }));
});
const outline = computed(() => [
  { id: "server", short: t('config.outline.server'), keys: ["debug", "port", "cpaPublicUrl"] },
  { id: "tls", short: t('config.outline.tls'), keys: ["tlsEnable", "tlsCert", "tlsKey"] },
  {
    id: "remote-management",
    short: t('config.outline.management'),
    keys: [
      "remoteManagementAllowRemote",
      "remoteManagementSecretKey",
      "remoteManagementDisableControlPanel",

    ],
  },
  {
    id: "user-email",
    short: t('config.outline.mail'),
    keys: ["userEmailEnabled", "userEmailPublicUrl", "userEmailFromAddress", "userEmailFromName", "userEmailSenderType", "userEmailSmtpHost", "userEmailSmtpPort", "userEmailSmtpUsername", "userEmailSmtpPasswordEnv", "userEmailSmtpStarttls", "userEmailVerificationTtl", "userEmailResetTtl"],
  },
  {
    id: "plugins",
    short: t('config.outline.plugins'),
    keys: ["pluginsEnabled", "pluginsDir", "pluginStoreSourcesJson"],
  },
  {
    id: "oauth-rules",
    short: t('config.outline.oauthRules'),
    keys: ["oauthExcludedModelsJson", "oauthModelAliasJson"],
  },
  {
    id: "logs",
    short: t('config.outline.logs'),
    keys: [
      "requestLog",

      "loggingToFile",
      "logsMaxTotalSizeMb",
      "errorLogsMaxFiles",
    ],
  },
  { id: "models", short: t('config.outline.models'), keys: ["modelsCatalog", "modelsCodexCatalog", "modelsDevinCatalog"] },
  { id: "network", short: t('config.outline.network'), keys: ["proxyUrl", "tlsHandshakeTimeoutSeconds"] },
  {
    id: "quota",
    short: t('config.outline.quota'),
    keys: ["quotaSwitchProject", "quotaSwitchPreviewModel"],
  },
  {
    id: "retry-routing",
    short: t('config.outline.routing'),
    keys: [
      "requestRetry",
      "maxRetryCredentials",
      "maxRetryInterval",
      "disableCooling",
      "forceModelPrefix",
      "routingStrategy",
    ],
  },
  ...displaySharedSections.value.map(section => ({ id: section.id, short: section.title, keys: section.fields.map(field => field.key) })),
  { id: "payload", short: t('config.outline.parameters'), keys: ["payloadJson"] },
  { id: "devin", short: t('config.outline.devin'), keys: ["devinSensitiveWordsJson"] },
  {
    id: "antigravity",
    short: t('config.outline.antigravity'),
    keys: ["antigravitySensitiveWordsJson"],
  },
]);
function visualFieldLabels(): Record<string, string> {
  return {
    debug: t('config.field.debug'), port: t('config.field.port'), cpaPublicUrl: t('config.field.cpaPublicUrl'),
    tlsEnable: t('config.field.tlsEnable'), tlsCert: t('config.field.tlsCert'), tlsKey: t('config.field.tlsKey'),
    remoteManagementAllowRemote: t('config.field.remoteManagementAllowRemote'), remoteManagementSecretKey: t('config.field.remoteManagementSecretKey'),
    remoteManagementDisableControlPanel: t('config.field.remoteManagementDisableControlPanel'),
    userEmailEnabled: t('config.field.userEmailEnabled'), userEmailPublicUrl: t('config.field.userEmailPublicUrl'),
    userEmailFromAddress: t('config.field.userEmailFromAddress'), userEmailFromName: t('config.field.userEmailFromName'),
    userEmailSenderType: t('config.field.userEmailSenderType'), userEmailSmtpHost: t('config.field.userEmailSmtpHost'),
    userEmailSmtpPort: t('config.field.userEmailSmtpPort'), userEmailSmtpUsername: t('config.field.userEmailSmtpUsername'),
    userEmailSmtpPasswordEnv: t('config.field.userEmailSmtpPasswordEnv'), userEmailSmtpStarttls: t('config.field.userEmailSmtpStarttls'),
    userEmailVerificationTtl: t('config.field.userEmailVerificationTtl'), userEmailResetTtl: t('config.field.userEmailResetTtl'),
    pluginsEnabled: t('config.field.pluginsEnabled'), pluginsDir: t('config.field.pluginsDir'), pluginStoreSourcesJson: t('config.field.pluginStoreSourcesJson'),
    oauthExcludedModelsJson: t('config.oauthRules.manualLabel'), oauthModelAliasJson: t('config.aliases.title'),
    requestLog: t('config.field.requestLog'), loggingToFile: t('config.field.loggingToFile'),
    logsMaxTotalSizeMb: t('config.field.logsMaxTotalSizeMb'), errorLogsMaxFiles: t('config.field.errorLogsMaxFiles'),
    modelsCatalog: t('config.field.modelsCatalog'), modelsCodexCatalog: t('config.field.modelsCodexCatalog'), modelsDevinCatalog: t('config.field.modelsDevinCatalog'),
    proxyUrl: t('config.field.proxyUrl'), tlsHandshakeTimeoutSeconds: t('config.field.tlsHandshakeTimeoutSeconds'),
    quotaSwitchProject: t('config.field.quotaSwitchProject'), quotaSwitchPreviewModel: t('config.field.quotaSwitchPreviewModel'),
    requestRetry: t('config.field.requestRetry'), maxRetryCredentials: t('config.field.maxRetryCredentials'), maxRetryInterval: t('config.field.maxRetryInterval'),
    disableCooling: t('config.field.disableCooling'), forceModelPrefix: t('config.field.forceModelPrefix'), routingStrategy: t('config.field.routingStrategy'),
    payloadJson: t('config.field.payloadJson'), devinSensitiveWordsJson: t('config.field.devinSensitiveWordsJson'),
    antigravitySensitiveWordsJson: t('config.field.antigravitySensitiveWordsJson'),
  };
}
const labels = computed(() => {
  const visual = visualFieldLabels();
  const shared = Object.fromEntries(displaySharedSections.value.flatMap(section => section.fields.map(field => [field.key, field.label])));
  return Object.fromEntries(
    outline.value.flatMap((section) =>
      section.keys.map((key) => [
        key,
        visual[key] || shared[key] || key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (value) => value.toUpperCase()),
      ]),
    ),
  );
});
return { displaySharedSections, outline, labels };
}
