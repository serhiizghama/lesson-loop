import { describe, expect, it } from 'vitest'
import { answerKeyFor, applyAction, isBlockComplete } from '../reducer'
import { harness } from '../__fixtures__/harness'
import { preferLogic, preferPair, preferSentence } from './prefer'
import type { BlockOf, PreferState } from '../types'

const block: BlockOf<'prefer'> = {
  id: 'pick', type: 'prefer', title: 'This or that', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] },
  sentence: 'I prefer the {en} to the {other}.', rounds: 3,
}
const { lesson, tap, run, stateOf, start } = harness<PreferState>(block)

describe('prefer', () => {
  it('offers a different pair of two different items every round', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = preferLogic.init(lesson, block, seed)
      expect(s.pairs).toHaveLength(3)
      for (const [a, b] of s.pairs) expect(a).not.toBe(b)
      expect(new Set(s.pairs.map((p) => [...p].sort().join('|'))).size).toBe(3)
    }
  })

  it('chooses only from the pair on screen', () => {
    const [a, b] = stateOf(start).pairs[0]!
    const outside = ['dog', 'cat', 'lion'].find((id) => id !== a && id !== b)!
    expect(applyAction(lesson, start, tap(outside))).toBe(start)
    expect(stateOf(run([tap(a)])).chosen).toBe(a)
  })

  it('moves on only with the chosen item', () => {
    const [a, b] = stateOf(start).pairs[0]!
    const chosen = run([tap(a)])
    expect(applyAction(lesson, chosen, tap(b))).toBe(chosen)
    const next = stateOf(applyAction(lesson, chosen, tap(a)))
    expect(next.index).toBe(1)
    expect(next.chosen).toBeNull()
  })

  it('is complete when the last round has a choice', () => {
    let state = start
    for (let round = 0; round < 3; round++) {
      expect(isBlockComplete(lesson, state, block)).toBe(false)
      const [a] = stateOf(state).pairs[round]!
      state = run([tap(a)], state)
      if (round < 2) state = run([tap(a)], state)
    }
    expect(isBlockComplete(lesson, state, block)).toBe(true)
  })

  it('renders the sentence for either choice of a pair', () => {
    const [a, b] = preferPair(lesson, stateOf(start))!
    expect(preferSentence(block, a, b)).toBe(`I prefer the ${a.en} to the ${b.en}.`)
    expect(preferSentence(block, b, a)).toBe(`I prefer the ${b.en} to the ${a.en}.`)
  })

  it('keys each round with its pair', () => {
    const key = answerKeyFor(lesson, start, block)!
    expect(key.rows).toHaveLength(3)
    expect(key.rows[0]!.label).toMatch(/ or /)
  })
})
