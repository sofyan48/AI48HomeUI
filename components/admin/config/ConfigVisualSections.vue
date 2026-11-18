<template>
  <div class="space-y-6">
    <PortalAlert
      v-if="loading"
      color="neutral"
      variant="subtle"
      icon="i-tabler-refresh"
      :title="t('config.vs.loadingTitle')"
      :description="t('config.vs.loadingDescription')"
    />

    <template v-for="section in sections" :key="section.id">
    <AppCard :id="`config-${section.id}`">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-[var(--ui-text-highlighted)]">{{ section.title }}</h2>
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">{{ section.description }}</p>
          </div>
          <AppButton
            v-if="section.navigateTo"
            class="shrink-0"
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            trailing-icon="i-tabler-arrow-right"
            @click="emit('navigate', section.navigateTo)"
          >
            {{ t('config.vs.manage') }}
          </AppButton>
        </div>
      </template>

      <div class="divide-y divide-[var(--ui-border-muted)]">
        <template v-for="field in section.fields" :key="field.key">
          <label
            v-if="field.type === 'switch'"
            class="flex items-center justify-between gap-5 px-1 py-3"
            :class="validationClass(field.key)"
          >
            <span class="min-w-0">
              <span class="block text-sm font-medium text-[var(--ui-text-highlighted)]">{{ field.label }}</span>
              <span v-if="field.description" class="mt-1 block text-xs text-[var(--ui-text-muted)]">{{ field.description }}</span>
              <span v-if="errorFor(field.key)" class="mt-2 block text-xs text-[var(--ui-error)]">{{ errorFor(field.key) }}</span>
            </span>
            <AdminSwitch
              :model-value="booleanValue(field.key)"
              :disabled="loading || fieldDisabled(field)"
              :aria-label="field.label"
              @update:model-value="updateField(field.key, $event)"
            />
          </label>

          <AdminField
            v-else
            :label="field.label"
            :description="field.description"
            :hint="field.hint"
            :error="errorFor(field.key)"
            class="grid gap-2 px-1 py-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)] md:items-center"
          >
            <AdminTextarea
              v-if="field.type === 'textarea'"
              :model-value="textValue(field.key)"
              :rows="field.rows || 4"
              :disabled="loading || fieldDisabled(field)"
              :placeholder="field.placeholder"
              class="w-full font-mono text-xs"
              spellcheck="false"
              @update:model-value="updateField(field.key, $event)"
            />
            <AdminSelect
              v-else-if="field.type === 'select'"
              :model-value="textValue(field.key)"
              :items="field.items"
              value-key="value"
              label-key="label"
              :disabled="loading || fieldDisabled(field)"
              class="w-full"
              @update:model-value="updateField(field.key, $event)"
            />
            <div v-else-if="field.type === 'password'" class="flex gap-2">
              <AdminInput
                :model-value="textValue(field.key)"
                :type="secretVisible ? 'text' : 'password'"
                :autocomplete="secretVisible ? 'off' : 'new-password'"
                :disabled="loading || fieldDisabled(field)"
                :placeholder="field.placeholder"
                class="min-w-0 flex-1"
                @update:model-value="updateField(field.key, $event)"
              />
              <AppButton
                type="button"
                color="neutral"
                variant="outline"
                :icon="secretVisible ? 'i-tabler-eye-off' : 'i-tabler-eye'"
                :aria-label="secretVisible ? t('config.vs.hideSecret') : t('config.vs.revealSecret')"
                :disabled="loading"
                @click="toggleSecretVisibility"
              />
            </div>
            <AdminInput
              v-else
              :model-value="inputValue(field.key)"
              :type="field.type"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              :disabled="loading || fieldDisabled(field)"
              :placeholder="field.placeholder"
              class="w-full"
              @update:model-value="updateField(field.key, normalizeInput(field, $event))"
            />
          </AdminField>
        </template>
      </div>
    </AppCard>
    <slot v-if="section.id === 'plugins'" name="oauth-rules" />
    <slot v-if="section.id === 'network'" name="proxy-pool" />
    <slot v-if="section.id === 'retry-routing'" name="payload" />
    </template>
  </div>
</template>

