import { h } from 'vue'
import { IconCircleCheck, IconClock } from '@tabler/icons-vue'
import { toast } from 'vue-sonner'

export type PortalToastOptions = {
  title: string
  description?: string
  color?: 'success' | 'error' | 'warning' | 'info' | 'progress'
  duration?: number
  icon?: 'i-tabler-circle-check' | 'i-tabler-clock'
}

const icons = {
  'i-tabler-circle-check': IconCircleCheck,
  'i-tabler-clock': IconClock,
}

export function usePortalToast() {
  function add({ title, description, color, duration, icon }: PortalToastOptions) {
    const notify = color === 'progress' ? toast.warning : color ? toast[color] : toast.message
    return notify(title, {
      description,
      // Nuxt's duration: 0 means persistent; Sonner uses Infinity instead.
      duration: duration === 0 ? Infinity : duration,
      ...(color === 'progress' && !icon ? { icon: h(IconClock, { class: 'size-4', 'aria-hidden': 'true' }) } : {}),
      ...(icon ? { icon: h(icons[icon], { class: 'size-4', 'aria-hidden': 'true' }) } : {}),
    })
  }
  return { add }
}
