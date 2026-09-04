import { describe, expect, it } from 'vitest'
import { testLesson, testState } from './__fixtures__/lesson'
import {
  applyAction, blockById, blockStateOf, createLessonState, isLessonComplete, lessonProgress,
  lessonTrail,
} from './reducer'
import type { Action, CardsState, LessonState, MatchState } from './types'

const lesson = testLesson()
const cards = blockById(lesson, 'vocab')!

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

describe('createLessonState', () => {
  it('starts empty at version zero', () => {
    const state = createLessonState('test')
    expect(state.v).toBe(0)
    expect(state.slide).toBe(0)
    expect(state.blocks).toEqual({})
    expect(state.resets).toEqual({})
  })

  it('draws a different seed each time', () => {
    const seeds = new Set(Array.from({ length: 20 }, () => createLessonState('test').seed))
    expect(seeds.size).toBeGreaterThan(1)
  })
})

describe('applyAction', () => {
  it('advances the version by one on an accepted action', () => {
    const first = (blockStateOf(lesson, testState(), cards) as CardsState).order[0]!
    const state = run([{ t: 'tap', block: 'vocab', target: first }])
    expect(state.v).toBe(1)
  })

  it('returns the same state, unchanged, for a block this lesson does not have', () => {
    const start = testState()
    const after = applyAction(lesson, start, { t: 'tap', block: 'nope', target: 'dog' })
    expect(after).toBe(start)
    expect(after.v).toBe(0)
  })

  it('returns the same state for a state belonging to another lesson', () => {
    const foreign = { ...testState(), lessonId: 'other' }
    expect(applyAction(lesson, foreign, { t: 'nav', slide: 1 })).toBe(foreign)
  })

  it('never throws on nonsense', () => {
    const start = testState()
    const nonsense: Action[] = [
      { t: 'tap', block: 'vocab', target: 'not-an-item' },
      { t: 'pick', block: 'homes', side: 'b', target: 'not-a-bucket' },
      { t: 'level', block: 'say', level: 99 },
      { t: 'nav', slide: 999 },
      { t: 'reset', block: 'ghost' },
    ]
    for (const action of nonsense) {
      expect(() => applyAction(lesson, start, action)).not.toThrow()
      expect(applyAction(lesson, start, action)).toBe(start)
    }
  })

  it('moves between slides within bounds only', () => {
    const start = testState()
    expect(applyAction(lesson, start, { t: 'nav', slide: 3 }).slide).toBe(3)
    expect(applyAction(lesson, start, { t: 'nav', slide: -1 })).toBe(start)
    expect(applyAction(lesson, start, { t: 'nav', slide: lesson.blocks.length })).toBe(start)
    expect(applyAction(lesson, start, { t: 'nav', slide: 0 })).toBe(start)
  })
})

describe('reset', () => {
  it('re-orders the block and leaves the others alone', () => {
    const pairs = blockById(lesson, 'pairs')!
    const before = run([{ t: 'tap', block: 'vocab', target: (blockStateOf(lesson, testState(), cards) as CardsState).order[0]! }])
    const orderBefore = (blockStateOf(lesson, before, pairs) as MatchState).orderA

    const after = applyAction(lesson, before, { t: 'reset', block: 'pairs' })
    const orderAfter = (blockStateOf(lesson, after, pairs) as MatchState).orderA

    expect(orderAfter).not.toEqual(orderBefore)
    expect([...orderAfter].sort()).toEqual([...orderBefore].sort())
    expect((blockStateOf(lesson, after, cards) as CardsState).flipped).toHaveLength(1)
  })

  it('clears the work done in the block it resets', () => {
    const order = (blockStateOf(lesson, testState(), cards) as CardsState).order
    const done = run(order.map((id) => ({ t: 'tap', block: 'vocab', target: id }) as Action))
    const reset = applyAction(lesson, done, { t: 'reset', block: 'vocab' })
    expect((blockStateOf(lesson, reset, cards) as CardsState).flipped).toEqual([])
    expect(reset.v).toBe(done.v + 1)
  })
})

describe('progress', () => {
  it('ignores blocks that do not count, without the caller knowing which those are', () => {
    const progress = lessonProgress(lesson, testState())
    expect(progress.total).toBe(lesson.blocks.length - 1) // the closing screen is not an exercise
    expect(progress.done).toBe(0)
    expect(progress.percent).toBe(0)
  })

  it('rises as exercises are completed', () => {
    const order = (blockStateOf(lesson, testState(), cards) as CardsState).order
    const state = run(order.map((id) => ({ t: 'tap', block: 'vocab', target: id }) as Action))
    expect(lessonProgress(lesson, state).done).toBe(1)
    expect(isLessonComplete(lesson, state)).toBe(false)
  })
})

describe('the star trail', () => {
  /** Every tap the cards block needs to be finished, in the order this seed deals them. */
  function completeCards(from: LessonState = testState()): LessonState {
    const order = (blockStateOf(lesson, from, cards) as CardsState).order
    return run(order.map((id) => ({ t: 'tap', block: 'vocab', target: id }) as Action), from)
  }

  it('has one slot per exercise and none for the closing slide', () => {
    const trail = lessonTrail(lesson, testState())
    expect(trail).toHaveLength(lesson.blocks.length - 1)
    expect(trail.map((slot) => slot.blockId)).not.toContain('done')
    expect(trail.every((slot) => !slot.done)).toBe(true)
  })

  it('keeps the lesson order, so a slot is where the exercise is', () => {
    const trail = lessonTrail(lesson, testState())
    const scored = lesson.blocks.filter((b) => b.type !== 'finish').map((b) => b.id)
    expect(trail.map((slot) => slot.blockId)).toEqual(scored)
  })

  it('marks the exercise on screen as current, and only that one', () => {
    const state = run([{ t: 'nav', slide: 2 }])
    const trail = lessonTrail(lesson, state)
    expect(trail.filter((slot) => slot.current).map((s) => s.blockId)).toEqual([
      lesson.blocks[2]!.id,
    ])
  })

  it('has nothing current while the closing slide is on screen', () => {
    const state = run([{ t: 'nav', slide: lesson.blocks.length - 1 }])
    expect(lessonTrail(lesson, state).some((slot) => slot.current)).toBe(false)
  })

  it('marks a completed exercise done and leaves every other slot alone', () => {
    const trail = lessonTrail(lesson, completeCards())
    expect(trail.find((slot) => slot.blockId === 'vocab')!.done).toBe(true)
    expect(trail.filter((slot) => slot.blockId !== 'vocab').every((s) => !s.done)).toBe(true)
  })

  it('returns the mark to open on a reset, and earns it again on the second completion', () => {
    const done = completeCards()
    expect(lessonTrail(lesson, done).find((s) => s.blockId === 'vocab')!.done).toBe(true)

    const reset = run([{ t: 'reset', block: 'vocab' }], done)
    expect(lessonTrail(lesson, reset).find((s) => s.blockId === 'vocab')!.done).toBe(false)

    // The reset deals a fresh order, so the second run has to read it again rather than
    // replaying the first run's taps.
    const again = completeCards(reset)
    expect(lessonTrail(lesson, again).find((s) => s.blockId === 'vocab')!.done).toBe(true)
  })

  it('agrees with the progress the footer shows', () => {
    const state = completeCards()
    const trail = lessonTrail(lesson, state)
    const progress = lessonProgress(lesson, state)
    expect(trail).toHaveLength(progress.total)
    expect(trail.filter((slot) => slot.done)).toHaveLength(progress.done)
  })
})
