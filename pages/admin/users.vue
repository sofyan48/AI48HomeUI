<template>
  <section class="grid gap-4">
    <UAlert
      v-if="capabilitiesError"
      color="warning"
      variant="subtle"
      :title="t('users.capabilityFailed')"
      :description="capabilitiesError"
    />
    <UAlert
      v-if="pageErrors.length"
      color="warning"
      variant="subtle"
      :title="t('users.partialLoadFailed')"
      :description="pageErrors.join(' · ')"
    />

    <UAlert
      v-if="!usersSupported"
      color="info"
      variant="subtle"
      :title="t('users.unsupportedTitle')"
      :description="t('users.unsupportedDescription')"
    />

    <template v-else>
      <section class="members" :aria-label="t('users.summaryAria')" :aria-busy="loading && !users.length">
        <div class="members__lead">
          <span class="members__icon" aria-hidden="true"><UIcon name="i-tabler-users" class="size-4" /></span>
          <div class="min-w-0">
            <p class="members__count">{{ loading && !users.length ? '—' : compactNumber(liveUsers.length) }}<span> {{ t('users.membersSuffix') }}</span></p>
            <p class="truncate text-[11px] text-[var(--ui-text-muted)]">{{ t('users.membersSummary', { credits: userSummary[2].value, keys: compactNumber(keys.length), unassigned: compactNumber(unassignedKeyCount) }) }}</p>
          </div>
        </div>
        <div class="members__segments" role="group" :aria-label="t('users.filterByStatus')">
          <button
            v-for="segment in userSegments"
            :key="segment.value"
            type="button"
            class="members__segment"
            :class="[`members__segment--${segment.tone}`, { 'members__segment--active': userSegment === segment.value }]"
            :aria-pressed="userSegment === segment.value"
            :disabled="segment.value !== 'all' && !segment.count"
            @click="selectSegment(segment.value)"
          >
            <span class="members__dot" aria-hidden="true" />
            <span>{{ segment.label }}</span>
            <strong class="tabular-nums">{{ compactNumber(segment.count) }}</strong>
          </button>
        </div>
      </section>
      <AppPanelTabs v-model="activeTab" :items="tabs" :label="t('users.tabsLabel')" />

      <AdminTablePanel
        v-if="activeTab === 'users'"
        :title="t('common.users')"
        :description="`${t('users.usersCount', { shown: compactNumber(filteredUsers.length), total: compactNumber(users.length) })}${userSegment !== 'all' ? ` · ${userSegments.find(item => item.value === userSegment)?.label}` : ''}`"
      >
        <template #actions>
          <UInput
            v-model="search"
            icon="i-tabler-search"
            :placeholder="t('users.searchUsersPlaceholder')"
            :aria-label="t('users.searchUsers')"
            class="w-full sm:w-72"
          />
          <AppButton icon="i-tabler-user-plus" @click="openUserCreate">{{ t('users.newUser') }}</AppButton>
        </template>

        <template v-if="selectedUsers.length" #bulk>
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p class="text-sm font-medium">
                {{ t('users.usersSelected', { count: selectedUsers.length }) }}
              </p>
              <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">
                {{ t('users.bulkHint') }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <AppButton
                size="sm"
                color="neutral"
                variant="ghost"
                @click="selectedUserIds = new Set()"
                >{{ t('users.clearSelection') }}</AppButton
              ><AppButton
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-tabler-cash-banknote"
                @click="openBalance(selectedUsers)"
                >{{ t('users.balanceOperation') }}</AppButton
              >
            </div>
          </div>
        </template>

        <AppTable
          :columns="visibleUserColumns"
          :data="filteredUsers"
          :virtualize="{ estimateSize: 64, overscan: 8 }"
          :get-row-id="(user) => String(user.id)"
          :ui="{ base: 'w-full table-fixed lg:min-w-[90rem]' }"
          :loading="loading"
          :empty="t('users.noUsersMatch')"
        >
          <template #select-header>
            <UCheckbox
              :model-value="allFilteredUsersSelected"
              :indeterminate="someFilteredUsersSelected"
              :disabled="!operableFilteredUsers.length"
              :aria-label="t('users.selectOperableUsers')"
              @update:model-value="toggleAllFilteredUsers(Boolean($event))"
            />
          </template>
          <template #select-cell="{ row }"
            ><UCheckbox
              :model-value="selectedUserIds.has(row.original.id)"
              :disabled="!isOperableUser(row.original)"
              :aria-label="t('users.selectUser', { name: row.original.username })"
              @update:model-value="
                toggleUserSelection(row.original.id, Boolean($event))
              "
          /></template>
          <template #user-cell="{ row }"
            ><p class="truncate font-medium" :title="row.original.username">{{ row.original.username }}</p>
            <p v-if="row.original.pending_topup" class="text-xs text-[var(--ui-text-muted)]">{{ t('users.topupPending') }}</p></template
          >
          <template #status-cell="{ row }"
            ><UBadge
              :color="row.original.deleted_at || row.original.approval_pending ? 'warning' : 'success'"
              variant="subtle"
              >{{ userStatus(row.original) }}</UBadge
            ></template
          >
          <template #credits-cell="{ row }"
            ><span class="tabular-nums">{{
              formatCredits(row.original.credits)
            }}</span></template
          >
          <template #pendingTopup-cell="{ row }">
            <UBadge v-if="row.original.pending_topup" color="warning" variant="subtle">{{ t('users.creditsAmount', { amount: formatCredits(row.original.pending_topup.amount) }) }}</UBadge>
            <span v-else class="text-[var(--ui-text-muted)]">—</span>
          </template>
          <template #periodLimits-cell="{ row }"
            ><span
              v-if="zeroPeriodWindows(row.original).length"
              class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
              :title="t('users.blockedWindows', { windows: zeroPeriodWindows(row.original).join(', ') })"
              ><UIcon name="i-tabler-lock" class="size-3.5" />{{ t('users.blocked') }}</span
            ><span
              v-else-if="periodWindows(row.original).length"
              class="tabular-nums"
              >{{ t('users.windowsCount', { count: periodWindows(row.original).length }) }}</span
            ><span v-else class="text-[var(--ui-text-muted)]">—</span></template
          >
          <template #resetAllowance-cell="{ row }">
            <div v-if="resetAllowanceSupported && row.original.reset_allowance" class="min-w-0">
              <p class="tabular-nums">{{ t('users.resetsAvailable', { count: row.original.reset_allowance.available }) }} <span class="text-xs text-[var(--ui-text-muted)]">· {{ row.original.reset_allowance.mode === 'monthly' ? t('users.perMonth', { count: row.original.reset_allowance.amount }) : t('users.oneTimeLower') }}</span></p>
              <p v-if="row.original.reset_allowance.renews_at || row.original.reset_allowance.expires_at" class="truncate text-xs text-[var(--ui-text-muted)]" :title="formatDate(row.original.reset_allowance.renews_at || row.original.reset_allowance.expires_at)">{{ row.original.reset_allowance.mode === 'monthly' ? t('users.renews') : t('users.expires') }} {{ formatDate(row.original.reset_allowance.renews_at || row.original.reset_allowance.expires_at) }}</p>
            </div>
            <span v-else class="text-[var(--ui-text-muted)]">—</span>
          </template>
          <template #keys-cell="{ row }">{{
            keysForUser(row.original.id).length
          }}</template>
          <template #credentialScope-cell="{ row }"
            ><span
              class="block max-w-52 truncate"
              :title="effectiveChannelScopes(row.original.id).join(', ')"
              >{{ scopeSummary(effectiveChannelScopes(row.original.id)) }}</span
            ></template
          >
          <template #modelScope-cell="{ row }"
            ><span
              class="block max-w-52 truncate"
              :title="effectiveModelScopes(row.original.id).join(', ')"
              >{{ scopeSummary(effectiveModelScopes(row.original.id)) }}</span
            ></template
          >

          <template #actions-cell="{ row }">
            <UsersRowActions
              :user="row.original"
              :operable="isOperableUser(row.original)"
              :topup-supported="topupApprovalSupported"
              :reset-supported="resetAllowanceSupported"
              :approving="approvingUserId !== null"
              :approving-topup="approvingTopupUserId !== null"
              @view="openUserDetail(row.original)"
              @edit="openUserEdit(row.original)"
              @balance="openBalance([row.original])"
              @reset="openResetAllowance(row.original)"
              @approve="openApproval(row.original)"
              @topup="openTopupApproval(row.original)"
              @delete="confirmUserDelete(row.original)"
            />
          </template>
        </AppTable>
      </AdminTablePanel>

      <AdminTablePanel
        v-else-if="activeTab === 'keys'"
        :title="t('users.clientKeys')"
        :description="t('users.keysCount', { shown: filteredKeys.length, total: keys.length })"
      >
        <template #actions>
          <UInput
            v-model="search"
            icon="i-tabler-search"
            :placeholder="t('users.searchKeysPlaceholder')"
            :aria-label="t('users.searchKeys')"
            class="w-full sm:w-72"
          />
          <AppButton icon="i-tabler-plus" @click="openKeyCreate">{{ t('users.newKey') }}</AppButton>
        </template>
        <AppTable
          :columns="keyColumns"
          :data="filteredKeys"
          :loading="loading"
          class="min-w-0"
        >
          <template #key-cell="{ row }"
            ><div>
              <p class="font-mono text-xs">
                {{ maskKey(rowValue(row).api_key) }}
              </p>
              <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
                {{ t('users.sequence', { sequence: keySequence(rowValue(row)) }) }}
              </p>
            </div></template
          >
          <template #owner-cell="{ row }"
            ><span v-if="userById(rowValue(row).user_id)">{{
              userById(rowValue(row).user_id).username
            }}</span
            ><span v-else class="text-[var(--ui-text-muted)]"
              >{{ t('users.unassigned') }}</span
            ></template
          >
          <template #credentialScope-cell="{ row }"
            ><span class="block max-w-60 truncate">{{
              scopeSummary(keyChannelNames(rowValue(row)))
            }}</span></template
          >
          <template #modelScope-cell="{ row }"
            ><span class="block max-w-60 truncate">{{
              scopeSummary(keyModelNames(rowValue(row)))
            }}</span></template
          >
          <template #length-cell="{ row }">{{
            rowValue(row).api_key.length
          }}</template>
          <template #actions-cell="{ row }"
            ><div class="flex justify-end gap-1">
              <AdminTableAction
                action="edit"
                :label="t('users.editClientKey')"
                @click="openKeyEdit(rowValue(row))"
              /><AdminTableAction
                action="delete"
                :label="t('users.deleteClientKey')"
                destructive
                @click="confirmKeyDelete(rowValue(row))"
              /></div
          ></template>
          <template #empty
            ><EmptyState icon="i-tabler-key" :text="t('users.noClientKeys')"
          /></template>
        </AppTable>
      </AdminTablePanel>

      <AdminDataPanel
        v-else-if="activeTab === 'channelGroups'"
        :title="t('users.credentialScopes')"
        :description="t('users.scopesCount', { count: filteredChannelGroups.length })"
        content-class="p-4"
      >
        <template #actions
          ><AppButton
            v-if="accessGroupsSupported"
            size="sm"
            icon="i-tabler-plus"
            @click="openGroupForm('channel')"
            >{{ t('users.newCredentialScope') }}</AppButton
          ></template
        >
        <UnsupportedScopes v-if="!accessGroupsSupported" />
        <template v-else>
          <GroupCards
            kind="channel"
            :groups="filteredChannelGroups"
            :details="channelDetailsData"
            :channel-groups="channelGroups"
            :channel-bindings-supported="modelChannelBindingsSupported"
            @edit="openGroupForm('channel', $event)"
            @delete="confirmGroupDelete('channel', $event)"
            @add="openBindings('credential', $event)"
            @delete-detail="confirmDetailDelete('channel', $event)"
          />
        </template>
      </AdminDataPanel>

      <AdminDataPanel
        v-else
        :title="t('users.modelScopes')"
        :description="t('users.scopesCount', { count: filteredModelGroups.length })"
        content-class="p-4"
      >
        <UnsupportedScopes v-if="!accessGroupsSupported" />
        <section v-else class="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside
            class="self-start rounded-lg border border-[var(--ui-border)] bg-[var(--glass-card)] p-3 max-xl:hidden"
            :aria-label="t('users.modelScopes')"
          >
            <div class="flex items-center justify-between px-2 pb-2">
              <p
                class="text-xs font-medium uppercase text-[var(--ui-text-muted)]"
              >
                {{ t('users.modelScopes') }}
              </p>
              <AppButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-tabler-plus"
                :aria-label="t('users.newModelScope')"
                @click="openGroupForm('model')"
              />
            </div>
            <nav class="grid gap-1" :aria-label="t('users.modelScopes')">
              <button
                v-for="group in filteredModelGroups"
                :key="group.id"
                type="button"
                :aria-current="
                  Number(selectedModelGroup?.id) === Number(group.id)
                    ? 'page'
                    : undefined
                "
                class="flex w-full min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors"
                :class="
                  Number(selectedModelGroup?.id) === Number(group.id)
                    ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]'
                    : 'border-transparent hover:border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)]'
                "
                @click="selectedModelGroupId = group.id"
              >
                <span class="flex min-w-0 items-center gap-2.5"
                  ><span
                    :class="[
                      'flex size-6 shrink-0 items-center justify-center rounded-md border',
                      'border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] app-surface',
                      'text-[10px] font-semibold'
                    ]"
                    >M</span
                  ><span class="min-w-0"
                    ><span class="block truncate text-sm font-medium">{{
                      group.group_name
                    }}</span
                    ><span
                      class="mt-0.5 block text-xs text-[var(--ui-text-muted)]"
                      >{{ t('users.modelsCount', { count: modelDetailsFor(group.id).length }) }}</span
                    ></span
                  ></span
                >
                <UIcon
                  v-if="group.disabled"
                  name="i-tabler-alert-triangle"
                  class="size-4 shrink-0 text-[var(--ui-warning)]"
                /><span
                  v-else
                  class="shrink-0 rounded-md border border-[var(--ui-border)] px-2 py-1 text-xs"
                  >{{ modelDetailsFor(group.id).length }}</span
                >
              </button>
              <p
                v-if="!filteredModelGroups.length"
                class="px-3 py-8 text-center text-sm text-[var(--ui-text-muted)]"
              >
                {{ t('users.noModelScopesMatch') }}
              </p>
            </nav>
          </aside>

          <div class="min-w-0">
            <AdminDataPanel
              :title="selectedModelGroup?.group_name || t('users.modelScopes')"
              :description="
                selectedModelGroup
                  ? t('users.scopeBindingsSummary', { id: selectedModelGroup.id, count: selectedModelBindings.length })
                  : t('users.selectOrCreateModelScope')
              "
            >
              <template #actions>
                <USelectMenu
                  v-model="selectedModelGroupId"
                  :items="modelScopeOptions"
                  value-key="value"
                  label-key="label"
                  :search-input="{ placeholder: t('users.searchModelScopes') }"
                  class="w-56 xl:hidden"
                />
                <AppButton
                  v-if="selectedModelGroup"
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-tabler-pencil"
                  :aria-label="t('users.editModelScope')"
                  @click="openGroupForm('model', selectedModelGroup)"
                />
                <AppButton
                  v-if="selectedModelGroup"
                  size="sm"
                  color="error"
                  variant="ghost"
                  icon="i-tabler-trash"
                  :aria-label="t('users.deleteModelScope')"
                  @click="confirmGroupDelete('model', selectedModelGroup)"
                />
                <AppButton
                  size="sm"
                  icon="i-tabler-plus"
                  @click="
                    selectedModelGroup
                      ? openBindings('model', selectedModelGroup)
                      : openGroupForm('model')
                  "
                  >{{
                    selectedModelGroup ? t('users.addModels') : t('users.newScope')
                  }}</AppButton
                >
              </template>
              <div class="min-w-0">
                <AppTable
                  :columns="modelBindingColumns"
                  :data="selectedModelBindings"
                  :loading="loading"
                  class="min-w-0"
                >
                  <template #model-cell="{ row }"
                    ><div class="min-w-0">
                      <p
                        class="truncate font-mono text-xs font-medium text-[var(--ui-text-highlighted)]"
                        :title="rowValue(row).model_id"
                      >
                        {{ rowValue(row).model_id }}
                      </p>
                    </div></template
                  >
                  <template #channels-cell="{ row }"
                    ><span
                      class="block max-w-64 truncate text-xs text-[var(--ui-text-muted)]"
                      :title="modelBindingChannelLabel(rowValue(row))"
                      >{{ modelBindingChannelLabel(rowValue(row)) }}</span
                    ></template
                  >
                  <template #updated-cell="{ row }"
                    ><span
                      class="whitespace-nowrap text-xs text-[var(--ui-text-muted)]"
                      >{{ formatDate(rowValue(row).updated_at) }}</span
                    ></template
                  >
                  <template #actions-cell="{ row }"
                    ><div class="flex justify-end">
                      <AdminTableAction
                        action="remove"
                        :label="t('users.removeModelFromScope')"
                        destructive
                        @click="confirmDetailDelete('model', rowValue(row))"
                      /></div
                  ></template>
                  <template #empty
                    ><EmptyState
                      icon="i-tabler-cube"
                      :text="
                        selectedModelGroup
                          ? t('users.noModelsBound')
                          : t('users.selectModelScope')
                      "
                  /></template>
                </AppTable>
              </div>
            </AdminDataPanel>
          </div>
        </section>
      </AdminDataPanel>
    </template>

    <USlideover
      v-model:open="userFormOpen"
      :title="editingUser ? t('users.editUser') : t('users.newUser')"
      :description="
        editingUser
          ? t('users.editUserDescription')
          : t('users.newUserDescription')
      "
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body
        ><form class="space-y-4" @submit.prevent="submitUser">
          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :description="formError"
          />
          <UFormField :label="t('users.username')" :error="fieldError('username')"
            ><UInput
              v-model="userForm.username"
              class="w-full"
              placeholder="user@example.com"
              :disabled="saving || !!editingUser"
            />
            <p
              v-if="editingUser"
              class="mt-1 text-xs text-[var(--ui-text-muted)]"
            >
              {{ t('users.usernameLocked') }}
            </p></UFormField
          >
          <UFormField
            :label="
              editingUser ? t('users.newPasswordOptional') : t('users.initialPassword')
            "
            ><UInput
              v-model="userForm.password"
              type="password"
              class="w-full"
              :placeholder="t('users.passwordPlaceholder')"
              :disabled="saving"
          /></UFormField>
          <UFormField :label="t('users.credits')"
            ><UInput
              v-model="userForm.credits"
              type="text"
              inputmode="decimal"
              class="w-full"
              :disabled="
                saving || (periodLimitsSupported && userForm.credits_unlimited)
              "
            />
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
              {{
                periodLimitsSupported && userForm.credits_unlimited
                  ? t('users.unlimitedOnHint')
                  : t('users.creditsHint')
              }}
            </p></UFormField
          >
          <div
            v-if="periodLimitsSupported"
            class="grid gap-3 rounded-md border border-[var(--ui-border)] p-4"
          >
            <div>
              <h3 class="text-sm font-semibold">{{ t('users.periodLimits') }}</h3>
              <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
                {{ t('users.periodLimitsHint') }}
              </p>
            </div>
            <div
              class="flex items-center justify-between gap-3 rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <div>
                <p class="text-sm font-medium">{{ t('users.unlimitedBalance') }}</p>
                <p class="text-xs text-[var(--ui-text-muted)]">
                  {{ t('users.unlimitedBalanceHint') }}
                </p>
              </div>
              <USwitch
                v-model="userForm.credits_unlimited"
                :disabled="saving"
              />
            </div>
            <div
              v-for="window in periodWindowIds"
              :key="window"
              class="grid gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{{
                  periodWindowLabel(window)
                }}</span
                ><USwitch
                  v-model="userForm.periods[window].enabled"
                  :disabled="saving"
                />
              </div>
              <div
                v-if="userForm.periods[window].enabled"
                class="grid gap-3 sm:grid-cols-2"
              >
                <UFormField :label="t('users.creditsLimit')"
                  ><UInput
                    v-model="userForm.periods[window].limit"
                    type="text"
                    inputmode="decimal"
                    class="w-full" /></UFormField
                ><UFormField :label="t('users.windowMode')"
                  ><USelect
                    v-model="userForm.periods[window].mode"
                    :items="periodModeOptions(window)"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                /></UFormField>
              </div>
              <p
                v-if="
                  userForm.periods[window].enabled &&
                  parseLocalizedNumber(userForm.periods[window].limit) === 0
                "
                class="text-xs text-amber-600 dark:text-amber-400"
              >
                {{ t('users.zeroLimitWarning') }}
              </p>
              <div
                v-if="
                  window === '7d' &&
                  userForm.periods[window].enabled &&
                  userForm.periods[window].mode === 'calendar'
                "
                class="grid gap-3 sm:grid-cols-2"
              >
                <UFormField :label="t('users.weekStartsOn')"
                  ><USelect
                    v-model="userForm.week_reset_day"
                    :items="weekDayOptions"
                    value-key="value"
                    label-key="label"
                    class="w-full" /></UFormField
                ><UFormField :label="t('users.weekStartHour')"
                  ><UInput
                    v-model="userForm.week_reset_hour"
                    type="number"
                    min="0"
                    max="23"
                    step="1"
                    class="w-full"
                /></UFormField>
              </div>
            </div>
            <UFormField :label="t('users.timezone')"
              ><UInputMenu
                v-model="userForm.timezone"
                :items="timezoneOptions"
                class="w-full"
                :search-input="{ placeholder: t('users.searchTimezones') }"
              />
              <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
                {{ t('users.timezoneHint') }}
              </p></UFormField
            >
          </div>
          <div
            v-else
            class="rounded-md border border-dashed border-[var(--ui-border)] px-3 py-2.5 text-xs text-[var(--ui-text-muted)]"
          >
            {{ t('users.periodLimitsUnsupported') }}
          </div>
          <div
            class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"
          >
            <AppButton
              type="button"
              color="neutral"
              variant="outline"
              @click="userFormOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton type="submit" :loading="saving">{{
              editingUser ? t('users.saveChanges') : t('users.createUser')
            }}</AppButton>
          </div>
        </form></template
      >
    </USlideover>

    <USlideover
      v-model:open="userDetailOpen"
      :title="t('users.userDetail')"
      :description="t('users.userDetailDescription')"
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body
        ><div v-if="userDetail" class="grid gap-5">
          <div class="rounded-md border border-[var(--ui-border)] p-4">
            <div class="flex flex-wrap gap-2">
              <UBadge
                :color="userDetail.deleted_at || userDetail.approval_pending ? 'warning' : 'success'"
                variant="subtle"
                >{{ userStatus(userDetail) }}</UBadge
              ><UBadge
                v-if="userDetail.password_set || userDetail.has_password"
                color="neutral"
                variant="subtle"
                >{{ t('users.passwordStored') }}</UBadge
              >
            </div>
            <p class="mt-3 font-semibold">{{ userDetail.username }}</p>
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
              {{ t('users.userId', { id: userDetail.id }) }}
            </p>
          </div>
          <DetailSection :title="t('users.profile')" :items="profileItems(userDetail)" />
                    <DetailSection :title="t('users.pendingTopup')" :items="topupDetailItems(userDetail)" />
                    <DetailSection v-if="resetAllowanceSupported" :title="t('users.resetAllowance')" :items="resetAllowanceItems(userDetail)" />
          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold">{{ t('users.periodLimits') }}</h3>
              <AppButton
                v-if="periodLimitsSupported"
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-tabler-refresh"
                :disabled="saving || !detailPeriods || !!detailPeriodError"
                @click="openPeriodReset(userDetail)"
                >{{ t('users.resetEllipsis') }}</AppButton
              >
            </div>
            <div
              v-if="detailPeriodLoading && !detailPeriods"
              class="grid gap-2"
            >
              <USkeleton
                v-for="window in periodWindowIds"
                :key="window"
                class="h-20 w-full rounded-md"
              />
            </div>
            <div
              v-else-if="detailPeriodError"
              class="grid gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950"
            >
              <p class="text-sm text-red-700 dark:text-red-300">
                {{ t('users.periodStatusFailed') }}
              </p>
              <p class="break-words text-xs text-red-600 dark:text-red-400">
                {{ detailPeriodError }}
              </p>
              <div>
                <AppButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  @click="loadUserPeriods(userDetail)"
                  >{{ t('common.retry') }}</AppButton
                >
              </div>
            </div>
            <div v-else-if="detailPeriods" class="grid gap-3">
              <div class="flex flex-wrap gap-2">
                <UBadge color="neutral" variant="subtle"
                  >{{ t('users.timezoneLabel') }}
                  {{
                    detailPeriods.timezone ||
                    userDetail.timezone ||
                    "Asia/Shanghai"
                  }}</UBadge
                ><UBadge
                  v-if="
                    detailPeriods.credits_unlimited ||
                    detailPeriods.creditsUnlimited ||
                    userDetail.credits_unlimited
                  "
                  color="info"
                  variant="subtle"
                  >{{ t('users.unlimitedBalance') }}</UBadge
                >
              </div>
              <PeriodCard
                v-for="window in normalizedDetailWindows"
                :key="window.id"
                :window="window"
              />
            </div>
            <div
              v-else
              class="rounded-md border border-dashed border-[var(--ui-border)] px-3 py-2.5 text-xs text-[var(--ui-text-muted)]"
            >
              {{ t('users.periodStatusUnsupported') }}
            </div>
          </section>
          <DetailSection
            :title="t('users.accessScope')"
            :items="accessItems(userDetail)"
          /></div
      ></template>
    </USlideover>

    <USlideover
      v-model:open="keyFormOpen"
      :title="editingKey ? t('users.editKeyAccess') : t('users.newClientKey')"
      :description="
        editingKey
          ? t('users.editKeyDescription')
          : t('users.newKeyDescription')
      "
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body
        ><form class="space-y-4" @submit.prevent="submitKey">
          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :description="formError"
          /><UFormField :label="t('users.keyValue')"
            ><UInput
              v-model="keyForm.api_key"
              class="w-full font-mono text-xs"
              :disabled="saving || !!editingKey" /></UFormField
          ><UFormField :label="t('users.owner')" :hint="keyOwnerUnavailable ? t('users.ownerUnavailableHint') : undefined"
            ><USelectMenu
              v-model="keyForm.user_id"
              :items="userOptions"
              value-key="value"
              label-key="label"
              class="w-full"
              :search-input="{ placeholder: t('users.searchUsersEllipsis') }"
          /></UFormField>
          <div class="grid gap-4">
            <ScopePicker
              :title="t('users.credentialScope')"
              :empty-label="t('users.noCredentialScopesCreated')"
              :items="channelOptions"
              :selected="keyForm.channels"
              @toggle="toggleId(keyForm.channels, $event)"
            /><ScopePicker
              :title="t('users.modelScope')"
              :empty-label="t('users.noModelScopesCreated')"
              :items="modelGroupOptions"
              :selected="keyForm.model_groups"
              @toggle="toggleId(keyForm.model_groups, $event)"
            />
          </div>
          <p class="text-sm leading-6 text-[var(--ui-text-muted)]">
            {{ t('users.noScopeHint') }}
          </p>
          <div
            class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"
          >
            <AppButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="keyFormOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton type="submit" :loading="saving">{{
              editingKey ? t('users.saveChanges') : t('users.createKey')
            }}</AppButton>
          </div>
        </form></template
      >
    </USlideover>

    <USlideover
      v-model:open="bindingOpen"
      :title="
        bindingKind === 'credential'
          ? t('users.addCredentialBinding')
          : t('users.addModelBinding')
      "
      :description="
        bindingKind === 'credential'
          ? t('users.addCredentialBindingDescription')
          : t('users.addModelBindingDescription')
      "
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body
        ><form class="space-y-4" @submit.prevent="addBindings">
          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :description="formError"
          />
          <div>
            <p class="text-sm font-medium">{{ t('users.scope') }}</p>
            <div
              class="mt-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2 text-sm"
            >
              {{ bindingGroupName }}
            </div>
          </div>
          <CandidatePicker
            :kind="bindingKind"
            :items="bindingCandidates"
            :selected="bindingSelection"
            :search="bindingSearch"
            :source-filter="modelSourceFilter"
            :pending="
              bindingKind === 'model'
                ? modelCandidatesPending
                : credentialCandidatesPending
            "
            :issue-message="
              bindingKind === 'model'
                ? modelCandidatesIssue
                : credentialCandidatesIssue
            "
            :error-message="
              bindingKind === 'model'
                ? modelCandidatesError
                : credentialCandidatesError
            "
            :mutating="saving"
            @update:search="bindingSearch = $event"
            @update:source-filter="modelSourceFilter = $event"
            @update:selected="setBindingSelection"
            @retry="
              bindingKind === 'model'
                ? loadModelCandidates()
                : loadCredentialCandidates()
            "
            @clear-error="formError = ''"
          />
          <ScopePicker
            v-if="bindingKind === 'model' && modelChannelBindingsSupported"
            :title="t('users.credentialScope')"
            :empty-label="t('users.noCredentialScopes')"
            :items="channelOptions"
            :selected="bindingChannels"
            @toggle="toggleId(bindingChannels, $event)"
          />
          <p
            v-if="bindingKind === 'model' && modelChannelBindingsSupported"
            class="text-xs text-[var(--ui-text-muted)]"
          >
            {{ t('users.inheritScopeHint') }}
          </p>
          <div
            class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"
          >
            <AppButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="bindingOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton
              type="submit"
              :loading="saving"
              :disabled="bindingSubmitDisabled"
              >{{ t('users.addBinding') }}</AppButton
            >
          </div>
        </form></template
      >
    </USlideover>

    <USlideover
      v-model:open="balanceOpen"
      :title="
        balanceTargets.length > 1
          ? t('users.batchBalanceOperation')
          : t('users.balanceOperation')
      "
      :description="
        balanceTargets.length > 1
          ? t('users.batchBalanceDescription')
          : t('users.balanceDescription')
      "
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body
        ><form class="space-y-4" @submit.prevent="reviewBalance">
          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :description="formError"
          />
          <div>
            <p class="text-sm font-medium">{{ t('users.target') }}</p>
            <div
              class="mt-2 grid gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2.5 text-sm"
            >
              <SummaryRow
                :label="balanceTargets.length === 1 ? t('common.user') : t('common.users')"
                :value="balanceTargetLabel"
              /><SummaryRow
                :label="t('users.currentBalanceTotal')"
                :value="formatCredits(balanceCurrentTotal)"
              /><SummaryRow
                :label="t('users.balanceTotalAfter')"
                :value="
                  balanceAfterTotal == null
                    ? '—'
                    : formatCredits(balanceAfterTotal)
                "
                :warning="balanceAfterTotal != null && balanceAfterTotal < 0"
              />
            </div>
            <p
              v-if="balanceTargets.length > 1"
              class="mt-2 text-xs text-[var(--ui-text-muted)]"
            >
              {{ t('users.batchSameAmountHint') }}
            </p>
          </div>
          <UFormField :label="t('users.operationType')"
            ><div class="grid grid-cols-2 gap-2">
              <AppButton
                type="button"
                :color="balanceForm.type === 'recharge' ? 'primary' : 'neutral'"
                :variant="balanceForm.type === 'recharge' ? 'solid' : 'outline'"
                icon="i-tabler-plus"
                @click="balanceForm.type = 'recharge'"
                >{{ t('users.recharge') }}</AppButton
              ><AppButton
                type="button"
                :color="balanceForm.type === 'deduct' ? 'warning' : 'neutral'"
                :variant="balanceForm.type === 'deduct' ? 'solid' : 'outline'"
                icon="i-tabler-minus"
                @click="balanceForm.type = 'deduct'"
                >{{ t('users.deduct') }}</AppButton
              >
            </div></UFormField
          ><UAlert
            v-if="negativeBalanceCount"
            color="warning"
            variant="subtle"
            :description="t('users.negativeAfterDeduction', { count: negativeBalanceCount })"
          /><UFormField :label="t('users.amount')"
            ><UInput
              v-model="balanceForm.amount"
              type="number"
              min="0"
              step="0.000001"
              class="w-full"
            />
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
              {{
                balanceTargets.length > 1
                  ? t('users.amountEachHint')
                  : t('users.amountCurrentHint')
              }}
            </p></UFormField
          ><UFormField
            :label="balanceForm.type === 'deduct' ? t('users.noteRequired') : t('users.note')"
            ><UTextarea v-model="balanceForm.note" class="w-full"
          /></UFormField>
          <div
            class="flex justify-end gap-2 border-t border-[var(--ui-border)] pt-4"
          >
            <AppButton
              type="button"
              color="neutral"
              variant="outline"
              @click="balanceOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton
              type="submit"
              :color="balanceForm.type === 'deduct' ? 'warning' : 'primary'"
              >{{
                balanceForm.type === 'deduct' ? t('users.deduct') : t('users.recharge')
              }}</AppButton
            >
          </div>
        </form></template
      >
    </USlideover>

    <AppModal
      v-model:open="balanceConfirmOpen"
      :title="balanceConfirmTitle"
      :description="
        balanceTargets.length > 1
          ? t('users.confirmBatchDescription')
          : balanceForm.type === 'deduct'
            ? t('users.confirmDeductDescription')
            : t('users.confirmRechargeDescription')
      "
      ><template #body
        ><div class="space-y-4">
          <div
            class="grid gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] px-3 py-2.5 text-sm"
          >
            <SummaryRow
              :label="balanceTargets.length === 1 ? t('common.user') : t('common.users')"
              :value="balanceTargetLabel"
            /><SummaryRow
              :label="t('users.amountPerUser')"
              :value="signedBalanceAmount"
              :warning="balanceForm.type === 'deduct'"
            /><SummaryRow
              v-if="balanceTargets.length > 1"
              :label="t('users.totalChange')"
              :value="signedBalanceTotal"
              :warning="balanceForm.type === 'deduct'"
            /><SummaryRow
              :label="t('users.currentBalanceTotal')"
              :value="formatCredits(balanceCurrentTotal)"
            /><SummaryRow
              :label="t('users.balanceTotalAfter')"
              :value="formatCredits(balanceAfterTotal)"
              :warning="balanceAfterTotal < 0"
            />
            <div class="border-t border-[var(--ui-border)] pt-2">
              <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.note') }}</p>
              <p class="mt-1 break-words">{{ balanceForm.note || "—" }}</p>
            </div>
            <UAlert
              v-if="negativeBalanceCount"
              color="warning"
              variant="subtle"
              :description="t('users.negativeAfterOperation', { count: negativeBalanceCount })"
            />
          </div>
          <div class="flex justify-end gap-2">
            <AppButton
              color="neutral"
              variant="outline"
              @click="balanceConfirmOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton
              :color="balanceForm.type === 'deduct' ? 'warning' : 'primary'"
              :loading="saving"
              @click="applyBalance"
              >{{ t('common.confirm') }}</AppButton
            >
          </div>
        </div></template
      ></AppModal
    >

    <AppModal
      v-model:open="groupFormOpen"
      :title="groupFormTitle"
      :description="groupFormDescription"
      ><template #body
        ><form class="space-y-4" @submit.prevent="submitGroup">
          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :description="formError"
          /><UFormField
            :label="
              groupFormKind === 'channel'
                ? t('users.credentialScopeName')
                : t('users.modelScopeName')
            "
            ><UInput
              v-model="groupForm.name"
              class="w-full"
              :placeholder="
                groupFormKind === 'channel' ? 'team-a' : 'premium-models'
              " /></UFormField
          ><label class="flex items-start gap-2 text-sm"
            ><UCheckbox v-model="groupForm.disabled" /><span
              ><span class="font-medium">{{ t('common.disabled') }}</span
              ><span class="block text-[var(--ui-text-muted)]"
                >{{ t('users.disabledScopeHint') }}</span
              ></span
            ></label
          >
          <div class="flex justify-end gap-2">
            <AppButton
              type="button"
              color="neutral"
              variant="outline"
              @click="groupFormOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton type="submit" :loading="saving">{{
              editingGroup
                ? t('users.saveChanges')
                : groupFormKind === 'channel'
                  ? t('users.createCredentialScope')
                  : t('users.createModelScope')
            }}</AppButton>
          </div>
        </form></template
      ></AppModal
    >

    <AppModal
      v-model:open="periodResetOpen"
      :title="t('users.resetPeriodCounters')"
      :description="t('users.resetPeriodDescription', { name: periodResetUser?.username || '' })"
      ><template #body
        ><div class="space-y-4">
          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            :description="formError"
          />
          <div>
            <p class="mb-2 text-sm font-medium">{{ t('users.windowsToReset') }}</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="window in periodWindowIds"
                :key="window"
                class="flex items-center gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm"
                ><UCheckbox
                  :model-value="resetWindows.has(window)"
                  :disabled="saving"
                  @update:model-value="toggleResetWindow(window)"
                /><span class="flex-1">{{ periodWindowLabel(window) }}</span
                ><span
                  v-if="detailWindow(window)?.enabled"
                  class="text-xs text-[var(--ui-text-muted)]"
                  >{{ t('users.enabledLower') }}</span
                ></label
              >
            </div>
          </div>
          <div>
            <p class="mb-2 text-sm font-medium">{{ t('users.resetMode') }}</p>
            <div class="grid gap-2">
              <label
                v-for="option in resetModeOptions"
                :key="option.value"
                class="flex items-start gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2"
                ><input
                  v-model="resetMode"
                  type="radio"
                  :value="option.value"
                  class="mt-1"
                /><span
                  ><span class="text-sm font-medium">{{ option.label }}</span
                  ><span class="block text-xs text-[var(--ui-text-muted)]">{{
                    option.hint
                  }}</span></span
                ></label
              >
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <AppButton
              color="neutral"
              variant="outline"
              @click="periodResetOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton :loading="saving" @click="resetPeriods"
              >{{ t('users.resetCounters') }}</AppButton
            >
          </div>
        </div></template
      ></AppModal
    >

    <AppModal
      v-model:open="approvalOpen"
      :title="t('users.approveUser')"
      :description="t('users.approveUserDescription')"
      :dismissible="approvingUserId === null"
      :close="approvingUserId === null"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="approveUser">
          <p class="text-sm">{{ t('users.userLabel') }} <span class="font-semibold">{{ approvalUser?.username }}</span></p>
          <UAlert v-if="approvalError" color="error" variant="subtle" :description="approvalError" />
          <UAlert v-if="!accessGroupsSupported" color="warning" variant="subtle" :title="t('users.modelScopesUnavailable')" :description="t('users.modelScopesUnavailableDescription')" />
          <fieldset v-else :disabled="approvingUserId !== null">
            <ScopePicker
              :title="t('users.modelScope')"
              :empty-label="t('users.noEnabledModelScopes')"
              :items="approvalModelOptions"
              :selected="approvalModelGroups"
              @toggle="toggleId(approvalModelGroups, $event)"
            />
          </fieldset>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.approveHint') }}</p>
          <div class="flex justify-end gap-2">
            <AppButton type="button" color="neutral" variant="outline" :disabled="approvingUserId !== null" @click="approvalOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton type="submit" color="success" icon="i-tabler-user-check" :loading="approvingUserId !== null" :disabled="!accessGroupsSupported || loading || !approvalModelGroups.length">{{ t('users.approveUser') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>

    <AppModal
      v-model:open="topupApprovalOpen"
      :title="t('users.approveTopup')"
      :description="t('users.approveTopupDescription')"
      :dismissible="approvingTopupUserId === null"
      :close="approvingTopupUserId === null"
    >
      <template #body>
        <form v-if="topupApprovalUser" class="space-y-4" @submit.prevent="approveTopup">
          <UAlert v-if="topupApprovalError" color="error" variant="subtle" :description="topupApprovalError" />
          <div class="space-y-2 rounded-md border border-[var(--ui-border)] p-3">
            <SummaryRow :label="t('common.user')" :value="topupApprovalUser.username" />
            <SummaryRow :label="t('users.requestId')" :value="String(topupApprovalUser.request.id)" />
            <SummaryRow :label="t('users.amount')" :value="t('users.creditsAmount', { amount: formatCredits(topupApprovalUser.request.amount) })" />
            <SummaryRow :label="t('users.requested')" :value="formatDate(topupApprovalUser.request.created_at)" />
          </div>
          <p v-if="topupApprovalUser.request.note" class="break-words text-sm text-[var(--ui-text-muted)]">{{ topupApprovalUser.request.note }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ t('users.approveTopupHint') }}</p>
          <div class="flex justify-end gap-2">
            <AppButton type="button" color="neutral" variant="outline" :disabled="approvingTopupUserId !== null" @click="topupApprovalOpen = false">{{ t('common.cancel') }}</AppButton>
            <AppButton type="submit" color="success" icon="i-tabler-coins" :loading="approvingTopupUserId !== null">{{ t('users.approveTopup') }}</AppButton>
          </div>
        </form>
      </template>
    </AppModal>

    <UsersResetAllowance v-model:open="resetAllowanceOpen" :user="resetAllowanceUser" @saved="syncAll" />

    <AppModal v-model:open="deleteOpen" :title="t('users.confirmDeletion')"
      ><template #body
        ><div class="space-y-4">
          <p class="text-sm">{{ deleteDescription }}</p>
          <div class="flex justify-end gap-2">
            <AppButton
              color="neutral"
              variant="outline"
              @click="deleteOpen = false"
              >{{ t('common.cancel') }}</AppButton
            ><AppButton color="error" :loading="saving" @click="performDelete"
              >{{ t('common.delete') }}</AppButton
            >
          </div>
        </div></template
      ></AppModal
    >
  </section>
