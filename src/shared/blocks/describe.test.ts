import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { currentItem, describeChoices, describeSentence } from './describe'
import type { Action, BlockOf, DescribeState, Item, LessonState } from '../types'

const lesson = testLesson()
const block = blockById(lesson, 'tell') as BlockOf<'describe'>

function stateOf(state: LessonState): DescribeState {
  return blockStateOf(lesson, state, block) as DescribeState
}

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const pick = (side: 'a' | 'b', target: string): Action => ({ t: 'pick', block: 'tell', side, target })

/** The item the exercise is asking about, and the two answers it wants for it. */
function asked(state: LessonState): { item: Item; name: string; habitat: string } {
  const item = currentItem(lesson, block, stateOf(state)) as Item
  return { item, name: item.en, habitat: item.tags?.['habitat'] as string }
}

describe('describe', () => {
  it('asks about one item at a time, with neither question answered', () => {
    const initial = stateOf(testState())
    expect(initial.given).toEqual({ a: false, b: false })
    expect(initial.index).toBe(0)
    expect(currentItem(lesson, block, initial)?.id).toBe(initial.order[0])
  })

  it('does not move on when only one question is answered', () => {
    const start = testState()
    const after = run([pick('a', asked(start).name)])
    expect(stateOf(after).given).toEqual({ a: true, b: false })
    expect(stateOf(after).index).toBe(0)
    expect(isBlockComplete(lesson, after, block)).toBe(false)
  })

  it('moves on once both questions are answered', () => {
    const start = testState()
    const { name, habitat } = asked(start)
    const after = run([pick('a', name), pick('b', habitat)])
    expect(stateOf(after).index).toBe(1)
    expect(stateOf(after).given).toEqual({ a: false, b: false })
  })

  it('keeps the answer already given when the other question is answered wrongly', () => {
    const start = testState()
    const { name } = asked(start)
    const after = run([pick('a', name), pick('b', 'nowhere')])
    expect(stateOf(after).given).toEqual({ a: true, b: false })
    expect(stateOf(after).wrong).toBe('b')
    expect(stateOf(after).index).toBe(0)
  })

  it('refuses the same wrong answer twice, by reference', () => {
    const once = run([pick('b', 'nowhere')])
    expect(applyAction(lesson, once, pick('b', 'nowhere'))).toBe(once)
  })

  it('lets the learner try again after a wrong answer', () => {
    const start = testState()
    const { name, habitat } = asked(start)
    const after = run([pick('b', 'nowhere'), pick('b', habitat), pick('a', name)])
    expect(stateOf(after).index).toBe(1)
    expect(stateOf(after).wrong).toBeNull()
  })

  it('closes a question once it is answered, so a late wrong tap changes nothing', () => {
    const start = testState()
    const { name } = asked(start)
    const once = run([pick('a', name)])
    expect(applyAction(lesson, once, pick('a', 'lion'))).toBe(once)
  })

  it('offers the lesson’s own distinct values as the choices', () => {
    expect([...describeChoices(lesson, block, 'b', 4242)].sort()).toEqual(['farm', 'jungle'])
    expect([...describeChoices(lesson, block, 'a', 4242)].sort()).toEqual(
      lesson.items.map((i) => i.en).sort(),
    )
  })

  it('is complete once every item has been described', () => {
    let state: LessonState = testState()
    for (let i = 0; i < stateOf(state).order.length; i += 1) {
      const { name, habitat } = asked(state)
      state = run([pick('a', name), pick('b', habitat)], state)
    }
    expect(isBlockComplete(lesson, state, block)).toBe(true)
    expect(currentItem(lesson, block, stateOf(state))).toBeNull()
  })

  it('puts both answers into one sentence', () => {
    const dog = lesson.items[0] as Item
    expect(describeSentence(block, dog)).toBe('The dog lives on the farm.')
  })

  it('shows the teacher both answers, marking the one already given', () => {
    const start = testState()
    const { name, habitat } = asked(start)
    const key = answerKeyFor(lesson, run([pick('a', name)]), block)
    expect(key?.rows.map((r) => r.value)).toEqual([name, habitat])
    expect(key?.rows.map((r) => r.mark)).toEqual(['done', 'current'])
  })
})
