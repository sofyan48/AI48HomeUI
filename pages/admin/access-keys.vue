<template>
  <section class="grid w-full gap-4">
    <AdminStatGrid
      v-if="hasLoaded && !primaryError"
      :label="t('keys.summaryLabel')"
      :items="keySummary"
      :columns="4"
    />

    <AppCard v-if="primaryError">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="font-semibold text-[var(--ui-text-highlighted)]">
            {{ t('keys.loadErrorTitle') }}
          </h2>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
            {{ t('keys.loadErrorHint') }}
          </p>
        </div>
        <AppButton
          color="neutral"
          variant="outline"
          icon="i-tabler-refresh"
          :loading="loading"
          @click="syncData"
          >{{ t('common.retry') }}</AppButton
        >
      </div>
    </AppCard>

    <AppCard v-else-if="loading && !hasLoaded">
      <div class="py-8 text-center">
        <h2 class="font-semibold text-[var(--ui-text-highlighted)]">
          {{ t('keys.loadingTitle') }}
        </h2>
        <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
          {{ t('keys.loadingHint') }}
        </p>
      </div>
    </AppCard>

    <AdminTablePanel
      v-else
      :title="t('keys.title')"
      :description="t('keys.countOf', { shown: filteredResources.length, total: resources.length })"
    >
      <template #actions>
        <UInput
          v-model="search"
          icon="i-tabler-search"
          :placeholder="t('keys.searchPlaceholder')"
          :aria-label="t('keys.searchAria')"
          class="w-full sm:w-72"
        />
        <AccessKeyReplaceList @replaced="handleListReplaced" />
        <AppButton icon="i-tabler-plus" @click="openCreate">{{ t('keys.new') }}</AppButton>
      </template>

      <template v-if="selectedIDs.size" #bulk>
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span class="text-sm font-medium"
            >{{ t('keys.selectedCount', { count: selectedIDs.size }) }}</span
          >
          <div class="flex flex-wrap gap-2">
            <AppButton
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="bulkDeleting"
              @click="clearSelection"
              >{{ t('keys.clearSelection') }}</AppButton
            >
            <AppButton
              color="error"
              variant="ghost"
              size="sm"
              icon="i-tabler-trash"
              :disabled="bulkDeleting"
              @click="openBulkDelete"
              >{{ t('keys.deleteSelected') }}</AppButton
            >
          </div>
        </div>
      </template>

      <AppTable
        :columns="columns"
        :data="filteredResources"
        :loading="loading"
        class="access-keys-table min-w-[980px]"
      >
        <template #select-header>
          <UCheckbox
            :model-value="allFilteredSelected"
            :indeterminate="someFilteredSelected"
            :disabled="loading || bulkDeleting || !filteredResources.length"
            :aria-label="t('keys.selectAllAria')"
            @update:model-value="toggleAllFiltered(Boolean($event))"
          />
        </template>

        <template #select-cell="{ row }">
          <UCheckbox
            :model-value="selectedIDs.has(rowValue(row).id)"
            :disabled="bulkDeleting"
            :aria-label="t('keys.selectOneAria', { name: resourceSummary(rowValue(row)) })"
            @update:model-value="toggleSelected(rowValue(row), Boolean($event))"
          />
        </template>

        <template #number-cell="{ row }">
          <span class="app-table-number">{{ rowValue(row).index + 1 }}</span>
        </template>

        <template #identity-header>
          <div class="flex items-center gap-1.5">
            <span>{{ t('keys.colIdentity') }}</span>
            <UTooltip :text="t('keys.identityTooltip')">
              <UIcon
                name="i-tabler-info-circle"
                class="size-4 text-[var(--ui-text-muted)]"
              />
            </UTooltip>
          </div>
        </template>

        <template #identity-cell="{ row }">
          <div class="min-w-0">
            <p
              v-if="rowValue(row).displayName"
              class="truncate text-sm font-medium"
            >
              {{ rowValue(row).displayName }}
            </p>
            <div v-if="rowValue(row).identifier" class="flex min-w-0 items-center gap-1.5">
              <p class="min-w-0 truncate font-mono text-xs font-medium">
                {{ rowValue(row).identifier }}
              </p>
              <AppButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-tabler-clipboard"
                :aria-label="t('keys.copyIdentifierAria', { id: rowValue(row).identifier })"
                :title="t('keys.copyIdentifierAria', { id: rowValue(row).identifier })"
                @click.stop="copyText(rowValue(row).identifier, t('keys.identifierCopied'))"
              />
            </div>
            <p v-else class="truncate text-xs text-[var(--ui-text-muted)]">
              {{ t('keys.noIdentifier') }}
            </p>
            <div class="mt-1 flex min-w-0 items-center gap-1.5">
              <p
                class="min-w-0 truncate font-mono text-xs text-[var(--ui-text-muted)]"
              >
                {{ rowValue(row).maskedValue }}
              </p>
              <AppButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-tabler-clipboard"
                :aria-label="t('keys.copyKeyAria', { key: rowValue(row).maskedValue })"
                @click="copyText(rowValue(row).value, t('keys.keyCopied'))"
              />
            </div>
          </div>
        </template>

        <template #owner-cell="{ row }">
          <span
            :class="{
              'text-[var(--ui-text-muted)]':
                rowValue(row).userId == null || rowValue(row).userId === 0,
            }"
          >
            {{ ownerName(rowValue(row)) }}
          </span>
        </template>

        <template #credential-scope-cell="{ row }">
          <span class="block max-w-[220px] truncate">{{
            credentialScope(rowValue(row))
          }}</span>
        </template>

        <template #model-scope-cell="{ row }">
          <span class="block max-w-[220px] truncate">{{
            modelScope(rowValue(row))
          }}</span>
        </template>

        <template #length-cell="{ row }">{{ rowValue(row).length }}</template>

        <template #status-cell>
          <UBadge color="success" variant="subtle"
            ><UIcon
              name="i-tabler-circle-check"
              class="mr-1 size-3"
            />{{ t('keys.accepted') }}</UBadge
          >
        </template>

        <template #actions-cell="{ row }">
          <AdminRowActions
            :actions="rowActions(rowValue(row))"
            :menu-label="t('keys.menuLabel', { name: resourceSummary(rowValue(row)) })"
          />
        </template>

        <template #empty>
          <div
            class="px-6 py-12 text-center text-sm text-[var(--ui-text-muted)]"
          >
            {{ t('keys.emptyFiltered') }}
          </div>
        </template>
      </AppTable>
    </AdminTablePanel>

    <USlideover
      v-model:open="detailOpen"
      :title="detailTitle"
      :description="detailDescription"
      :ui="{ content: 'sm:max-w-xl' }"
      @update:open="handleDetailOpen"
    >
      <template #body>
        <form
          v-if="sheetMode === 'create' || sheetMode === 'edit'"
          class="grid gap-4"
          @submit.prevent="submitKey"
        >
          <p
            v-if="sheetMode === 'create'"
            class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]"
          >
            {{ t('keys.createHeading') }}
          </p>

          <UFormField
            v-if="supportsDisplayNames"
            :label="t('keys.displayName')"
            :hint="t('keys.displayNameHint')"
            :error="displayNameError"
          >
            <UInput
              v-model="form.displayName"
              class="w-full"
              :placeholder="t('keys.displayNamePlaceholder')"
              :disabled="submitting"
              @input="displayNameError = ''"
            />
          </UFormField>

          <UFormField :label="t('keys.keyValue')" required :error="keyValueError">
            <div class="flex gap-2">
              <UInput
                v-model="form.value"
                :type="formSecretVisible ? 'text' : 'password'"
                class="min-w-0 flex-1 font-mono"
                autocomplete="off"
                :disabled="submitting"
                @input="keyValueError = ''"
              />
              <AppButton
                type="button"
                color="neutral"
                variant="outline"
                :icon="formSecretVisible ? 'i-tabler-eye-off' : 'i-tabler-eye'"
                :aria-label="formSecretVisible ? t('keys.hide') : t('keys.reveal')"
                @click="formSecretVisible = !formSecretVisible"
              />
            </div>
          </UFormField>

          <AppButton
            type="button"
            color="neutral"
            variant="outline"
            icon="i-tabler-sparkles"
            :disabled="submitting"
            @click="generateKey"
          >
            {{ t('keys.generate') }}
          </AppButton>

          <UFormField
            v-if="supports('users', true)"
            :label="t('keys.owner')"
            :hint="ownerUnavailable ? t('keys.ownerUnavailableHint') : undefined"
          >
            <USelect
              :model-value="form.userId == null ? 'unassigned' : String(form.userId)"
              :items="ownerOptions"
              class="w-full"
              :disabled="submitting"
              @update:model-value="setFormOwner"
            />
          </UFormField>

          <template v-if="supports('access_groups', true)">
            <p v-if="supplementalError" role="status" class="text-sm text-[var(--ui-text-muted)]">
              {{ t('keys.supplementalError') }}
            </p>
            <UFormField :label="t('keys.credentialScope')" :hint="t('keys.credentialScopeHint')">
              <div class="grid gap-2">
                <UCheckbox
                  v-for="group in scopeOptions(channelGroups, form.channelGroupIds)"
                  :key="group.id"
                  :model-value="form.channelGroupIds.includes(group.id)"
                  :label="group.label"
                  :disabled="submitting"
                  @update:model-value="toggleFormGroup('channelGroupIds', group.id, $event)"
                />
                <p v-if="!scopeOptions(channelGroups, form.channelGroupIds).length" class="text-sm text-[var(--ui-text-muted)]">{{ t('keys.noCredentialGroups') }}</p>
              </div>
            </UFormField>
            <UFormField :label="t('keys.modelScope')" :hint="t('keys.modelScopeHint')">
              <div class="grid gap-2">
                <UCheckbox
                  v-for="group in scopeOptions(modelGroups, form.modelGroupIds)"
                  :key="group.id"
                  :model-value="form.modelGroupIds.includes(group.id)"
                  :label="group.label"
                  :disabled="submitting"
                  @update:model-value="toggleFormGroup('modelGroupIds', group.id, $event)"
                />
                <p v-if="!scopeOptions(modelGroups, form.modelGroupIds).length" class="text-sm text-[var(--ui-text-muted)]">{{ t('keys.noModelGroups') }}</p>
              </div>
            </UFormField>
            <p class="text-xs text-[var(--ui-text-muted)]">
              {{ t('keys.scopeNote') }}
            </p>
          </template>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AppButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="submitting"
              @click="cancelForm"
              >{{ t('common.cancel') }}</AppButton
            >
            <AppButton type="submit" :loading="submitting">{{
              sheetMode === "edit" ? t('keys.saveKey') : t('keys.createKey')
            }}</AppButton>
          </div>
        </form>

        <div v-else-if="selectedResource" class="space-y-5">
          <div class="rounded-md border border-[var(--ui-border)] p-3">
            <p class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.secretValue') }}</p>
            <p class="mt-2 break-all font-mono text-sm">
              {{
                detailSecretVisible
                  ? selectedResource.value
                  : selectedResource.maskedValue
              }}
            </p>
            <div class="mt-3 flex gap-2">
              <AppButton
                color="neutral"
                variant="outline"
                size="sm"
                :icon="
                  detailSecretVisible ? 'i-tabler-eye-off' : 'i-tabler-eye'
                "
                @click="detailSecretVisible = !detailSecretVisible"
              >
                {{ detailSecretVisible ? t('keys.hide') : t('keys.reveal') }}
              </AppButton>
              <AppButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-tabler-clipboard"
                @click="copyText(selectedResource.value, t('keys.keyCopied'))"
                >{{ t('common.copy') }}</AppButton
              >
            </div>
          </div>

          <dl class="grid gap-3 text-sm">
            <div
              v-if="supportsDisplayNames"
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.displayName') }}</dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ selectedResource.displayName || t('keys.noDisplayName') }}
              </dd>
            </div>
            <div
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.prefix') }}</dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ selectedResource.prefix }}
              </dd>
            </div>
            <div
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.suffix') }}</dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ selectedResource.suffix }}
              </dd>
            </div>
            <div
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.length') }}</dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ selectedResource.length }}
              </dd>
            </div>
            <div
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.owner') }}</dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ ownerName(selectedResource) }}
              </dd>
            </div>
            <div
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">
                {{ t('keys.credentialScope') }}
              </dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ credentialScope(selectedResource) }}
              </dd>
            </div>
            <div
              class="rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <dt class="text-xs text-[var(--ui-text-muted)]">{{ t('keys.modelScope') }}</dt>
              <dd class="mt-1 break-words font-mono text-xs">
                {{ modelScope(selectedResource) }}
              </dd>
            </div>
          </dl>

          <div class="grid gap-2">
            <AppButton icon="i-tabler-pencil" @click="openEdit(selectedResource)"
              >{{ t('common.edit') }}</AppButton
            >
            <AppButton
              color="error"
              variant="outline"
              icon="i-tabler-trash"
              @click="openDelete(selectedResource)"
              >{{ t('common.delete') }}</AppButton
            >
          </div>
        </div>
      </template>
    </USlideover>

    <AppModal
      v-model:open="confirmationOpen"
      :title="confirmationTitle"
      :description="confirmationDescription"
    >
      <template #body>
        <div class="flex justify-end gap-2">
          <AppButton
            color="neutral"
            variant="outline"
            :disabled="confirmationBusy"
            @click="closeConfirmation"
            >{{ t('common.cancel') }}</AppButton
          >
          <AppButton
            color="error"
            :loading="confirmationBusy"
            @click="confirmDestructiveAction"
            >{{ confirmationActionLabel }}</AppButton
          >
        </div>
      </template>
    </AppModal>
  </section>
