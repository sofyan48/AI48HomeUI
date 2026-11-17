import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from '#imports'
import { useUserApi } from '~/composables/useUserApi'

const publicPaths = new Set(['/app/login', '/app/register', '/app/forgot-password', '/app/reset-password', '/app/verify-email', '/app/models'])

/** Keep authentication behavior identical across portal layouts. */
export function usePortalSessionGuard() {
  const route = useRoute()
  const router = useRouter()
  const { token, hydrateSession, loadCurrentUser, loadCapabilities, clearSession } = useUserApi()

  const ensureSession = async () => {
    hydrateSession()
    if (publicPaths.has(route.path)) return
    if (!token.value) { await router.replace({ path: '/app/login', query: { redirect: route.fullPath } }); return }
    try { await loadCurrentUser(); await loadCapabilities().catch(() => {}) }
    catch (cause: any) {
      if (cause?.statusCode !== 401 && cause?.code !== 'approval_pending' && token.value) return
      clearSession()
      await router.replace({ path: '/app/login', query: { redirect: route.fullPath } })
    }
  }

  watch(() => route.fullPath, () => { void ensureSession() })
  onMounted(ensureSession)
}
