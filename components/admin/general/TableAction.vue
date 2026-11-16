<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <span class="inline-flex" :tabindex="disabled ? 0 : undefined">
      <AppButton
        type="button"
        size="xs"
        :color="destructive ? 'error' : 'neutral'"
        variant="ghost"
        :icon="resolvedIcon"
        :aria-label="label"
        :title="label"
        :loading="loading"
        :disabled="disabled"
        class="admin-table-action shrink-0 whitespace-nowrap"
        @click="$emit('click', $event)"
      />
      </span>
    </TooltipTrigger>
    <TooltipContent>{{ label }}</TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

const icons = {
  view: 'i-tabler-eye',
  edit: 'i-tabler-pencil',
  copy: 'i-tabler-copy',
  duplicate: 'i-tabler-copy',
  test: 'i-tabler-plug-connected',
  refresh: 'i-tabler-refresh',
  download: 'i-tabler-download',
  remove: 'i-tabler-trash',
  delete: 'i-tabler-trash',
  add: 'i-tabler-plus',
  upload: 'i-tabler-upload',
  retry: 'i-tabler-reload',
  details: 'i-tabler-eye'
} as const

type Action = keyof typeof icons

const props = withDefaults(defineProps<{
  action: Action
  label?: string
  text?: string
  icon?: string
  loading?: boolean
  disabled?: boolean
  destructive?: boolean
}>(), {
  label: '',
  text: '',
  icon: '',
  loading: false,
  disabled: false,
  destructive: false
})

defineEmits<{ click: [event: MouseEvent] }>()

const { t } = useAdminI18n()
const actionLabel = (action: Action) => {
  switch (action) {
    case 'view': return t('common.view')
    case 'edit': return t('common.edit')
    case 'copy': return t('common.copy')
    case 'duplicate': return t('shared.action.duplicate')
    case 'test': return t('shared.action.test')
    case 'refresh': return t('common.refresh')
    case 'download': return t('shared.action.download')
    case 'remove': return t('common.remove')
    case 'delete': return t('common.delete')
    case 'add': return t('common.add')
    case 'upload': return t('shared.action.upload')
    case 'retry': return t('common.retry')
    case 'details': return t('common.details')
    default: return `${String(action).charAt(0).toUpperCase()}${String(action).slice(1)}`
  }
}

const resolvedIcon = computed(() => props.icon || icons[props.action])
// Keep contextual labels available without spending their full length in every row.
const text = computed(() => props.text || actionLabel(props.action))
const label = computed(() => props.label || text.value)
</script>
