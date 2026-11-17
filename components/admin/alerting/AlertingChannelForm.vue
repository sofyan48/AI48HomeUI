<template>
  <AppFormModal
    v-model:open="channelFormOpen"
    :title="editingChannel ? t('alerting.channel.editTitle') : t('alerting.channel.addTitle')"
    :description="t('alerting.channel.formDescription')"
    :error="channelFormError"
    :submit-label="editingChannel ? t('alerting.channel.saveChanges') : t('alerting.channel.create')"
    :loading="channelSaving"
    :locked="channelSaving"
    @submit="saveChannel"
  >
    <AdminField :label="t('common.name')" required>
      <AdminInput v-model="channelForm.name" class="w-full" placeholder="ops-alerts" />
    </AdminField>
    <AdminField :label="t('alerting.channels.col.type')" required>
      <AdminSelect v-model="channelForm.type" :items="typeItems" :disabled="!!editingChannel" class="w-full" />
    </AdminField>

    <template v-if="channelForm.type === 'telegram'">
      <AdminField :label="t('alerting.channel.botToken')" :required="!editingChannel?.bot_token_set" :help="editingChannel?.bot_token_set ? t('alerting.channel.keepSecret', { hint: editingChannel.bot_token_hint }) : t('alerting.channel.botTokenHelp')">
        <AdminInput v-model="channelForm.bot_token" type="password" autocomplete="off" class="w-full" placeholder="123456789:AA..." />
      </AdminField>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminField :label="t('alerting.channel.chatId')" required :help="t('alerting.channel.chatIdHelp')">
          <AdminInput v-model="channelForm.chat_id" class="w-full" placeholder="-1001234567890" />
        </AdminField>
        <AdminField :label="t('alerting.channel.threadId')" :help="t('alerting.channel.threadIdHelp')">
          <AdminInput v-model="channelForm.thread_id" class="w-full" />
        </AdminField>
      </div>
    </template>
    <AdminField v-else :label="t('alerting.channel.webhookUrl')" :required="!editingChannel?.webhook_url_set" :help="editingChannel?.webhook_url_set ? t('alerting.channel.keepSecret', { hint: editingChannel.webhook_url_hint }) : t('alerting.channel.webhookHelp')">
      <AdminInput v-model="channelForm.webhook_url" type="password" autocomplete="off" class="w-full" placeholder="https://....webhook.office.com/..." />
    </AdminField>

    <label class="flex items-center justify-between rounded-lg border border-[var(--ui-border)] p-3">
      <span class="text-sm font-medium">{{ t('common.enabled') }}</span>
      <AdminSwitch v-model="channelForm.enabled" />
    </label>
  </AppFormModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import { useAlertingWorkspace } from '~/composables/alerting/useAlertingWorkspace'

const { t, channelFormOpen, channelForm, channelFormError, channelSaving, editingChannel, saveChannel } = useAlertingWorkspace()

const typeItems = computed(() => [
  { label: t('alerting.channel.type.telegram'), value: 'telegram' },
  { label: t('alerting.channel.type.teams'), value: 'teams' },
])
</script>