</template>

<script setup>
import { useWorkspaceState } from '~/composables/useWorkspaceState'
import { useDataSync } from '~/composables/useDataSync'
import { changedUsersKeyBindings, usersKeyOwnerOptions } from '~/composables/usersKeyBindings'
import EmptyState from "@/components/admin/users/UsersEmptyState.vue";

import UnsupportedScopes from "@/components/admin/users/UsersUnsupportedScopes.vue";
import SummaryRow from "@/components/admin/users/UsersSummaryRow.vue";
import DetailSection from "@/components/admin/users/UsersDetailSection.vue";
import PeriodCard from "@/components/admin/users/UsersPeriodCard.vue";
import UsersResetAllowance from "~/components/admin/users/UsersResetAllowance.vue";
import UsersRowActions from "~/components/admin/users/UsersRowActions.vue";
import ScopePicker from "@/components/admin/users/UsersScopePicker.vue";
import CandidatePicker from "@/components/admin/users/UsersCandidatePicker.vue";
import GroupCards from "@/components/admin/users/UsersGroupCards.vue";

const { fetchAPI } = useApi();
const {
  supports,
  refreshCapabilities,
  error: capabilitiesError,
} = useCapabilities();
const toast = useToast();
const { t, intlLocale } = useAdminI18n();