<script setup lang="ts">
import AdminField from '~/components/admin/general/controls/AdminField.vue'
import AdminInput from '~/components/admin/general/controls/AdminInput.vue'
import AdminSelect from '~/components/admin/general/controls/AdminSelect.vue'
import AdminTextarea from '~/components/admin/general/controls/AdminTextarea.vue'
import AdminSwitch from '~/components/admin/general/controls/AdminSwitch.vue'
import PortalAlert from '~/components/app/general/PortalAlert.vue'
type DraftValue = string | number | boolean | null | undefined
type ConfigDraft = Record<string, DraftValue>
type ValidationErrors = Record<string, string | string[] | null | undefined>
type FieldType = 'switch' | 'text' | 'url' | 'number' | 'password' | 'textarea' | 'select'

type Field = {
  key: string
  label: string
  type: FieldType
  description?: string
  hint?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
  rows?: number
  span?: 'full'
  items?: Array<{ label: string; value: string }>
  enabledBy?: string
}

type Section = {
  id: string
  title: string
  description: string
  navigateTo?: string
  fields: Field[]
}

const props = withDefaults(defineProps<{
  validationErrors?: ValidationErrors
  loading?: boolean
}>(), {
  validationErrors: () => ({}),
  loading: false
})

const draft = defineModel<ConfigDraft>('draft', { required: true })
const emit = defineEmits<{
  navigate: [section: string]
}>()

const secretVisible = ref(false)
const { t } = useAdminI18n()

const routingOptions = computed(() => [
  { label: t('config.routing.roundRobin'), value: 'round-robin' },
  { label: t('config.routing.weightedRoundRobin'), value: 'weighted-round-robin' },
  { label: t('config.routing.fillFirst'), value: 'fill-first' }
])

