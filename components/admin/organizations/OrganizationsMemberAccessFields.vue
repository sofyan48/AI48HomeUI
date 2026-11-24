<template>
  <div class="grid gap-4">
    <AdminField :label="t('organizations.member.modelGroups')" :help="t('organizations.member.modelGroupsHelp')">
      <div class="grid gap-2 rounded-md border border-[var(--ui-border)] p-2">
        <div v-if="loading" class="grid gap-2">
          <PortalSkeleton v-for="row in 2" :key="row" class="h-8" />
        </div>
        <p v-else-if="!options.length" class="px-1 py-2 text-sm text-[var(--ui-text-muted)]">{{ t('organizations.modelGroupsEmpty') }}</p>
        <template v-else>
          <div class="flex items-center justify-between gap-2 px-1">
            <span class="text-xs text-[var(--ui-text-muted)]">{{ access.modelGroups.length ? t('organizations.modelGroupsSelected', { count: access.modelGroups.length }) : t('organizations.member.inheritModelGroups') }}</span>
            <AppButton v-if="access.modelGroups.length" type="button" size="xs" color="neutral" variant="ghost" :disabled="disabled" @click="access.modelGroups = []">{{ t('organizations.clearSelection') }}</AppButton>
          </div>
          <div class="grid max-h-48 gap-1 overflow-y-auto">
            <AdminCheckbox
              v-for="group in options"
              :key="group.id"
              :model-value="access.modelGroups.includes(group.id)"
              :label="group.name"
              :disabled="disabled"
              class="rounded-md px-2 py-1.5 hover:bg-[var(--ui-bg-muted)]"
              @update:model-value="toggleMemberModelGroup(access, group.id, $event === true)"
            />
          </div>
        </template>
      </div>
    </AdminField>
    <AdminField :label="t('organizations.member.maxKeys')" :help="t('organizations.member.maxKeysHelp')">
      <AdminInput v-model="access.maxApiKeys" inputmode="numeric" class="w-full" placeholder="∞" :disabled="disabled" />
    </AdminField>
  </div>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminCheckbox from '~/components/admin/general/controls/AdminCheckbox.vue'
import PortalSkeleton from '~/components/app/general/PortalSkeleton.vue'
import { useAdminI18n } from '#imports'
import { toggleMemberModelGroup, type MemberAccessForm } from '~/composables/organizations/memberAccess'

// The parent owns the form; this component edits its access draft in place.
defineProps<{ access: MemberAccessForm, options: Array<{ id: number, name: string }>, loading?: boolean, disabled?: boolean }>()

const { t } = useAdminI18n()
</script>
