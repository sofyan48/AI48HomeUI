<template>
  <div :class="section === 'dashboard' ? 'user-dashboard space-y-5' : 'space-y-8'">

    <UAlert v-if="pageError" color="error" variant="subtle" icon="i-tabler-alert-triangle" title="Some workspace data could not be loaded" :description="pageError" />

    <div v-if="section === 'dashboard'" class="dashboard-bento">
      <header class="dashboard-greeting" aria-labelledby="dashboard-title">
        <div class="min-w-0">
          <h1 id="dashboard-title" class="break-words font-bold tracking-tight text-[var(--ui-text-highlighted)]">Welcome back{{ user?.username ? `, ${user.username}` : '' }}</h1>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">{{ dashboardStatusLine }}</p>
        </div>
        <AppButton v-if="capabilities.request_logs === true" to="/app/logs" icon="i-tabler-list-details" color="neutral" variant="ghost" size="sm" class="rounded-full">Request logs</AppButton>
      </header>

      <!-- Spotlight 1: how to start sending requests. -->
      <section class="dashboard-connect" aria-labelledby="connect-title">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="dashboard-connect-icon"><UIcon name="i-tabler-plug-connected" class="size-5" aria-hidden="true" /></span>
            <div><h2 id="connect-title" class="text-base font-semibold text-[var(--ui-text-highlighted)]">Connect your app</h2><p class="text-xs text-[var(--ui-text-muted)]">Three steps to your first request.</p></div>
          </div>
          <AppButton to="/app/models" size="xs" color="neutral" variant="ghost" class="rounded-full" trailing-icon="i-tabler-arrow-right">Find a model ID</AppButton>
        </div>

        <ol class="dashboard-steps mt-5">
          <li class="dashboard-step">
            <span class="dashboard-step-index" aria-hidden="true">1</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">Create an API key</p>
              <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">Use a separate key for each app and keep it out of public code.</p>
            </div>
            <AppButton to="/app/api-keys" size="sm" icon="i-tabler-key" class="dashboard-primary-action shrink-0 rounded-full">API keys</AppButton>
          </li>
          <li class="dashboard-step">
            <span class="dashboard-step-index" aria-hidden="true">2</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">Point your client at the endpoint</p>
              <div v-if="serverInfo.cpa_public_url" class="dashboard-endpoint-field mt-2">
                <code class="min-w-0 flex-1 truncate font-mono text-sm text-[var(--ui-text-highlighted)]" :title="serverInfo.cpa_public_url">{{ serverInfo.cpa_public_url }}</code>
                <AppButton type="button" size="xs" class="shrink-0" color="neutral" variant="soft" icon="i-tabler-copy" aria-label="Copy endpoint" @click="copyText(serverInfo.cpa_public_url, 'Endpoint copied')">Copy</AppButton>
              </div>
              <p v-else class="mt-0.5 text-xs text-[var(--ui-text-muted)]">Your administrator has not published a public endpoint yet. Ask them for the base URL.</p>
            </div>
          </li>
          <li class="dashboard-step">
            <span class="dashboard-step-index" aria-hidden="true">3</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">Send a request</p>
              <p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">OpenAI-compatible: replace the key and model ID.</p>
              <div v-if="serverInfo.cpa_public_url" class="dashboard-code mt-2 overflow-hidden rounded-xl">
                <div class="flex items-center justify-between gap-2 border-b px-3 py-1.5">
                  <span class="font-mono text-[11px] opacity-70">curl</span>
                  <AppButton type="button" size="xs" color="neutral" variant="ghost" icon="i-tabler-copy" class="dashboard-code-copy" aria-label="Copy curl example" @click="copyText(curlExample, 'Example copied')">Copy</AppButton>
                </div>
                <pre class="overflow-x-auto p-4 text-xs leading-6"><code class="font-mono">{{ curlExample }}</code></pre>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <!-- Spotlight 2: what the user can still spend. -->
      <section class="dashboard-credits" aria-labelledby="credits-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="credits-title" class="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text-highlighted)]"><span class="dashboard-balance-icon"><UIcon name="i-tabler-wallet" class="size-4" aria-hidden="true" /></span>Credits & limits</h2>
          <UBadge v-if="limitAlert" :color="limitAlert.color" variant="subtle" class="rounded-full">{{ limitAlert.label }}</UBadge>
        </div>
        <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--ui-text-muted)]">Available credits</p>
            <p class="dashboard-balance-value mt-1 break-all font-bold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">{{ user ? formatCredits(user.credits) : '—' }}</p>
          </div>
          <AppButton to="/app/balance" size="sm" icon="i-tabler-plus" color="success" variant="soft" class="rounded-full">Top up</AppButton>
        </div>

        <div class="dashboard-limit-list mt-5" aria-label="Account period limits">
          <p class="mb-2 text-xs font-medium text-[var(--ui-text-muted)]">Spending limits</p>
          <template v-if="activePeriodWindows.length">
            <div v-for="window in activePeriodWindows" :key="window.id" class="dashboard-limit min-w-0">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold">{{ periodWindowLabel(window.id) }}</p>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums" :class="periodWindowColor(window)">{{ formatPercent(periodWindowRatio(window)) }}</span>
              </div>
              <div class="period-progress-track mt-2 h-2 overflow-hidden rounded-full" role="progressbar" :aria-label="`${periodWindowLabel(window.id)} limit used`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(periodWindowRatio(window) * 100)"><div class="h-full rounded-full transition-[width]" :class="periodWindowBarColor(window)" :style="{ width: `${periodWindowRatio(window) * 100}%`, minWidth: periodWindowRatio(window) > 0 ? '4px' : '0' }" /></div>
              <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-[var(--ui-text-muted)]">
                <span><strong class="font-semibold tabular-nums text-[var(--ui-text-highlighted)]">{{ formatCredits(window.remaining) }}</strong> left of {{ formatCredits(window.limit) }}</span>
                <span v-if="window.reset_at" class="text-[var(--ui-text-dimmed)]">Resets {{ formatDate(window.reset_at) }}</span>
              </div>
            </div>
          </template>
          <p v-else class="rounded-xl border border-dashed border-[var(--ui-border)] px-3 py-3 text-xs text-[var(--ui-text-muted)]">No spending limits apply to your account. Only your credit balance limits usage.</p>
        </div>
        <AppLimitReset class="mt-auto" @reset="loadPeriodLimits" />
      </section>

      <!-- Single place for activity numbers. -->
      <AppCard class="dashboard-panel dashboard-usage min-w-0" :ui="{ body: 'pt-2' }">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3"><span class="dashboard-icon flex size-9 items-center justify-center rounded-lg"><UIcon name="i-tabler-chart-bar" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">Usage</h2><p class="text-xs text-[var(--ui-text-muted)]">{{ appliedRange.from === appliedRange.to ? appliedRange.from : `${appliedRange.from} – ${appliedRange.to}` }}<template v-if="monthOverview"> · {{ formatCredits(monthOverview.total_charge_amount ?? monthOverview.month_spend) }} credits this month</template></p></div></div>
            <form class="flex flex-wrap items-center gap-2" @submit.prevent="applyBillingRange">
              <USelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-36" aria-label="Time range" @update:model-value="selectRange" />
              <template v-if="rangePreset === 'custom'">
                <UInput v-model="rangeFrom" type="date" aria-label="From (UTC)" />
                <UInput v-model="rangeTo" type="date" aria-label="To (UTC)" />
                <AppButton type="submit" :loading="billingLoading">Apply</AppButton>
              </template>
              <AppButton type="button" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="billingLoading" aria-label="Refresh usage" title="Refresh usage" @click="loadBilling" />
              <AppButton to="/app/balance" color="neutral" variant="ghost" size="sm" trailing-icon="i-tabler-arrow-right">Details</AppButton>
            </form>
          </div>
        </template>
        <dl class="dashboard-usage-strip" :aria-busy="billingLoading">
          <div v-for="(metric, index) in dashboardUsageMetrics" :key="metric.label" class="dashboard-usage-item" :class="`dashboard-metric--${index}`">
            <dt class="flex items-center gap-2 text-xs font-medium text-[var(--ui-text-muted)]"><UIcon :name="metric.icon" class="size-4 dashboard-usage-icon" aria-hidden="true" />{{ metric.label }}</dt>
            <dd class="mt-1.5 break-words text-2xl font-bold tabular-nums tracking-tight text-[var(--ui-text-highlighted)]">{{ billingLoading ? '—' : metric.value }}</dd>
          </div>
        </dl>
        <UAlert v-if="billingError" class="mt-3" color="error" variant="subtle" title="Usage could not be loaded" :description="billingError" />
      </AppCard>
    </div>

    <section v-if="section === 'billing'" class="workspace-finance space-y-5" aria-labelledby="billing-title">
      <AppCard class="finance-panel finance-usage" :ui="{ body: 'space-y-5' }">
        <template #header><div class="flex items-center gap-3"><span class="finance-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-chart-bar" class="size-5" aria-hidden="true" /></span><div><h2 id="billing-title" class="text-sm font-semibold">Usage & spending</h2><p class="mt-0.5 text-xs text-[var(--ui-text-muted)]">Explore your usage and charges by time range.</p></div></div></template>
        <form class="billing-range flex flex-wrap items-end gap-3" @submit.prevent="applyBillingRange">
          <UFormField label="Time range">
            <USelect v-model="rangePreset" :items="rangeOptions" value-key="value" label-key="label" class="w-44" @update:model-value="selectRange" />
          </UFormField>
          <template v-if="rangePreset === 'custom'">
            <UFormField label="From (UTC)"><UInput v-model="rangeFrom" type="date" /></UFormField>
            <UFormField label="To (UTC)"><UInput v-model="rangeTo" type="date" /></UFormField>
            <AppButton type="submit" :loading="billingLoading">Apply range</AppButton>
          </template>
          <AppButton type="button" class="ml-auto shrink-0 rounded-full" color="neutral" variant="ghost" icon="i-tabler-refresh" :loading="billingLoading" @click="loadBilling">Refresh</AppButton>
        </form>
        <UAlert v-if="billingError" class="mt-4" color="error" variant="subtle" title="Billing request failed" :description="billingError" />

        <div class="billing-stat-strip grid min-w-0 grid-cols-2 gap-5 lg:grid-cols-4" aria-label="Usage summary" :aria-busy="billingLoading">
          <div v-for="(metric, index) in billingMetrics" :key="metric.label" class="billing-stat min-w-0" :class="{ 'billing-stat--featured': index === 0 }">
            <p class="flex items-center gap-2 text-sm text-[var(--ui-text-muted)]"><UIcon :name="dashboardMetricIcons[index]" class="size-4 billing-stat-icon" aria-hidden="true" />{{ metric.label }}</p>
            <p class="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums text-[var(--ui-text-highlighted)]">{{ billingLoading ? '—' : metric.value }}</p>
            <p class="mt-2 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ metric.detail }}</p>
          </div>
        </div>
        <details class="billing-models">
          <summary class="flex cursor-pointer items-center gap-3 text-sm font-medium"><UIcon name="i-tabler-stack-2" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /><span>Model breakdown</span><UIcon name="i-tabler-chevron-down" class="billing-model-chevron ml-auto size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /></summary>
          <div v-if="topModels.length" class="space-y-4">
            <div v-for="(model, index) in topModels" :key="model.id || model.label" class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ index + 1 }}. {{ model.label || model.id || 'Unknown model' }}</p>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ formatNumber(model.request_count) }} requests</p>
              </div>
              <span class="shrink-0 font-mono text-sm font-semibold">{{ formatCredits(model.amount) }}</span>
            </div>
          </div>
          <p v-else class="py-5 text-sm text-[var(--ui-text-muted)]">No model charges in this range.</p>
        </details>
      </AppCard>

        <div class="grid min-w-0 grid-cols-1 items-stretch gap-5">

        <AppCard class="finance-panel flex min-w-0 flex-col overflow-hidden" :ui="{ header: 'min-h-24', body: 'flex-1 p-0' }">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="flex items-center gap-2 text-sm font-semibold"><UIcon name="i-tabler-receipt" class="size-4 text-[var(--ui-primary)]" aria-hidden="true" /> Recent charges</h3>
                <p class="text-xs text-[var(--ui-text-muted)]">{{ formatNumber(chargesTotal) }} matching records</p>
              </div>
              <UFormField label="Rows per page">
                <USelect v-model="chargePageSize" :items="pageSizeOptions" value-key="value" label-key="label" class="w-28" @update:model-value="changePageSize" />
              </UFormField>
            </div>
          </template>
          <div class="min-h-64 overflow-x-auto">
            <AppTable :data="charges" :columns="chargeColumns" :loading="billingLoading" empty="No billing charges found." class="min-w-[800px]">
              <template #created_at-cell="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDate(rowValue(row).created_at) }}</span></template>
              <template #provider-cell="{ row }"><span class="text-sm">{{ rowValue(row).provider || '—' }}</span></template>
              <template #model-cell="{ row }"><span class="text-sm font-medium">{{ rowValue(row).model || '—' }}</span></template>
              <template #input_tokens-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).input_tokens) }}</span></template>
              <template #output_tokens-cell="{ row }"><span class="tabular-nums">{{ formatNumber(rowValue(row).output_tokens) }}</span></template>
              <template #amount-cell="{ row }"><span class="font-mono font-semibold tabular-nums text-[var(--ui-text-highlighted)]">−{{ formatCredits(Math.abs(Number(rowValue(row).amount) || 0)) }}</span></template>
              <template #balance_after-cell="{ row }"><span class="font-mono">{{ formatCredits(rowValue(row).balance_after) }}</span></template>
            </AppTable>
          </div>
          <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span class="text-[var(--ui-text-muted)]">Showing {{ chargeRangeStart }}–{{ chargeRangeEnd }} of {{ formatNumber(chargesTotal) }}</span>
            <div class="flex items-center gap-2">
              <AppButton size="sm" color="neutral" variant="outline" :disabled="chargePage <= 1 || billingLoading" @click="changeChargePage(-1)">Previous</AppButton>
              <span>Page {{ chargePage }} of {{ chargePages }}</span>
              <AppButton size="sm" color="neutral" variant="outline" :disabled="chargePage >= chargePages || billingLoading" @click="changeChargePage(1)">Next</AppButton>
            </div>
          </div>
          </template>
        </AppCard>
          <slot name="balance-history" />
        </div>
    </section>

    <section v-if="section === 'api-keys'" class="workspace-finance workspace-keys space-y-5" aria-labelledby="keys-title">
      <AppCard class="finance-panel keys-panel">
        <div class="flex flex-wrap items-end gap-4">
          <UFormField label="Search" class="min-w-0 flex-1">
            <UInput v-model="keySearch" icon="i-tabler-search" placeholder="Find a key by name or value…" aria-label="Search API keys" size="lg" class="w-full" />
          </UFormField>
          <AppButton icon="i-tabler-plus" size="lg" class="shrink-0 rounded-full" @click="openKeyForm()">Create key</AppButton>
        </div>
        <p class="mt-4 text-xs leading-relaxed text-[var(--ui-text-muted)]">Use a separate key for each app. Keep your keys private and out of public code.</p>
      </AppCard>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="keys-title" class="flex items-center gap-2 text-sm font-semibold"><UIcon name="i-tabler-key" class="size-4 text-[var(--ui-text-muted)]" aria-hidden="true" /> Your keys</h2>
        <span class="rounded-full bg-[var(--ui-bg-muted)] px-3 py-1 text-xs tabular-nums text-[var(--ui-text-muted)]">{{ keysLoading ? '—' : `${filteredKeys.length} of ${keys.length}` }} keys</span>
      </div>
      <div v-if="keysLoading" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading keys" aria-busy="true">
        <USkeleton v-for="index in 3" :key="index" class="h-56 rounded-3xl" />
      </div>
      <div v-else-if="filteredKeys.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <AppCard v-for="key in filteredKeys" :key="key.api_key" class="finance-panel key-card min-w-0" :ui="{ body: 'flex h-full flex-col p-5 sm:p-6' }">
          <span class="finance-icon flex size-10 items-center justify-center rounded-full"><UIcon name="i-tabler-key" class="size-5" aria-hidden="true" /></span>
          <h3 class="mt-3 break-words text-base font-semibold tracking-tight text-[var(--ui-text-highlighted)]">{{ key.display_name || 'Unnamed key' }}</h3>
          <div class="mt-1 flex min-w-0 items-center gap-2">
            <code class="min-w-0 break-all text-xs text-[var(--ui-text-muted)]">{{ maskKey(key.api_key) }}</code>
            <AppButton type="button" size="xs" class="shrink-0" color="neutral" variant="ghost" icon="i-tabler-copy" :aria-label="`Copy ${maskKey(key.api_key)}`" @click="copyKey(key.api_key)" />
          </div>
          <dl class="my-4 space-y-2 text-xs">
            <div class="flex flex-wrap justify-between gap-2"><dt class="text-[var(--ui-text-muted)]">Created</dt><dd>{{ formatDate(key.created_at) }}</dd></div>
            <div class="flex flex-wrap justify-between gap-2"><dt class="text-[var(--ui-text-muted)]">Updated</dt><dd>{{ formatDate(key.updated_at || key.created_at) }}</dd></div>
          </dl>
          <div class="mt-auto flex items-center justify-between gap-3 border-t border-[var(--ui-border)] pt-3">
            <AppButton color="primary" variant="ghost" size="sm" class="rounded-full" icon="i-tabler-pencil" :aria-label="`Edit ${key.display_name || 'key'}`" @click="openKeyForm(key)">Edit key</AppButton>
            <AppButton color="error" variant="ghost" size="sm" class="rounded-full" icon="i-tabler-trash" :aria-label="`Delete ${key.display_name || 'key'}`" @click="confirmKeyDelete(key)">Delete</AppButton>
          </div>
        </AppCard>
      </div>
      <div v-else class="flex flex-col items-center px-5 py-12 text-center">
        <span class="finance-icon mb-4 flex size-12 items-center justify-center rounded-2xl"><UIcon :name="keys.length ? 'i-tabler-search' : 'i-tabler-key'" class="size-6" aria-hidden="true" /></span>
        <h2 class="text-sm font-semibold">{{ keys.length ? 'No matching keys' : 'Connect your first app' }}</h2>
        <p class="mt-2 max-w-sm text-sm text-[var(--ui-text-muted)]">{{ keys.length ? 'Try another name or key value to find what you need.' : 'Create a client access key to authenticate requests to your CPA endpoint.' }}</p>
        <AppButton v-if="keys.length" class="mt-5 rounded-full" color="neutral" variant="soft" size="sm" @click="keySearch = ''">Clear search</AppButton>
      </div>

    </section>

    <section v-if="section === 'settings'" class="workspace-settings min-w-0 space-y-5" aria-labelledby="security-title">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="security-title" class="text-base font-semibold tracking-tight">Sign-in & recovery</h1>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">Manage your password, recovery email, and secure sign-in methods.</p>
        </div>
        <AppButton to="/app/profile" color="neutral" variant="ghost" size="sm" class="rounded-full" trailing-icon="i-tabler-arrow-right">View profile</AppButton>
      </div>
      <div class="settings-layout">
        <nav class="settings-nav" aria-label="Security sections">
          <a v-for="item in settingsSections" :key="item.id" :href="`#${item.id}`" class="settings-nav-link" @click.prevent="scrollToSection(item.id)">
            <UIcon :name="item.icon" class="size-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span class="settings-nav-dot" :class="item.done ? 'settings-nav-dot--on' : ''" :title="item.done ? 'Configured' : 'Not configured'" />
          </a>
        </nav>
        <div class="min-w-0 space-y-4">
        <AppCard id="settings-password" class="settings-panel min-w-0">
          <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-lock" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">Password</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">Changing your password refreshes the active session.</p></div></div></template>
          <form class="space-y-4" @submit.prevent="changePassword">
            <UAlert v-if="passwordError" color="error" variant="subtle" :description="passwordError" />
            <UFormField label="New password" required><UInput v-model="passwordForm.password" type="password" autocomplete="new-password" class="w-full" /></UFormField>
            <UFormField label="Confirm password" required><UInput v-model="passwordForm.confirm" type="password" autocomplete="new-password" class="w-full" /></UFormField>
            <div class="flex justify-end"><AppButton type="submit" :loading="passwordSaving">Change password</AppButton></div>
          </form>
        </AppCard>

        <AppCard id="settings-email" class="settings-panel min-w-0">
          <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-mail" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">Recovery email</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ emailDetail }}</p></div></div></template>
          <form v-if="capabilities.email_verification !== false" class="space-y-4" @submit.prevent="updateEmail">
            <UAlert v-if="emailError" color="error" variant="subtle" :description="emailError" />
            <UFormField label="Email address" required><UInput v-model="email" type="email" autocomplete="email" class="w-full" :disabled="capabilities.email_verification === false" /></UFormField>
            <div class="flex flex-wrap justify-end gap-2">
              <AppButton v-if="user?.email_status.configured" type="button" color="error" variant="soft" :loading="emailSaving" @click="clearEmail">Remove email</AppButton>
              <AppButton v-if="user?.email_status.configured && !user?.email_status.verified" type="button" color="neutral" variant="outline" :loading="emailSaving" @click="requestVerification">Resend verification</AppButton>
              <AppButton type="submit" :loading="emailSaving" :disabled="capabilities.email_verification === false">Save and verify</AppButton>
            </div>
          </form>
        </AppCard>

        <AppCard id="settings-totp" class="settings-panel min-w-0">
          <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-device-mobile" class="size-5" aria-hidden="true" /></span><div class="min-w-0"><h2 class="text-sm font-semibold">Authenticator app</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">{{ user?.totp_enabled ? 'TOTP is enabled for this account.' : 'Add a time-based one-time password.' }}</p></div></div>
              <UBadge :color="user?.totp_enabled ? 'success' : 'neutral'" variant="subtle">{{ user?.totp_enabled ? 'Enabled' : 'Not enabled' }}</UBadge>
            </div>
          </template>
          <div class="space-y-4">
            <UAlert v-if="totpError" color="error" variant="subtle" :description="totpError" />
            <div class="flex flex-wrap gap-2">
              <AppButton color="primary" variant="soft" :loading="totpLoading" @click="showTOTP(false)">{{ user?.totp_enabled ? 'View setup' : 'Set up authenticator' }}</AppButton>
              <AppButton v-if="user?.totp_enabled || totpSetup" color="neutral" variant="ghost" :loading="totpLoading" @click="showTOTP(true)">Regenerate setup</AppButton>
              <AppButton v-if="user?.totp_enabled" color="error" variant="soft" @click="openTOTPDelete">Disable TOTP</AppButton>
            </div>
            <form v-if="totpSetup" class="settings-setup min-w-0 space-y-4 rounded-xl border p-4" @submit.prevent="bindTOTP">
              <p class="text-sm text-[var(--ui-text-muted)]">Open the setup link in a compatible authenticator or enter the raw secret manually, then confirm a current code.</p>
              <div>
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)]">Raw secret</p>
                <div class="mt-1 flex items-start gap-2"><code class="min-w-0 flex-1 break-all text-sm font-semibold">{{ totpSetup.secret }}</code><AppButton type="button" icon="i-tabler-clipboard" color="neutral" variant="ghost" size="xs" aria-label="Copy TOTP secret" @click="copyText(totpSetup.secret, 'TOTP secret copied')" /></div>
              </div>
              <div v-if="totpSetup.otp_auth_url">
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)]">Authenticator setup link</p>
                <a :href="totpSetup.otp_auth_url" class="mt-1 block break-all text-sm text-primary-500 underline underline-offset-2">{{ totpSetup.otp_auth_url }}</a>
                <p class="mt-1 text-xs text-[var(--ui-text-dimmed)]">No QR encoder is bundled, so the standard otpauth link is provided directly.</p>
              </div>
              <UFormField label="Verification code" required><UInput v-model="totpCode" class="w-full font-mono tracking-[0.3em]" inputmode="numeric" autocomplete="one-time-code" /></UFormField>
              <div class="flex justify-end"><AppButton type="submit" :loading="totpSaving">{{ user?.totp_enabled ? 'Confirm regenerated setup' : 'Enable TOTP' }}</AppButton></div>
            </form>
          </div>
        </AppCard>

        <AppCard id="settings-passkeys" class="settings-panel settings-passkeys min-w-0 overflow-hidden" :ui="{ body: 'p-0' }">
          <template #header><div class="flex items-start gap-3"><span class="settings-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><UIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><div><h2 class="text-sm font-semibold">Passkeys</h2><p class="mt-1 text-xs leading-relaxed text-[var(--ui-text-muted)]">Use a device authenticator or hardware security key.</p></div></div></template>
          <div class="settings-passkey-form">
            <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="addPasskey">
              <UFormField label="Passkey name" hint="Optional" class="min-w-0 flex-1"><UInput v-model="passkeyName" class="w-full" placeholder="MacBook Touch ID" /></UFormField>
              <AppButton type="submit" icon="i-tabler-fingerprint" :loading="passkeySaving">Add passkey</AppButton>
            </form>
            <UAlert v-if="passkeyError" class="mt-4" color="error" variant="subtle" :description="passkeyError" />
          </div>
          <div v-if="user?.passkeys?.length" class="overflow-x-auto">
            <AppTable :data="user?.passkeys || []" :columns="passkeyColumns" empty="No passkeys registered." class="min-w-[560px]">
              <template #empty><div class="flex flex-col items-center gap-2 py-6 text-center"><span class="settings-icon mb-1 flex size-10 items-center justify-center rounded-xl"><UIcon name="i-tabler-fingerprint" class="size-5" aria-hidden="true" /></span><p class="text-sm font-medium text-[var(--ui-text-highlighted)]">No passkeys yet</p><p class="max-w-xs text-xs leading-relaxed text-[var(--ui-text-muted)]">Add a passkey above to sign in with your device or a hardware security key.</p></div></template>
              <template #name-cell="{ row }"><span class="font-medium">{{ row.original.name || 'Unnamed passkey' }}</span></template>
              <template #created_at-cell="{ row }">{{ formatDate(row.original.created_at) }}</template>
              <template #updated_at-cell="{ row }">{{ formatDate(row.original.updated_at) }}</template>
              <template #actions-cell="{ row }">
                <div class="flex justify-end"><AppButton icon="i-tabler-trash" color="error" variant="ghost" size="sm" :aria-label="`Delete ${row.original.name || 'passkey'}`" @click="confirmPasskeyDelete(row.original)" /></div>
              </template>
            </AppTable>
          </div>
          <p v-else class="settings-passkey-empty text-xs text-[var(--ui-text-muted)]">No passkeys yet. Add one to sign in with your device.</p>
        </AppCard>
        </div>
      </div>
    </section>

    <AppModal v-model:open="keyFormOpen" :title="editingKey ? 'Edit client access key' : 'Create client access key'" :description="editingKey ? 'Rename the key or change its value. Existing scopes remain unchanged.' : 'Give the key a name; leave its value blank to generate a secure one.'">
      <template #body>
        <form class="space-y-5" @submit.prevent="saveKey">
          <div class="flex items-start gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-muted)] p-4"><UIcon name="i-tabler-shield-lock" class="mt-0.5 size-5 shrink-0 text-[var(--ui-primary)]" aria-hidden="true" /><p class="text-xs leading-relaxed text-[var(--ui-text-muted)]">Use a descriptive name to identify this client. Keep the key private; anyone with its value can use it to authenticate requests.</p></div>
          <UAlert v-if="keyFormError" color="error" variant="subtle" :description="keyFormError" />
          <UFormField label="Name" hint="Optional; up to 128 characters"><UInput v-model="keyName" icon="i-tabler-tag" class="w-full" maxlength="128" placeholder="e.g. My laptop" /></UFormField>
          <UFormField label="Key" :hint="editingKey ? 'Leave unchanged to keep this key' : 'Optional; blank is generated by the server'">
            <UInput v-model="keyValue" icon="i-tabler-key" class="w-full font-mono" autocomplete="off" />
          </UFormField>

          <div class="flex justify-end gap-2"><AppButton type="button" color="neutral" variant="ghost" @click="closeKeyForm">Cancel</AppButton><AppButton type="submit" :loading="keySaving">{{ editingKey ? 'Save key' : 'Create key' }}</AppButton></div>
        </form>
      </template>
    </AppModal>

    <AppModal v-model:open="keyDeleteOpen" title="Delete client access key?" description="Clients using this key will immediately lose access.">
      <template #body><div class="space-y-5"><p class="break-all text-sm">Delete <code>{{ keyDeleteTarget ? maskKey(keyDeleteTarget.api_key) : '' }}</code>?</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="keyDeleting" @click="closeKeyDelete">Cancel</AppButton><AppButton color="error" icon="i-tabler-trash" :loading="keyDeleting" @click="deleteKey">Delete key</AppButton></div></div></template>
    </AppModal>

    <AppModal v-model:open="totpDeleteOpen" title="Disable authenticator app?" description="Your account will no longer require authenticator codes after this change.">
      <template #body><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="totpDeleting" @click="closeTOTPDelete">Cancel</AppButton><AppButton color="error" :loading="totpDeleting" @click="deleteTOTP">Disable TOTP</AppButton></div></template>
    </AppModal>

    <AppModal v-model:open="passkeyDeleteOpen" title="Delete passkey?" description="The selected authenticator will no longer be accepted for this account.">
      <template #body><div class="space-y-5"><p class="text-sm">Delete {{ passkeyDeleteTarget?.name || 'this passkey' }}?</p><div class="flex justify-end gap-2"><AppButton color="neutral" variant="ghost" :disabled="passkeyDeleting" @click="closePasskeyDelete">Cancel</AppButton><AppButton color="error" :loading="passkeyDeleting" @click="deletePasskey">Delete passkey</AppButton></div></div></template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceState } from '~/composables/useWorkspaceState'
