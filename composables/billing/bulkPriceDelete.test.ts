import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref } from 'vue'
import { useBulkPriceDelete } from './useBulkPriceDelete'
import type { BillingPriceRule } from './types'

const rule = (id: string): BillingPriceRule => ({ id, provider: 'openai', model: id, source: 'manual' })
function setup(deleteRule: (id: string) => Promise<unknown> = async () => {}) {
  const scope = effectScope()
  const rules = ref([rule('a'), rule('b'), rule('c')])
  const visible = ref(rules.value.slice(0, 2))
  let reloads = 0
  const state = scope.run(() => useBulkPriceDelete(rules, visible, async () => { reloads++ }, {
    deleteRule, t: (key, params) => `${key}:${params?.count ?? ''}`, toast: { add: () => 'test-toast' },
  }))!
  return { scope, rules, visible, state, reloads: () => reloads }
}

describe('bulk price deletion', () => {
  test('select all affects only filtered rows and preserves hidden selections', () => {
    const { scope, state } = setup()
    state.select('c', true)
    state.select('a', true)
    expect(state.someSelected.value).toBe(true)
    state.selectAll(true)
    expect(state.allSelected.value).toBe(true)
    state.selectAll(false)
    expect([...state.selectedIDs.value]).toEqual(['c'])
    scope.stop()
  })

  test('confirmation snapshots targets, prevents duplicate submission, and refreshes once', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const calls: string[] = []
    const { scope, state, reloads } = setup(async id => { calls.push(id); await gate })
    state.selectAll(true)
    state.confirm()
    state.select('c', true)
    const pending = state.remove()
    await state.remove()
    expect(state.busy.value).toBe(true)
    state.clear()
    release()
    await pending
    expect(calls).toEqual(['a', 'b'])
    expect([...state.selectedIDs.value]).toEqual(['c'])
    expect(state.open.value).toBe(false)
    expect(reloads()).toBe(1)
    scope.stop()
  })

  test('partial failures stay selected in the confirmation for retry', async () => {
    let fail = true
    const { scope, state } = setup(async id => { if (id === 'b' && fail) throw new Error('failed') })
    state.selectAll(true)
    state.confirm()
    await state.remove()
    expect([...state.selectedIDs.value]).toEqual(['b'])
    expect(state.targets.value.map(value => value.id)).toEqual(['b'])
    expect(state.error.value).toContain('billing.bulkDelete.failed:1')
    expect(state.open.value).toBe(true)
    fail = false
    await state.remove()
    expect(state.selectedIDs.value.size).toBe(0)
    expect(state.open.value).toBe(false)
    scope.stop()
  })

  test('refresh prunes selections for rules that no longer exist', async () => {
    const { scope, state, rules } = setup()
    state.selectAll(true)
    rules.value = [rule('b')]
    await nextTick()
    expect([...state.selectedIDs.value]).toEqual(['b'])
    scope.stop()
  })
})
