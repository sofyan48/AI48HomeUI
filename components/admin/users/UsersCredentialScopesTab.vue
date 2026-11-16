<template>
  <AdminDataPanel :title="t('users.credentialScopes')" :description="t('users.scopesCount', { count: filteredGroups.length })" content-class="p-4">
    <template #actions>
      <AppButton v-if="accessGroupsSupported" size="sm" icon="i-tabler-plus" @click="emit('create')">{{ t('users.newCredentialScope') }}</AppButton>
    </template>
    <UsersUnsupportedScopes v-if="!accessGroupsSupported" />
    <UsersGroupCards
      v-else
      kind="channel"
      :groups="filteredGroups"
      :details="channelDetailsData"
      :channel-groups="channelGroups"
      :channel-bindings-supported="modelChannelBindingsSupported"
      @edit="emit('edit', $event)"
      @delete="emit('delete', $event)"
      @add="emit('bind', $event)"
      @delete-detail="emit('deleteDetail', $event)"
    />
  </AdminDataPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UsersGroupCards from './UsersGroupCards.vue'
import UsersUnsupportedScopes from './UsersUnsupportedScopes.vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'

const emit = defineEmits<{
  create: []
  edit: [group: AnyRecord]
  delete: [group: AnyRecord]
  bind: [group: AnyRecord]
  deleteDetail: [detail: AnyRecord]
}>()

const {
  t, accessGroupsSupported, modelChannelBindingsSupported, channelGroups, channelDetailsData, matches, channelDetailsFor
} = useUsersWorkspace()

const filteredGroups = computed(() => channelGroups.value.filter(group => matches([
  group.id, group.channel_name, ...channelDetailsFor(group.id).map(item => item.auth_id)
])))
</script>
