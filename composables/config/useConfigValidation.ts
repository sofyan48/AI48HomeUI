import { computed, type Ref } from 'vue'
import { configParitySections, validateConfigParityField, type ConfigField } from '~/composables/configParity'
import { sharedConfigFields } from './schema'
import { parseJSON } from './draft'
import type { ConfigDraft, ConfigTranslator } from './types'

export function useConfigValidation(draft: Ref<ConfigDraft>, t: ConfigTranslator) {
const validationErrors = computed(() => {
  const errors: Record<string, string> = {};
  const integerKeys = [
    "requestRetry",
    "maxRetryCredentials",
    "maxRetryInterval",
    "logsMaxTotalSizeMb",
    "errorLogsMaxFiles",
    "tlsHandshakeTimeoutSeconds",
  ];
  if (
    !Number.isInteger(Number(draft.value.port)) ||
    Number(draft.value.port) < 1 ||
    Number(draft.value.port) > 65535
  )
    errors.port = t('config.validation.port');
  for (const key of integerKeys)
    if (
      draft.value[key] === null || draft.value[key] === "" ||
      !Number.isInteger(Number(draft.value[key])) ||
      Number(draft.value[key]) < 0
    )
      errors[key] = t('config.validation.nonNegativeInteger');
  if (
    !["round-robin", "weighted-round-robin", "fill-first"].includes(
      draft.value.routingStrategy,
    )
  )
    errors.routingStrategy = t('config.validation.strategy');
  if (String(draft.value.cpaPublicUrl || "").trim()) {
    try {
      const url = new URL(String(draft.value.cpaPublicUrl).trim());
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch {
      errors.cpaPublicUrl = t('config.validation.cpaPublicUrl');
    }
  }
  for (const key of ["modelsCatalog", "modelsCodexCatalog", "modelsDevinCatalog"]) {
    const source = String(draft.value[key] || "").trim();
    if (!source || source.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(source) || source.startsWith("\\\\")) continue;
    try {
      const url = new URL(source);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error();
    } catch {
      errors[key] = t('config.validation.catalog');
    }
  }
  if (draft.value.userEmailEnabled) {
    const text = (key: string) => String(draft.value[key] || "").trim();
    const isLoopback = (host: string) => host === "localhost" || host === "::1" || host === "[::1]" || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host);
    try {
      const url = new URL(text("userEmailPublicUrl"));
      if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && isLoopback(url.hostname)))) throw new Error();
    } catch {
      errors.userEmailPublicUrl = t('config.validation.emailPublicUrl');
    }
    if (!/^[^\s<>@]+@[^\s<>@]+$/.test(text("userEmailFromAddress"))) errors.userEmailFromAddress = t('config.validation.fromAddress');
    if (text("userEmailSenderType") !== "smtp") errors.userEmailSenderType = t('config.validation.smtpOnly');
    if (!text("userEmailSmtpHost")) errors.userEmailSmtpHost = t('config.validation.smtpHost');
    const port = Number(draft.value.userEmailSmtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 465) errors.userEmailSmtpPort = t('config.validation.smtpPort');
    if (!draft.value.userEmailSmtpStarttls && !isLoopback(text("userEmailSmtpHost").toLowerCase())) errors.userEmailSmtpStarttls = t('config.validation.starttls');
    if (text("userEmailSmtpUsername") && !text("userEmailSmtpPasswordEnv")) errors.userEmailSmtpPasswordEnv = t('config.validation.passwordEnv');
    for (const key of ["userEmailVerificationTtl", "userEmailResetTtl"]) {
      const value = text(key);
      if (!/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value) || !/[1-9]/.test(value)) errors[key] = t('config.validation.positiveDuration');
    }
  }
  const exclusions = parseJSON(draft.value.oauthExcludedModelsJson, null);
  if (!exclusions || typeof exclusions !== "object" || Array.isArray(exclusions) || Object.values(exclusions).some(rules => !Array.isArray(rules) || rules.some(rule => typeof rule !== "string"))) {
    errors.oauthExcludedModelsJson = t('config.validation.exclusions');
  }
  for (const field of sharedConfigFields) {
    const value = draft.value[field.key];
    if (value === null || value === undefined) continue;
    if (configParitySections.some(section => section.fields.some(item => item.key === field.key))) {
      const error = validateConfigParityField(field, value);
      if (error) errors[field.key] = parityErrorText(field);
      continue;
    }
    if (field.type === "boolean") {
      if (typeof value !== "boolean") errors[field.key] = t('config.validation.boolean');
    } else if (field.type === "number") {
      if (typeof value !== "number" || !Number.isSafeInteger(value)) errors[field.key] = t('config.validation.integer');
    } else if (field.type === "json") {
      const rules = parseJSON(value, null);
      const isObject = (item: any) => item !== null && typeof item === "object" && !Array.isArray(item);
      const actions = ["stop", "stop-and-cooldown", "continue", "continue-and-cooldown"];
      if (!isObject(rules) || Object.values(rules).some(entries => !Array.isArray(entries) || entries.some(rule =>
        !isObject(rule) || !actions.includes(rule.action) ||
        (rule.status !== undefined && !Number.isSafeInteger(rule.status)) ||
        ["match", "match-regexr"].some(key => rule[key] !== undefined && (!Array.isArray(rule[key]) || rule[key].some(item => typeof item !== "string"))) ||
        Object.hasOwn(rule, "match-regex")
      ))) errors[field.key] = t('config.validation.requestScopedRules');
    } else if (typeof value !== "string") {
      errors[field.key] = t('config.validation.string');
    } else if (field.type === "session-duration") {
      if (value.trim() !== "" && value.trim() !== "0" && !/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value.trim())) {
        errors[field.key] = t('config.validation.sessionDuration');
      }
    } else if (field.type === "duration") {
      const text = value.trim().toLowerCase();
      if (!["", "0", "0s", "none", "unlimited", "disabled", "off", "never"].includes(text) && !/^\+?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:ns|us|µs|μs|ms|s|m|h))+$/.test(value.trim())) {
        errors[field.key] = t('config.validation.duration');
      }
    } else if (/[\r\n\u0000]/.test(value)) {
      errors[field.key] = t('config.validation.header');
    }
  }
  if (draft.value.liveMediaRelayUdpPortMin != null && draft.value.liveMediaRelayUdpPortMax != null && Number(draft.value.liveMediaRelayUdpPortMin) > Number(draft.value.liveMediaRelayUdpPortMax)) {
    errors.liveMediaRelayUdpPortMax = t('config.validation.udpRange');
  }
  return errors;
});
// configParity.ts returns English messages (asserted by tests); show the translation for the failing field type.
function parityErrorText(field: ConfigField) {
  if (field.type === "image-mode") return t('config.validation.imageMode');
  if (field.type === "string-list") return t('config.validation.stringList');
  if (field.type === "ice-servers") return t('config.validation.iceServers');
  if (field.type === "go-duration") return t('config.validation.goDuration');
  if (field.type === "number") return t('config.validation.integerRange', { min: field.min ?? t('config.validation.rangeMin'), max: field.max ?? t('config.validation.rangeMax') });
  return t('config.validation.header');
}
const validationCount = computed(
  () => Object.keys(validationErrors.value).length,
);
return { validationErrors, validationCount };
}
