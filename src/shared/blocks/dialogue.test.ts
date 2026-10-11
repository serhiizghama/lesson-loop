import { describe, expect, it } from 'vitest'
import { answerKeyFor, applyAction, isBlockComplete } from '../reducer'
import { harness } from '../__fixtures__/harness'
import { roleHolder } from './dialogue'
import type { BlockOf, DialogueState } from '../types'

const block: BlockOf<'dialogue'> = {
  id: 'shop', type: 'dialogue', title: 'The shop', items: { select: 'ids', ids: ['dog', 'cat'] },
  roles: ['Shopkeeper', 'Customer'],
  lines: [
    { role: 0, text: 'What do you like?' },
    { role: 1, text: 'I like the {en}.' },
    { role: 0, text: 'Why?' },
  ],
}
const { lesson, tap, run, stateOf, start } = harness<DialogueState>(block)

describe('dialogue', () => {
  it('shows the lines in order, and no further than the last', () => {
    expect(stateOf(run([tap('line'), tap('line')])).shown).toBe(2)
    const all = run([tap('line'), tap('line'), tap('line')])
    expect(stateOf(all).shown).toBe(3)
    expect(applyAction(lesson, all, tap('line'))).toBe(all)
  })

  it('swaps roles at any time, leaving the lines where they were', () => {
    const swapped = stateOf(run([tap('line'), tap('swap')]))
    expect(swapped.swapped).toBe(true)
    expect(swapped.shown).toBe(1)
    expect(roleHolder(swapped, 0)).toBe('Student')
    expect(roleHolder(swapped, 1)).toBe('Teacher')
    expect(roleHolder(stateOf(start), 0)).toBe('Teacher')
  })

  it('moves on only once every line is shown', () => {
    const current = stateOf(start).order[0] as string
    const partway = run([tap('line'), tap('line')])
    expect(applyAction(lesson, partway, tap(current))).toBe(partway)
    const next = stateOf(run([tap('line'), tap('line'), tap('line'), tap(current)]))
    expect(next.index).toBe(1)
    expect(next.shown).toBe(0)
  })

  it('is complete when the last item’s dialogue is played through', () => {
    const first = stateOf(start).order[0] as string
    const end = run([tap('line'), tap('line'), tap('line'), tap(first), tap('line'), tap('line')])
    expect(isBlockComplete(lesson, end, block)).toBe(false)
    expect(isBlockComplete(lesson, run([tap('line')], end), block)).toBe(true)
  })

  it('keys the whole dialogue, the next line current', () => {
    const key = answerKeyFor(lesson, run([tap('line')]), block)!
    expect(key.rows.map((r) => r.mark)).toEqual(['done', 'current', 'open'])
    expect(key.rows[1]!.label).toBe('Customer')
    expect(key.rows[1]!.value).toMatch(/^I like the (dog|cat)\.$/)
  })
})