</template>

<script setup>
import AccessKeyReplaceList from '~/components/admin/access-keys/ReplaceList.vue'
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
const { fetchAPI, fetchRaw } = useApi();
const { supports } = useCapabilities();
const toast = useToast();
const { t } = useAdminI18n();

const MAX_DISPLAY_NAME_LENGTH = 128;
const rowValue = (row) => row?.original ?? row;

const search = ref("");
const loading = useWorkspaceState('admin:access-keys:loading', () => (false));
const hasLoaded = useWorkspaceState('admin:access-keys:hasLoaded', () => (false));
const primaryError = useWorkspaceState('admin:access-keys:primaryError', () => (""));
const resources = useWorkspaceState('admin:access-keys:resources', () => ([]));
const users = useWorkspaceState('admin:access-keys:users', () => ([]));
const channelGroups = useWorkspaceState('admin:access-keys:channelGroups', () => ([]));
const modelGroups = useWorkspaceState('admin:access-keys:modelGroups', () => ([]));

const supportsDisplayNames = useWorkspaceState('admin:access-keys:supportsDisplayNames', () => (true));
const selectedIDs = ref(new Set());
const wideTable = ref(false);

const detailOpen = ref(false);
const sheetMode = ref("detail");
const selectedResource = ref(null);
const detailSecretVisible = ref(false);
const formSecretVisible = ref(false);
const submitting = useWorkspaceState('admin:access-keys:submitting', () => (false));
const keyValueError = ref("");
const displayNameError = ref("");
const form = reactive({ value: "", displayName: "", userId: null, channelGroupIds: [], modelGroupIds: [] });
const supplementalError = useWorkspaceState('admin:access-keys:supplementalError', () => (""));
const ownerOptions = computed(() => {
  const options = [{ label: t('keys.unassigned'), value: "unassigned" }];
  for (const user of users.value) {
    if (!user.deletedAt || user.id === form.userId)
      options.push({ label: user.deletedAt ? t('keys.deletedSuffix', { name: user.name }) : user.name, value: String(user.id) });
  }
  if (form.userId != null && !users.value.some((user) => user.id === form.userId))
    options.push({ label: t('keys.unavailableId', { id: form.userId }), value: String(form.userId) });
  return options;
});
const ownerUnavailable = computed(() => form.userId != null &&
  !users.value.some((user) => user.id === form.userId && !user.deletedAt));

