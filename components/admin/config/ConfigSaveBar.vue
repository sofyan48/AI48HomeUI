<template>
    <AppCard
      v-if="loaded"
      :ui="{
        body: 'flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between',
      }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="subtle"
          >{{ t('config.footer.runtime', { mode: runtimeMode }) }}</UBadge
        >
        <UBadge color="neutral" variant="subtle"
          >{{ t('config.footer.updated', { time: updatedLabel }) }}</UBadge
        >
        <UBadge :color="dirtyCount ? 'warning' : 'neutral'" variant="subtle">{{
          dirtyCount ? t('config.footer.changes', { count: dirtyCount }) : t('config.footer.noChanges')
        }}</UBadge>
        <UBadge v-if="validationCount" color="warning" variant="subtle"
          >{{ t('config.footer.attention', { count: validationCount }) }}</UBadge
        >
      </div>
      <div class="flex flex-wrap gap-2">
        <AdminConfigYamlReplacement :disabled="loading || saving || dirtyCount > 0" @saved="loadWorkspace()" />
        <AppButton
          color="neutral"
          variant="outline"
          :disabled="!dirtyCount"
          @click="changesOpen = true"
          >{{ t('config.footer.viewChanges') }}</AppButton
        >
        <AppButton
          color="neutral"
          variant="outline"
          icon="i-tabler-refresh"
          :loading="loading"
          :disabled="saving"
          @click="reloadWorkspace"
          >{{ t('common.reload') }}</AppButton
        >
        <AppButton
          icon="i-tabler-check"
          :loading="saving"
          :disabled="!dirtyCount || validationCount > 0 || loading || saveNeedsReload"
          @click="saveWorkspace"
          >{{ t('common.save') }}</AppButton
        >
      </div>
    </AppCard>
</template>

<script setup lang="ts">
import AdminConfigYamlReplacement from './ConfigYamlReplacement.vue'
import { useConfigWorkspace } from '~/composables/config/useConfigWorkspace'
const {
  t, loaded, runtimeMode, updatedLabel, dirtyCount, validationCount, loading,
  saving, loadWorkspace, changesOpen, reloadWorkspace, saveNeedsReload, saveWorkspace,
} = useConfigWorkspace()
</script>