const activeTab = ref("users");
const tabs = computed(() => [
  { label: t("common.users"), value: "users" },
  { label: t("users.clientKeys"), value: "keys" },
  { label: t("users.credentialScopes"), value: "channelGroups" },
  { label: t("users.modelScopes"), value: "modelGroups" },
]);
const search = ref(""),
  loading = useWorkspaceState('admin:users:loading', () => (false)),
  saving = useWorkspaceState('admin:users:saving', () => (false)),
  pageErrors = useWorkspaceState('admin:users:pageErrors', () => ([])),
  formError = ref(""),
  formFieldErrors = ref([]);
const usersData = useWorkspaceState('admin:users:usersData', () => ([])),
  keysData = useWorkspaceState('admin:users:keysData', () => ([])),
  channelGroupsData = useWorkspaceState('admin:users:channelGroupsData', () => ([])),
  channelDetailsData = useWorkspaceState('admin:users:channelDetailsData', () => ([])),
  modelGroupsData = useWorkspaceState('admin:users:modelGroupsData', () => ([])),
  modelDetailsData = useWorkspaceState('admin:users:modelDetailsData', () => ([])),
  credentialsData = useWorkspaceState('admin:users:credentialsData', () => ([])),
  providerCredentialsData = useWorkspaceState('admin:users:providerCredentialsData', () => ([])),
  runtimeModelsData = useWorkspaceState('admin:users:runtimeModelsData', () => ([])),
  staticModelsData = useWorkspaceState('admin:users:staticModelsData', () => ([]));