const confirmationOpen = ref(false);
const confirmationType = ref(null);
const confirmationResources = ref([]);
const deleting = useWorkspaceState('admin:access-keys:deleting', () => (false));
const bulkDeleting = useWorkspaceState('admin:access-keys:bulkDeleting', () => (false));

const compactColumns = computed(() => [
  { accessorKey: "select", header: "" },
  { accessorKey: "identity", header: t('keys.colIdentity') },
  { accessorKey: "status", header: t('common.status') },
  {
    id: "actions",
    header: t('common.actions'),
    meta: {
      class: {
        th: "w-px whitespace-nowrap text-right",
        td: "w-px whitespace-nowrap text-right",
      },
    },
  },
]);

const fullColumns = computed(() => [
  { accessorKey: "select", header: "" },
  { accessorKey: "number", header: t('keys.colNumber'), meta: { class: { th: "app-table-number-head", td: "app-table-number-cell" } } },
  { accessorKey: "identity", header: t('keys.colIdentity') },
  { accessorKey: "owner", header: t('keys.owner') },
  { accessorKey: "credential-scope", header: t('keys.credentialScope') },
  { accessorKey: "model-scope", header: t('keys.modelScope') },
  { accessorKey: "length", header: t('keys.length') },
  { accessorKey: "status", header: t('common.status') },
  {
    id: "actions",
    header: t('common.actions'),
    meta: {
      class: {
        th: "w-px whitespace-nowrap text-right",
        td: "w-px whitespace-nowrap text-right",
      },
    },
  },
]);

