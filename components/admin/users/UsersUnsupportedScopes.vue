<template>
  <div class="rounded-xl border border-blue-500/25 bg-blue-500/8 p-4 text-sm">
    <p class="font-medium">{{ t('users.scopesUnavailableTitle') }}</p>
    <p class="mt-1 text-[var(--ui-text-muted)]">{{ t('users.scopesUnavailableDescription') }}</p>
  </div>
</template>

<script setup lang="ts">
const { t } = useAdminI18n()
</script>
