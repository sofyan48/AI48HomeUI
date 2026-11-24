<script setup lang="ts">
import PortalCheckbox from '~/components/app/general/PortalCheckbox.vue'
import PortalField from '~/components/app/general/PortalField.vue'
import PortalInput from '~/components/app/general/PortalInput.vue'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { toggleMemberModelGroup, type MemberAccessForm } from '~/composables/organizations/memberAccess'

// The parent owns the form; this component edits its access draft in place.
// options is undefined on Home builds without member model groups.
defineProps<{ access: MemberAccessForm, options?: Array<{ id: number, name: string }>, disabled?: boolean }>()

const { t } = usePortalI18n()
</script>

<template>
  <div class="grid gap-4">
    <PortalField v-if="options" :label="t('org.memberModelGroups')" :help="t('org.memberModelGroupsHint')">
      <div class="grid gap-1 rounded-2xl border border-[var(--ui-border)] p-2">
        <p v-if="!options.length" class="px-1 py-2 text-sm text-[var(--ui-text-muted)]">{{ t('org.noModelGroups') }}</p>
        <template v-else>
          <p class="px-1 text-xs text-[var(--ui-text-muted)]">{{ access.modelGroups.length ? t('org.modelGroupsSelected', { count: access.modelGroups.length }) : t('org.inheritModelGroups') }}</p>
          <div class="grid max-h-44 gap-1 overflow-y-auto">
            <PortalCheckbox
              v-for="group in options"
              :key="group.id"
              :model-value="access.modelGroups.includes(group.id)"
              :label="group.name"
              :disabled="disabled"
              class="rounded-xl px-2 py-1.5"
              @update:model-value="toggleMemberModelGroup(access, group.id, $event === true)"
            />
          </div>
        </template>
      </div>
    </PortalField>
    <PortalField :label="t('org.maxKeys')" :help="t('org.maxKeysHint')">
      <PortalInput v-model="access.maxApiKeys" inputmode="numeric" placeholder="∞" class="w-full" :disabled="disabled" />
    </PortalField>
  </div>
</template>