const props = withDefaults(defineProps<{ section?: 'dashboard' | 'api-keys' | 'settings' | 'billing' }>(), { section: 'dashboard' })
const section = computed(() => props.section)

type BillingRange = { from: string; to: string }
type WorkspaceBillingOverview = BillingOverview & {
  request_count?: number
  input_tokens?: number
  output_tokens?: number
  cache_tokens?: number
  total_charge_amount?: number
}
type BillingChargesResponse = { items?: BillingCharge[]; data?: BillingCharge[]; total?: number; limit?: number; offset?: number }
type TOTPSetup = { secret: string; otp_auth_url?: string; issuer?: string; enabled?: boolean }
type WorkspaceKey = Omit<UserApiKey, 'id'> & { id: number | null; index: number }
type PeriodWindowStatus = { id: string; enabled: boolean; limit: number | null; used: number; remaining: number | null; active: boolean; reset_at?: string | null }
type PeriodLimitsStatus = { windows?: PeriodWindowStatus[] }

const dashboardMetricIcons = ['i-tabler-calendar-stats', 'i-tabler-sun', 'i-tabler-calendar-month', 'i-tabler-activity']

const toast = useToast()
const { currentUser: user, fetchAPI, loadCurrentUser, saveSession, capabilities, serverInfo, loadCapabilities, registerPasskey } = useUserApi()

