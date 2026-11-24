import { reactive, ref, toRaw, watch, type Ref } from 'vue'
import { useOAuthExclusions, type OAuthChannelModel } from './useOAuthExclusions'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { parseJSON } from './draft'
import type { ConfigDraft, ConfigFetch, ConfigTranslator } from './types'

export function useConfigEditors(draft: Ref<ConfigDraft>, fetchAPI: ConfigFetch, t: ConfigTranslator) {

const channelModels = useWorkspaceState<OAuthChannelModel[]>('admin:config:channelModels', () => ([]));
const modelsLoading = useWorkspaceState('admin:config:modelsLoading', () => (false));
const oauthEditors = useOAuthExclusions(draft, fetchAPI, t, channelModels, modelsLoading);
const aliasRows = ref<ConfigDraft[]>([]);
let aliasKey = 0;
let aliasEditorBaseline = "";
let aliasEditorSource = "{}";
const payloadDraft = reactive<Record<string, ConfigDraft[]>>({
  default: [],
  "default-raw": [],
  override: [],
  "override-raw": [],
  filter: [],
});
let payloadEditorBaseline = "";
let payloadEditorSource = "{}";
const payloadModes = [
  { value: "default" },
  { value: "default-raw" },
  { value: "override" },
  { value: "override-raw" },
  { value: "filter" },
];
function payloadModeLabel(mode: string) {
  const labels: Record<string, string> = {
    default: t('config.payload.mode.default'),
    "default-raw": t('config.payload.mode.defaultRaw'),
    override: t('config.payload.mode.override'),
    "override-raw": t('config.payload.mode.overrideRaw'),
    filter: t('config.payload.mode.filter'),
  };
  return labels[mode] || mode;
}
const payloadEditorOpen = ref(false);
const payloadEditMode = ref("default");
const payloadEditIndex = ref(-1);
const payloadEditor = reactive({ models: "[]", params: "{}" });
const payloadEditorError = ref("");
function syncEditors() {
  const aliases = parseJSON(draft.value.oauthModelAliasJson, {});
  aliasRows.value = Object.entries<ConfigDraft[]>(aliases).flatMap(([channel, entries]) =>
    (entries || []).map((entry) => ({
      key: ++aliasKey,
      channel,
      original: structuredClone(toRaw(entry)),
      displayName: entry["display-name"] || "",
      name: entry.name || "",
      alias: entry.alias || "",
      fork: Boolean(entry.fork),
      forceMapping: Boolean(entry["force-mapping"]),
    })),
  );
  aliasEditorBaseline = JSON.stringify(aliasRows.value);
  aliasEditorSource = draft.value.oauthModelAliasJson;
  const payload = parseJSON(draft.value.payloadJson, {});
  for (const mode of payloadModes)
    payloadDraft[mode.value] = structuredClone(
      Array.isArray(payload[mode.value]) ? toRaw(payload[mode.value]) : [],
    );
  payloadEditorBaseline = JSON.stringify(payloadDraft);
  payloadEditorSource = draft.value.payloadJson;
}
function syncSpecialDrafts() {
  const grouped: Record<string, ConfigDraft[]> = {};
  for (const row of aliasRows.value) {
    const channel = row.channel.trim().toLowerCase();
    if (!channel || !row.name.trim() || !row.alias.trim()) continue;
    (grouped[channel] ||= []).push({
      ...row.original,
      ...(row.displayName?.trim() ? { "display-name": row.displayName.trim() } : row.original?.["display-name"] !== undefined ? { "display-name": "" } : {}),
      name: row.name.trim(),
      alias: row.alias.trim(),
      fork: row.fork,
      "force-mapping": row.forceMapping,
    });
  }
  if (JSON.stringify(aliasRows.value) !== aliasEditorBaseline) {
    draft.value.oauthModelAliasJson = JSON.stringify(grouped, null, 2);
  } else {
    draft.value.oauthModelAliasJson = aliasEditorSource;
  }
  draft.value.payloadJson = JSON.stringify(payloadDraft) === payloadEditorBaseline
    ? payloadEditorSource
    : JSON.stringify({
        ...parseJSON(payloadEditorSource, {}),
        ...Object.fromEntries(payloadModes.map((mode) => [mode.value, payloadDraft[mode.value]])),
      }, null, 2);
}
function addAlias() {
  aliasRows.value.push({
    key: ++aliasKey,
    channel: aliasRows.value.at(-1)?.channel || "claude",
    name: "",
    alias: "",
    displayName: "",
    fork: false,
    forceMapping: false,
  });
}
function payloadRuleSummary(rule: ConfigDraft) {
  return Array.isArray(rule?.models)
    ? rule.models.map((model) => model?.name || t('config.payload.unnamed')).join(", ")
    : t('config.payload.unsupportedMatcher');
}
function payloadRulePaths(rule: ConfigDraft, mode: string) {
  return mode === "filter"
    ? Array.isArray(rule?.params)
      ? rule.params.join(", ")
      : ""
    : Object.keys(rule?.params || {}).join(", ");
}
function addPayloadRule(mode: string) {
  payloadEditMode.value = mode;
  payloadEditIndex.value = -1;
  payloadEditor.models = JSON.stringify([{ name: "" }], null, 2);
  payloadEditor.params = mode === "filter" ? "[]" : "{}";
  payloadEditorError.value = "";
  payloadEditorOpen.value = true;
}
function editPayload(mode: string, index: number) {
  const rule = payloadDraft[mode]?.[index];
  payloadEditMode.value = mode;
  payloadEditIndex.value = index;
  payloadEditor.models = JSON.stringify(rule?.models || [], null, 2);
  payloadEditor.params = JSON.stringify(
    rule?.params ?? (mode === "filter" ? [] : {}),
    null,
    2,
  );
  payloadEditorError.value = "";
  payloadEditorOpen.value = true;
}
function duplicatePayload(mode: string, index: number) {
  const rules = payloadDraft[mode];
  const rule = rules?.[index];
  if (!rules || !rule) return;
  rules.push(structuredClone(toRaw(rule)));
  syncSpecialDrafts();
}
function removePayload(mode: string, index: number) {
  payloadDraft[mode]?.splice(index, 1);
  syncSpecialDrafts();
}
function savePayloadEditor() {
  try {
    const models = JSON.parse(payloadEditor.models);
    const params = JSON.parse(payloadEditor.params);
    if (
      !Array.isArray(models) ||
      !models.length ||
      models.some((model: ConfigDraft) => !model?.name?.trim())
    )
      throw new Error(t('config.payload.errorModels'));
    if (
      payloadEditMode.value === "filter"
        ? !Array.isArray(params)
        : !params || typeof params !== "object" || Array.isArray(params)
    )
      throw new Error(t('config.payload.errorParams'));
    const rule = { models, params };
    const rules = (payloadDraft[payloadEditMode.value] ??= []);
    if (payloadEditIndex.value < 0) rules.push(rule);
    else rules[payloadEditIndex.value] = rule;
    syncSpecialDrafts();
    payloadEditorOpen.value = false;
  } catch (error: any) {
    payloadEditorError.value = error.message;
  }
}
watch(aliasRows, syncSpecialDrafts, { deep: true });
return {
  ...oauthEditors, modelsLoading,
  aliasRows, addAlias, payloadDraft, payloadModes,
  payloadModeLabel, payloadEditorOpen, payloadEditMode, payloadEditIndex,
  payloadEditor, payloadEditorError, payloadRuleSummary, payloadRulePaths,
  addPayloadRule, editPayload, duplicatePayload, removePayload, savePayloadEditor,
  syncEditors, syncSpecialDrafts,
};
}
