<template>
  <form class="flex flex-wrap items-center gap-2" @submit.prevent="emit('apply')">
    <AdminSelect
      :model-value="preset"
      :items="rangeOptions"
      value-key="value"
      label-key="label"
      icon="i-tabler-calendar"
      :aria-label="t('billing.filter.timeRange')"
      class="w-40"
      @update:model-value="onPreset"
    />
    <template v-if="preset === 'custom'">
      <AdminInput v-model="filters.from" type="date" :max="filters.to || undefined" :aria-label="t('billing.filter.fromDate')" class="w-40" />
      <span class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.filter.to') }}</span>
      <AdminInput v-model="filters.to" type="date" :min="filters.from || undefined" :aria-label="t('billing.filter.toDate')" class="w-40" />
    </template>
    <span v-else-if="filters.from || filters.to" class="hidden text-xs tabular-nums text-[var(--ui-text-muted)] md:inline">{{ filters.from || '…' }} – {{ filters.to || '…' }}</span>

    <span class="mx-1 hidden h-5 w-px bg-[var(--ui-border)] sm:block" aria-hidden="true" />

    <OrganizationScopeFilter v-if="organizationScope && 'organization' in filters" v-model:organization="filters.organization" v-model:member="filters.member" :scope="organizationScope" :with-member="'member' in filters" class="w-full sm:w-auto" />
    <AdminInputMenu v-if="'user' in filters && !filters.organization" v-model="filters.user" :items="userOptions" create-item :placeholder="t('billing.filter.allUsers')" icon="i-tabler-user" :aria-label="t('common.user')" class="w-44" @create="filters.user = $event.trim()" />
    <AdminSearchSelect v-if="'provider' in filters" :model-value="filters.provider || ''" :items="providerItems" :placeholder="t('billing.filter.allProviders')" :aria-label="t('common.provider')" :clear-label="t('common.reset')" :empty-text="t('common.noResults')" class="w-full sm:w-44" @update:model-value="filters.provider = String($event ?? '')" />
    <AdminSearchSelect v-if="'model' in filters" :model-value="filters.model || ''" :items="modelItems" :placeholder="t('billing.filter.allModels')" :aria-label="t('common.model')" :clear-label="t('common.reset')" :empty-text="t('common.noResults')" class="w-full sm:w-52" @update:model-value="filters.model = String($event ?? '')" />

    <div class="ml-auto flex items-center gap-1">
      <AppButton v-if="dirty" type="button" color="neutral" variant="ghost" size="sm" @click="emit('reset')">{{ t('common.reset') }}</AppButton>
      <AppButton type="submit" size="sm" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import AdminSearchSelect from '~/components/admin/general/controls/AdminSearchSelect.vue'
import AdminInputMenu from '~/components/admin/general/controls/AdminInputMenu.vue'
import OrganizationScopeFilter from '~/components/admin/general/OrganizationScopeFilter.vue'
import type { OrganizationScope } from '~/composables/organizations/useOrganizationScope'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
type Filters = { from: string; to: string; user?: string; organization?: string; member?: string; provider?: string; model?: string }
const props = defineProps<{
  preset: string
  rangeOptions: { label: string; value: string }[]
  userOptions?: string[]
  providerOptions?: string[]
  modelOptions?: string[]
  organizationScope?: OrganizationScope
  loading?: boolean
}>()
const { t } = useAdminI18n()
const filters = defineModel<Filters>('filters', { required: true })
// Preserve selected historical values when refreshed data narrows the suggestions.
function searchItems(values: string[] | undefined, selected: string | undefined, label: string) {
  const options = [...new Set([...(values || []), selected].filter((value): value is string => Boolean(value)))].sort()
  return [{ label, value: '' }, ...options.map(value => ({ label: value, value }))]
}
const providerItems = computed(() => searchItems(props.providerOptions, filters.value.provider, t('billing.filter.allProviders')))
const modelItems = computed(() => searchItems(props.modelOptions, filters.value.model, t('billing.filter.allModels')))
const emit = defineEmits<{ 'update:preset': [value: string]; range: [value: string]; apply: []; reset: [] }>()
const dirty = computed(() => props.preset !== '7d' || Boolean(filters.value.user || filters.value.organization || filters.value.provider || filters.value.model))
// The organization is the billed owner; a stale user filter would otherwise be hidden but still look applied after clearing.
watch(() => filters.value.organization, value => { if (value && 'user' in filters.value) filters.value.user = '' })
function onPreset(value: string) {
  emit('update:preset', value)
  emit('range', value)
}
</script>
