import { computed } from 'vue'
import { useUsersWorkspace } from '~/composables/users/useUsersWorkspace'
import type { AnyRecord } from '~/composables/users/common'

/** Status segments for the users table. Counts are computed once per data change. */
export function useUserSegments() {
  const { t, users, userSegment } = useUsersWorkspace()

  const counts = computed(() => {
    const result = { all: 0, active: 0, approval: 0, topup: 0, deleted: 0 }
    for (const user of users.value) {
      result.all++
      if (user.deleted_at) {
        result.deleted++
        continue
      }
      if (user.approval_pending) result.approval++
      else result.active++
      if (user.pending_topup) result.topup++
    }
    return result
  })

  const segments = computed(() => [
    { value: 'all', label: t('common.all'), tone: 'neutral', count: counts.value.all },
    { value: 'active', label: t('common.active'), tone: 'emerald', count: counts.value.active },
    { value: 'approval', label: t('users.pendingApproval'), tone: 'amber', count: counts.value.approval },
    { value: 'topup', label: t('users.topupRequests'), tone: 'blue', count: counts.value.topup },
    ...(counts.value.deleted ? [{ value: 'deleted', label: t('users.deleted'), tone: 'rose', count: counts.value.deleted }] : [])
  ])

  function inSegment(user: AnyRecord) {
    switch (userSegment.value) {
      case 'active': return !user.deleted_at && !user.approval_pending
      case 'approval': return !user.deleted_at && Boolean(user.approval_pending)
      case 'topup': return !user.deleted_at && Boolean(user.pending_topup)
      case 'deleted': return Boolean(user.deleted_at)
      default: return true
    }
  }

  return { segments, inSegment }
}
