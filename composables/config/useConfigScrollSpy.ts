import { nextTick, onMounted, onScopeDispose, ref, watch, type Ref } from 'vue'

type Section = { id: string }

export function sectionAtPosition(sections: Array<{ id: string; top: number }>, position: number) {
  let active = sections[0]?.id ?? ''
  for (const section of sections) {
    if (section.top <= position) active = section.id
  }
  return active
}

export function useConfigScrollSpy(outline: Ref<Section[]>, loaded: Ref<boolean>) {
  const activeSection = ref('')
  let frame: number | undefined
  let disposed = false

  function update() {
    frame = undefined
    const sections = outline.value.flatMap(section => {
      const element = document.getElementById(`config-${section.id}`)
      return element ? [{ id: section.id, element, top: element.getBoundingClientRect().top }] : []
    }).sort((a, b) => a.top - b.top)
    let container = sections[0]?.element.parentElement
    while (container && !/(auto|scroll)/.test(getComputedStyle(container).overflowY)) {
      container = container.parentElement
    }
    const top = container ? Math.max(0, container.getBoundingClientRect().top) : 0
    activeSection.value = sectionAtPosition(sections, top + 32)
  }

  function schedule() {
    if (!disposed && frame === undefined) frame = requestAnimationFrame(update)
  }

  watch([loaded, outline], async () => {
    await nextTick()
    schedule()
  }, { flush: 'post' })
  onMounted(() => {
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    schedule()
  })
  onScopeDispose(() => {
    disposed = true
    window.removeEventListener('scroll', schedule, true)
    window.removeEventListener('resize', schedule)
    if (frame !== undefined) cancelAnimationFrame(frame)
  })

  return { activeSection }
}
