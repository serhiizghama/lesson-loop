import { describe, expect, it } from 'vitest'
import { answerKeyFor, applyAction, isBlockComplete } from '../reducer'
import { harness } from '../__fixtures__/harness'
import { talkLogic, talkQuestion } from './talk'
import type { BlockOf, TalkState } from '../types'

const block: BlockOf<'talk'> = {
  id: 'chat', type: 'talk', title: 'Talk time',
  levels: [
    { label: 'Level 1', lines: ['A1', 'A2', 'A3', 'A4'] },
    { label: 'Level 2', lines: ['B1', 'B2'] },
    { label: 'Level 3', lines: ['C1'] },
  ],
}
const { lesson, tap, run, stateOf, start } = harness<TalkState>(block)

describe('talk', () => {
  it('asks nothing until asked', () => {
    expect(talkQuestion(block, stateOf(start))).toBeNull()
  })

  it('asks at the first level for a new question', () => {
    const s = stateOf(run([tap('harder'), tap('harder'), tap('new')]))
    expect(s.level).toBe(0)
    expect(talkQuestion(block, s)).toMatch(/^A/)
  })

  it('climbs a level for a harder one, and stays at the top', () => {
    const s1 = stateOf(run([tap('new'), tap('harder')]))
    expect(s1.level).toBe(1)
    expect(talkQuestion(block, s1)).toMatch(/^B/)
    const s2 = stateOf(run([tap('new'), tap('harder'), tap('harder'), tap('harder')]))
    expect(s2.level).toBe(2)
    expect(talkQuestion(block, s2)).toBe('C1')
  })

  it('asks every question of a level before repeating one, then wraps', () => {
    const asked: string[] = []
    let state = start
    for (let i = 0; i < 4; i++) {
      state = applyAction(lesson, state, tap('new'))
      asked.push(talkQuestion(block, stateOf(state)) as string)
    }
    expect(new Set(asked).size).toBe(4)
    state = applyAction(lesson, state, tap('new'))
    expect(talkQuestion(block, stateOf(state))).toBe(asked[0])
  })

  it('is complete once a question of the last level has been asked', () => {
    const climbing = run([tap('new'), tap('harder')])
    expect(isBlockComplete(lesson, climbing, block)).toBe(false)
    expect(isBlockComplete(lesson, run([tap('harder')], climbing), block)).toBe(true)
  })

  it('draws the same orders for the same seed', () => {
    expect(talkLogic.init(lesson, block, 7)).toEqual(talkLogic.init(lesson, block, 7))
  })

  it('keys every question, the asked ones done and the one on screen current', () => {
    const state = run([tap('new'), tap('new')])
    const key = answerKeyFor(lesson, state, block)!
    expect(key.rows).toHaveLength(7)
    expect(key.rows.filter((r) => r.mark === 'current')).toHaveLength(1)
    expect(key.rows.filter((r) => r.mark === 'done')).toHaveLength(1)
  })
})
