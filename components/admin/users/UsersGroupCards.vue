<template>
  <div v-if="groups.length" class="grid gap-3">
    <div v-for="group in groups" :key="group.id" class="min-w-0">
      <div class="flex flex-col gap-3 border-b border-[var(--ui-border)] p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-medium">{{ groupName(group) }}</p>
            <PortalBadge color="neutral" variant="subtle">{{ t('users.bindingsCount', { count: groupDetails(group).length }) }}</PortalBadge>
            <PortalBadge v-if="group.disabled" color="warning" variant="subtle">{{ t('common.disabled') }}</PortalBadge>
          </div>
          <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ t('users.scopeId', { id: group.id }) }}</p>
        </div>
        <div class="flex gap-1">
          <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-plus" :aria-label="t('users.addBinding')" @click="$emit('add', group)" />
          <AppButton color="neutral" variant="ghost" size="sm" icon="i-tabler-pencil" :aria-label="t('common.edit')" @click="$emit('edit', group)" />
          <AppButton color="error" variant="ghost" size="sm" icon="i-tabler-trash" :aria-label="t('common.delete')" @click="$emit('delete', group)" />
        </div>
      </div>
      <AppCard :ui="{ body: 'p-0' }">
      <AppTable native>
        <table class="text-left text-sm">
          <thead>
            <tr>
              <th class="app-table-number-head">{{ t('users.numberShort') }}</th>
              <th>{{ kind === 'channel' ? t('users.credentialId') : t('users.modelId') }}</th>
              <th v-if="kind === 'model' && channelBindingsSupported">{{ t('users.credentialScope') }}</th>
              <th class="whitespace-nowrap">{{ t('common.updated') }}</th>
              <th class="w-px whitespace-nowrap text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!groupDetails(group).length">
              <td :colspan="kind === 'model' && channelBindingsSupported ? 5 : 4" class="px-4 py-12 text-center text-sm text-muted">{{ t('users.noBindingsYet') }}</td>
            </tr>
            <tr v-for="(detail, index) in groupDetails(group)" :key="detail.id">
              <td class="app-table-number-cell"><span class="app-table-number">{{ index + 1 }}</span></td>
              <td class="min-w-32 max-w-64 truncate font-mono text-xs" :title="target(detail)">{{ target(detail) }}</td>
              <td v-if="kind === 'model' && channelBindingsSupported" class="min-w-32 max-w-64 truncate text-muted" :title="channels(detail)">{{ channels(detail) }}</td>
              <td class="whitespace-nowrap text-muted">{{ updated(detail) }}</td>
              <td class="w-px whitespace-nowrap text-right">
                <AppButton color="error" variant="ghost" size="sm" icon="i-tabler-trash" :aria-label="t('users.removeBinding')" :title="t('users.removeBinding')" @click="$emit('delete-detail', detail)" />
              </td>
            </tr>
          </tbody>
        </table>
      </AppTable>
      </AppCard>
    </div>
  </div>
  <AppEmptyState v-else :icon="kind === 'channel' ? 'i-tabler-layout-grid' : 'i-tabler-cube'" :text="kind === 'channel' ? t('users.noCredentialScopes') : t('users.noModelScopes')" />
</template>

<script>
import PortalBadge from '~/components/app/general/PortalBadge.vue'
import { useAdminI18n } from '~/composables/useAdminI18n'

export default {
  props: ['kind', 'groups', 'details', 'channelGroups', 'channelBindingsSupported'],
  emits: ['edit', 'delete', 'add', 'delete-detail'],
  setup() {
    const { t, intlLocale } = useAdminI18n()
    return { t, intlLocale }
  },
  methods: {
    groupDetails(group) {
      return this.details.filter(item => Number(item[this.kind === 'channel' ? 'channel_group_id' : 'model_group_id']) === Number(group.id) && !item.deleted_at)
    },
    groupName(group) {
      return this.kind === 'channel' ? group.channel_name : group.group_name
    },
    target(detail) {
      return this.kind === 'channel' ? detail.auth_id : detail.model_id
    },
    channels(detail) {
      const ids = detail.channels || []
      return ids.length ? ids.map(id => this.channelGroups.find(group => Number(group.id) === Number(id))?.channel_name || `#${id}`).join(', ') : this.t('users.inheritsKeyScope')
    },
    updated(detail) {
      return detail.updated_at ? new Intl.DateTimeFormat(this.intlLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(detail.updated_at)) : this.t('users.notReturned')
    }
  }
}
</script>
