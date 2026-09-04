import type { Action, Block, BlockOf, BlockStateMap, BlockType, Lesson } from '../types'

/**
 * What the teacher is shown about the exercise on screen (design D15): the pairs that
 * belong together, the bucket each item goes in, the word being asked, the sentence a
 * level renders. It is one uniform shape rather than a union per block type, because
 * the teacher's panel should render a key it has never seen before — a block type added
 * later must not need a new branch in the UI to be teachable.
 *
 * Every row is already rendered text: the key is read aloud by a person, not parsed.
 */
export type AnswerKeyRow = {
  /** Stable within one key, for list rendering. */
  id: string
  /** The side the teacher is looking at — a picture, an item, the prompt. */
  label: string
  /** The answer to it. */
  value: string
  /**
   * Where the learner is: `done` is already got and can be dimmed, `current` is the one
   * on screen right now and is what the teacher is about to say.
   */
  mark: 'open' | 'current' | 'done'
}

export type AnswerKey = {
  /** What the key is, e.g. "Pairs" or "Now asking". */
  title: string
  rows: AnswerKeyRow[]
}

/**
 * What every block type must provide. All three are pure: given the same arguments
 * they return the same result, on the client and — from the next change — inside the
 * Durable Object.
 *
 * `reduce` MUST return the state it was given, by reference, when it refuses an action.
 * That identity is how the reducer knows not to bump the version, and how React knows
 * not to re-render.
 */
export type BlockLogic<T extends BlockType> = {
  /** Whether finishing this block counts towards lesson progress. */
  scored: boolean
  /** `seed` is already mixed with the block id and its reset generation. */
  init(lesson: Lesson, block: BlockOf<T>, seed: number): BlockStateMap[T]
  reduce(
    lesson: Lesson,
    block: BlockOf<T>,
    state: BlockStateMap[T],
    action: Action,
  ): BlockStateMap[T]
  isComplete(lesson: Lesson, block: BlockOf<T>, state: BlockStateMap[T]): boolean
  /**
   * The answer to this exercise as it stands, or `null` for a block with nothing to be
   * right about. Required, so that a new block type cannot ship an exercise the teacher
   * cannot see the answer to: the type checker asks for it (design D15).
   */
  answerKey(lesson: Lesson, block: BlockOf<T>, state: BlockStateMap[T]): AnswerKey | null
}

/** Narrowing helper: a block and its state always belong to the same type. */
export type AnyBlockLogic = BlockLogic<BlockType>

export function isBlockOf<T extends BlockType>(block: Block, type: T): block is BlockOf<T> {
  return block.type === type
}