const sections = computed<Section[]>(() => [
  {
    id: 'server',
    title: t('config.vs.server.title'),
    description: t('config.vs.server.description'),
    fields: [
      { key: 'debug', label: t('config.field.debug'), type: 'switch', description: t('config.field.debug.desc') },
      { key: 'port', label: t('config.field.port'), type: 'number', min: 1, max: 65535, step: 1, hint: t('config.field.port.hint') },
            { key: 'cpaPublicUrl', label: t('config.field.cpaPublicUrl'), type: 'url', placeholder: 'https://api.example.com/v1', hint: t('config.field.cpaPublicUrl.hint') }
    ]
  },
  {
    id: 'tls',
    title: t('config.vs.tls.title'),
    description: t('config.vs.tls.description'),
    fields: [
      { key: 'tlsEnable', label: t('config.field.tlsEnable'), type: 'switch', description: t('config.field.tlsEnable.desc') },
      { key: 'tlsCert', label: t('config.field.tlsCert'), type: 'text', placeholder: '/path/to/cert.pem' },
      { key: 'tlsKey', label: t('config.field.tlsKey'), type: 'text', placeholder: '/path/to/key.pem' }
    ]
  },
  {
    id: 'remote-management',
    title: t('config.vs.remote.title'),
    description: t('config.vs.remote.description'),
    fields: [
      { key: 'remoteManagementAllowRemote', label: t('config.field.remoteManagementAllowRemote'), type: 'switch', description: t('config.field.remoteManagementAllowRemote.desc') },
      { key: 'remoteManagementSecretKey', label: t('config.field.remoteManagementSecretKey'), type: 'password', placeholder: t('config.field.remoteManagementSecretKey.placeholder'), hint: t('config.field.remoteManagementSecretKey.hint') },
      { key: 'remoteManagementDisableControlPanel', label: t('config.field.remoteManagementDisableControlPanel'), type: 'switch', description: t('config.field.remoteManagementDisableControlPanel.desc') }
    ]
  },
  {
    id: 'user-email',
    title: t('config.vs.email.title'),
    description: t('config.vs.email.description'),
    fields: [
      { key: 'userEmailEnabled', label: t('config.field.userEmailEnabled'), type: 'switch', description: t('config.field.userEmailEnabled.desc') },
      { key: 'userEmailPublicUrl', label: t('config.field.userEmailPublicUrl'), type: 'url', placeholder: 'https://home.example.com/user.html', hint: t('config.field.userEmailPublicUrl.hint') },
      { key: 'userEmailFromAddress', label: t('config.field.userEmailFromAddress'), type: 'text', placeholder: 'no-reply@example.com', hint: t('config.field.userEmailFromAddress.hint') },
      { key: 'userEmailFromName', label: t('config.field.userEmailFromName'), type: 'text', placeholder: 'AI48Home' },
      { key: 'userEmailSenderType', label: t('config.field.userEmailSenderType'), type: 'select', items: [{ label: 'SMTP', value: 'smtp' }] },
      { key: 'userEmailSmtpHost', label: t('config.field.userEmailSmtpHost'), type: 'text', placeholder: 'smtp.example.com' },
      { key: 'userEmailSmtpPort', label: t('config.field.userEmailSmtpPort'), type: 'number', min: 1, max: 65535, step: 1, hint: t('config.field.userEmailSmtpPort.hint') },
      { key: 'userEmailSmtpUsername', label: t('config.field.userEmailSmtpUsername'), type: 'text', placeholder: 'smtp-user', hint: t('config.field.userEmailSmtpUsername.hint') },
      { key: 'userEmailSmtpPasswordEnv', label: t('config.field.userEmailSmtpPasswordEnv'), type: 'text', placeholder: 'HOME_USER_EMAIL_SMTP_PASSWORD', hint: t('config.field.userEmailSmtpPasswordEnv.hint') },
      { key: 'userEmailSmtpStarttls', label: t('config.field.userEmailSmtpStarttls'), type: 'switch', description: t('config.field.userEmailSmtpStarttls.desc') },
      { key: 'userEmailVerificationTtl', label: t('config.field.userEmailVerificationTtl'), type: 'text', placeholder: '24h', hint: t('config.field.userEmailVerificationTtl.hint') },
      { key: 'userEmailResetTtl', label: t('config.field.userEmailResetTtl'), type: 'text', placeholder: '30m', hint: t('config.field.userEmailResetTtl.hint') }
    ]
  },
  {
    id: 'plugins',
    title: t('config.vs.plugins.title'),
    description: t('config.vs.plugins.description'),
    navigateTo: 'plugins',
    fields: [
      { key: 'pluginsEnabled', label: t('config.field.pluginsEnabled'), type: 'switch', description: t('config.field.pluginsEnabled.desc') },
      { key: 'pluginsDir', label: t('config.field.pluginsDir'), type: 'text', placeholder: 'plugins' },
      { key: 'pluginStoreSourcesJson', label: t('config.field.pluginStoreSourcesJson'), type: 'textarea', rows: 5, span: 'full', hint: t('config.field.pluginStoreSourcesJson.hint'), placeholder: 'https://example.com/plugins/registry.json' }
    ]
  },
  {
    id: 'models',
    title: t('config.vs.models.title'),
    description: t('config.vs.models.description'),
    fields: [
      { key: 'modelsCatalog', label: t('config.field.modelsCatalog'), type: 'text', placeholder: 'https://example.com/models.json', hint: t('config.field.modelsCatalog.hint') },
      { key: 'modelsCodexCatalog', label: t('config.field.modelsCodexCatalog'), type: 'text', placeholder: '/etc/home/codex-models.json', hint: t('config.field.modelsCodexCatalog.hint') },
      { key: 'modelsDevinCatalog', label: t('config.field.modelsDevinCatalog'), type: 'text', placeholder: 'https://example.com/devin-models.json', hint: t('config.field.modelsDevinCatalog.hint') }
    ]
  },
  {
    id: 'logs',
    title: t('config.vs.logs.title'),
    description: t('config.vs.logs.description'),
    fields: [
      { key: 'requestLog', label: t('config.field.requestLog'), type: 'switch', description: t('config.field.requestLog.desc') },

      { key: 'loggingToFile', label: t('config.field.loggingToFile'), type: 'switch', description: t('config.field.loggingToFile.desc') },
      { key: 'logsMaxTotalSizeMb', label: t('config.field.logsMaxTotalSizeMb'), type: 'number', min: 0, step: 1, hint: t('config.field.logsMaxTotalSizeMb.hint') },
      { key: 'errorLogsMaxFiles', label: t('config.field.errorLogsMaxFiles'), type: 'number', min: 0, step: 1, hint: t('config.field.errorLogsMaxFiles.hint') }
    ]
  },
  {
    id: 'network',
    title: t('config.vs.network.title'),
    description: t('config.vs.network.description'),
    navigateTo: 'proxy-network',
    fields: [
      { key: 'proxyUrl', label: t('config.field.proxyUrl'), type: 'url', span: 'full', placeholder: 'http://user:password@proxy.example:8080', hint: t('config.field.proxyUrl.hint') },
      { key: 'tlsHandshakeTimeoutSeconds', label: t('config.field.tlsHandshakeTimeoutSeconds'), type: 'number', min: 0, step: 1, hint: t('config.field.tlsHandshakeTimeoutSeconds.hint'), description: t('config.field.tlsHandshakeTimeoutSeconds.desc') }
    ]
  },
  {
    id: 'quota',
    title: t('config.vs.quota.title'),
    description: t('config.vs.quota.description'),
    navigateTo: 'quota',
    fields: [
      { key: 'quotaSwitchProject', label: t('config.field.quotaSwitchProject'), type: 'switch', description: t('config.field.quotaSwitchProject.desc') },
      { key: 'quotaSwitchPreviewModel', label: t('config.field.quotaSwitchPreviewModel'), type: 'switch', description: t('config.field.quotaSwitchPreviewModel.desc') }
    ]
  },
  {
    id: 'retry-routing',
    title: t('config.vs.routing.title'),
    description: t('config.vs.routing.description'),
    fields: [
      { key: 'requestRetry', label: t('config.field.requestRetry'), type: 'number', min: 0, step: 1 },
      { key: 'maxRetryCredentials', label: t('config.field.maxRetryCredentials'), type: 'number', min: 0, step: 1 },
      { key: 'maxRetryInterval', label: t('config.field.maxRetryInterval'), type: 'number', min: 0, step: 1, hint: t('config.field.maxRetryInterval.hint') },
      { key: 'disableCooling', label: t('config.field.disableCooling'), type: 'switch', description: t('config.field.disableCooling.desc') },
      { key: 'forceModelPrefix', label: t('config.field.forceModelPrefix'), type: 'switch', description: t('config.field.forceModelPrefix.desc') },
      { key: 'routingStrategy', label: t('config.field.routingStrategy'), type: 'select', items: routingOptions.value }
    ]
  },
  {
    id: 'devin',
    title: t('config.vs.devin.title'),
    description: t('config.vs.devin.description'),
    fields: [
      { key: 'devinSensitiveWordsJson', label: t('config.field.devinSensitiveWordsJson'), type: 'textarea', rows: 5, span: 'full', hint: t('config.field.devinSensitiveWordsJson.hint'), placeholder: 'sensitive-word' }
    ]
  },
  {
    id: 'antigravity',
    title: t('config.vs.antigravity.title'),
    description: t('config.vs.antigravity.description'),
    fields: [
      { key: 'antigravitySensitiveWordsJson', label: t('config.field.antigravitySensitiveWordsJson'), type: 'textarea', rows: 5, span: 'full', hint: t('config.field.antigravitySensitiveWordsJson.hint'), placeholder: 'sensitive-word' }
    ]
  }
])

function valueFor(key: string): DraftValue {
  return draft.value?.[key]
}

function textValue(key: string): string {
  const value = valueFor(key)
  return value === null || value === undefined ? '' : String(value)
}

function inputValue(key: string): string | number | undefined {
  const value = valueFor(key)
  return typeof value === 'number' || typeof value === 'string' ? value : undefined
}

function toggleSecretVisibility() {
  secretVisible.value = !secretVisible.value
}

function booleanValue(key: string): boolean {
  return Boolean(valueFor(key))
}

function updateField(key: string, value: DraftValue) {
  draft.value = { ...draft.value, [key]: value }
}

function normalizeInput(field: Field, value: string | number | null | undefined): string | number | null {
  if (field.type !== 'number') return value ?? ''
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? value : number
}

function fieldDisabled(_field: Field): boolean {
  return false
}

function errorFor(key: string): string | undefined {
  const error = props.validationErrors[key]
  if (Array.isArray(error)) return error.filter(Boolean).join(', ') || undefined
  return error || undefined
}

function validationClass(key: string): string {
  return errorFor(key) ? 'bg-[var(--ui-warning)]/5' : ''
}
</script>