const users = computed(() => usersData.value),
  keys = computed(() => keysData.value),
  channelGroups = computed(() => channelGroupsData.value),
  modelGroups = computed(() => modelGroupsData.value);
const usersSupported = computed(() => supports("users", true)),
  accessGroupsSupported = computed(() => supports("access_groups", true)),
  periodLimitsSupported = computed(() => supports("user_period_limits", false)),
  modelChannelBindingsSupported = computed(() =>
    supports("model_channel_bindings", false),
  );
const unassignedKeyCount = computed(
  () =>
    keys.value.filter((key) => key.user_id == null || Number(key.user_id) === 0)
      .length,
);
const userSummary = computed(() => {
  const live = users.value.filter((user) => !user.deleted_at);
  const pendingApproval = live.filter((user) => user.approval_pending).length;
  const pendingTopups = live.filter((user) => user.pending_topup).length;
  const totalCredits = live.reduce((sum, user) => sum + (Number(user.credits) || 0), 0);
  return [
    { key: "users", label: t("common.users"), value: live.length, detail: t("users.summaryUsersDetail", { active: live.length - pendingApproval, pending: pendingApproval }), icon: "i-tabler-users", tone: "violet", action: true, ariaLabel: t("users.showUsers"), ratio: live.length ? (live.length - pendingApproval) / live.length : null },
    { key: "pending", label: t("users.needsReview"), value: pendingApproval + pendingTopups, detail: t("users.summaryReviewDetail", { signups: pendingApproval, topups: pendingTopups }), icon: "i-tabler-user-exclamation", tone: "amber", action: true, ariaLabel: t("users.showUsersNeedingReview"), warning: pendingApproval + pendingTopups > 0 },
    { key: "credits", label: t("users.creditsHeld"), value: formatCredits(totalCredits), detail: t("users.totalBalanceAcrossUsers"), icon: "i-tabler-wallet", tone: "emerald" },
    { key: "keys", label: t("users.clientKeys"), value: keys.value.length, detail: t("users.unassignedCount", { count: unassignedKeyCount.value }), icon: "i-tabler-key", tone: "blue", action: true, ariaLabel: t("users.showClientKeys") },
  ];
});
const liveUsers = computed(() => users.value.filter((user) => !user.deleted_at));
// Status segments: counts are computed once per data change, so they stay cheap with thousands of users.
const userSegment = ref("all");
const segmentCounts = computed(() => {
  const counts = { all: 0, active: 0, approval: 0, topup: 0, deleted: 0 };
  for (const user of users.value) {
    counts.all++;
    if (user.deleted_at) { counts.deleted++; continue; }
    if (user.approval_pending) counts.approval++;
    else counts.active++;
    if (user.pending_topup) counts.topup++;
  }
  return counts;
});
const userSegments = computed(() => [
  { value: "all", label: t("common.all"), tone: "neutral", count: segmentCounts.value.all },
  { value: "active", label: t("common.active"), tone: "emerald", count: segmentCounts.value.active },
  { value: "approval", label: t("users.pendingApproval"), tone: "amber", count: segmentCounts.value.approval },
  { value: "topup", label: t("users.topupRequests"), tone: "blue", count: segmentCounts.value.topup },
  ...(segmentCounts.value.deleted ? [{ value: "deleted", label: t("users.deleted"), tone: "rose", count: segmentCounts.value.deleted }] : []),
]);
function inSegment(user) {
  switch (userSegment.value) {
    case "active": return !user.deleted_at && !user.approval_pending;
    case "approval": return !user.deleted_at && Boolean(user.approval_pending);
    case "topup": return !user.deleted_at && Boolean(user.pending_topup);
    case "deleted": return Boolean(user.deleted_at);
    default: return true;
  }
}
function selectSegment(value) {
  userSegment.value = value;
  activeTab.value = "users";
}
const compactFormatter = computed(() => new Intl.NumberFormat(intlLocale.value, { notation: "compact", maximumFractionDigits: 1 }));
const compactNumber = (value) => (Number(value) >= 10000 ? compactFormatter.value.format(Number(value)) : new Intl.NumberFormat(intlLocale.value).format(Number(value) || 0));
function selectSummary(key) {
  activeTab.value = key === "keys" ? "keys" : "users";
  if (key === "pending") userSegment.value = "approval";
}
const rowValue = (row) => row?.original ?? row;
const userStatus = (user) => user.deleted_at ? t("users.deleted") : user.approval_pending ? t("users.pendingApproval") : t("common.active");
const resetAllowanceSupported = computed(() => supports("user_reset_allowance", false));
const resetAllowanceOpen = ref(false), resetAllowanceUser = ref(null);
function openResetAllowance(user) {
  if (!resetAllowanceSupported.value || !isOperableUser(user)) return;
  resetAllowanceUser.value = user;
  resetAllowanceOpen.value = true;
}
const topupApprovalSupported = computed(() => supports("topup_approval", false));
const topupApprovalOpen = ref(false),
  topupApprovalUser = ref(null),
  approvingTopupUserId = ref(null),
  topupApprovalError = ref("");
function openTopupApproval(user) {
  if (approvingTopupUserId.value !== null || !user.pending_topup || user.deleted_at) return;
  topupApprovalUser.value = { id: user.id, username: user.username, request: { ...user.pending_topup } };
  topupApprovalError.value = "";
  topupApprovalOpen.value = true;
}
async function approveTopup() {
  const user = topupApprovalUser.value;
  if (!user || approvingTopupUserId.value !== null || !topupApprovalSupported.value) return;
  approvingTopupUserId.value = user.id;
  topupApprovalError.value = "";
  try {
    await fetchAPI(`/users/${encodeURIComponent(user.id)}/topup/approve`, {
      method: "POST", body: { request_id: user.request.id },
    });
    topupApprovalOpen.value = false;
    await syncAll();
    toast.add({ title: t("users.topupApproved"), description: t("users.topupApprovedDescription", { name: user.username, amount: formatCredits(user.request.amount) }), color: "success" });
  } catch (error) {
    topupApprovalError.value = errorMessage(error);
  } finally {
    approvingTopupUserId.value = null;
  }
}
const approvingUserId = ref(null);
const approvalOpen = ref(false),
  approvalUser = ref(null),
  approvalModelGroups = ref([]),
  approvalError = ref("");
const approvalModelOptions = computed(() => modelGroups.value
  .filter((group) => !group.disabled && !group.deleted_at)
  .map((group) => ({ label: group.group_name, value: Number(group.id) })));
function openApproval(user) {
  if (approvingUserId.value !== null || !user.approval_pending || user.deleted_at) return;
  approvalUser.value = user;
  const existing = new Set(keysForUser(user.id).flatMap((key) => key.model_groups));
  approvalModelGroups.value = approvalModelOptions.value.filter((option) => existing.has(option.value)).map((option) => option.value);
  approvalError.value = "";
  approvalOpen.value = true;
}
async function approveUser() {
  const user = approvalUser.value;
  if (approvingUserId.value !== null || loading.value || !user?.approval_pending || user.deleted_at) return;
  approvalError.value = "";
  if (!accessGroupsSupported.value || !approvalModelGroups.value.length) {
    approvalError.value = t("users.selectEnabledModelScope");
    return;
  }
  approvingUserId.value = user.id;
  try {
    await fetchAPI(`/users/${encodeURIComponent(user.id)}/approve`, {
      method: "POST", body: { model_groups: [...approvalModelGroups.value] },
    });
    approvalOpen.value = false;
    await syncAll();
    toast.add({ title: t("users.userApproved"), description: t("users.userApprovedDescription", { name: user.username }), color: "success" });
  } catch (error) {
    approvalError.value = errorMessage(error);
  } finally {
    approvingUserId.value = null;
  }
}
const userColumns = computed(() => [
  { id: "select", header: "", meta: { class: { th: 'w-12', td: 'w-12' } } },
  { accessorKey: "user", header: t("common.user") },
  { accessorKey: "status", header: t("common.status"), meta: { class: { th: 'w-28', td: 'w-28' } } },
  { accessorKey: "credits", header: t("users.credits") },
  { accessorKey: "pendingTopup", header: t("users.pendingTopup") },
  { accessorKey: "periodLimits", header: t("users.periodLimits") },
  { accessorKey: "resetAllowance", header: t("users.resetAllowance") },
  { accessorKey: "keys", header: t("users.clientKeys") },
  { accessorKey: "credentialScope", header: t("users.credentialScope") },
  { accessorKey: "modelScope", header: t("users.modelScope") },

  {
    id: "actions",
    header: "",
    meta: {
      class: {
        th: "w-24 whitespace-nowrap text-right",
        td: "w-24 whitespace-nowrap text-right",
      },
    },
  },
]);
const compactUsers = ref(false);
const visibleUserColumns = computed(() => compactUsers.value
  ? userColumns.value.filter((column) => ['select', 'user', 'status', 'actions'].includes(column.id || column.accessorKey))
  : userColumns.value);
