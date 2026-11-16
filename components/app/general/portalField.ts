import { computed, inject, onScopeDispose, ref, useId, watchEffect } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'

export interface PortalFieldContext {
  id: string
  controlId: Ref<string>
  required: ComputedRef<boolean>
  invalid: ComputedRef<boolean>
  describedBy: ComputedRef<string | undefined>
}

export const portalFieldKey: InjectionKey<PortalFieldContext> = Symbol('portal-field')

export function usePortalControl(props: { id?: string; required?: boolean }) {
  const field = inject(portalFieldKey, undefined)
  const generatedId = useId()
  const id = computed(() => props.id ?? field?.id ?? generatedId)
  if (field) {
    watchEffect(() => { field.controlId.value = id.value })
    onScopeDispose(() => { field.controlId.value = field.id })
  }
  const required = computed(() => props.required || field?.required.value || false)
  function accessibility(attrs: Record<string, unknown>) {
    return {
      id: id.value,
      required: required.value,
      'aria-required': required.value || undefined,
      'aria-invalid': field?.invalid.value || attrs['aria-invalid'],
      'aria-describedby': [attrs['aria-describedby'], field?.describedBy.value].filter(Boolean).join(' ') || undefined,
    }
  }
  return { id, required, accessibility }
}

export type PortalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export const portalControlSizes = { xs: 'h-6', sm: 'h-8', md: 'h-9', lg: 'h-10', xl: 'h-12' }

export function usePortalFocus() {
  const root = ref<{ $el: HTMLElement } | HTMLElement | null>(null)
  const element = computed(() => {
    const node = root.value && ('$el' in root.value ? root.value.$el : root.value)
    if (!node || typeof node.matches !== 'function') return undefined
    return node.matches('input, select, button') ? node : node.querySelector<HTMLElement>('input, select, button') ?? undefined
  })
  return { root, element, focus: (options?: FocusOptions) => element.value?.focus(options), blur: () => element.value?.blur() }
}
