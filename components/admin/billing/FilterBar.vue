<template>
  <form class="flex flex-wrap items-center gap-2" @submit.prevent="emit('apply')">
    <USelect
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
      <UInput v-model="filters.from" type="date" :max="filters.to || undefined" :aria-label="t('billing.filter.fromDate')" class="w-40" />
      <span class="text-xs text-[var(--ui-text-muted)]">{{ t('billing.filter.to') }}</span>
      <UInput v-model="filters.to" type="date" :min="filters.from || undefined" :aria-label="t('billing.filter.toDate')" class="w-40" />
    </template>
    <span v-else-if="filters.from || filters.to" class="hidden text-xs tabular-nums text-[var(--ui-text-muted)] md:inline">{{ filters.from || '…' }} – {{ filters.to || '…' }}</span>

    <span class="mx-1 hidden h-5 w-px bg-[var(--ui-border)] sm:block" aria-hidden="true" />

    <UInputMenu v-if="'user' in filters" v-model="filters.user" :items="userOptions" create-item :placeholder="t('billing.filter.allUsers')" icon="i-tabler-user" :aria-label="t('common.user')" class="w-44" @create="filters.user = $event.trim()" />
    <UInputMenu v-if="'provider' in filters" v-model="filters.provider" :items="providerOptions" create-item :placeholder="t('billing.filter.allProviders')" icon="i-tabler-cloud" :aria-label="t('common.provider')" class="w-44" @create="filters.provider = $event.trim()" />
    <UInputMenu v-if="'model' in filters" v-model="filters.model" :items="modelOptions" create-item :placeholder="t('billing.filter.allModels')" icon="i-tabler-box" :aria-label="t('common.model')" class="w-52" @create="filters.model = $event.trim()" />

    <div class="ml-auto flex items-center gap-1">
      <AppButton v-if="dirty" type="button" color="neutral" variant="ghost" size="sm" @click="emit('reset')">{{ t('common.reset') }}</AppButton>
      <AppButton type="submit" size="sm" icon="i-tabler-filter" :loading="loading">{{ t('common.apply') }}</AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
type Filters = { from: string; to: string; user?: string; provider?: string; model?: string }
const props = defineProps<{
  preset: string
  rangeOptions: { label: string; value: string }[]
  userOptions?: string[]
  providerOptions?: string[]
  modelOptions?: string[]
  loading?: boolean
}>()
const { t } = useAdminI18n()
const filters = defineModel<Filters>('filters', { required: true })
const emit = defineEmits<{ 'update:preset': [value: string]; range: [value: string]; apply: []; reset: [] }>()
const dirty = computed(() => props.preset !== '7d' || Boolean(filters.value.user || filters.value.provider || filters.value.model))
function onPreset(value: string) {
  emit('update:preset', value)
  emit('range', value)
}
</script>