let usersMedia;
const updateUsersLayout = () => { compactUsers.value = usersMedia.matches; };
onMounted(() => {
  usersMedia = window.matchMedia('(max-width: 63.99rem)');
  updateUsersLayout();
  usersMedia.addEventListener('change', updateUsersLayout);
});
onBeforeUnmount(() => usersMedia?.removeEventListener('change', updateUsersLayout));

const keyColumns = computed(() => [
  { accessorKey: "key", header: t("users.clientKey") },
  { accessorKey: "owner", header: t("users.owner") },
  { accessorKey: "credentialScope", header: t("users.credentialScope") },
  { accessorKey: "modelScope", header: t("users.modelScope") },
  { accessorKey: "length", header: t("users.length") },
  {
    id: "actions",
    header: t("common.actions"),
    meta: {
      class: {
        th: "w-px whitespace-nowrap text-right",
        td: "w-px whitespace-nowrap text-right",
      },
    },
  },
]);
const normalize = (value) => String(value ?? "").toLowerCase();
const matches = (values) => {
  const query = normalize(search.value).trim();
  return !query || values.some((value) => normalize(value).includes(query));
};
const filteredUsers = computed(() =>
  users.value.filter((user) => inSegment(user) && matches([user.id, user.username, userStatus(user)])),
);

const filteredKeys = computed(() =>
  keys.value.filter((key) =>
    matches([
      key.api_key,
      userById(key.user_id)?.username,
      ...keyChannelNames(key),
      ...keyModelNames(key),
    ]),
  ),
);
const filteredChannelGroups = computed(() =>
  channelGroups.value.filter((group) =>
    matches([
      group.id,
      group.channel_name,
      ...channelDetailsFor(group.id).map((item) => item.auth_id),
    ]),
  ),
);
const selectedModelGroupId = ref(null);
const filteredModelGroups = computed(() =>
  modelGroups.value.filter((group) =>
    matches([
      group.id,
      group.group_name,
      ...modelDetailsFor(group.id).map((item) => item.model_id),
    ]),
  ),
);
const modelScopeOptions = computed(() =>
  filteredModelGroups.value.map((group) => ({
    label: `${group.group_name} · ${t("users.modelsCount", { count: modelDetailsFor(group.id).length })}`,
    value: Number(group.id),
  })),
);
const selectedModelGroup = computed(
  () =>
    modelGroups.value.find(
      (group) => Number(group.id) === Number(selectedModelGroupId.value),
    ) ||
    filteredModelGroups.value[0] ||
    null,
);
const selectedModelBindings = computed(() =>
  selectedModelGroup.value ? modelDetailsFor(selectedModelGroup.value.id) : [],
);
const modelBindingColumns = computed(() => [
  { accessorKey: "model", header: t("users.modelId") },
  { accessorKey: "channels", header: t("users.credentialScope") },
  { accessorKey: "updated", header: t("common.updated") },
  {
    id: "actions",
    header: t("common.actions"),
    meta: {
      class: {
        th: "w-px whitespace-nowrap text-right",
        td: "w-px whitespace-nowrap text-right",
      },
    },
  },
]);
watch(
  filteredModelGroups,
  (groups) => {
    if (!groups.length) selectedModelGroupId.value = null;
    else if (
      !groups.some(
        (group) => Number(group.id) === Number(selectedModelGroupId.value),
      )
    )
      selectedModelGroupId.value = Number(groups[0].id);
  },
  { immediate: true },
);

async function safeLoad(label, request, fallback) {
  try {
    return await request();
  } catch (error) {
    pageErrors.value.push(`${label}: ${errorMessage(error)}`);
    return fallback;
  }
}

async function syncAll(notify = false) {
  loading.value = true;
  pageErrors.value = [];
  try {
    try {
      await refreshCapabilities(true);
    } catch {}
    if (!usersSupported.value) {
      usersData.value = [];
      keysData.value = [];
      channelGroupsData.value = [];
      channelDetailsData.value = [];
      modelGroupsData.value = [];
      modelDetailsData.value = [];
      return;
    }

    const tasks = [
      safeLoad(t("common.users"), () => fetchAPI("/users"), { users: [] }).then(
        (value) => {
          usersData.value = Array.isArray(value)
            ? value
            : value?.users ||
              value?.items ||
              value?.records ||
              value?.data ||
              [];
        },
      ),
      safeLoad(t("users.clientKeys"), () => fetchAPI("/access/api-keys"), {
        items: [],
      }).then((value) => {
        keysData.value = keyEntries(value).map(normalizeKey);
      }),
    ];
    if (accessGroupsSupported.value) {
      tasks.push(
        safeLoad(t("users.credentialScopes"), () => fetchAPI("/channel-groups"), {
          channel_groups: [],
        }).then((value) => {
          channelGroupsData.value = value?.channel_groups || value?.items || [];
        }),
        safeLoad(
          t("users.credentialBindings"),
          () => fetchAPI("/channel-group-details"),
          { channel_group_details: [] },
        ).then((value) => {
          channelDetailsData.value =
            value?.channel_group_details || value?.items || [];
        }),
        safeLoad(t("users.modelScopes"), () => fetchAPI("/model-groups"), {
          model_groups: [],
        }).then((value) => {
          modelGroupsData.value = value?.model_groups || value?.items || [];
        }),
        safeLoad(t("users.modelBindings"), () => fetchAPI("/model-group-details"), {
          model_group_details: [],
        }).then((value) => {
          modelDetailsData.value =
            value?.model_group_details || value?.items || [];
        }),
      );
    } else {
      channelGroupsData.value = [];
      channelDetailsData.value = [];
      modelGroupsData.value = [];
      modelDetailsData.value = [];
    }
    await Promise.all(tasks);
    if (notify) toast.add({ title: t("users.dataSynchronized"), color: "success" });
  } finally {
    loading.value = false;
  }
}
useDataSync('admin:users:sync', syncAll);
await syncAll();

function keyEntries(value) {
  const entries = value?.api_key_entries ?? value?.items;
  if (Array.isArray(entries) && entries.length) return entries;
  const legacy = value?.["api-keys"] ?? value?.api_keys;
  return Array.isArray(legacy)
    ? legacy.filter((entry) => typeof entry === "string")
    : [];
}
function normalizeKey(entry, index = 0) {
  const raw = typeof entry === "string" ? { api_key: entry } : entry || {};
  const numericId = raw.id ?? raw.api_key_id ?? raw["api-key-id"] ?? null;
  return {
    ...raw,
    id:
      numericId != null
        ? String(numericId)
        : `${index}:${raw.api_key || raw["api-key"] || raw.key || raw.value || ""}`,
    numeric_id: numericId,
    index,
    api_key: raw.api_key || raw["api-key"] || raw.key || raw.value || "",
    user_id: raw.user_id ?? raw["user-id"] ?? null,
    channels: Array.isArray(raw.channels)
      ? raw.channels.filter(Number.isFinite).map(Number)
      : [],
    model_groups: Array.isArray(raw.model_groups || raw["model-groups"])
      ? (raw.model_groups || raw["model-groups"])
          .filter(Number.isFinite)
          .map(Number)
      : [],
  };
}
function flattenModels(models) {
  if (Array.isArray(models))
    return models.map((item) => ({
      ...item,
      channelBucket:
        item?.channel || item?.channel_bucket || item?.["channel-bucket"] || "",
    }));
  if (models && typeof models === "object")
    return Object.entries(models).flatMap(([channelBucket, items]) =>
      Array.isArray(items)
        ? items.map((item) => ({
            ...item,
            channelBucket:
              item?.channel ||
              item?.channel_bucket ||
              item?.["channel-bucket"] ||
              channelBucket,
          }))
        : [],
    );
  return [];
}
function firstModelText(item, fields) {
  for (const field of fields) {
    const value = item?.[field];
    if (
      (typeof value === "string" || typeof value === "number") &&
      String(value).trim()
    )
      return String(value).trim();
  }
  return "";
}
function normalizeProviders(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [
    ...new Set(
      values
        .map((item) =>
          typeof item === "string" || typeof item === "number"
            ? String(item).trim()
            : firstModelText(item, ["id", "name", "provider"]),
        )
        .filter(Boolean),
    ),
  ];
}
function normalizeModelCandidate(item, scope) {
  const modelId = firstModelText(item, [
    "id",
    "model_id",
    "model-id",
    "model",
    "name",
  ]);
  if (!modelId) return null;
  const displayName = firstModelText(item, [
    "displayName",
    "display_name",
    "display-name",
    "label",
  ]);
  return {
    id: `model:${modelId}`,
    modelId,
    label: displayName || modelId,
    displayName,
    ownedBy: firstModelText(item, ["ownedBy", "owned_by", "owned-by"]),
    type: firstModelText(item, ["type"]),
    providers: normalizeProviders(item?.providers ?? item?.provider),
    channel: firstModelText(item, [
      "channelBucket",
      "channel",
      "channel_bucket",
      "channel-bucket",
      "source",
    ]),
    scopes: [scope],
  };
}
function mergeModelCandidates() {
  const merged = new Map();
  const add = (item, scope) => {
    const candidate = normalizeModelCandidate(item, scope);
    if (!candidate) return;
    const existing = merged.get(candidate.modelId);
    if (!existing) {
      merged.set(candidate.modelId, candidate);
      return;
    }
    existing.scopes = [...new Set([...existing.scopes, ...candidate.scopes])];
    existing.displayName ||= candidate.displayName;
    existing.label = existing.displayName || existing.modelId;
    existing.ownedBy ||= candidate.ownedBy;
    existing.type ||= candidate.type;
    existing.channel ||= candidate.channel;
    existing.providers = [
      ...new Set([...existing.providers, ...candidate.providers]),
    ];
  };
  for (const item of runtimeModelsData.value) add(item, "available");
  for (const item of staticModelsData.value) add(item, "static");
  return [...merged.values()].sort(
    (left, right) =>
      Number(!left.scopes.includes("available")) -
        Number(!right.scopes.includes("available")) ||
      left.modelId.localeCompare(right.modelId),
  );
}
function userById(id) {
  return users.value.find((user) => Number(user.id) === Number(id));
}
function channelName(id) {
  return (
    channelGroups.value.find((group) => Number(group.id) === Number(id))
      ?.channel_name || `#${id}`
  );
}
function modelGroupName(id) {
  return (
    modelGroups.value.find((group) => Number(group.id) === Number(id))
      ?.group_name || `#${id}`
  );
}
function keyChannelNames(key) {
  return key.channels.map(channelName);
}
function keyModelNames(key) {
  return key.model_groups.map(modelGroupName);
}
const keysByUser = computed(() => {
  const grouped = new Map();
  for (const key of keys.value) {
    const id = Number(key.user_id);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(key);
  }
  return grouped;
});
function keysForUser(id) {
  return keysByUser.value.get(Number(id)) || [];
}
function effectiveChannelScopes(id) {
  const owned = keysForUser(id);
  if (!owned.length || owned.some((key) => !key.channels.length)) return [];
  return [...new Set(owned.flatMap(keyChannelNames))];
}
function effectiveModelScopes(id) {
  const owned = keysForUser(id);
  if (!owned.length || owned.some((key) => !key.model_groups.length)) return [];
  return [...new Set(owned.flatMap(keyModelNames))];
}
function scopeSummary(names) {
  return names.length ? names.join(", ") : t("users.unrestricted");
}
function channelDetailsFor(id) {
  return channelDetailsData.value.filter(
    (item) => Number(item.channel_group_id) === Number(id) && !item.deleted_at,
  );
}
function modelDetailsFor(id) {
  return modelDetailsData.value.filter(
    (item) => Number(item.model_group_id) === Number(id) && !item.deleted_at,
  );
}
function modelBindingChannelLabel(detail) {
  const ids = Array.isArray(detail?.channels) ? detail.channels : [];
  return ids.length ? ids.map(channelName).join(", ") : t("users.inheritsKeyScope");
}
function periodWindows(user) {
  return (
    user.period_limits_summary?.enabled_windows ||
    user.periodLimitsSummary?.enabledWindows ||
    []
  );
}
function zeroPeriodWindows(user) {
  return (
    user.period_limits_summary?.zero_limit_windows ||
    user.periodLimitsSummary?.zeroLimitWindows ||
    []
  );
}
function parseLocalizedNumber(value) {
  const input = String(value ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!input) return Number.NaN;
  const lastComma = input.lastIndexOf(",");
  const lastDot = input.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    return Number(
      input.split(groupingSeparator).join("").replace(decimalSeparator, "."),
    );
  }
  return Number(input.replace(",", "."));
}
function formatCredits(value) {
  return new Intl.NumberFormat(intlLocale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(Number(value || 0));
}
function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(intlLocale.value, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : t("users.notReturned");
}
function maskKey(value) {
  const text = String(value || "").trim();
  return !text
    ? ""
    : text.length <= 10
      ? `${text.slice(0, 2)}***`
      : `${text.slice(0, 6)}...${text.slice(-4)}`;
}
function keySequence(key) {
  return (
    Math.max(
      keys.value.findIndex((item) => item.id === key.id),
      0,
    ) + 1
  );
}
function toggleId(target, id) {
  const value = Number(id);
  const index = target.indexOf(value);
  index >= 0 ? target.splice(index, 1) : target.push(value);
}
function isOperableUser(user) {
  return user && !user.deleted_at && Number.isFinite(Number(user.id));
}
function errorMessage(error) {
  return (
    error?.data?.message ||
    error?.data?.error ||
    error?.response?._data?.message ||
    error?.response?._data?.error ||
    error?.message ||
    t("users.unexpectedError")
  );
}
function clearFormError() {
  formError.value = "";
  formFieldErrors.value = [];
}
function fieldError(field) {
  return (
    formFieldErrors.value.find((item) => item.field === field)?.message || ""
  );
}

const selectedUserIds = ref(new Set());
const operableFilteredUsers = computed(() =>
    filteredUsers.value.filter(isOperableUser),
  ),
  selectedUsers = computed(() =>
    users.value.filter(
      (user) => selectedUserIds.value.has(user.id) && isOperableUser(user),
    ),
  );
const allFilteredUsersSelected = computed(
  () =>
    operableFilteredUsers.value.length > 0 &&
    operableFilteredUsers.value.every((user) =>
      selectedUserIds.value.has(user.id),
    ),
);
const someFilteredUsersSelected = computed(
  () =>
    !allFilteredUsersSelected.value &&
    operableFilteredUsers.value.some((user) =>
      selectedUserIds.value.has(user.id),
    ),
);
function toggleUserSelection(id, checked) {
  const next = new Set(selectedUserIds.value);
  checked ? next.add(id) : next.delete(id);
  selectedUserIds.value = next;
}
function toggleAllFilteredUsers(checked) {
  const next = new Set(selectedUserIds.value);
  for (const user of operableFilteredUsers.value)
    checked ? next.add(user.id) : next.delete(user.id);
  selectedUserIds.value = next;
}

const periodWindowIds = ["5h", "1d", "7d", "30d"];
const deviceTimezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const fallbackTimezones = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
];
const timezoneOptions = (() => {
  try {
    const supported =
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [];
    return [
      ...new Set(["UTC", deviceTimezone, ...supported, ...fallbackTimezones]),
    ]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [...new Set([deviceTimezone, ...fallbackTimezones])]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }
})();
const weekDayOptions = computed(() => [
  t("users.monday"),
  t("users.tuesday"),
  t("users.wednesday"),
  t("users.thursday"),
  t("users.friday"),
  t("users.saturday"),
  t("users.sunday"),
].map((label, index) => ({ label, value: index + 1 })));
const periodWindowLabel = (id) =>
  ({ "5h": t("users.window5h"), "1d": t("users.window1d"), "7d": t("users.window7d"), "30d": t("users.window30d") })[id];
