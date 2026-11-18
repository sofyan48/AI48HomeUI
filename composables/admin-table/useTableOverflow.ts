import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** Tracks whether a horizontally scrollable element hides content before or after its viewport. */
export function useTableOverflow(target: Ref<HTMLElement | null | undefined>) {
  const overflowStart = ref(false)
  const overflowEnd = ref(false)
  let element: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  let frame = 0

  const measure = () => {
    frame = 0
    if (!element) {
      overflowStart.value = false
      overflowEnd.value = false
      return
    }
    const max = element.scrollWidth - element.clientWidth
    // Sub-pixel layouts leave a fractional remainder; treat it as fully visible.
    overflowStart.value = max > 1 && element.scrollLeft > 1
    overflowEnd.value = max > 1 && element.scrollLeft < max - 1
  }
  const schedule = () => {
    if (!frame && typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(measure)
  }

  const detach = () => {
    element?.removeEventListener('scroll', schedule)
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    resizeObserver = null
    mutationObserver = null
    element = null
  }
  const attach = (next: HTMLElement | null | undefined) => {
    detach()
    element = next || null
    if (element) {
      element.addEventListener('scroll', schedule, { passive: true })
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(schedule)
        resizeObserver.observe(element)
        // The content width changes independently of the viewport when columns or data change.
        if (element.firstElementChild) resizeObserver.observe(element.firstElementChild)
      }
      if (typeof MutationObserver === 'function') {
        mutationObserver = new MutationObserver(schedule)
        mutationObserver.observe(element, { childList: true, subtree: true })
      }
    }
    schedule()
  }

  /** Scrolls by most of the visible width so the next columns come into view. */
  const scrollColumns = (direction: 1 | -1) => {
    element?.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' })
  }

  watch(target, attach, { flush: 'post', immediate: true })
  onBeforeUnmount(() => {
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    frame = 0
    detach()
  })

  return { overflowStart, overflowEnd, scrollColumns }
}