const curlExample = computed(() => {
  const url = new URL(serverInfo.value.cpa_public_url || 'https://api.gonkagate.com/v1')
  const basePath = url.pathname.replace(/\/+$/, '')
  url.pathname = `${basePath.endsWith('/v1') ? basePath : `${basePath}/v1`}/chat/completions`
  url.search = ''
  url.hash = ''
  const endpoint = url.toString().replace(/'/g, "'\\''")
  return [
    `curl '${endpoint}' \\`,
    '  -H "Authorization: Bearer gp-..." \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "model": "<model-id>",',
    '    "messages": [{"role": "user", "content": "Hello"}]',
    "  }'"
  ].join('\n')
})

const pageError = useWorkspaceState('user:workspace:page-error', () => '')
const keys = useWorkspaceState<WorkspaceKey[]>('user:workspace:keys', () => [])
const keySearch = ref('')
const filteredKeys = computed(() => {
  const query = keySearch.value.trim().toLowerCase()
  if (!query) return keys.value
  return keys.value.filter(key =>
    (key.display_name || 'Unnamed key').toLowerCase().includes(query) ||
    key.api_key.toLowerCase().includes(query)
  )
})
const keysLoading = useWorkspaceState('user:workspace:keys-loading', () => false)
const selectedOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:selected-overview', () => null)
const todayOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:today-overview', () => null)
const monthOverview = useWorkspaceState<WorkspaceBillingOverview | null>('user:workspace:month-overview', () => null)
const charges = useWorkspaceState<BillingCharge[]>('user:workspace:charges', () => [])
const chargesTotal = useWorkspaceState('user:workspace:charges-total', () => 0)
const billingLoading = useWorkspaceState('user:workspace:billing-loading', () => false)
const billingError = useWorkspaceState('user:workspace:billing-error', () => '')
const periodLimits = useWorkspaceState<PeriodLimitsStatus | null>('user:workspace:period-limits', () => null)

let billingRequest = 0

const rangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Custom', value: 'custom' }
]
const pageSizeOptions = [5, 20, 50, 100].map(value => ({ label: String(value), value }))
const rangePreset = ref('today')
const rangeFrom = ref('')
const rangeTo = ref('')
const appliedRange = ref<BillingRange>(presetRange('today'))
const chargePage = ref(1)
const chargePageSize = ref(5)
const chargePages = computed(() => Math.max(1, Math.ceil(chargesTotal.value / chargePageSize.value)))
const chargeRangeStart = computed(() => chargesTotal.value ? (chargePage.value - 1) * chargePageSize.value + 1 : 0)
const chargeRangeEnd = computed(() => Math.min(chargePage.value * chargePageSize.value, chargesTotal.value))
const topModels = computed(() => (selectedOverview.value?.top_models || []).slice(0, 5))
const activePeriodWindows = computed(() => (periodLimits.value?.windows || []).filter(window => window.enabled && window.limit != null))