const periodModeLabel = (value) =>
  value === "sliding" ? t("users.modeSliding") : value === "calendar" ? t("users.modeCalendar") : t("users.modeFirstUse");
const periodModeOptions = (id) =>
  (id === "5h"
    ? ["first_use", "sliding"]
    : ["first_use", "sliding", "calendar"]
  ).map((value) => ({
    value,
    label: periodModeLabel(value),
  }));
const newPeriods = () =>
  Object.fromEntries(
    periodWindowIds.map((id) => [
      id,
      { enabled: false, limit: "0", mode: "first_use" },
    ]),
  );
const emptyUserForm = () => ({
  username: "",
  password: "",
  credits: "0",
  credits_unlimited: false,
  timezone: deviceTimezone,
  week_reset_day: 1,
  week_reset_hour: 0,
  periods: newPeriods(),
});
const userFormOpen = ref(false),
  editingUser = ref(null),
  userForm = ref(emptyUserForm());
function openUserCreate() {
  editingUser.value = null;
  userForm.value = emptyUserForm();
  clearFormError();
  userFormOpen.value = true;
}
async function openUserEdit(user) {
  clearFormError();
  try {
    const response = await fetchAPI(`/users/${user.id}`);
    const detail = response?.user || user;
    editingUser.value = detail;
    userForm.value = userToForm(detail);
    userFormOpen.value = true;
  } catch (error) {
    toast.add({
      title: t("users.loadUserFailed"),
      description: errorMessage(error),
      color: "error",
    });
  }
}
function userToForm(user) {
  const form = emptyUserForm();
  form.username = user.username || "";
  form.credits = String(user.credits ?? 0);
  form.credits_unlimited = !!user.credits_unlimited;
  form.timezone = user.timezone || "Asia/Shanghai";
  form.week_reset_day = Number(user.week_reset_day ?? 1);
  form.week_reset_hour = Number(user.week_reset_hour ?? 0);
  for (const id of periodWindowIds) {
    const limit = user[`limit_${id}_credits`];
    form.periods[id] = {
      enabled: limit != null,
      limit: String(limit ?? 0),
      mode: user[`window_mode_${id}`] || "first_use",
    };
  }
  return form;
}
async function submitUser() {
  clearFormError();
  const username = userForm.value.username.trim();
  const credits = parseLocalizedNumber(userForm.value.credits);
  if (!username) return void (formError.value = t("users.usernameRequired"));
  if (!Number.isFinite(credits) || credits < 0)
    return void (formError.value =
      t("users.creditsInvalid"));
  const body = {
    username,
    credits,
    credits_unlimited: userForm.value.credits_unlimited,
  };
  if (userForm.value.password.trim())
    body.password = userForm.value.password.trim();
  if (periodLimitsSupported.value) {
    const timezone = userForm.value.timezone.trim();
    const weekResetDay = Number(userForm.value.week_reset_day);
    const weekResetHour = Number(userForm.value.week_reset_hour);
    if (!timezone) return void (formError.value = t("users.timezoneRequired"));
    if (!Number.isInteger(weekResetDay) || weekResetDay < 1 || weekResetDay > 7)
      return void (formError.value =
        t("users.weekDayInvalid"));
    if (
      !Number.isInteger(weekResetHour) ||
      weekResetHour < 0 ||
      weekResetHour > 23
    )
      return void (formError.value =
        t("users.weekHourInvalid"));
    body.timezone = timezone;
    body.week_reset_day = weekResetDay;
    body.week_reset_hour = weekResetHour;
    for (const id of periodWindowIds) {
      const period = userForm.value.periods[id];
      const limit = parseLocalizedNumber(period.limit);
      if (period.enabled && (!Number.isFinite(limit) || limit < 0))
        return void (formError.value = t("users.periodLimitInvalid", { window: periodWindowLabel(id) }));
      body[`limit_${id}_credits`] = period.enabled ? limit : null;
      body[`window_mode_${id}`] = period.mode;
    }
  }
  saving.value = true;
  try {
    await fetchAPI(
      editingUser.value
        ? `/users/${encodeURIComponent(editingUser.value.id)}`
        : "/users",
      { method: editingUser.value ? "PATCH" : "POST", body },
    );
    userFormOpen.value = false;
    await syncAll();
    toast.add({
      title: editingUser.value ? t("users.userUpdated") : t("users.userCreated"),
      color: "success",
    });
  } catch (error) {
    formError.value = errorMessage(error);
    formFieldErrors.value =
      error?.data?.field_errors ||
      error?.data?.fieldErrors ||
      error?.response?._data?.field_errors ||
      error?.response?._data?.fieldErrors ||
      [];
  } finally {
    saving.value = false;
  }
}

const userDetailOpen = ref(false),
  userDetail = useWorkspaceState('admin:users:userDetail', () => (null)),
  detailPeriods = useWorkspaceState('admin:users:detailPeriods', () => (null)),
  detailPeriodLoading = useWorkspaceState('admin:users:detailPeriodLoading', () => (false)),
  detailPeriodError = useWorkspaceState('admin:users:detailPeriodError', () => (""));
async function openUserDetail(user) {
  userDetailOpen.value = true;
  userDetail.value = user;
  detailPeriods.value = null;
  detailPeriodError.value = "";
  try {
    const response = await fetchAPI(`/users/${encodeURIComponent(user.id)}`);
    userDetail.value = { ...user, ...(response?.user || response || {}) };
  } catch {}
  if (periodLimitsSupported.value) await loadUserPeriods(user);
}
async function loadUserPeriods(user) {
  detailPeriodLoading.value = true;
  detailPeriodError.value = "";
  try {
    detailPeriods.value = await fetchAPI(
      `/users/${encodeURIComponent(user.id)}/period-limits`,
    );
  } catch (error) {
    detailPeriodError.value = errorMessage(error);
  } finally {
    detailPeriodLoading.value = false;
  }
}
function topupDetailItems(user) {
  const request = user.pending_topup;
  return request ? [
    { label: t('users.requestId'), value: String(request.id) },
    { label: t('users.amount'), value: t('users.creditsAmount', { amount: formatCredits(request.amount) }) },
    { label: t('users.requested'), value: formatDate(request.created_at) },
    { label: t('users.note'), value: request.note || '—' },
  ] : [{ label: t('users.request'), value: t('common.none') }];
}
function resetAllowanceItems(user) {
  const allowance = user.reset_allowance;
  return allowance ? [
    { label: t('users.available'), value: String(allowance.available) },
    { label: t('users.mode'), value: allowance.mode === 'monthly' ? t('users.monthly') : t('users.oneTime') },
    { label: t('users.amount'), value: String(allowance.amount) },
    { label: t('users.renews'), value: formatDate(allowance.renews_at) },
    { label: t('users.expires'), value: formatDate(allowance.expires_at) },
  ] : [{ label: t('users.allowance'), value: t('users.notConfigured') }];
}
function profileItems(user) {
  const mfa = Array.isArray(user.mfa)
    ? user.mfa.length > 0
    : user.mfa && typeof user.mfa === "object"
      ? Object.keys(user.mfa).length > 0
      : Boolean(user.mfa || user.totp_enabled);
  const passkeys = Array.isArray(user.passkey)
    ? user.passkey.length
    : Array.isArray(user.passkeys)
      ? user.passkeys.length
      : user.passkey && typeof user.passkey === "object"
        ? 1
        : Number(user.passkey_count || 0);
  return [
    { label: t("common.created"), value: formatDate(user.created_at) },
    { label: t("common.updated"), value: formatDate(user.updated_at) },
    {
      label: t("users.deletedAt"),
      value: user.deleted_at ? formatDate(user.deleted_at) : t("users.notDeleted"),
    },
    { label: t("users.credits"), value: user.credits_unlimited ? t('users.unlimited') : formatCredits(user.credits) },
    { label: "MFA", value: mfa ? t("common.enabled") : t("common.disabled") },
    { label: t("users.passkeys"), value: String(passkeys) },
  ];
}
function accessItems(user) {
  return [
    { label: t("users.clientKeys"), value: String(keysForUser(user.id).length) },
    {
      label: t("users.credentialScope"),
      value: scopeSummary(effectiveChannelScopes(user.id)),
    },
    {
      label: t("users.modelScope"),
      value: scopeSummary(effectiveModelScopes(user.id)),
    },
  ];
}
const normalizedDetailWindows = computed(() => {
  const windows =
    detailPeriods.value?.windows || detailPeriods.value?.limits?.windows || [];
  return periodWindowIds.map((id) => {
    const item =
      windows.find((window) => (window.id || window.window) === id) || {};
    const enabled = item.enabled ?? item.limit != null;
    const remainingNumber = Number.isFinite(Number(item.remaining))
      ? Number(item.remaining)
      : null;
    const exhausted =
      enabled && remainingNumber != null && remainingNumber <= 0;
    const active = Boolean(item.active);
    const used = Number(item.used || 0);
    const limit = Number.isFinite(Number(item.limit))
      ? Number(item.limit)
      : null;
    const progress =
      !enabled || limit == null
        ? null
        : limit > 0
          ? Math.min(Math.round((used / limit) * 100), 100)
          : 100;
    const mode =
      item.mode === "sliding" || item.mode === "rolling"
        ? "sliding"
        : item.mode === "calendar" && id !== "5h"
          ? "calendar"
          : "first_use";
    const start = item.window_start || item.windowStart;
    const end = item.window_end || item.windowEnd;
    const reset = item.reset_at || item.resetAt;
    const state =
      active && start && end
        ? `${formatDate(start)} – ${formatDate(end)}`
        : !active && mode === "first_use"
          ? t("users.windowOpensOnCharge")
          : "";
    const status = !enabled
      ? "Disabled"
      : exhausted
        ? "Exhausted"
        : active
          ? "Active"
          : "Not started";
    return {
      id,
      label: periodWindowLabel(id),
      enabled,
      status,
      statusLabel: status === "Disabled" ? t("common.disabled") : status === "Exhausted" ? t("users.exhausted") : status === "Active" ? t("common.active") : t("users.notStarted"),
      progress,
      used: formatCredits(used),
      limit: limit == null ? "—" : formatCredits(limit),
      remaining: remainingNumber == null ? "—" : formatCredits(remainingNumber),
      description: `${periodModeLabel(mode)}${state ? ` · ${state}` : ""}${reset ? ` · ${t("users.resetsAt", { date: formatDate(reset) })}` : ""}`,
    };
  });
});