const columns = computed(() =>
  wideTable.value ? fullColumns.value : compactColumns.value,
);
const detailTitle = computed(() =>
  sheetMode.value === "create"
    ? t('keys.sheetNew')
    : sheetMode.value === "edit"
      ? t('keys.sheetUpdate')
      : t('keys.sheetDetail'),
);
const detailDescription = computed(() => {
  if (sheetMode.value === "create") return t('keys.createHeading');
  return selectedResource.value
    ? resourceSummary(selectedResource.value)
    : t('keys.selectOrCreate');
});

const keySummary = computed(() => {
  const total = resources.value.length;
  const owned = resources.value.filter((resource) => resource.userId != null).length;
  const credentialScoped = resources.value.filter((resource) => resource.channelGroupIds.length).length;
  const modelScoped = resources.value.filter((resource) => resource.modelGroupIds.length).length;
  const ratio = (value) => (total ? value / total : 0);
  // Every card carries the same parts (value, one-line detail, ratio bar) so the row stays even.
  return [
    { label: t('keys.title'), value: total, detail: t('keys.statUnrestricted', { count: keyCoverage.value.open }), icon: "i-tabler-key", tone: "violet", ratio: ratio(keyCoverage.value.scoped), warning: keyCoverage.value.open > 0 && keyCoverage.value.scoped === 0 },
    { label: t('keys.statAssigned'), value: owned, detail: t('keys.statUnassigned', { count: total - owned }), icon: "i-tabler-user-check", tone: "blue", ratio: ratio(owned) },
    { label: t('keys.statCredentialScoped'), value: credentialScoped, detail: t('keys.groupsAvailable', { count: channelGroups.value.length }), icon: "i-tabler-route", tone: "emerald", ratio: ratio(credentialScoped) },
    { label: t('keys.statModelScoped'), value: modelScoped, detail: t('keys.groupsAvailable', { count: modelGroups.value.length }), icon: "i-tabler-box-multiple", tone: "amber", ratio: ratio(modelScoped) },
  ];
});

