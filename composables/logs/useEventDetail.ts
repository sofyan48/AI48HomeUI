import { computed, ref } from 'vue'
import { apiErrorMessage } from './format'
import type { LogActionDependencies, RequestEvent, RequestEventDetail } from './types'

/** Request event detail dialog state for the admin logs page. */
export function useEventDetail({ fetchAPI, t, useWorkspaceState, errorMessage }: LogActionDependencies) {
  const eventDetailOpen = ref(false)
  const eventDetailLoading = useWorkspaceState('admin:logs:eventDetailLoading', () => (false))
  const selectedEvent = useWorkspaceState<RequestEventDetail | null>('admin:logs:selectedEvent', () => (null))

  const hasEventError = computed(() => {
    const error = selectedEvent.value?.event?.error
    return Boolean(error?.message || error?.reason || error?.body_preview)
  })

  const openEventDetail = async (event: Pick<RequestEvent, 'id'> | null | undefined) => {
    if (!event?.id) return
    eventDetailOpen.value = true
    eventDetailLoading.value = true
    selectedEvent.value = null
    errorMessage.value = ''
    try {
      selectedEvent.value = await fetchAPI<RequestEventDetail>(`/request-events/${encodeURIComponent(event.id)}?include_payload=true&include_logs=true&include_related=true`)
    } catch (error) {
      errorMessage.value = apiErrorMessage(error, t('logs.loadEventFailed'))
      eventDetailOpen.value = false
    } finally {
      eventDetailLoading.value = false
    }
  }

  return { eventDetailOpen, eventDetailLoading, selectedEvent, hasEventError, openEventDetail }
}