const keyFormOpen = ref(false)
const keyFormError = useWorkspaceState('user:workspace:key-form-error', () => '')
const keySaving = useWorkspaceState('user:workspace:key-saving', () => false)
const editingKey = ref<WorkspaceKey | null>(null)
const keyValue = ref('')
const keyName = ref('')
const keyDeleteOpen = ref(false)
const keyDeleteTarget = ref<WorkspaceKey | null>(null)
const keyDeleting = useWorkspaceState('user:workspace:key-deleting', () => false)

const passwordForm = reactive({ password: '', confirm: '' })
const passwordError = useWorkspaceState('user:workspace:password-error', () => '')
const passwordSaving = useWorkspaceState('user:workspace:password-saving', () => false)
const email = ref('')
const emailError = useWorkspaceState('user:workspace:email-error', () => '')
const emailSaving = useWorkspaceState('user:workspace:email-saving', () => false)
const totpSetup = useWorkspaceState<TOTPSetup | null>('user:workspace:totp-setup', () => null)
const totpCode = ref('')
const totpError = useWorkspaceState('user:workspace:totp-error', () => '')
const totpLoading = useWorkspaceState('user:workspace:totp-loading', () => false)
const totpSaving = useWorkspaceState('user:workspace:totp-saving', () => false)
const totpDeleteOpen = ref(false)
const totpDeleting = useWorkspaceState('user:workspace:totp-deleting', () => false)
const passkeyName = ref('')
const passkeyError = useWorkspaceState('user:workspace:passkey-error', () => '')
const passkeySaving = useWorkspaceState('user:workspace:passkey-saving', () => false)
const passkeyDeleteOpen = ref(false)
const passkeyDeleteTarget = ref<UserPasskey | null>(null)
const passkeyDeleting = useWorkspaceState('user:workspace:passkey-deleting', () => false)


const passkeyColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'created_at', header: 'Created' },
  { accessorKey: 'updated_at', header: 'Updated' },
  { id: 'actions', header: 'Actions', meta: { class: { th: 'text-right', td: 'text-right' } } }
]

const chargeColumns = [
  { accessorKey: 'created_at', header: 'Time' },
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'model', header: 'Model' },
  { accessorKey: 'input_tokens', header: 'Input tokens' },
  { accessorKey: 'output_tokens', header: 'Output tokens' },
  { accessorKey: 'amount', header: 'Charge' },
  { accessorKey: 'balance_after', header: 'Balance after' }
]



const billingMetrics = computed(() => [
  { label: 'Selected range', value: formatCredits(selectedOverview.value?.total_charge_amount ?? selectedOverview.value?.today_spend), detail: `${appliedRange.value.from} – ${appliedRange.value.to}` },
  { label: 'Today', value: formatCredits(todayOverview.value?.total_charge_amount ?? todayOverview.value?.today_spend), detail: 'Credits charged today' },
  { label: 'This month', value: formatCredits(monthOverview.value?.total_charge_amount ?? monthOverview.value?.month_spend), detail: 'Credits charged this calendar month' },
  { label: 'Requests', value: formatNumber(selectedOverview.value?.request_count), detail: `${formatNumber(selectedOverview.value?.input_tokens)} input · ${formatNumber(selectedOverview.value?.output_tokens)} output tokens` }
])

