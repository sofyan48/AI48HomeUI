import { computed, inject, onMounted, provide, ref, toRaw, type InjectionKey } from 'vue'
import { useApi, useAdminI18n, useToast } from '#imports'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { parseDocument } from 'yaml'
import { planConfigWrites, applyConfigWrites, reconcileConfigDraft } from '~/composables/configWrites'
import { sharedConfigFields } from './schema'
import { buildDraft, configWriteValue, v8YamlPaths } from './draft'
import { useConfigPresentation } from './useConfigPresentation'
import { useConfigValidation } from './useConfigValidation'
import { useConfigEditors } from './useConfigEditors'
import type { ConfigDraft } from './types'

function createConfigWorkspace() {
const { fetchAPI } = useApi();
const toast = useToast();
const { t, intlLocale } = useAdminI18n();
const loading = useWorkspaceState('admin:config:loading', () => (false));
const loaded = useWorkspaceState('admin:config:loaded', () => (false));
const saving = useWorkspaceState('admin:config:saving', () => (false));
const pageError = useWorkspaceState('admin:config:pageError', () => (""));
const updatedAt = useWorkspaceState<Date | null>('admin:config:updatedAt', () => (null));
const runtimeMode = useWorkspaceState('admin:config:runtimeMode', () => ("home"));
const draft = ref<ConfigDraft>({});
const baseline = useWorkspaceState<ConfigDraft>('admin:config:baseline', () => ({}));
const yamlText = useWorkspaceState('admin:config:yamlText', () => (""));
const configSnapshot = useWorkspaceState('admin:config:configSnapshot', () => ({}));
const changesOpen = ref(false);
const reloadConfirmOpen = ref(false);
const saveNeedsReload = ref(false);
const { displaySharedSections, outline, labels } = useConfigPresentation(t);
const { validationErrors, validationCount } = useConfigValidation(draft, t);
const editors = useConfigEditors(draft, fetchAPI, t);
const { syncEditors, syncSpecialDrafts, loadChannelModels } = editors;
const updatedLabel = computed(() =>
  updatedAt.value
    ? new Intl.DateTimeFormat(intlLocale.value, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(updatedAt.value)
    : "—",
);
const changes = computed(() =>
  Object.keys(draft.value)
    .filter((key) => fieldChanged(key))
    .map((key) => ({
      key,
      label: labels.value[key] || key,
      before: formatChangeValue(key, baseline.value[key]),
      after: formatChangeValue(key, draft.value[key]),
      section:
        outline.value.find((section) => section.keys.includes(key))?.id || "server",
    })),
);
const dirtyCount = computed(() => changes.value.length);
function scrollToSection(id: string) {
  document
    .getElementById(`config-${id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function fieldChanged(key: string) {
  if (sharedConfigFields.some(field => field.key === key)) {
    return draft.value[key] !== baseline.value[key];
  }
  return String(draft.value[key]) !== String(baseline.value[key]);
}
function formatChangeValue(key: string, value: unknown) {
  if (key === "remoteManagementSecretKey" || key === "liveMediaRelayIceServersJson" || key === "serverGithubToken") return t('config.changes.sensitive');
  if (sharedConfigFields.some(field => field.key === key)) {
    if (value === null || value === undefined) return t('config.changes.unset');
    if (value === "") return t('config.changes.emptyString');
  }
  return String(value ?? "");
}
function sectionDirty(keys: string[]) {
  return keys.some(fieldChanged);
}
async function loadWorkspace(preserveDraft = false) {
  if (loading.value) return;
  loading.value = true;
  pageError.value = "";
  try {
    const [config, yaml] = await Promise.all([
      fetchAPI("/config"),
      fetchAPI("/config.yaml", { responseType: "text" }),
    ]);
    configSnapshot.value = config;
    yamlText.value = String(yaml || "");
    const document = parseDocument(yamlText.value);
    if (document.errors.length) throw new Error(t('config.load.invalidYaml'));
    const root = document.toJS() || {};
    const next = buildDraft(config, root);
    const reconciled = preserveDraft === true
      ? reconcileConfigDraft(baseline.value, draft.value, next)
      : structuredClone(next);
    baseline.value = structuredClone(next);
    draft.value = reconciled;
    syncEditors();
    saveNeedsReload.value = false;
    runtimeMode.value =
      String(config.mode || config["runtime-mode"] || "home").toLowerCase() ===
      "cpa"
        ? "cpa"
        : "home";
    updatedAt.value = new Date();
    loaded.value = true;
    await loadChannelModels();
  } catch (error: any) {
    pageError.value =
      error?.data?.message ||
      error?.data?.error ||
      error?.message ||
      t('config.load.fallback');
  } finally {
    loading.value = false;
  }
}
function reloadWorkspace() {
  syncSpecialDrafts();
  if (dirtyCount.value) reloadConfirmOpen.value = true;
  else loadWorkspace();
}
async function saveWorkspace() {
  if (saving.value || loading.value || !loaded.value || saveNeedsReload.value) return;
  syncSpecialDrafts();
  if (!dirtyCount.value || validationCount.value) return;
  saving.value = true;
  pageError.value = "";
  try {
    const previous = structuredClone(toRaw(baseline.value));
    const intended = structuredClone(toRaw(draft.value));
    const writes = planConfigWrites(changes.value.map(change => change.key), v8YamlPaths, key => configWriteValue(draft.value, key));
    const result = await applyConfigWrites(writes, fetchAPI);
    // Even a failed write may have committed before runtime reload failed.
    // Always reread before offering a retry, without discarding remaining edits.
    await loadWorkspace(true);
    if (!pageError.value) {
      draft.value = reconcileConfigDraft(previous, intended, baseline.value);
      // Acknowledged writes may be normalized (including omitted defaults).
      for (const write of result.completed) {
        for (const key of write.keys) draft.value[key] = baseline.value[key];
      }
      syncEditors();
    }
    saveNeedsReload.value = Boolean(pageError.value);
    if (result.failed) {
      const error = result.error;
      const detail = error?.data?.message || error?.data?.error || error?.message || t('config.save.requestFailed');
      const refreshError = pageError.value;
      pageError.value = t('config.save.partial', {
        completed: result.completed.length,
        total: writes.length,
        path: result.failed.path,
        detail,
        next: refreshError ? t('config.save.readbackFailedRetry', { error: refreshError }) : t('config.save.reread'),
      });
    } else if (pageError.value) {
      pageError.value = t('config.save.readbackFailed', { error: pageError.value });
    } else {
      toast.add({ title: t('config.save.saved'), color: "success" });
    }
  } catch (error: any) {
    pageError.value = error?.message || t('config.save.prepareFailed');
  } finally {
    saving.value = false;
  }
}


useDataSync('admin:config:sync', () => {
  if (saving.value) return;
  syncSpecialDrafts();
  return loadWorkspace(true);
});
onMounted(loadWorkspace);
return {
  ...editors, t, loading, loaded, saving, pageError, runtimeMode, draft,
  changesOpen, reloadConfirmOpen, saveNeedsReload, updatedLabel, changes,
  dirtyCount, displaySharedSections, outline, validationErrors, validationCount,
  scrollToSection, sectionDirty, loadWorkspace, reloadWorkspace, saveWorkspace,
};
}

const configWorkspaceKey: InjectionKey<ReturnType<typeof createConfigWorkspace>> = Symbol('config-workspace');

export function provideConfigWorkspace() {
  const workspace = createConfigWorkspace();
  provide(configWorkspaceKey, workspace);
  return workspace;
}

export function useConfigWorkspace() {
  const workspace = inject(configWorkspaceKey);
  if (!workspace) throw new Error('Config workspace must be provided by the config page');
  return workspace;
}