const keyFormOpen = ref(false),
  editingKey = ref(null),
  keyForm = ref({});
const userOptions = computed(() => usersKeyOwnerOptions(users.value, Number(keyForm.value.user_id) || 0));
const keyOwnerUnavailable = computed(() => Number(keyForm.value.user_id) > 0 &&
  !users.value.some((user) => Number(user.id) === Number(keyForm.value.user_id) && !user.deleted_at));
const channelOptions = computed(() =>
    channelGroups.value.map((group) => ({
      label: group.channel_name,
      value: Number(group.id),
    })),
  ),
  modelGroupOptions = computed(() =>
    modelGroups.value.map((group) => ({
      label: group.group_name,
      value: Number(group.id),
    })),
  );
function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `sk-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
function openKeyCreate() {
  editingKey.value = null;
  keyForm.value = {
    api_key: generateSecret(),
    user_id: 0,
    channels: [],
    model_groups: [],
  };
  clearFormError();
  keyFormOpen.value = true;
}
function openKeyEdit(key) {
  editingKey.value = key;
  keyForm.value = {
    api_key: key.api_key,
    user_id: Number(key.user_id || 0),
    channels: [...key.channels],
    model_groups: [...key.model_groups],
  };
  clearFormError();
  keyFormOpen.value = true;
}
async function submitKey() {
  if (saving.value) return;
  if (!keyForm.value.api_key.trim())
    return void (formError.value = t("users.keyValueRequired"));
  const channels = [
    ...new Set(
      (keyForm.value.channels || [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const modelGroups = [
    ...new Set(
      (keyForm.value.model_groups || [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  saving.value = true;
  clearFormError();
  try {
    const bindings = {
      user_id: Number(keyForm.value.user_id) || 0,
      channels,
      model_groups: modelGroups,
    };
    if (editingKey.value) {
      const changed = changedUsersKeyBindings(editingKey.value, bindings);
      if (!Object.keys(changed).length) {
        keyFormOpen.value = false;
        return;
      }
      await fetchAPI("/access/api-keys", {
        method: "PATCH",
        body: {
          ...(editingKey.value.numeric_id != null
            ? { id: editingKey.value.numeric_id }
            : { api_key: editingKey.value.api_key }),
          ...changed,
        },
      });
    } else {
      const body = { api_key: keyForm.value.api_key.trim(), ...bindings };
      const response = await fetchAPI("/access/api-keys");
      const existing = keyEntries(response)
        .map((entry, index) => normalizeKey(entry, index))
        .filter((key) => key.api_key);
      if (!existing.length || existing.every((key) => key.numeric_id != null)) {
        try {
          await fetchAPI("/access/api-keys", { method: "POST", body });
        } catch (error) {
          const status =
            error?.statusCode || error?.status || error?.response?.status;
          if (![404, 405].includes(Number(status))) throw error;
          await fetchAPI("/access/api-keys", {
            method: "PUT",
            body: { api_key_entries: [...existing.map(keyPayload), body] },
          });
        }
      } else
        await fetchAPI("/access/api-keys", {
          method: "PUT",
          body: { api_key_entries: [...existing.map(keyPayload), body] },
        });
    }
    keyFormOpen.value = false;
    await syncAll();
    toast.add({
      title: editingKey.value ? t("users.keyAccessUpdated") : t("users.clientKeyCreated"),
      color: "success",
    });
  } catch (error) {
    formError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}
function keyPayload(key) {
  return {
    api_key: key.api_key.trim(),
    user_id: key.user_id ?? 0,
    channels: key.channels || [],
    model_groups: key.model_groups || [],
  };
}

const groupFormOpen = ref(false),
  groupFormKind = ref("channel"),
  editingGroup = ref(null),
  groupForm = ref({ name: "", disabled: false });
const groupFormTitle = computed(() =>
  editingGroup.value
    ? groupFormKind.value === "channel" ? t("users.editCredentialScope") : t("users.editModelScope")
    : groupFormKind.value === "channel" ? t("users.newCredentialScope") : t("users.newModelScope"),
);
const groupFormDescription = computed(() =>
  editingGroup.value
    ? groupFormKind.value === "channel" ? t("users.editCredentialScopeDescription") : t("users.editModelScopeDescription")
    : groupFormKind.value === "channel" ? t("users.newCredentialScopeDescription") : t("users.newModelScopeDescription"),
);
function openGroupForm(kind, group = null) {
  groupFormKind.value = kind;
  editingGroup.value = group;
  groupForm.value = {
    name: group
      ? kind === "channel"
        ? group.channel_name
        : group.group_name
      : "",
    disabled: !!group?.disabled,
  };
  clearFormError();
  groupFormOpen.value = true;
}
async function submitGroup() {
  const name = groupForm.value.name.trim();
  if (!name) return void (formError.value = t("users.scopeNameRequired"));
  const channel = groupFormKind.value === "channel",
    base = channel ? "/channel-groups" : "/model-groups";
  saving.value = true;
  try {
    await fetchAPI(
      editingGroup.value ? `${base}/${editingGroup.value.id}` : base,
      {
        method: editingGroup.value ? "PATCH" : "POST",
        body: {
          [channel ? "channel_name" : "group_name"]: name,
          disabled: groupForm.value.disabled,
        },
      },
    );
    groupFormOpen.value = false;
    await syncAll();
    toast.add({
      title: editingGroup.value ? t("users.scopeUpdated") : t("users.scopeCreated"),
      color: "success",
    });
  } catch (error) {
    formError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}

const bindingOpen = ref(false),
  bindingKind = ref("credential"),
  bindingGroup = ref(null),
  bindingSearch = ref(""),
  bindingSelection = ref([]),
  bindingChannels = ref([]),
  modelSourceFilter = ref("all");
const credentialCandidatesPending = useWorkspaceState('admin:users:credentialCandidatesPending', () => (false)),
  credentialCandidatesIssue = useWorkspaceState('admin:users:credentialCandidatesIssue', () => ("")),
  credentialCandidatesError = useWorkspaceState('admin:users:credentialCandidatesError', () => (""));
const modelCandidatesPending = useWorkspaceState('admin:users:modelCandidatesPending', () => (false)),
  modelCandidatesIssue = useWorkspaceState('admin:users:modelCandidatesIssue', () => ("")),
  modelCandidatesError = useWorkspaceState('admin:users:modelCandidatesError', () => (""));
const bindingGroupName = computed(() =>
  bindingGroup.value
    ? bindingKind.value === "credential"
      ? bindingGroup.value.channel_name
      : bindingGroup.value.group_name
    : "",
);
const bindingCandidates = computed(() => {
  if (!bindingGroup.value) return [];
  if (bindingKind.value === "credential") {
    const bound = new Set(
      channelDetailsFor(bindingGroup.value.id).map((item) =>
        String(item.auth_id),
      ),
    );
    return [...credentialsData.value, ...providerCredentialsData.value]
      .map((item) => {
        const value = credentialAuthId(item);
        const unavailable = Boolean(item.disabled || item.unavailable);
        return {
          id: `${item.source || "credential"}:${value}`,
          value,
          label:
            item.label ||
            item.email ||
            item.account ||
            item.name ||
            item.identifier ||
            value,
          description: value,
          provider:
            item.provider || item.providerId || item.type || "credential",
          type: item.type || "",
          status: item.status || "",
          scopes: [],
          disabled: bound.has(value) || unavailable,
          badges: [
            item.provider || item.providerId || item.type || "credential",
            ...(bound.has(value)
              ? ["Bound"]
              : unavailable
                ? ["Unavailable"]
                : []),
          ],
        };
      })
      .filter((item) => item.value);
  }
  const bound = new Set(
    modelDetailsFor(bindingGroup.value.id).map((item) => String(item.model_id)),
  );
  return mergeModelCandidates().map((item) => ({
    ...item,
    value: item.modelId,
    description: item.modelId,
    disabled: bound.has(item.modelId),
    badges: [
      ...item.scopes.map((scope) =>
        scope === "available" ? "Available" : "Static catalog",
      ),
      ...(item.channel ? [item.channel] : []),
      ...(bound.has(item.modelId) ? ["Bound"] : []),
    ],
  }));
});
const bindingSubmitDisabled = computed(
  () =>
    saving.value ||
    !bindingGroup.value?.id ||
    (bindingKind.value === "model"
      ? modelCandidatesPending.value || !!modelCandidatesError.value
      : credentialCandidatesPending.value || !!credentialCandidatesError.value),
);
const providerCandidateRoutes = [
  { id: "gemini", path: "/config/api-keys/gemini" },
  { id: "interactions", path: "/config/api-keys/interactions" },
  { id: "claude", path: "/config/api-keys/claude" },
  { id: "codex", path: "/config/api-keys/codex" },
  { id: "vertex", path: "/config/api-keys/vertex" },
  { id: "xai", path: "/config/api-keys/xai" },
  { id: "openaiCompatibility", path: "/config/api-keys/openai-compatibility" },
];
function credentialAuthId(item) {
  return String(
    item?.auth_id ||
      item?.auth_index ||
      item?.["auth-index"] ||
      item?.id ||
      item?.uuid ||
      "",
  ).trim();
}
async function loadCredentialCandidates() {
  credentialCandidatesPending.value = true;
  credentialCandidatesIssue.value = "";
  credentialCandidatesError.value = "";
  const results = await Promise.allSettled([
    fetchAPI("/credentials"),
    ...providerCandidateRoutes.map((route) => fetchAPI(route.path)),
  ]);
  const failures = results
    .filter((result) => result.status === "rejected")
    .map((result) => errorMessage(result.reason));
  const credentialResponse =
    results[0].status === "fulfilled" ? results[0].value : null;
  const credentialEntries = Array.isArray(credentialResponse)
    ? credentialResponse
    : credentialResponse?.credentials || credentialResponse?.items || [];
  credentialsData.value = credentialEntries
    .map((item) => ({ ...item, source: "credential" }))
    .filter((item) => credentialAuthId(item));
  providerCredentialsData.value = providerCandidateRoutes.flatMap(
    (route, index) => {
      const result = results[index + 1];
      if (result.status !== "fulfilled" || !Array.isArray(result.value))
        return [];
      return result.value
        .flatMap((group) =>
          (Array.isArray(group?.keys) ? group.keys : []).map((item) => ({
            ...group,
            ...item,
            keys: undefined,
            source: "provider",
            providerId: route.id,
          })),
        )
        .filter((item) => credentialAuthId(item));
    },
  );
  const deduped = new Set();
  credentialsData.value = [
    ...credentialsData.value,
    ...providerCredentialsData.value,
  ].filter((item) => {
    const id = credentialAuthId(item);
    if (!id || deduped.has(id)) return false;
    deduped.add(id);
    return true;
  });
  providerCredentialsData.value = [];
  if (!credentialsData.value.length && failures.length)
    credentialCandidatesError.value = failures.join(" · ");
  else if (failures.length)
    credentialCandidatesIssue.value = failures.join(" · ");
  credentialCandidatesPending.value = false;
}
async function loadModelCandidates() {
  modelCandidatesPending.value = true;
  modelCandidatesIssue.value = "";
  modelCandidatesError.value = "";
  const [available, staticResult] = await Promise.allSettled([
    fetchAPI("/models", { query: { scope: "available" } }),
    fetchAPI("/models", { query: { scope: "static" } }),
  ]);
  runtimeModelsData.value =
    available.status === "fulfilled"
      ? flattenModels(available.value?.models)
      : [];
  staticModelsData.value =
    staticResult.status === "fulfilled"
      ? flattenModels(staticResult.value?.models)
      : [];
  const failures = [available, staticResult]
    .filter((result) => result.status === "rejected")
    .map((result) => errorMessage(result.reason));
  if (failures.length === 2 && !mergeModelCandidates().length)
    modelCandidatesError.value = failures.join(" · ");
  else if (failures.length) modelCandidatesIssue.value = failures.join(" · ");
  modelCandidatesPending.value = false;
}
function openBindings(kind, group) {
  bindingKind.value = kind;
  bindingGroup.value = group;
  bindingSearch.value = "";
  bindingSelection.value = [];
  bindingChannels.value = [];
  modelSourceFilter.value = "all";
  clearFormError();
  bindingOpen.value = true;
  if (kind === "model") void loadModelCandidates();
  else void loadCredentialCandidates();
}
function setBindingSelection(value) {
  bindingSelection.value = Array.isArray(value) ? [...value] : [];
}
function replaceModelGroupDetails(groupId, details) {
  modelDetailsData.value = [
    ...modelDetailsData.value.filter(
      (item) => Number(item.model_group_id) !== Number(groupId),
    ),
    ...details,
  ];
}
async function loadModelGroupDetails(groupId) {
  const response = await fetchAPI("/model-group-details", {
    query: { model_group_id: groupId },
  });
  const details = response?.model_group_details || response?.items || [];
  replaceModelGroupDetails(groupId, details);
  return details;
}
async function refreshModelScopeData(groupId) {
  const [detailsResult, groupsResult] = await Promise.allSettled([
    loadModelGroupDetails(groupId),
    fetchAPI("/model-groups"),
  ]);
  if (groupsResult.status === "fulfilled")
    modelGroupsData.value =
      groupsResult.value?.model_groups || groupsResult.value?.items || [];
  return detailsResult;
}
async function addModelBindings(targets) {
  const groupId = Number(bindingGroup.value.id);
  await loadModelGroupDetails(groupId);
  const nowBound = new Set(
    modelDetailsFor(groupId).map((item) => String(item.model_id).trim()),
  );
  if (targets.some((target) => nowBound.has(target)))
    throw new Error(t("users.modelAlreadyBound"));
  const channels = modelChannelBindingsSupported.value
    ? [
        ...new Set(
          bindingChannels.value
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ]
    : [];
  const bodies = targets.map((modelId) => ({
    model_group_id: groupId,
    model_id: modelId,
    ...(channels.length ? { channels } : {}),
  }));
  if (bodies.length === 1) {
    await fetchAPI("/model-group-details", { method: "POST", body: bodies[0] });
    await refreshModelScopeData(groupId);
    bindingOpen.value = false;
    toast.add({ title: t("users.bindingAdded"), color: "success" });
    return;
  }
  const results = await Promise.allSettled(
    bodies.map((body) =>
      fetchAPI("/model-group-details", { method: "POST", body }),
    ),
  );
  await refreshModelScopeData(groupId);
  const failed = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ target: targets[index], message: errorMessage(result.reason) }]
      : [],
  );
  const created = results.length - failed.length;
  if (failed.length) {
    if (created)
      toast.add({
        title: t("users.bindingsPartiallyAdded", { created, failed: failed.length }),
        color: "warning",
      });
    throw new Error(
      t("users.bindingsFailedDetail", { count: failed.length, target: failed[0].target, message: failed[0].message }),
    );
  }
  bindingOpen.value = false;
  toast.add({ title: t("users.bindingsAdded", { count: created }), color: "success" });
}
async function addBindings() {
  if (!bindingGroup.value?.id)
    return void (formError.value =
      t("users.selectValidScope"));
  const targets = [
    ...new Set(
      bindingSelection.value
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ];
  if (!targets.length)
    return void (formError.value =
      bindingKind.value === "credential"
        ? t("users.selectAtLeastOneCredential")
        : t("users.selectAtLeastOneModel"));
  saving.value = true;
  clearFormError();
  try {
    if (bindingKind.value === "model") {
      await addModelBindings(targets);
      return;
    }
    const failed = [];
    let created = 0;
    for (const target of targets) {
      try {
        await fetchAPI("/channel-group-details", {
          method: "POST",
          body: {
            channel_group_id: Number(bindingGroup.value.id),
            auth_id: target,
          },
        });
        created++;
      } catch (error) {
        failed.push(`${target}: ${errorMessage(error)}`);
      }
    }
    await syncAll();
    if (failed.length) {
      if (created)
        toast.add({
          title: t("users.bindingsAddedCount", { count: created }),
          description: t("users.failedCount", { count: failed.length }),
          color: "warning",
        });
      formError.value = failed.join(" | ");
      return;
    }
    bindingOpen.value = false;
    toast.add({
      title: created === 1 ? t("users.bindingAdded") : t("users.bindingsAdded", { count: created }),
      color: "success",
    });
  } catch (error) {
    formError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}

const balanceOpen = ref(false),
  balanceConfirmOpen = ref(false),
  balanceTargets = ref([]),
  balanceForm = ref({ type: "recharge", amount: "", note: "" });
const balanceCurrentTotal = computed(() =>
    balanceTargets.value.reduce(
      (sum, user) => sum + Number(user.credits || 0),
      0,
    ),
  ),
  balanceDelta = computed(() => {
    const amount = Number(balanceForm.value.amount);
    return Number.isFinite(amount) && amount > 0
      ? balanceForm.value.type === "deduct"
        ? -amount
        : amount
      : null;
  }),
  balanceAfterTotal = computed(() =>
    balanceDelta.value == null
      ? null
      : balanceCurrentTotal.value +
        balanceDelta.value * balanceTargets.value.length,
  ),
  negativeBalanceCount = computed(() =>
    balanceDelta.value == null
      ? 0
      : balanceTargets.value.filter(
          (user) => Number(user.credits || 0) + balanceDelta.value < 0,
        ).length,
  );
const balanceTargetLabel = computed(() =>
  balanceTargets.value.length === 1
    ? `${balanceTargets.value[0].username} (#${balanceTargets.value[0].id})`
    : t("users.usersCountShort", { count: balanceTargets.value.length }),
);
const balanceConfirmTitle = computed(() =>
  balanceTargets.value.length > 1
    ? balanceForm.value.type === "deduct" ? t("users.confirmBatchDeduction") : t("users.confirmBatchRecharge")
    : balanceForm.value.type === "deduct" ? t("users.confirmDeduction") : t("users.confirmRecharge"),
);
const signedBalanceAmount = computed(
    () =>
      `${balanceForm.value.type === "deduct" ? "−" : "+"}${formatCredits(balanceForm.value.amount)}`,
  ),
  signedBalanceTotal = computed(
    () =>
      `${balanceForm.value.type === "deduct" ? "−" : "+"}${formatCredits(Number(balanceForm.value.amount) * balanceTargets.value.length)}`,
  );