const settingsSections = computed(() => [
  { id: 'settings-password', label: 'Password', icon: 'i-tabler-lock', done: true },
  { id: 'settings-email', label: 'Recovery email', icon: 'i-tabler-mail', done: Boolean(user.value?.email_status?.verified) },
  { id: 'settings-totp', label: 'Authenticator app', icon: 'i-tabler-device-mobile', done: Boolean(user.value?.totp_enabled) },
  { id: 'settings-passkeys', label: 'Passkeys', icon: 'i-tabler-fingerprint', done: Boolean(user.value?.passkey_count) }
])
function scrollToSection(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

const dashboardUsageMetrics = computed(() => [
  { label: 'Credits spent', value: formatCredits(selectedOverview.value?.total_charge_amount ?? selectedOverview.value?.today_spend), icon: 'i-tabler-coins' },
  { label: 'Requests', value: formatNumber(selectedOverview.value?.request_count), icon: 'i-tabler-arrows-exchange' },
  { label: 'Input tokens', value: formatCompactNumber(selectedOverview.value?.input_tokens), icon: 'i-tabler-arrow-bar-to-right' },
  { label: 'Output tokens', value: formatCompactNumber(selectedOverview.value?.output_tokens), icon: 'i-tabler-arrow-bar-to-left' }
])
const limitAlert = computed(() => {
  const highest = Math.max(0, ...activePeriodWindows.value.map(periodWindowRatio))
  if (!activePeriodWindows.value.length) return null
  if (highest >= 1) return { label: 'Limit reached', color: 'error' as const }
  if (highest >= 0.8) return { label: 'Near limit', color: 'warning' as const }
  return null
})
const dashboardStatusLine = computed(() => {
  if (limitAlert.value?.color === 'error') return 'A spending limit has been reached. Requests may be blocked until it resets.'
  if (limitAlert.value) return 'You are close to a spending limit. Keep an eye on the reset time below.'
  if (user.value && Number(user.value.credits) <= 0) return 'Your balance is empty. Top up to keep sending requests.'
  return 'Everything you need to start sending requests is right here.'
})

const emailDetail = computed(() => {
  if (capabilities.value.email_verification === false) return 'Email recovery is not enabled on this Home server.'
  if (!user.value?.email_status.configured) return 'No recovery email configured.'
  return `${user.value.email_status.masked} · ${user.value.email_status.verified ? 'verified' : 'verification pending'}`
})

function presetRange(preset: string): BillingRange {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  if (preset === 'month') start.setUTCDate(1)
  else start.setUTCDate(start.getUTCDate() - (preset === '30d' ? 29 : preset === '7d' ? 6 : 0))
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}
function overviewValue(response: any): WorkspaceBillingOverview {
  return (response?.overview && typeof response.overview === 'object' ? response.overview : response || {}) as WorkspaceBillingOverview
}
function rowValue(row: any): BillingCharge { return row?.original ?? row }

function isObject(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function keyEntries(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isObject(payload)) return []
  for (const name of ['api_keys', 'api-keys', 'items', 'data']) {
    const value = payload[name]
    if (Array.isArray(value)) return value
    if (isObject(value)) {
      const nested = keyEntries(value)
      if (nested.length) return nested
    }
  }
  return []
}
function numericArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(Number).filter(item => Number.isInteger(item) && item > 0)
}
function normalizeKey(entry: unknown, index: number): WorkspaceKey | null {
  const source = isObject(entry) ? entry : {}
  const value = String(typeof entry === 'string' ? entry : source.api_key ?? source['api-key'] ?? source.key ?? source.value ?? '').trim()
  if (!value) return null
  const numericID = Number(source.id ?? source.api_key_id ?? source['api-key-id'])
  return {
    id: Number.isInteger(numericID) && numericID > 0 ? numericID : null,
    index,
    api_key: value,
    display_name: typeof source.display_name === 'string' ? source.display_name.trim() || null : null,
    channels: numericArray(source.channels),
    model_groups: numericArray(source.model_groups ?? source['model-groups']),
    created_at: typeof source.created_at === 'string' ? source.created_at : undefined,
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : undefined
  }
}
function errorMessage(error: any, fallback: string) { return error?.data?.message || error?.data?.error || error?.message || fallback }
function periodWindowLabel(id: string) { return id === '5h' ? '5 hours' : id === '1d' ? '1 day' : id === '7d' ? '7 days' : id === '30d' ? '1 month' : id }
function periodWindowRatio(window: PeriodWindowStatus) { const limit = Number(window.limit); return limit > 0 ? Math.max(0, Math.min(1, Number(window.used || 0) / limit)) : 1 }
function periodWindowColor(window: PeriodWindowStatus) { const ratio = periodWindowRatio(window); return ratio >= 1 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ratio >= 0.8 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400' }
function periodWindowBarColor(window: PeriodWindowStatus) { const ratio = periodWindowRatio(window); return ratio >= 1 ? 'bg-red-600 dark:bg-red-400' : ratio >= 0.8 ? 'bg-amber-600 dark:bg-amber-400' : 'bg-violet-600 dark:bg-violet-400' }
function formatPercent(value: number) { return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }

async function loadPeriodLimits() {
  try { periodLimits.value = await fetchAPI<PeriodLimitsStatus>('/period-limits') }
  catch (error: any) { if (error?.statusCode !== 404) throw error; periodLimits.value = null }
}


async function loadKeys() {
  keysLoading.value = true
  try {
    const response = await fetchAPI<any>('/api-keys')
    keys.value = keyEntries(response).map(normalizeKey).filter((item): item is WorkspaceKey => Boolean(item))
  } finally {
    keysLoading.value = false
  }
}
async function loadDashboardBilling() {
  billingLoading.value = true
  billingError.value = ''
  try {
    const request = ++billingRequest
    const [selectedResponse, todayResponse, monthResponse] = await Promise.all([
      fetchAPI<any>('/billing/overview', { query: appliedRange.value }),
      fetchAPI<any>('/billing/overview', { query: presetRange('today') }),
      fetchAPI<any>('/billing/overview', { query: presetRange('month') })
    ])
    if (request !== billingRequest) return
    todayOverview.value = overviewValue(todayResponse)
    selectedOverview.value = overviewValue(selectedResponse)
    monthOverview.value = overviewValue(monthResponse)
  } catch (error: any) {
    billingError.value = errorMessage(error, 'Unable to load usage summary.')
  } finally {
    billingLoading.value = false
  }
}
async function loadBilling() {
  if (section.value === 'dashboard') return loadDashboardBilling()
  const request = ++billingRequest
  const selected = appliedRange.value
  const today = presetRange('today')
  const month = presetRange('month')
  const limit = chargePageSize.value
  const offset = (chargePage.value - 1) * limit
  billingLoading.value = true
  billingError.value = ''
  try {
    const [selectedResponse, todayResponse, monthResponse, chargesResponse] = await Promise.all([
      fetchAPI<any>('/billing/overview', { query: selected }),
      fetchAPI<any>('/billing/overview', { query: today }),
      fetchAPI<any>('/billing/overview', { query: month }),
      fetchAPI<BillingChargesResponse>('/billing/charges', { query: { ...selected, limit, offset } })
    ])
    if (request !== billingRequest) return
    selectedOverview.value = overviewValue(selectedResponse)
    todayOverview.value = overviewValue(todayResponse)
    monthOverview.value = overviewValue(monthResponse)
    charges.value = Array.isArray(chargesResponse?.items) ? chargesResponse.items : Array.isArray(chargesResponse?.data) ? chargesResponse.data : []
    chargesTotal.value = Number(chargesResponse?.total) || 0
  } catch (error: any) {
    if (request === billingRequest) billingError.value = errorMessage(error, 'Unable to load billing activity.')
  } finally {
    if (request === billingRequest) billingLoading.value = false
  }
}
async function loadWorkspace() {
  pageError.value = ''
  const tasks: Promise<unknown>[] = []
  if (section.value === 'billing') tasks.push(loadBilling())
  else {
    tasks.push(loadCapabilities(), loadCurrentUser())
    if (section.value === 'api-keys') tasks.push(loadKeys())
    if (section.value === 'dashboard') tasks.push(loadPeriodLimits(), loadDashboardBilling())
  }
  const results = await Promise.allSettled(tasks)
  const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
  if (failures.length) pageError.value = failures.map(result => errorMessage(result.reason, 'Unable to load workspace data.')).join(' · ')
  email.value = ''
}
function selectRange(preset: string) {
  if (preset === 'custom') {
    rangeFrom.value = appliedRange.value.from
    rangeTo.value = appliedRange.value.to
    return
  }
  appliedRange.value = presetRange(preset)
  chargePage.value = 1
  void loadBilling()
}
function applyBillingRange() {
  if (!rangeFrom.value || !rangeTo.value || rangeFrom.value > rangeTo.value) {
    billingError.value = 'Choose valid From and To dates, with From on or before To.'
    return
  }
  appliedRange.value = { from: rangeFrom.value, to: rangeTo.value }
  chargePage.value = 1
  void loadBilling()
}
function changePageSize() {

  chargePage.value = 1
  void loadBilling()
}
function changeChargePage(delta: number) {
  const next = chargePage.value + delta
  if (next < 1 || next > chargePages.value) return
  chargePage.value = next
  void loadBilling()
}

function openKeyForm(key?: WorkspaceKey) {
  editingKey.value = key || null
  keyValue.value = key?.api_key || ''
  keyName.value = key?.display_name || ''
  keyFormError.value = ''
  keyFormOpen.value = true
}
function closeKeyForm() { keyFormOpen.value = false }
function closeKeyDelete() { keyDeleteOpen.value = false }
function openTOTPDelete() { totpDeleteOpen.value = true }
function closeTOTPDelete() { totpDeleteOpen.value = false }
function closePasskeyDelete() { passkeyDeleteOpen.value = false }
async function saveKey() {
  keyFormError.value = ''
  const nextValue = keyValue.value.trim()
  const nextName = keyName.value.trim()
  if ([...nextName].length > 128) {
    keyFormError.value = 'Name must be 128 characters or fewer.'
    return
  }
  if (editingKey.value && !nextValue) {
    keyFormError.value = 'A non-empty key is required when editing.'
    return
  }
  keySaving.value = true
  try {
    if (editingKey.value) {
      if (editingKey.value.id != null) {
        await fetchAPI(`/api-keys/${editingKey.value.id}`, { method: 'PATCH', body: { api_key: nextValue, display_name: nextName } })
      } else {
        await fetchAPI('/api-keys', { method: 'PATCH', body: { old: editingKey.value.api_key, new_api_key: nextValue, display_name: nextName } })
      }
    } else {
      await fetchAPI('/api-keys', { method: 'POST', body: { ...(nextValue ? { api_key: nextValue } : {}), display_name: nextName } })
    }
    keyFormOpen.value = false
    await loadKeys()
    toast.add({ title: editingKey.value ? 'Client key updated' : 'Client key created', color: 'success' })
  } catch (error: any) {
    keyFormError.value = errorMessage(error, 'Unable to save the client key.')
  } finally {
    keySaving.value = false
  }
}
function confirmKeyDelete(key: WorkspaceKey) {
  keyDeleteTarget.value = key
  keyDeleteOpen.value = true
}
async function deleteKey() {
  const target = keyDeleteTarget.value
  if (!target) return
  keyDeleting.value = true
  try {
    if (target.id != null) await fetchAPI(`/api-keys/${target.id}`, { method: 'DELETE', body: {} })
    else await fetchAPI('/api-keys', { method: 'DELETE', body: { api_key: target.api_key } })
    keyDeleteOpen.value = false
    keyDeleteTarget.value = null
    await loadKeys()
    toast.add({ title: 'Client key deleted', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'Delete failed', description: errorMessage(error, 'Unable to delete the client key.'), color: 'error' })
  } finally {
    keyDeleting.value = false
  }
}

async function changePassword() {
  passwordError.value = ''
  if (!passwordForm.password) return void (passwordError.value = 'Enter a new password.')
  if (passwordForm.password !== passwordForm.confirm) return void (passwordError.value = 'Passwords do not match.')
  passwordSaving.value = true
  try {
    const session = await fetchAPI<UserSessionResponse>('/password', { method: 'POST', body: { new_password: passwordForm.password } })
    saveSession(session)
    passwordForm.password = ''
    passwordForm.confirm = ''
    toast.add({ title: 'Password changed', color: 'success' })
  } catch (error: any) {
    passwordError.value = errorMessage(error, 'Unable to change the password.')
  } finally {
    passwordSaving.value = false
  }
}
async function updateEmail() {
  emailError.value = ''
  const value = email.value.trim()
  if (!value) return void (emailError.value = 'Enter a recovery email address.')
  emailSaving.value = true
  try {
    await fetchAPI('/email', { method: 'PUT', body: { email: value } })
    await fetchAPI('/email/verification', { method: 'POST', body: {} })
    await loadCurrentUser()
    email.value = ''
    toast.add({ title: 'Recovery email saved', description: 'A verification email has been queued.', color: 'success' })
  } catch (error: any) {
    emailError.value = errorMessage(error, 'Unable to update the recovery email.')
  } finally {
    emailSaving.value = false
  }
}
async function clearEmail() {
  emailError.value = ''
  emailSaving.value = true
  try {
    await fetchAPI('/email', { method: 'DELETE', body: {} })
    await loadCurrentUser()
    email.value = ''
    toast.add({ title: 'Recovery email removed', color: 'success' })
  } catch (error: any) {
    emailError.value = errorMessage(error, 'Unable to remove the recovery email.')
  } finally {
    emailSaving.value = false
  }
}
async function requestVerification() {
  emailError.value = ''
  emailSaving.value = true
  try {
    await fetchAPI('/email/verification', { method: 'POST', body: {} })
    toast.add({ title: 'Verification email queued', color: 'success' })
  } catch (error: any) {
    emailError.value = errorMessage(error, 'Unable to request verification.')
  } finally {
    emailSaving.value = false
  }
}
async function showTOTP(regenerate: boolean) {
  totpError.value = ''
  totpLoading.value = true
  try {
    totpSetup.value = await fetchAPI<TOTPSetup>('/totp', { query: { issuer: 'AI48Hub', ...(regenerate ? { regenerate: true } : {}) } })
    totpCode.value = ''
  } catch (error: any) {
    totpError.value = errorMessage(error, 'Unable to load TOTP setup.')
  } finally {
    totpLoading.value = false
  }
}
async function bindTOTP() {
  if (!totpSetup.value) return
  totpError.value = ''
  if (!totpCode.value.trim()) return void (totpError.value = 'Enter the current authenticator code.')
  totpSaving.value = true
  try {
    await fetchAPI('/totp', { method: 'POST', body: { secret: totpSetup.value.secret, issuer: totpSetup.value.issuer || 'AI48Hub', code: totpCode.value.trim() } })
    await loadCurrentUser()
    totpSetup.value = null
    totpCode.value = ''
    toast.add({ title: 'Authenticator setup saved', color: 'success' })
  } catch (error: any) {
    totpError.value = errorMessage(error, 'Unable to save TOTP setup.')
  } finally {
    totpSaving.value = false
  }
}
async function deleteTOTP() {
  totpDeleting.value = true
  try {
    await fetchAPI('/totp', { method: 'DELETE', body: {} })
    await loadCurrentUser()
    totpSetup.value = null
    totpDeleteOpen.value = false
    toast.add({ title: 'Authenticator disabled', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'Unable to disable TOTP', description: errorMessage(error, 'Request failed.'), color: 'error' })
  } finally {
    totpDeleting.value = false
  }
}
async function addPasskey() {
  passkeyError.value = ''
  passkeySaving.value = true
  try {
    await registerPasskey(passkeyName.value.trim())
    passkeyName.value = ''
    toast.add({ title: 'Passkey added', color: 'success' })
  } catch (error: any) {
    passkeyError.value = error?.name === 'NotAllowedError' ? 'Passkey registration was cancelled.' : errorMessage(error, 'Unable to add the passkey.')
  } finally {
    passkeySaving.value = false
  }
}
function confirmPasskeyDelete(passkey: UserPasskey) {
  passkeyDeleteTarget.value = passkey
  passkeyDeleteOpen.value = true
}
async function deletePasskey() {
  const target = passkeyDeleteTarget.value
  if (!target) return
  passkeyDeleting.value = true
  try {
    await fetchAPI(`/passkeys/${encodeURIComponent(target.id)}`, { method: 'DELETE', body: {} })
    await loadCurrentUser()
    passkeyDeleteOpen.value = false
    passkeyDeleteTarget.value = null
    toast.add({ title: 'Passkey deleted', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'Unable to delete passkey', description: errorMessage(error, 'Request failed.'), color: 'error' })
  } finally {
    passkeyDeleting.value = false
  }
}

async function copyKey(value: string) { await copyText(value, 'Client key copied') }
async function copyText(value: string, title: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title, color: 'success' })
  } catch {
    toast.add({ title: 'Copy failed', color: 'error' })
  }
}
function maskKey(value: string) {
  const text = String(value || '')
  return text.length <= 12 ? `${text.slice(0, 3)}***` : `${text.slice(0, 8)}...${text.slice(-4)}`
}

