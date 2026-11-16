import { ref } from 'vue'

// Details slide-over target, tab and the generation guard that discards stale detail responses.
export function useAccountDetailsState({ t }) {
  const detailsOpen = ref(false)
  const detailsTarget = ref(null)
  const detailsTab = ref('Overview')
  const detailSections = ['Overview', 'Metadata', 'Quota', 'Concurrency', 'Models', 'Recovery', 'Danger']
  // detailsTab keeps the English section IDs; only the displayed label is translated.
  function detailSectionLabel(section) {
    const labels = { Overview: t('cred.tab.overview'), Metadata: t('cred.tab.metadata'), Quota: t('cred.tab.quota'), Concurrency: t('cred.tab.concurrency'), Models: t('cred.tab.models'), Recovery: t('cred.tab.recovery'), Danger: t('cred.tab.danger') }
    return labels[section] || section
  }
  let detailGeneration = 0
  const currentGeneration = () => detailGeneration
  const bumpGeneration = () => { detailGeneration++ }
  const ownsDetails = (id, generation) => detailsOpen.value && detailsTarget.value?.id === id && detailGeneration === generation
  return { detailsOpen, detailsTarget, detailsTab, detailSections, detailSectionLabel, currentGeneration, bumpGeneration, ownsDetails }
}
