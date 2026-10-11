import { describe, expect, it } from 'vitest'
import { answerKeyFor, applyAction, isBlockComplete } from '../reducer'
import { harness } from '../__fixtures__/harness'
import type { BlockOf, RevealState } from '../types'

const block: BlockOf<'reveal'> = {
  id: 'peek', type: 'reveal', title: 'Guess & Say', items: { select: 'ids', ids: ['dog', 'cat', 'lion'] },
  speak: 'It is a {en}.',
}
const { lesson, tap, run, stateOf, start } = harness<RevealState>(block)

describe('reveal', () => {
  it('peeks, then reveals', () => {
    expect(stateOf(run([tap('peek')])).stage).toBe(1)
    expect(stateOf(run([tap('peek'), tap('reveal')])).stage).toBe(2)
  })

  it('reveals without a peek', () => {
    expect(stateOf(run([tap('reveal')])).stage).toBe(2)
  })

  it('refuses a second peek or reveal by reference', () => {
    const peeked = run([tap('peek')])
    expect(applyAction(lesson, peeked, tap('peek'))).toBe(peeked)
    const revealed = run([tap('reveal')])
    expect(applyAction(lesson, revealed, tap('reveal'))).toBe(revealed)
  })

  it('moves on only once revealed, and only by naming the item shown', () => {
    const shown = stateOf(start).order[0] as string
    const other = stateOf(start).order[1] as string
    expect(applyAction(lesson, start, tap(shown))).toBe(start)
    const revealed = run([tap('reveal')])
    expect(applyAction(lesson, revealed, tap(other))).toBe(revealed)
    const next = stateOf(applyAction(lesson, revealed, tap(shown)))
    expect(next.index).toBe(1)
    expect(next.stage).toBe(0)
  })

  it('is complete when the last picture is revealed, with no tap after it', () => {
    let state = start
    const order = stateOf(start).order
    for (const [at, id] of order.entries()) {
      expect(isBlockComplete(lesson, state, block)).toBe(false)
      state = run([tap('reveal')], state)
      if (at < order.length - 1) state = run([tap(id)], state)
    }
    expect(isBlockComplete(lesson, state, block)).toBe(true)
  })

  it('keys each picture with its line, the one on screen current', () => {
    const key = answerKeyFor(lesson, start, block)!
    expect(key.rows).toHaveLength(3)
    expect(key.rows[0]!.mark).toBe('current')
    expect(key.rows[0]!.value).toMatch(/^It is a (dog|cat|lion)\.$/)
  })
})
