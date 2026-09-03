import { describe, expect, it } from 'vitest'
import { testLesson, testState } from './__fixtures__/lesson'
import { applyAction, blockStateOf, blockById, lessonProgress } from './reducer'
import type { Action, CardsState, LessonState, MatchState } from './types'

/**
 * These are the guarantees the next change leans on: the Durable Object will hold the
 * authoritative state while each client predicts locally, and the two must never drift.
 */
const lesson = testLesson()

function script(from: LessonState): Action[] {
  const cards = blockStateOf(lesson, from, blockById(lesson, 'vocab')!) as CardsState
  const pairs = blockStateOf(lesson, from, blockById(lesson, 'pairs')!) as MatchState
  return [
    { t: 'tap', block: 'vocab', target: cards.order[0]! },
    { t: 'tap', block: 'vocab', target: cards.order[1]! },
    { t: 'nav', slide: 1 },
    { t: 'pick', block: 'pairs', side: 'a', target: pairs.orderA[0]! },
    { t: 'pick', block: 'pairs', side: 'b', target: pairs.orderA[1]! }, // deliberately wrong
    { t: 'pick', block: 'pairs', side: 'a', target: pairs.orderA[0]! },
    { t: 'pick', block: 'pairs', side: 'b', target: pairs.orderA[0]! },
    { t: 'nav', slide: 2 },
    { t: 'tap', block: 'say', target: 'dog' },
    { t: 'level', block: 'say', level: 2 },
    { t: 'nav', slide: 3 },
    { t: 'pick', block: 'homes', side: 'a', target: 'lion' },
    { t: 'pick', block: 'homes', side: 'b', target: 'jungle' },
    { t: 'reset', block: 'vocab' },
    { t: 'tap', block: 'vocab', target: cards.order[0]! },
  ]
}

function replay(from: LessonState): LessonState {
  return script(from).reduce((state, action) => applyAction(lesson, state, action), from)
}

describe('determinism', () => {
  it('reproduces the same state when the same actions are replayed', () => {
    expect(replay(testState())).toEqual(replay(testState()))
  })

  it('leaves two independent devices showing the same thing', () => {
    const teacher = replay(testState(9001))
    const student = replay(testState(9001))
    expect(teacher).toEqual(student)
    expect(lessonProgress(lesson, teacher)).toEqual(lessonProgress(lesson, student))
  })

  it('lays the cards out differently under a different seed', () => {
    const a = blockStateOf(lesson, testState(1), blockById(lesson, 'vocab')!) as CardsState
    const b = blockStateOf(lesson, testState(2), blockById(lesson, 'vocab')!) as CardsState
    expect(a.order).not.toEqual(b.order)
  })

  it('survives a serialise and deserialise round trip', () => {
    const midway = replay(testState())
    const revived = JSON.parse(JSON.stringify(midway)) as LessonState
    expect(revived).toEqual(midway)

    const nextAction: Action = { t: 'nav', slide: 4 }
    expect(applyAction(lesson, revived, nextAction)).toEqual(applyAction(lesson, midway, nextAction))
  })

  it('holds the same block order after leaving and returning', () => {
    const start = testState()
    const pairsBlock = blockById(lesson, 'pairs')!
    const before = (blockStateOf(lesson, start, pairsBlock) as MatchState).orderA
    const wandered = [
      { t: 'nav', slide: 4 },
      { t: 'nav', slide: 0 },
      { t: 'nav', slide: 1 },
    ].reduce((state, action) => applyAction(lesson, state, action as Action), start)
    expect((blockStateOf(lesson, wandered, pairsBlock) as MatchState).orderA).toEqual(before)
  })

  it('derives an untouched block identically whether or not it was stored', () => {
    const start = testState()
    const block = blockById(lesson, 'ears')!
    const derivedTwice = [blockStateOf(lesson, start, block), blockStateOf(lesson, start, block)]
    expect(derivedTwice[0]).toEqual(derivedTwice[1])
    expect(start.blocks).toEqual({}) // deriving never writes
  })
})
