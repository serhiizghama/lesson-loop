import { describe, expect, it } from 'vitest'
import { testLesson, testState } from '../__fixtures__/lesson'
import { applyAction, blockById, blockStateOf, isBlockComplete } from '../reducer'
import { answerKeyFor } from '../reducer'
import { phraseAt } from './phrases'
import type { Action, BlockOf, LessonState, PhrasesState } from '../types'

const lesson = testLesson()
const block = blockById(lesson, 'talk') as BlockOf<'phrases'>

function stateOf(state: LessonState): PhrasesState {
  return blockStateOf(lesson, state, block) as PhrasesState
}

function run(actions: Action[], from: LessonState = testState()): LessonState {
  return actions.reduce((state, action) => applyAction(lesson, state, action), from)
}

const play = (index: number): Action => ({ t: 'tap', block: 'talk', target: String(index) })

describe('phrases', () => {
  it('starts with nothing heard and keeps the declared order', () => {
    expect(stateOf(testState()).played).toEqual([])
    expect(block.lines).toEqual(['What is it?', 'It is a dog.'])
  })

  it('records a phrase as heard when its control is pressed', () => {
    expect(stateOf(run([play(0)])).played).toEqual(['0'])
  })

  it('does not move when a phrase already heard is played again', () => {
    const once = run([play(0)])
    expect(applyAction(lesson, once, play(0))).toBe(once)
  })

  it('refuses an index that names no phrase, by reference', () => {
    const start = testState()
    expect(applyAction(lesson, start, play(9))).toBe(start)
    expect(applyAction(lesson, start, { t: 'tap', block: 'talk', target: 'first' })).toBe(start)
  })

  it('is complete only once every phrase has been heard', () => {
    const partial = run([play(0)])
    expect(isBlockComplete(lesson, partial, block)).toBe(false)
    const whole = run([play(0), play(1)])
    expect(isBlockComplete(lesson, whole, block)).toBe(true)
  })

  it('shows the teacher every phrase, marking the ones already heard', () => {
    const key = answerKeyFor(lesson, run([play(1)]), block)
    expect(key?.rows.map((r) => r.value)).toEqual(block.lines)
    expect(key?.rows.map((r) => r.mark)).toEqual(['open', 'done'])
  })

  it('reads a phrase back from an action target', () => {
    expect(phraseAt(block, '1')).toBe('It is a dog.')
    expect(phraseAt(block, '5')).toBeNull()
  })
})
