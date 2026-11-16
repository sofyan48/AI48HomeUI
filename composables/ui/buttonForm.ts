import type { InjectionKey, Ref } from 'vue'

// Called during the button's setup so the resolver sees its nearest form ancestor.
export const buttonFormLoadingResolverKey: InjectionKey<() => Ref<boolean> | undefined> = Symbol('button-form-loading-resolver')
