import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { answerKeyFor, applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { quizChoices, quizTarget } from './quiz'
import type { Action, BlockOf, Lesson, LessonState, QuizState } from '../types'

const lesson = testLesson()
const block = blockById(lesson, 'guess') as BlockOf<'quiz'>

function stateOf(state: LessonState): QuizState {
  return blockStateOf(lesson, state, block) as QuizState
}

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const answer = (id: string): Action => ({ t: 'tap', block: 'guess', target: id })

/** A four-item lesson, for the case where the block asks for more choices than it can have. */
function fourItems(): Lesson {
  const items = lesson.items.slice(0, 4)
  return {
    ...lesson,
    items,
    blocks: [{ ...block, count: 4, items: { select: 'all' } }],
  }
}

describe('quiz', () => {
  it('asks about every selected item, one at a time', () => {
    const initial = stateOf(testState())
    expect([...initial.order].sort()).toEqual(lesson.items.map((i) => i.id).sort())
    expect(quizTarget(initial)).toBe(initial.order[0])
  })

  it('advances when the prompt is answered correctly', () => {
    const initial = stateOf(testState())
    const after = stateOf(run([answer(initial.order[0] as string)]))
    expect(after.index).toBe(1)
    expect(after.answered).toEqual([initial.order[0]])
    expect(after.wrong).toBeNull()
  })

  it('records a wrong choice without losing anything, and refuses it twice', () => {
    const initial = stateOf(testState())
    const wrong = initial.order[1] as string
    const once = run([answer(wrong)])
    expect(stateOf(once).wrong).toBe(wrong)
    expect(stateOf(once).index).toBe(0)
    expect(stateOf(once).answered).toEqual([])
    expect(applyAction(lesson, once, answer(wrong))).toBe(once)
  })

  it('lets the learner try again after a wrong choice', () => {
    const initial = stateOf(testState())
    const after = run([answer(initial.order[1] as string), answer(initial.order[0] as string)])
    expect(stateOf(after).index).toBe(1)
    expect(stateOf(after).wrong).toBeNull()
  })

  it('offers the answer exactly once among its choices', () => {
    const state = stateOf(testState())
    const choices = quizChoices(lesson, block, state, 4242)
    expect(choices).toHaveLength(3)
    expect(choices.filter((c) => c.id === quizTarget(state))).toHaveLength(1)
    expect(new Set(choices.map((c) => c.id)).size).toBe(choices.length)
  })

  it('clamps the choices to the items it actually has', () => {
    const small = fourItems()
    const smallBlock = small.blocks[0] as BlockOf<'quiz'>
    const state = blockStateOf(small, { ...testState(), lessonId: small.id }, smallBlock) as QuizState
    const choices = quizChoices(small, smallBlock, state, 4242)
    expect(choices).toHaveLength(4)
    expect(new Set(choices.map((c) => c.id)).size).toBe(4)
  })

  it('is complete once every prompt has been answered', () => {
    let state = testState()
    for (let i = 0; i < stateOf(state).order.length; i += 1) {
      const target = quizTarget(stateOf(state))
      if (target !== null) state = applyAction(lesson, state, answer(target))
    }
    expect(isBlockComplete(lesson, state, block)).toBe(true)
    expect(quizTarget(stateOf(state))).toBeNull()
  })

  it('shows the teacher the prompt against the choice that answers it', () => {
    const initial = stateOf(testState())
    const state = run([answer(initial.order[0] as string)])
    const key = answerKeyFor(lesson, state, block)
    const first = key?.rows[0]
    const item = lesson.items.find((i) => i.id === initial.order[0])
    expect(first?.label).toBe(item?.tags?.['sound'])
    expect(first?.value).toBe(item?.emoji)
    expect(first?.mark).toBe('done')
    expect(key?.rows[1]?.mark).toBe('current')
  })
})
