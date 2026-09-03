import type { Action, Block, BlockOf, BlockStateMap, BlockType, Lesson } from '../types'

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
}

/** Narrowing helper: a block and its state always belong to the same type. */
export type AnyBlockLogic = BlockLogic<BlockType>

export function isBlockOf<T extends BlockType>(block: Block, type: T): block is BlockOf<T> {
  return block.type === type
}
