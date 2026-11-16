import { h } from 'vue'
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconOctagonOff } from '@tabler/icons-vue'
import { toast } from 'vue-sonner'

type Color = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type Options = { title: string; description?: string; color?: Color; duration?: number; icon?: string }
const icons: Record<string, any> = {
  'i-tabler-alert-triangle': IconAlertTriangle,
  'i-tabler-circle-check': IconCircleCheck,
  'i-tabler-info-circle': IconInfoCircle,
  'i-tabler-octagon-off': IconOctagonOff,
}
export function useAdminToast() {
  function add(options: Options) {
    const method = options.color === 'error' ? toast.error : options.color === 'warning' ? toast.warning : options.color === 'success' ? toast.success : options.color === 'info' ? toast.info : toast.message
    return method(options.title, {
      description: options.description,
      duration: options.duration === 0 ? Infinity : options.duration,
      ...(options.icon && icons[options.icon] ? { icon: h(icons[options.icon], { class: 'size-4', 'aria-hidden': 'true' }) } : {}),
    })
  }
  return { add, update: toast, remove: toast.dismiss, clear: toast.dismiss }
}
