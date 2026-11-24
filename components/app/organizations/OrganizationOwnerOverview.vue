<script setup lang="ts">
import { usePortalOrganizations } from '~/composables/organizations-portal/usePortalOrganizations'

const { t, summary, members, keys } = usePortalOrganizations()
defineEmits<{ navigate: [tab: 'members' | 'keys' | 'charges'] }>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-3">
    <AppCard tinted>
      <dl class="flex flex-col gap-2">
        <dt class="text-xs text-muted-foreground">{{ t('org.balance') }}</dt>
        <dd class="text-3xl font-semibold tracking-tight tabular-nums">{{ summary?.credits_unlimited ? '∞' : summary?.credits ?? '—' }}</dd>
      </dl>
      <p class="mt-3 text-xs leading-relaxed text-muted-foreground">{{ t('org.topupHint') }}</p>
    </AppCard>
    <AppCard>
      <dl class="flex flex-col gap-2">
        <dt class="text-xs text-muted-foreground">{{ t('org.membersTitle') }}</dt>
        <dd class="text-3xl font-semibold tracking-tight tabular-nums">{{ members.length }}</dd>
      </dl>
      <AppButton class="mt-3" size="xs" color="neutral" variant="outline" @click="$emit('navigate', 'members')">{{ t('org.tab.members') }}</AppButton>
    </AppCard>
    <AppCard>
      <dl class="flex flex-col gap-2">
        <dt class="text-xs text-muted-foreground">{{ t('org.keysTitle') }}</dt>
        <dd class="text-3xl font-semibold tracking-tight tabular-nums">{{ keys.length }}</dd>
      </dl>
      <AppButton class="mt-3" size="xs" color="neutral" variant="outline" @click="$emit('navigate', 'keys')">{{ t('org.tab.keys') }}</AppButton>
    </AppCard>
  </div>
</template>
