import { blockLogic } from './blocks'
import type { AnswerKey } from './blocks/contract'
import { seedFor } from './rng'
import type { Action, Block, BlockState, Lesson, LessonState } from './types'

/**
 * The single state transition of the whole app. It is pure: given the same lesson,
 * state and action it always produces the same result, and it reads nothing outside
 * its arguments — no clock, no randomness, no environment. The next change runs this
 * exact function inside a Durable Object as the authoritative copy.
 *
 * A refused action returns the state it was given, by reference. Nothing throws:
 * an action may arrive from a peer whose view of the lesson is stale.
 */
export function applyAction(lesson: Lesson, state: LessonState, action: Action): LessonState {
  if (lesson.id !== state.lessonId) return state

  if (action.t === 'nav') {
    if (!Number.isInteger(action.slide)) return state
    if (action.slide < 0 || action.slide >= lesson.blocks.length) return state
    if (action.slide === state.slide) return state
    return { ...state, v: state.v + 1, slide: action.slide }
  }

  const block = blockById(lesson, action.block)
  if (block === undefined) return state

  if (action.t === 'reset') {
    const blocks = { ...state.blocks }
    delete blocks[block.id]
    return {
      ...state,
      v: state.v + 1,
      blocks,
      resets: { ...state.resets, [block.id]: generationOf(state, block.id) + 1 },
    }
  }

  const current = blockStateOf(lesson, state, block)
  const next = logicFor(block).reduce(lesson, block, current, action)
  // Identity means refusal. When the block had no stored state yet, a refusal also
  // means there is nothing to store: the same initial state is derived again on demand.
  if (next === current) return state
  return { ...state, v: state.v + 1, blocks: { ...state.blocks, [block.id]: next } }
}

/** Draws the seed — the only impure moment in the model (design D3). */
export function createLessonState(lessonId: string): LessonState {
  return newLessonState(lessonId, (Math.random() * 0x100000000) >>> 0)
}

/**
 * A lesson at its beginning on a seed someone else drew. The room uses this when it
 * switches lesson, so that everything it does stays pure and reproducible (design D9).
 */
export function newLessonState(lessonId: string, seed: number): LessonState {
  return { v: 0, lessonId, slide: 0, seed: seed >>> 0, blocks: {}, resets: {} }
}

export function blockById(lesson: Lesson, id: string): Block | undefined {
  return lesson.blocks.find((b) => b.id === id)
}

/**
 * A block's state, derived on demand when the learner has not reached it yet.
 * Deriving is deterministic, so lazy and eager creation are indistinguishable.
 */
export function blockStateOf(lesson: Lesson, state: LessonState, block: Block): BlockState {
  const stored = state.blocks[block.id]
  if (stored !== undefined) return stored
  return logicFor(block).init(lesson, block, seedFor(state.seed, block.id, generationOf(state, block.id)))
}

export function isBlockComplete(lesson: Lesson, state: LessonState, block: Block): boolean {
  return logicFor(block).isComplete(lesson, block, blockStateOf(lesson, state, block))
}

export type Progress = { done: number; total: number; percent: number }

/**
 * Progress is derived, never stored (design D8), and knows nothing about block types:
 * each block declares whether it is scored.
 */
export function lessonProgress(lesson: Lesson, state: LessonState): Progress {
  const scored = lesson.blocks.filter((b) => logicFor(b).scored)
  const done = scored.filter((b) => isBlockComplete(lesson, state, b)).length
  const total = scored.length
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function isLessonComplete(lesson: Lesson, state: LessonState): boolean {
  const { done, total } = lessonProgress(lesson, state)
  return total > 0 && done === total
}

/**
 * The answer to a block as it stands, or null when it scores nothing (design D15).
 * Dispatching here rather than in the teacher's panel is what makes a block type
 * without a key a compile error instead of a silent gap in the lesson.
 */
export function answerKeyFor(lesson: Lesson, state: LessonState, block: Block): AnswerKey | null {
  return logicFor(block).answerKey(lesson, block, blockStateOf(lesson, state, block))
}

function generationOf(state: LessonState, blockId: string): number {
  return state.resets[blockId] ?? 0
}

/**
 * The registry is keyed by block type, and TypeScript cannot see that a block and its
 * logic are correlated. One cast, in one place, instead of a cast per call site.
 */
type ErasedLogic = {
  scored: boolean
  init(lesson: Lesson, block: Block, seed: number): BlockState
  reduce(lesson: Lesson, block: Block, state: BlockState, action: Action): BlockState
  isComplete(lesson: Lesson, block: Block, state: BlockState): boolean
  answerKey(lesson: Lesson, block: Block, state: BlockState): AnswerKey | null
}

function logicFor(block: Block): ErasedLogic {
  return blockLogic[block.type] as unknown as ErasedLogic
}
