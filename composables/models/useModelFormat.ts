import { usePortalToast } from '~/composables/portal/usePortalToast'
import { usePortalI18n } from '~/composables/usePortalI18n'
import { useUserApi } from '~/composables/useUserApi'
import { formatCatalogPrice, pricingMessageKind, type CatalogModel } from '~/composables/userModelCatalog'
import { componentLabelKeys, unitKeys } from '~/composables/models/catalog'

/** Translated display helpers for the user model catalog. Holds no state, so any component may call it. */
export function useModelFormat() {
  const { t, intlLocale } = usePortalI18n()
  const { token } = useUserApi()
  const toast = usePortalToast()

  async function copyModelId(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      toast.add({ title: t('models.toast.copied'), color: 'success' })
    } catch {
      toast.add({ title: t('models.toast.copyFailed'), color: 'error' })
    }
  }
  function capabilityLabels(model: CatalogModel) {
    const labels: string[] = []
    if (model.capabilities?.reasoning?.status === 'supported') labels.push(t('models.capability.reasoning'))
    if (model.capabilities?.tool_calling?.status === 'supported') labels.push(t('models.capability.tools'))
    if (model.capabilities?.structured_output?.status === 'supported') labels.push(t('models.capability.structuredOutput'))
    for (const modality of model.modalities?.input || []) if (modality !== 'text') labels.push(modality)
    return labels
  }
  function formatTokens(value?: number) { if (!value) return t('models.status.notPublished'); return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value) }
  function availabilityLabel(model: CatalogModel) { const rate = model.availability?.availability_rate; return model.availability?.status === 'observed' && typeof rate === 'number' ? t('models.availability.observed', { rate: (rate * 100).toFixed(1) }) : t('models.availability.insufficient') }
  function modalityText(model: CatalogModel, direction: 'input' | 'output') { return model.modalities?.status === 'known' && model.modalities[direction]?.length ? model.modalities[direction].join(', ') : t('models.status.notPublished') }
  function capabilityText(status?: string) { return status === 'supported' ? t('models.status.supported') : status === 'unsupported' ? t('models.status.unsupported') : t('models.status.notPublished') }
  function duration(ms?: number) { return ms == null ? t('models.status.notPublished') : `${ms.toLocaleString(intlLocale.value)} ms` }
  function dateText(value?: string) { return value ? new Date(value).toLocaleString(intlLocale.value) : t('models.status.notPublished') }
  function providerLimit(value?: number) { return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(intlLocale.value) : t('models.status.notPublished') }
  function modelLimit(model: CatalogModel, field: 'context_length' | 'max_output_tokens') {
    if (model[field]) return formatTokens(model[field])
    const published = (model.provider_limits || []).map(limit => limit[field]).filter((value): value is number => Boolean(value))
    return published.length ? t('models.status.variesByProvider') : t('models.status.notPublished')
  }
  function modelFacts(model: CatalogModel) {
    const notPublished = t('models.status.notPublished')
    return [
      { label: t('models.fact.servingProviders'), value: model.providers?.join(', ') || notPublished },
      { label: t('models.fact.keyAccess'), value: model.accessible === true ? t('models.badge.included') : model.accessible === false ? t('models.badge.notIncluded') : t('models.status.unknown') },
      { label: t('models.fact.modelId'), value: model.id }, { label: t('models.fact.context'), value: modelLimit(model, 'context_length') },
      { label: t('models.fact.maxOutput'), value: modelLimit(model, 'max_output_tokens') }, { label: t('models.fact.version'), value: model.version || notPublished },
      { label: t('models.fact.owner'), value: model.owned_by || notPublished }, { label: t('models.fact.type'), value: model.type || notPublished }
    ]
  }
  function price(value: number | null | undefined) { return formatCatalogPrice(value, { locale: intlLocale.value, notPublished: t('models.status.notPublished'), creditsUnit: t('balance.creditsUnit') }) }
  function pricingText(model: CatalogModel) {
    const kind = pricingMessageKind(model, Boolean(token.value))
    if (kind === 'signIn') return t('models.message.signIn')
    if (kind === 'outsideAccess') return t('models.message.outsideAccess')
    if (kind === 'unavailable') return t('models.message.unavailable')
    return t('models.message.notPublished')
  }
  function componentLabel(label: string) { const key = componentLabelKeys[label]; return key ? t(key) : label }
  function unitLabel(unit: string) { const key = unitKeys[unit]; return key ? t(key) : unit }

  return {
    copyModelId, capabilityLabels, availabilityLabel, modalityText, capabilityText, duration, dateText,
    providerLimit, modelLimit, modelFacts, price, pricingText, componentLabel, unitLabel
  }
}
