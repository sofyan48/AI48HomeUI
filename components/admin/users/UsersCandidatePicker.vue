<template>
  <div class="grid gap-2">
    <p class="text-sm font-medium">{{ kind === 'credential' ? t('users.accountCredential') : t('common.model') }}</p>
    <UInput
      :model-value="search"
      icon="i-tabler-search"
      :disabled="mutating || pending"
      :placeholder="kind === 'credential' ? t('users.searchCredentialPlaceholder') : t('users.searchModelPlaceholder')"
      @update:model-value="$emit('update:search', $event)"
      @keydown.enter.prevent.stop="selectFirst($event)"
    />
    <div class="flex flex-col gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="kind === 'model'" class="flex flex-wrap items-center gap-1.5">
        <span class="mr-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.source') }}</span>
        <AppButton
          v-for="filter in [{ label: t('common.all'), value: 'all' }, { label: t('users.sourceRuntime'), value: 'available' }, { label: t('users.sourceStatic'), value: 'static' }]"
          :key="filter.value"
          type="button"
          size="xs"
          color="neutral"
          :variant="sourceFilter === filter.value ? 'soft' : 'outline'"
          :disabled="mutating || pending"
          @click="$emit('update:source-filter', filter.value)"
        >
          {{ filter.label }}
        </AppButton>
      </div>
      <span v-else class="text-xs text-[var(--ui-text-muted)]">{{ t('users.currentResults', { count: visible.length }) }}</span>
      <span class="text-xs text-[var(--ui-text-muted)]">{{ kind === 'credential' ? t('users.credentialsSelected', { count: selected.length }) : t('users.modelsSelected', { count: selected.length }) }}</span>
    </div>
    <div v-if="pending" class="grid gap-2 rounded-md border border-[var(--ui-border)] p-2">
      <USkeleton v-for="row in 3" :key="row" class="h-14" />
    </div>
    <div v-else-if="errorMessage" class="rounded-md border border-red-300 bg-red-50 px-3 py-3 dark:border-red-900 dark:bg-red-950">
      <p class="text-sm text-red-700 dark:text-red-300">{{ errorMessage }}</p>
      <AppButton type="button" size="sm" color="neutral" variant="outline" icon="i-tabler-refresh" class="mt-3" @click="$emit('retry')">{{ t('common.retry') }}</AppButton>
    </div>
    <div v-else-if="!visible.length" class="rounded-md border border-[var(--ui-border)] px-3 py-6 text-center text-sm text-[var(--ui-text-muted)]">
      {{ search.trim() ? (kind === 'credential' ? t('users.noCredentialsMatch') : t('users.noModelsMatch')) : (kind === 'credential' ? t('users.noCredentialsAvailable') : t('users.noModelsAvailable')) }}
    </div>
    <div v-else class="grid gap-2">
      <div v-if="issueMessage" class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">{{ issueMessage }}</div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-1.5">
          <AppButton type="button" size="xs" color="neutral" variant="outline" :disabled="mutating || !enabledVisible.length || allEnabledVisibleSelected" @click="selectResults">{{ t('users.selectResults') }}</AppButton>
          <AppButton type="button" size="xs" color="neutral" variant="outline" :disabled="mutating || !enabledVisible.length" @click="invert">{{ t('users.invertResults') }}</AppButton>
          <AppButton type="button" size="xs" color="neutral" variant="ghost" :disabled="mutating || !selected.length" @click="$emit('update:selected', []); $emit('clear-error')">{{ t('users.clearSelection') }}</AppButton>
        </div>
        <span class="text-xs text-[var(--ui-text-muted)]">{{ t('users.currentResults', { count: visible.length }) }}</span>
      </div>
      <div class="grid max-h-72 gap-1 overflow-y-auto rounded-md border border-[var(--ui-border)] p-1.5">
        <label
          v-for="item in visible"
          :key="item.id"
          :class="['flex min-w-0 items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors', selected.includes(item.value) ? 'bg-[var(--ui-primary)]/10 ring-1 ring-[var(--ui-primary)]/35' : 'hover:bg-[var(--ui-bg-muted)]', (mutating || item.disabled) ? 'cursor-not-allowed opacity-55' : '']"
        >
          <UCheckbox class="mt-0.5" :model-value="selected.includes(item.value)" :disabled="mutating || item.disabled" @update:model-value="toggle(item.value)" />
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-1.5">
              <span class="truncate text-sm font-medium">{{ item.label }}</span>
              <UBadge v-for="badge in item.badges" :key="badge" :color="badge === 'Available' || badge === 'Bound' ? 'success' : 'neutral'" variant="subtle" size="sm">{{ badgeLabel(badge) }}</UBadge>
            </span>
            <span class="mt-1 block truncate font-mono text-xs text-[var(--ui-text-muted)]">{{ item.description }}</span>
          </span>
        </label>
      </div>
    </div>
    <p class="text-xs leading-5 text-[var(--ui-text-muted)]">{{ kind === 'credential' ? t('users.credentialPickerHint') : t('users.modelPickerHint') }}</p>
  </div>
</template>

<script>
import { useAdminI18n } from '~/composables/useAdminI18n'

export default {
  props: ['kind', 'items', 'selected', 'search', 'sourceFilter', 'pending', 'issueMessage', 'errorMessage', 'mutating'],
  emits: ['update:search', 'update:source-filter', 'update:selected', 'retry', 'clear-error'],
  setup() {
    const { t } = useAdminI18n()
    // Badge values stay English internally (they drive badge colors); translate only for display.
    const badgeLabel = badge => badge === 'Available' ? t('users.badgeAvailable') : badge === 'Bound' ? t('users.badgeBound') : badge === 'Unavailable' ? t('users.badgeUnavailable') : badge === 'Static catalog' ? t('users.badgeStaticCatalog') : badge
    return { t, badgeLabel }
  },
  computed: {
    visible() {
      const query = String(this.search || '').trim().toLowerCase()
      return this.items.filter(item => (this.kind !== 'model' || this.sourceFilter === 'all' || item.scopes.includes(this.sourceFilter)) && (!query || (this.kind === 'model' ? [item.label, item.modelId, item.ownedBy, item.type, item.channel, ...(item.scopes || [])] : [item.label, item.value, item.provider, item.type, item.status]).some(value => String(value || '').toLowerCase().includes(query))))
    },
    enabledVisible() {
      return this.visible.filter(item => !item.disabled)
    },
    allEnabledVisibleSelected() {
      return this.enabledVisible.length > 0 && this.enabledVisible.every(item => this.selected.includes(item.value))
    }
  },
  methods: {
    toggle(value) {
      const item = this.items.find(candidate => candidate.value === value)
      if (this.mutating || item?.disabled) return
      const next = this.selected.includes(value) ? this.selected.filter(item => item !== value) : [...this.selected, value]
      this.$emit('update:selected', next)
      this.$emit('clear-error')
    },
    selectResults() {
      if (!this.enabledVisible.length || this.allEnabledVisibleSelected) return
      this.$emit('update:selected', [...new Set([...this.selected, ...this.enabledVisible.map(item => item.value)])])
      this.$emit('clear-error')
    },
    invert() {
      if (!this.enabledVisible.length) return
      const next = new Set(this.selected)
      for (const item of this.enabledVisible) next.has(item.value) ? next.delete(item.value) : next.add(item.value)
      this.$emit('update:selected', [...next])
      this.$emit('clear-error')
    },
    selectFirst(event) {
      if (event?.isComposing) return
      const first = this.enabledVisible[0]
      if (first) this.toggle(first.value)
    }
  }
}
</script>
