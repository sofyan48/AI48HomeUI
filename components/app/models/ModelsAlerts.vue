<template>
  <UAlert v-if="capabilityError" color="warning" variant="subtle" :title="t('models.capabilityErrorTitle')" :description="t('models.capabilityErrorDescription', { error: capabilityError })" />
  <UAlert v-if="error" color="error" variant="subtle" :title="t('models.loadErrorTitle')" :description="error" />
  <UAlert v-if="accessibleWarning" color="warning" variant="subtle" :title="t('models.accessWarningTitle')" :description="t('models.accessWarningDescription', { warning: accessibleWarning })" />

  <UAlert v-if="token && accessLoaded && access?.reason === 'no_api_keys'" color="warning" variant="subtle" :title="t('models.noKeysTitle')" :description="t('models.noKeysDescription')" />
  <UAlert v-else-if="token && accessLoaded && access?.restricted" color="info" variant="subtle" :title="t('models.restrictedTitle')" :description="t('models.restrictedDescription', { count: access.api_key_count })" />
</template>

<script setup lang="ts">
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useModelsWorkspace } from '~/composables/models/useModelsWorkspace'

const { t } = usePortalI18n()
const { token, error, capabilityError, accessibleWarning, access, accessLoaded } = useModelsWorkspace()
</script>