// Keys with neither credential nor model groups can reach every upstream and model.
const keyCoverage = computed(() => {
  const total = resources.value.length;
  const scoped = resources.value.filter((resource) => resource.channelGroupIds.length || resource.modelGroupIds.length).length;
  return { scoped, open: total - scoped, restricted: total ? Math.round((scoped / total) * 100) : 0 };
});

const filteredResources = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return resources.value;
  return resources.value.filter((resource) =>
    [
      resource.value,
      resource.maskedValue,
      resource.identifier ?? "",
      resource.displayName ?? "",
      resource.prefix,
      resource.suffix,
      String(resource.index),
      resource.userId == null || resource.userId === 0
        ? ""
        : ownerName(resource),
      credentialScope(resource),
      modelScope(resource),
    ].some((value) => String(value).toLowerCase().includes(query)),
  );
});

const selectedResources = computed(() =>
  resources.value.filter((resource) => selectedIDs.value.has(resource.id)),
);
const selectedFilteredResources = computed(() =>
  filteredResources.value.filter((resource) =>
    selectedIDs.value.has(resource.id),
  ),
);
const allFilteredSelected = computed(
  () =>
    filteredResources.value.length > 0 &&
    selectedFilteredResources.value.length === filteredResources.value.length,
);
const someFilteredSelected = computed(
  () =>
    selectedFilteredResources.value.length > 0 && !allFilteredSelected.value,
);
const confirmationBusy = computed(() => deleting.value || bulkDeleting.value);
const confirmationTitle = computed(() =>
  confirmationType.value === "bulk"
    ? t('keys.confirmBulkTitle')
    : t('keys.confirmDeleteTitle'),
);
const confirmationDescription = computed(() => {
  if (confirmationType.value === "bulk")
    return t('keys.confirmBulkDesc', { count: confirmationResources.value.length });
  const resource = confirmationResources.value[0];
  return resource ? t('keys.confirmDeleteDesc', { name: resourceSummary(resource) }) : "";
});
const confirmationActionLabel = computed(() =>
  confirmationType.value === "bulk" ? t('keys.deleteSelected') : t('common.delete'),
);

let mediaQuery;
let mediaQueryListener;