function openBalance(targets) {
  balanceTargets.value = targets.filter(isOperableUser);
  balanceForm.value = { type: "recharge", amount: "", note: "" };
  clearFormError();
  balanceOpen.value = true;
}
function reviewBalance() {
  const amount = Number(balanceForm.value.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    return void (formError.value = t("users.amountInvalid"));
  if (balanceForm.value.type === "deduct" && !balanceForm.value.note.trim())
    return void (formError.value = t("users.deductionNoteRequired"));
  balanceConfirmOpen.value = true;
}
async function applyBalance() {
  saving.value = true;
  let succeeded = 0;
  const failed = [];
  for (const user of balanceTargets.value) {
    try {
      await fetchAPI(`/billing/balance-records/${balanceForm.value.type}`, {
        method: "POST",
        body: {
          user_id: user.id,
          amount: Number(balanceForm.value.amount),
          note: balanceForm.value.note.trim(),
        },
      });
      succeeded++;
    } catch (error) {
      failed.push(errorMessage(error));
    }
  }
  await syncAll();
  saving.value = false;
  if (failed.length)
    toast.add({
      title: succeeded
        ? t("users.balancePartialFailed", { succeeded, failed: failed.length, message: failed[0] })
        : t("users.balanceAllFailed", { count: failed.length, message: failed[0] }),
      color: "error",
    });
  else
    toast.add({
      title:
        balanceTargets.value.length === 1
          ? balanceForm.value.type === "recharge"
            ? t("users.rechargeSubmitted")
            : t("users.deductionSubmitted")
          : t("users.balanceCompleted", { count: succeeded }),
      color: "success",
    });
  if (succeeded) {
    balanceConfirmOpen.value = false;
    balanceOpen.value = false;
    selectedUserIds.value = new Set();
  }
}

const periodResetOpen = ref(false),
  periodResetUser = ref(null),
  resetWindows = ref(new Set(periodWindowIds)),
  resetMode = ref("counter");
const resetModeOptions = computed(() => [
  {
    label: t("users.resetCounters"),
    value: "counter",
    hint: t("users.resetCountersHint"),
  },
  {
    label: t("users.resetWindowStartOnly"),
    value: "window_only",
    hint: t("users.resetWindowStartOnlyHint"),
  },
]);
function openPeriodReset(user) {
  periodResetUser.value = user;
  resetWindows.value = new Set(periodWindowIds);
  resetMode.value = "counter";
  clearFormError();
  periodResetOpen.value = true;
}
function toggleResetWindow(window) {
  const next = new Set(resetWindows.value);
  next.has(window) ? next.delete(window) : next.add(window);
  resetWindows.value = next;
}
function detailWindow(id) {
  const windows =
    detailPeriods.value?.windows || detailPeriods.value?.limits?.windows || [];
  return windows.find((window) => (window.id || window.window) === id);
}
async function resetPeriods() {
  if (!resetWindows.value.size)
    return void (formError.value = t("users.selectAtLeastOneWindow"));
  saving.value = true;
  try {
    const response = await fetchAPI(
      `/users/${encodeURIComponent(periodResetUser.value.id)}/period-limits/reset`,
      {
        method: "POST",
        body: {
          windows: periodWindowIds.filter((id) => resetWindows.value.has(id)),
          mode: resetMode.value,
        },
      },
    );
    detailPeriods.value = response?.limits || response || null;
    periodResetOpen.value = false;
    await syncAll();
    toast.add({ title: t("users.periodCountersReset"), color: "success" });
  } catch (error) {
    formError.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}

const deleteOpen = ref(false),
  deleteKind = ref(""),
  deleteTarget = ref(null);
const deleteDescription = computed(() => {
  const target = deleteTarget.value;
  if (!target) return "";
  if (deleteKind.value === "user")
    return t("users.deleteUserConfirm", { name: target.username });
  if (deleteKind.value === "key")
    return t("users.deleteKeyConfirm", { key: maskKey(target.api_key) });
  if (deleteKind.value === "detail")
    return t("users.deleteBindingConfirm", { name: target.auth_id || target.model_id });
  return t("users.deleteScopeConfirm", { name: target.channel_name || target.group_name });
});
function openDelete(kind, target, subkind = "") {
  deleteKind.value = kind;
  deleteTarget.value = { ...target, subkind };
  deleteOpen.value = true;
}
function confirmUserDelete(user) {
  openDelete("user", user);
}
function confirmKeyDelete(key) {
  openDelete("key", key);
}
function confirmGroupDelete(kind, group) {
  openDelete("group", group, kind);
}
function confirmDetailDelete(kind, detail) {
  openDelete("detail", detail, kind);
}
async function performDelete() {
  const target = deleteTarget.value;
  if (!target) return;
  let url = "";
  if (deleteKind.value === "user")
    url = `/users/${encodeURIComponent(target.id)}`;
  if (deleteKind.value === "key")
    url = `/access/api-keys?${target.numeric_id != null ? `id=${encodeURIComponent(target.numeric_id)}` : `index=${encodeURIComponent(target.index)}`}`;
  if (deleteKind.value === "group")
    url = `/${target.subkind === "channel" ? "channel-groups" : "model-groups"}/${encodeURIComponent(target.id)}`;
  if (deleteKind.value === "detail")
    url = `/${target.subkind === "channel" ? "channel-group-details" : "model-group-details"}/${encodeURIComponent(target.id)}`;
  saving.value = true;
  try {
    await fetchAPI(url, { method: "DELETE" });
    deleteOpen.value = false;
    await syncAll();
    toast.add({
      title:
        deleteKind.value === "detail"
          ? t("users.bindingDeleted")
          : deleteKind.value === "group"
            ? t("users.scopeDeleted")
            : deleteKind.value === "key"
              ? t("users.clientKeyDeleted")
              : t("users.userDeleted"),
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: t("users.deleteFailed"),
      description: errorMessage(error),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* Users signature: compact lead plus status segments that double as table filters.
   Fixed-size content, so it stays the same with ten users or ten thousand. */
.members {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 0.875rem;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--page-accent) 6%, transparent), transparent 55%),
    var(--admin-panel-bg);
  box-shadow: 0 1px 2px rgb(24 24 27 / 4%);
}
.members__lead { display: flex; min-width: 0; align-items: center; gap: 0.75rem; }
.members__icon { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.625rem; background: color-mix(in oklch, var(--page-accent) 12%, transparent); color: var(--page-accent); }
.members__count { font-size: 1.1875rem; line-height: 1.5rem; font-weight: 650; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--ui-text-highlighted); }
.members__count span { font-size: 0.8125rem; font-weight: 500; letter-spacing: normal; color: var(--ui-text-muted); }
.members__segments { display: flex; min-width: 0; flex-wrap: wrap; gap: 0.375rem; }
.members__segment {
  --seg: var(--color-zinc-400);
  display: inline-flex;
  min-height: 2rem !important;
  align-items: center;
  gap: 0.375rem;
  padding: 0 0.75rem;
  border: 1px solid var(--admin-panel-border);
  border-radius: 9999px !important;
  background: var(--admin-panel-bg);
  font-size: 0.75rem;
  color: var(--ui-text-toned);
  transition: background-color 140ms ease, border-color 140ms ease;
}
.members__segment strong { color: var(--ui-text-highlighted); }
.members__segment--emerald { --seg: var(--color-emerald-500); }
.members__segment--amber { --seg: var(--color-amber-500); }
.members__segment--blue { --seg: var(--color-blue-500); }
.members__segment--rose { --seg: var(--color-rose-500); }
.members__dot { width: 0.4375rem; height: 0.4375rem; border-radius: 9999px; background: var(--seg); }
.members__segment:hover:not(:disabled) { border-color: color-mix(in oklch, var(--seg) 45%, var(--admin-panel-border)); }
.members__segment:disabled { opacity: 0.5; cursor: default; }
.members__segment--active {
  border-color: color-mix(in oklch, var(--seg) 55%, transparent);
  background: color-mix(in oklch, var(--seg) 12%, var(--admin-panel-bg));
}
.members__segment:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .members__segment { transition: none; } }
</style>
