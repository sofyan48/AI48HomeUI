import { computed, ref } from 'vue'
import { apiErrorMessage } from './format.js'

/** Request event detail dialog state for the admin logs page. */
export function useEventDetail({ fetchAPI, t, useWorkspaceState, errorMessage }) {
  const eventDetailOpen = ref(false)
  const eventDetailLoading = useWorkspaceState('admin:logs:eventDetailLoading', () => (false))
  const selectedEvent = useWorkspaceState('admin:logs:selectedEvent', () => (null))

  const hasEventError = computed(() => {
    const error = selectedEvent.value?.event?.error
    return Boolean(error?.message || error?.reason || error?.body_preview)
  })

  const openEventDetail = async (event) => {
    if (!event?.id) return
    eventDetailOpen.value = true
    eventDetailLoading.value = true
    selectedEvent.value = null
    errorMessage.value = ''
    try {
      selectedEvent.value = await fetchAPI(`/request-events/${encodeURIComponent(event.id)}?include_payload=true&include_logs=true&include_related=true`)
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('logs.loadEventFailed'))
      eventDetailOpen.value = false
    } finally {
      eventDetailLoading.value = false
    }
  }

  return { eventDetailOpen, eventDetailLoading, selectedEvent, hasEventError, openEventDetail }
}
