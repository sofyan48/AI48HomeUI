<template>
  <section class="grid gap-5">
    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      :title="t('config.page.attention')"
      :description="pageError"
    />

    <div v-if="loading && !loaded" class="grid gap-4">
      <USkeleton class="h-28 w-full" />
      <USkeleton class="h-64 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else class="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <ConfigOutline />
      <div class="min-w-0">
        <ConfigMobileOutline />
        <AdminConfigVisualSections
          v-model:draft="draft"
          :validation-errors="validationErrors"
          :loading="loading || saving"
        >
          <template #oauth-rules>
            <ConfigOAuthRules />
          </template>
          <template #proxy-pool
            ><div id="config-proxy-pool"><AdminConfigProxyPool /></div
          ></template>
          <template #payload>
            <AdminConfigSharedUpstream
              v-model:draft="draft"
              :sections="displaySharedSections"
              :validation-errors="validationErrors"
              :loading="loading || saving"
              class="mb-6"
            />
            <ConfigPayloadRules />
          </template>
        </AdminConfigVisualSections>
      </div>
    </div>

    <ConfigSaveBar />
    <ConfigReviewDialogs />
    <ConfigPayloadDialog />
  </section>
</template>

<script setup lang="ts">
import AdminConfigVisualSections from '~/components/admin/config/ConfigVisualSections.vue'
import AdminConfigSharedUpstream from '~/components/admin/config/ConfigSharedUpstream.vue'
import AdminConfigProxyPool from '~/components/admin/config/ConfigProxyPool.vue'
import ConfigOutline from '~/components/admin/config/ConfigOutline.vue'
import ConfigMobileOutline from '~/components/admin/config/ConfigMobileOutline.vue'
import ConfigOAuthRules from '~/components/admin/config/ConfigOAuthRules.vue'
import ConfigPayloadRules from '~/components/admin/config/ConfigPayloadRules.vue'
import ConfigSaveBar from '~/components/admin/config/ConfigSaveBar.vue'
import ConfigReviewDialogs from '~/components/admin/config/ConfigReviewDialogs.vue'
import ConfigPayloadDialog from '~/components/admin/config/ConfigPayloadDialog.vue'
import { provideConfigWorkspace } from '~/composables/config/useConfigWorkspace'

const {
  t, pageError, loading, loaded, saving, draft, validationErrors, displaySharedSections,
} = provideConfigWorkspace()
</script>
