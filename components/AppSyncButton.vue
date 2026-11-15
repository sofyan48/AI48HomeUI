<template>
  <AppButton v-bind="$attrs" color="neutral" variant="outline" size="md" icon="i-tabler-refresh" :loading="loading" :disabled="loading">
    {{ loading ? t('shared.sync.syncing') : t('shared.sync.label') }}
  </AppButton>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ loading?: boolean }>()
const { t } = useAdminI18n()
</script>