function formatCredits(value: unknown) {
  const number = Number(value)
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, roundingMode: 'ceil' } as Intl.NumberFormatOptions).format(Number.isFinite(number) ? number : 0)
}
function formatCompactNumber(value: unknown) {
  const number = Number(value)
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number.isFinite(number) ? number : 0)
}
function formatNumber(value: unknown) {
  const number = Number(value)
  return new Intl.NumberFormat().format(Number.isFinite(number) ? number : 0)
}
function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—'
}

onMounted(() => {

  void loadWorkspace()
})
</script>

<style scoped>
.workspace-settings { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-settings .settings-panel h2 { font-size: 1rem; letter-spacing: -0.02em; }
.workspace-settings .settings-panel { scroll-margin-top: 1rem; }
.settings-layout { display: grid; gap: 1rem; }
.settings-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0.25rem;
  border: 1px solid var(--user-panel-border);
  border-radius: 0.875rem;
  background: var(--user-panel-bg);
  box-shadow: var(--user-panel-shadow);
}
.settings-nav-link {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.625rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 120ms ease, color 120ms ease;
}
.settings-nav-link:hover { background: var(--ui-hover); color: var(--ui-text-highlighted); }
.settings-nav-link:focus-visible { outline: 2px solid var(--ui-focus); outline-offset: 2px; }
.settings-nav-dot { width: 0.5rem; height: 0.5rem; flex-shrink: 0; border-radius: 9999px; background: var(--ui-border-accented); }
.settings-nav-dot--on { background: var(--ui-success); box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-success) 20%, transparent); }
@media (min-width: 1024px) {
  .settings-layout { grid-template-columns: 15rem minmax(0, 1fr); align-items: start; }
  .settings-nav { position: sticky; top: 0; flex-direction: column; overflow: visible; padding: 0.375rem; }
}
.workspace-settings .settings-icon { border-radius: 0.625rem; }


.workspace-settings .settings-panel :deep([data-slot="header"]) {
  border-bottom: 0;
  padding: 1.5rem 1.5rem 0;
}
.workspace-settings .settings-panel :deep([data-slot="body"]) {
  padding: 1.25rem 1.5rem 1.5rem;
}
.workspace-settings .settings-passkeys :deep([data-slot="body"]) { padding: 0; }
.settings-passkey-form { padding: 1.25rem 1.5rem; }
.settings-passkey-empty { padding: 0 1.5rem 1.5rem; }
@media (min-width: 640px) {
  .workspace-settings .settings-panel :deep([data-slot="header"]) { padding: 1.75rem 1.75rem 0; }
  .workspace-settings .settings-panel :deep([data-slot="body"]) { padding: 1.5rem 1.75rem 1.75rem; }
  .workspace-settings .settings-passkeys :deep([data-slot="body"]) { padding: 0; }
  .settings-passkey-form { padding: 1.5rem 1.75rem; }
  .settings-passkey-empty { padding: 0 1.75rem 1.75rem; }
}

.workspace-settings .settings-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}

.workspace-settings .settings-setup {
  border-color: color-mix(in oklch, var(--ui-primary) 18%, var(--ui-border));
  background: color-mix(in oklch, var(--ui-primary) 4%, var(--ui-bg));
}


