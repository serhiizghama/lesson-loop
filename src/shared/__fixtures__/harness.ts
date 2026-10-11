import { testLesson, testState } from './lesson'
import { applyAction, blockStateOf } from '../reducer'
import type { Action, Block, BlockState, Lesson, LessonState } from '../types'

/** A lesson of the fixture's items carrying exactly one block, and a way to play it. */
export function harness<S extends BlockState>(block: Block, seed = 4242) {
  const lesson: Lesson = { ...testLesson(), blocks: [block] }
  const tap = (target: string): Action => ({ t: 'tap', block: block.id, target })
  const run = (actions: Action[], from: LessonState = testState(seed)) =>
    actions.reduce((s, a) => applyAction(lesson, s, a), from)
  const stateOf = (s: LessonState) => blockStateOf(lesson, s, block) as S
  return { lesson, tap, run, stateOf, start: testState(seed) }
}