onMounted(() => {
  mediaQuery = window.matchMedia("(min-width: 640px)");
  mediaQueryListener = (event) => {
    wideTable.value = event.matches;
  };
  wideTable.value = mediaQuery.matches;
  mediaQuery.addEventListener?.("change", mediaQueryListener);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener?.("change", mediaQueryListener);
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(object, keys) {
  for (const key of keys) {
    if (typeof object?.[key] === "string") return object[key];
  }
  return null;
}

function firstNumber(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function numericArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "number" && Number.isFinite(item))
    : [];
}

function selectAPIKeyEntries(payload) {
  if (Array.isArray(payload)) return payload;
  const entries = payload?.api_key_entries ?? payload?.items;
  if (Array.isArray(entries) && entries.length > 0) return entries;
  const legacy = payload?.["api-keys"] ?? payload?.api_keys;
  return Array.isArray(legacy)
    ? legacy.filter((value) => typeof value === "string")
    : [];
}

function normalizeResource(raw, index) {
  const object = isPlainObject(raw) ? raw : null;
  const value = (
    object
      ? (firstString(object, ["api_key", "api-key", "key", "value"]) ?? "")
      : typeof raw === "string"
        ? raw
        : ""
  ).trim();
  const numericId = object
    ? firstNumber(object, ["id", "api_key_id", "api-key-id"])
    : null;
  const displayNameValue = object
    ? firstString(object, ["display_name"])
    : null;
  const displayName = displayNameValue?.trim() || null;
  const modelGroupValue = object
    ? (object.model_groups ?? object["model-groups"])
    : null;
  const rawUserId = object ? firstNumber(object, ["user_id", "user-id"]) : null;
  return {
    id: numericId != null ? String(numericId) : `${index}:${value}`,
    index,
    numericId,
    identifier: numericId != null ? `api-key-${numericId}` : null,
    displayName,
    value,
    maskedValue: value
      ? value.length <= 10
        ? `${value.slice(0, 2)}***`
        : `${value.slice(0, 6)}...${value.slice(-4)}`
      : "",
    prefix: value.slice(0, 6),
    suffix: value.slice(-4),
    length: value.length,
    userId: rawUserId > 0 ? rawUserId : null,
    channelGroupIds: numericArray(object?.channels),
    modelGroupIds: numericArray(modelGroupValue),
    raw,
  };
}

function serializeEntry(resource, displayName) {
  return {
    api_key: resource.value.trim(),
    ...(displayName === undefined
      ? {}
      : { display_name: displayName.trim() || null }),
    user_id: resource.userId ?? 0,
    channels: resource.channelGroupIds ?? [],
    model_groups: resource.modelGroupIds ?? [],
  };
}

function topLevelArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function normalizeUsers(payload) {
  return topLevelArray(payload, ["users", "items", "records", "data"])
    .map((item) => {
      if (!isPlainObject(item)) return null;
      const id = firstNumber(item, ["id", "user_id", "userId"]);
      if (id == null) return null;
      return {
        id,
        deletedAt: item.deleted_at ?? null,
        name:
          firstString(item, [
            "username",
            "user_name",
            "userName",
            "name",
          ])?.trim() || String(id),
      };
    })
    .filter(Boolean);
}

function normalizeGroups(payload, kind) {
  const topLevelKey = kind === "channel" ? "channel_groups" : "model_groups";
  const nameKeys =
    kind === "channel"
      ? ["channel_name", "name", "label"]
      : ["group_name", "name", "label"];
  const fallbackPrefix = kind === "channel" ? "channel-group" : "model-group";
  return topLevelArray(payload, [topLevelKey, "items"]).filter((item) => !item?.deleted_at).map((item, index) => {
    const object = isPlainObject(item) ? item : {};
    const id = firstNumber(object, ["id"]) ?? index + 1;
    return {
      id,
      disabled: Boolean(object.disabled),
      name:
        firstString(object, nameKeys)?.trim() ||
        `${fallbackPrefix}-${index + 1}`,
    };
  });
}

async function loadPrimary() {
  const response = await fetchRaw("/access/api-keys");
  const payload = response._data;
  const entries = selectAPIKeyEntries(payload);
  resources.value = entries
    .map(normalizeResource)
    .filter((resource) => resource.value);
  supportsDisplayNames.value =
    entries.length === 0 ||
    entries.some(
      (entry) =>
        isPlainObject(entry) &&
        Object.prototype.hasOwnProperty.call(entry, "display_name"),
    );
}

async function supplementalRequest(path) {
  try {
    return await fetchAPI(path);
  } catch {
    supplementalError.value = "Some owner or group metadata could not be loaded.";
    return null;
  }
}

async function loadSupplemental() {
  supplementalError.value = "";
  const tasks = [];
  let usersIndex = -1;
  let channelGroupsIndex = -1;
  let modelGroupsIndex = -1;

  if (supports("users", true)) {
    usersIndex = tasks.length;
    tasks.push(supplementalRequest("/users"));
  }

  if (supports("access_groups", true)) {
    channelGroupsIndex = tasks.length;
    tasks.push(supplementalRequest("/channel-groups"));

    modelGroupsIndex = tasks.length;
    tasks.push(supplementalRequest("/model-groups"));

  }

  const results = await Promise.all(tasks);
  users.value = usersIndex >= 0 ? normalizeUsers(results[usersIndex]) : [];
  channelGroups.value =
    channelGroupsIndex >= 0
      ? normalizeGroups(results[channelGroupsIndex], "channel")
      : [];
  modelGroups.value =
    modelGroupsIndex >= 0
      ? normalizeGroups(results[modelGroupsIndex], "model")
      : [];
}

async function syncData() {
  loading.value = true;
  primaryError.value = "";
  try {
    await loadPrimary();
    await loadSupplemental();
    const validIDs = new Set(resources.value.map((resource) => resource.id));
    selectedIDs.value = new Set(
      [...selectedIDs.value].filter((id) => validIDs.has(id)),
    );
    if (selectedResource.value)
      selectedResource.value =
        resources.value.find(
          (resource) => resource.id === selectedResource.value.id,
        ) ?? null;
    hasLoaded.value = true;
  } catch (error) {
    resources.value = [];
    users.value = [];
    channelGroups.value = [];
    modelGroups.value = [];

    primaryError.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  selectedResource.value = null;
  sheetMode.value = "create";
  form.value = "";
  form.displayName = "";
  form.userId = null;
  form.channelGroupIds = [];
  form.modelGroupIds = [];
  resetFormState();
  detailOpen.value = true;
}

function openDetail(resource) {
  selectedResource.value = resource;
  sheetMode.value = "detail";
  detailSecretVisible.value = false;
  detailOpen.value = true;
}

function openEdit(resource) {
  selectedResource.value = resource;
  sheetMode.value = "edit";
  form.value = resource.value;
  form.displayName = resource.displayName || "";
  form.userId = resource.userId;
  form.channelGroupIds = [...resource.channelGroupIds];
  form.modelGroupIds = [...resource.modelGroupIds];
  resetFormState();
  detailOpen.value = true;
}

function resetFormState() {
  keyValueError.value = "";
  displayNameError.value = "";
  formSecretVisible.value = false;
}

function cancelForm() {
  if (sheetMode.value === "edit") {
    sheetMode.value = "detail";
    resetFormState();
    return;
  }
  detailOpen.value = false;
}

function handleDetailOpen(open) {
  if (!open) {
    sheetMode.value = "detail";
    detailSecretVisible.value = false;
    resetFormState();
  }
}

function validateForm() {
  const value = form.value.trim();
  const displayName = form.displayName.trim();
  if (!value) keyValueError.value = t('keys.keyRequired');
  if (
    supportsDisplayNames.value &&
    Array.from(displayName).length > MAX_DISPLAY_NAME_LENGTH
  ) {
    displayNameError.value = t('keys.displayNameTooLong', { max: MAX_DISPLAY_NAME_LENGTH });
  }
  return Boolean(value) && !displayNameError.value;
}

async function submitKey() {
  if (submitting.value) return;
  keyValueError.value = "";
  displayNameError.value = "";
  if (!validateForm()) return;

  submitting.value = true;
  try {
    if (sheetMode.value === "edit" && selectedResource.value) {
      const changed = await updateResource(selectedResource.value);
      if (!changed) {
        sheetMode.value = "detail";
        return;
      }
      await syncData();
      selectedResource.value =
        resources.value.find(
          (resource) => resource.id === selectedResource.value?.id,
        ) ?? null;
      sheetMode.value = "detail";
      toast.add({ title: t('keys.updated'), color: "success" });
    } else {
      await createResource();
      detailOpen.value = false;
      await syncData();
      toast.add({ title: t('keys.created'), color: "success" });
    }
  } catch (error) {
    showErrorToast(error);
  } finally {
    submitting.value = false;
  }
}

async function handleListReplaced() {
  detailOpen.value = false;
  selectedResource.value = null;
  clearSelection();
  await syncData();
}

async function createResource() {
  const newResource = {
    value: form.value.trim(),
    userId: form.userId,
    channelGroupIds: [...form.channelGroupIds],
    modelGroupIds: [...form.modelGroupIds],
  };
  const newEntry = serializeEntry(
    newResource,
    supportsDisplayNames.value ? form.displayName : undefined,
  );

  // Creation must never silently become a whole-list replacement.
  await fetchAPI("/access/api-keys", { method: "POST", body: newEntry });
}

async function updateResource(resource) {
  const nextValue = form.value.trim();
  const nextDisplayName = form.displayName.trim();
  const valueChanged = nextValue !== resource.value;
  const displayNameChanged =
    supportsDisplayNames.value &&
    nextDisplayName !== (resource.displayName || "");
  // Omitted fields preserve stored bindings without revalidating a deleted owner
  // or restoring group bindings removed since this form was opened.
  const bindings = {
    ...(form.userId === resource.userId ? {} : { user_id: form.userId ?? 0 }),
    ...(sameGroupIds(form.channelGroupIds, resource.channelGroupIds) ? {} : { channels: [...form.channelGroupIds] }),
    ...(sameGroupIds(form.modelGroupIds, resource.modelGroupIds) ? {} : { model_groups: [...form.modelGroupIds] }),
  };
  if (!valueChanged && !displayNameChanged && !Object.keys(bindings).length) return false;

  if (valueChanged) {
    await fetchAPI("/access/api-keys", {
      method: "PATCH",
      body: {
        ...(resource.numericId != null
          ? { id: resource.numericId }
          : { index: resource.index }),
        value: {
          api_key: nextValue,
          ...bindings,
        },
        ...(displayNameChanged
          ? { display_name: nextDisplayName || null }
          : {}),
      },
    });
  } else {
    await fetchAPI("/access/api-keys", {
      method: "PATCH",
      body: {
        ...(resource.numericId != null
          ? { id: resource.numericId }
          : { api_key: resource.value }),
        ...bindings,
        ...(displayNameChanged ? { display_name: nextDisplayName || null } : {}),
      },
    });
  }
  return true;
}

function openDelete(resource) {
  confirmationType.value = "delete";
  confirmationResources.value = [resource];
  confirmationOpen.value = true;
}

function openBulkDelete() {
  confirmationType.value = "bulk";
  confirmationResources.value = [...selectedResources.value];
  confirmationOpen.value = true;
}

function closeConfirmation() {
  confirmationOpen.value = false;
  confirmationType.value = null;
  confirmationResources.value = [];
}

async function confirmDestructiveAction() {
  if (confirmationType.value === "bulk") await deleteSelected();
  else await deleteOne();
}

async function requestDelete(resource) {
  await fetchAPI("/access/api-keys", {
    method: "DELETE",
    query:
      resource.numericId != null
        ? { id: resource.numericId }
        : { index: resource.index },
  });
}

async function deleteOne() {
  const resource = confirmationResources.value[0];
  if (!resource) return;
  deleting.value = true;
  try {
    await requestDelete(resource);
    selectedIDs.value = new Set(
      [...selectedIDs.value].filter((id) => id !== resource.id),
    );
    selectedResource.value = null;
    sheetMode.value = "detail";
    detailOpen.value = false;
    closeConfirmation();
    await syncData();
    toast.add({ title: t('keys.deleted'), color: "success" });
  } catch (error) {
    showErrorToast(error);
  } finally {
    deleting.value = false;
  }
}

async function deleteSelected() {
  const targets = [...confirmationResources.value].sort(
    (left, right) => right.index - left.index,
  );
  if (!targets.length) return;
  bulkDeleting.value = true;
  try {
    for (const resource of targets) await requestDelete(resource);
    selectedIDs.value = new Set();
    selectedResource.value = null;
    sheetMode.value = "detail";
    detailOpen.value = false;
    closeConfirmation();
    await syncData();
    toast.add({
      title: t('keys.bulkDeleted', { count: targets.length }),
      color: "success",
    });
  } catch (error) {
    showErrorToast(error);
  } finally {
    bulkDeleting.value = false;
  }
}

function rowActions(resource) {
  return [
    {
      id: "view",
      label: t('common.view'),
      ariaLabel: t('keys.viewAria'),
      icon: "i-tabler-eye",
      onSelect: () => openDetail(resource),
    },
    {
      id: "edit",
      label: t('common.edit'),
      ariaLabel: t('keys.editAria'),
      icon: "i-tabler-pencil",
      onSelect: () => openEdit(resource),
    },
    resource.identifier && {
      id: "copy",
      label: t('keys.copyIdentifier'),
      icon: "i-tabler-copy",
      onSelect: () => copyText(resource.identifier, t('keys.identifierCopiedShort')),
    },
    {
      id: "delete",
      label: t('common.delete'),
      ariaLabel: t('keys.deleteAria'),
      icon: "i-tabler-trash",
      destructive: true,
      onSelect: () => openDelete(resource),
    },
  ];
}

function toggleSelected(resource, checked) {
  const next = new Set(selectedIDs.value);
  if (checked) next.add(resource.id);
  else next.delete(resource.id);
  selectedIDs.value = next;
}

function toggleAllFiltered(checked) {
  const next = new Set(selectedIDs.value);
  for (const resource of filteredResources.value) {
    if (checked) next.add(resource.id);
    else next.delete(resource.id);
  }
  selectedIDs.value = next;
}

function clearSelection() {
  selectedIDs.value = new Set();
}

function generatedKey() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sk-${hex}`;
}

function generateKey() {
  form.value = generatedKey();
  keyValueError.value = "";
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    toast.add({ title: successMessage, color: "success" });
  } catch (error) {
    showErrorToast(error);
  }
}

function resourceSummary(resource) {
  const identity = resource.identifier
    ? `${resource.identifier} · ${resource.maskedValue}`
    : resource.maskedValue;
  return resource.displayName
    ? `${resource.displayName} · ${identity}`
    : identity;
}

function setFormOwner(value) {
  if (!value) return;
  if (value === "unassigned") {
    form.userId = null;
    return;
  }
  const id = Number(value);
  if (Number.isSafeInteger(id) && id > 0) form.userId = id;
}

function sameGroupIds(left, right) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function scopeOptions(groups, selected) {
  const options = groups.map((group) => ({
    id: group.id,
    label: group.disabled ? t('keys.disabledSuffix', { name: group.name }) : group.name,
  }));
  for (const id of selected) {
    if (!groups.some((group) => group.id === id))
      options.push({ id, label: t('keys.unavailableId', { id }) });
  }
  return options;
}

function toggleFormGroup(field, id, checked) {
  form[field] = checked === true
    ? [...new Set([...form[field], id])]
    : form[field].filter((value) => value !== id);
}

function ownerName(resource) {
  if (resource.userId == null || resource.userId === 0) return t('keys.unassigned');
  return (
    users.value.find((user) => user.id === resource.userId)?.name ||
    String(resource.userId)
  );
}

function groupName(id, groups) {
  return groups.find((group) => group.id === id)?.name || String(id);
}

function credentialScope(resource) {
  return resource.channelGroupIds.length
    ? resource.channelGroupIds
        .map((id) => groupName(id, channelGroups.value))
        .join(", ")
    : t('keys.unrestricted');
}

function modelScope(resource) {
  return resource.modelGroupIds.length
    ? resource.modelGroupIds
        .map((id) => groupName(id, modelGroups.value))
        .join(", ")
    : t('keys.unrestricted');
}

function errorMessage(error) {
  return typeof error?.message === "string" && error.message.trim()
    ? error.message
    : t('keys.requestFailed');
}

function showErrorToast(error) {
  toast.add({ title: errorMessage(error), color: "error" });
}

useDataSync('admin:access-keys:sync', syncData);
await syncData();
</script>

<style scoped>
.access-keys-table :deep(th:first-child),
.access-keys-table :deep(td:first-child) {
  width: 2.75rem;
  min-width: 2.75rem;
}

.access-keys-table :deep(th:nth-child(2)),
.access-keys-table :deep(td:nth-child(2)) {
  min-width: 12rem;
}

.access-keys-table :deep(th:nth-last-child(2)),
.access-keys-table :deep(td:nth-last-child(2)) {
  white-space: nowrap;
}
</style>