.workspace-finance .finance-hero,
.workspace-finance .finance-metric {
  background: radial-gradient(ellipse at 0% 0%, color-mix(in oklch, var(--ui-primary) 9%, transparent), transparent 70%), var(--ui-bg);
  border-color: color-mix(in oklch, var(--ui-primary) 15%, var(--ui-border));
}

.workspace-finance .finance-usage :deep([data-slot="header"]) { border-bottom: 0; padding-bottom: 0; }
.finance-usage h2 { font-size: 1.125rem; letter-spacing: -0.025em; }
.billing-range { padding-block: 0.25rem; }
.billing-stat-strip { align-items: center; padding-block: 0.5rem; }
.billing-stat {
  height: 100%;
  padding: 1rem 1.125rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
}
.billing-stat--featured {
  border-color: color-mix(in oklch, var(--ui-primary) 25%, var(--ui-border));
  background: radial-gradient(ellipse at 100% 0%, color-mix(in oklch, var(--ui-primary) 14%, transparent), transparent 70%), color-mix(in oklch, var(--ui-primary) 5%, var(--user-panel-bg));
}
.billing-stat--featured > p:nth-child(2) { font-size: 2.25rem; line-height: 1.2; }
.billing-stat-icon { color: var(--ui-primary); }
.billing-stat--featured > p:first-child { color: var(--ui-text); }
.billing-models { padding: 0.875rem 1rem; border: 1px solid var(--ui-border); border-radius: 0.875rem; background: var(--user-inset-bg); }
.billing-models summary { list-style: none; border-radius: 0.5rem; }
.billing-models summary::-webkit-details-marker { display: none; }
.billing-models summary:focus-visible { outline: 2px solid var(--ui-primary); outline-offset: 4px; }
.billing-model-chevron { transition: transform 150ms ease; }
.billing-models[open] .billing-model-chevron { transform: rotate(180deg); }
.billing-models > div { margin-top: 1.25rem; }
@media (max-width: 639px) {
  .billing-stat-strip { gap: 0.5rem; }
  .billing-stat { padding: 1rem 0.5rem; }
  .billing-stat--featured { padding: 1rem; }
}

.workspace-keys { max-width: 80rem; margin-inline: auto; padding-block: 0.75rem; }
.workspace-keys .key-card {
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.workspace-keys .key-card:is(:hover, :focus-within) {
  border-color: color-mix(in oklch, var(--ui-primary) 35%, var(--ui-border)) !important;
  box-shadow: 0 12px 28px -14px color-mix(in oklch, var(--ui-primary) 40%, transparent) !important;
}
@media (prefers-reduced-motion: reduce) {
  .workspace-keys .key-card { transition: none; }
}

.workspace-finance .finance-icon {
  color: var(--ui-primary);
  background: var(--user-selected);
}

.user-dashboard {
  --dashboard-accent: var(--ui-primary);
  max-width: 80rem;
  margin-inline: auto;
  padding-block: 0.25rem 1rem;
}

/* Priority layout: connect (how to start) + credits & limits (what is left), then one usage strip. */
.dashboard-bento {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}
.dashboard-bento > * { min-width: 0; }

.dashboard-greeting {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  padding-block: 0.25rem;
}
.dashboard-greeting h1 { font-size: clamp(1.5rem, 2.4vw, 2rem); line-height: 1.2; letter-spacing: -0.03em; }

.dashboard-connect,
.dashboard-credits {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: 1.25rem;
  box-shadow: var(--user-panel-shadow);
}
.dashboard-connect {
  border: 1px solid color-mix(in oklch, var(--brand-from) 24%, var(--user-panel-border));
  background:
    radial-gradient(ellipse 60% 70% at 100% 0%, color-mix(in oklch, var(--brand-to) 11%, transparent), transparent 70%),
    radial-gradient(ellipse 50% 60% at 0% 0%, color-mix(in oklch, var(--brand-from) 9%, transparent), transparent 70%),
    var(--user-panel-bg);
}
.dashboard-connect-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: var(--brand-gradient);
  color: white;
  box-shadow: 0 6px 16px -6px color-mix(in oklch, var(--brand-from) 60%, transparent);
}

.dashboard-steps { display: grid; gap: 0.25rem; }
.dashboard-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding-block: 0.75rem;
}
.dashboard-step:not(:last-child)::before {
  position: absolute;
  top: 2.5rem;
  bottom: -0.5rem;
  left: 0.8125rem;
  width: 2px;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--brand-from) 18%, var(--ui-border));
  content: '';
}
.dashboard-step-index {
  position: relative;
  z-index: 1;
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklch, var(--brand-from) 30%, var(--ui-border));
  border-radius: 9999px;
  background: var(--user-panel-bg);
  color: var(--ui-primary);
  font-size: 0.75rem;
  font-weight: 700;
}
.dashboard-endpoint-field {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.375rem 0.375rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--user-inset-bg);
}
.user-dashboard .dashboard-primary-action {
  background: var(--brand-gradient);
  color: white;
  box-shadow: 0 6px 18px -6px color-mix(in oklch, var(--brand-from) 60%, transparent);
}
.user-dashboard .dashboard-primary-action:hover { filter: brightness(1.06); }

.dashboard-code {
  border: 1px solid var(--color-zinc-800);
  background: var(--color-zinc-950);
  color: var(--color-zinc-200);
}
.dashboard-code > div { border-color: var(--color-zinc-800); color: var(--color-zinc-400); }
.dashboard-code :deep(.dashboard-code-copy) { color: var(--color-zinc-400); }
.dashboard-code :deep(.dashboard-code-copy:hover) { background: var(--color-zinc-800); color: white; }

.dashboard-credits {
  --dashboard-accent: var(--ui-success);
  border: 1px solid color-mix(in oklch, var(--dashboard-accent) 24%, var(--user-panel-border));
  background:
    radial-gradient(ellipse 90% 45% at 100% 0%, color-mix(in oklch, var(--dashboard-accent) 13%, transparent), transparent 70%),
    var(--user-panel-bg);
}
.dashboard-balance-icon {
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--dashboard-accent) 15%, transparent);
  color: var(--dashboard-accent);
}
.dashboard-balance-value { font-size: clamp(2rem, 3vw, 2.5rem); line-height: 1.1; }
.dashboard-limit-list { display: grid; gap: 0.5rem; }
.dashboard-limit {
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
}
.dashboard-credits :deep(.limit-reset) { margin-top: 1rem; padding-block: 1rem 0; border-top: 1px solid var(--ui-border); }

.user-dashboard .dashboard-icon {
  color: var(--dashboard-accent);
  background: color-mix(in oklch, var(--dashboard-accent) 13%, transparent);
}
.user-dashboard .dashboard-panel :deep([data-slot="header"]) { border-bottom: 0; padding-bottom: 0.25rem; }
.user-dashboard .dashboard-panel h2 { font-size: 0.9375rem; letter-spacing: -0.01em; }

.dashboard-usage-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--user-inset-bg);
}
.dashboard-usage-item { padding: 0.875rem 1rem; }
.dashboard-usage-item:nth-child(odd) { border-right: 1px solid var(--ui-border); }
.dashboard-usage-item:nth-child(-n + 2) { border-bottom: 1px solid var(--ui-border); }
.dashboard-usage-icon { color: var(--dashboard-accent); }
.dashboard-metric--0 { --dashboard-accent: var(--ui-primary); }
.dashboard-metric--1 { --dashboard-accent: var(--color-blue-500); }
.dashboard-metric--2 { --dashboard-accent: var(--color-emerald-500); }
.dashboard-metric--3 { --dashboard-accent: var(--color-amber-500); }

@media (min-width: 768px) {
  .dashboard-usage-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .dashboard-usage-item { border-bottom: 0 !important; }
  .dashboard-usage-item:not(:last-child) { border-right: 1px solid var(--ui-border); }
}

@media (min-width: 1024px) {
  .dashboard-bento { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .dashboard-bento > .dashboard-greeting,
  .dashboard-bento > .dashboard-usage { grid-column: 1 / -1; }
  .dashboard-bento > .dashboard-connect { grid-column: span 7; }
  .dashboard-bento > .dashboard-credits { grid-column: span 5; }
}

.period-progress-track {
  background: color-mix(in oklch, var(--ui-text-muted) 16%, var(--ui-bg));
}

</style>
