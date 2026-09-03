import type { TprState } from '../types'
import { shuffleWithSeed } from '../rng'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/**
 * "Touch your nose!", "Hop like a rabbit!" — the learner answers with their body, off
 * screen, so nothing here records right or wrong. The action names the instruction being
 * left behind rather than the one being moved to, which makes a duplicate or stale tap
 * a no-op instead of a skipped instruction.
 */
export const tprLogic: BlockLogic<'tpr'> = {
  scored: true,
  init(lesson, block, seed) {
    return {
      order: shuffleWithSeed(
        resolveItems(lesson, block.items).map((i) => i.id),
        seed,
      ),
      index: 0,
      started: false,
    }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    if (state.order.length === 0) return state

    if (!state.started) {
      if (action.target !== state.order[0]) return state
      return { ...state, started: true, index: 0 }
    }
    if (state.index >= state.order.length) return state
    if (action.target !== state.order[state.index]) return state
    return { ...state, index: state.index + 1 }
  },

  isComplete(_lesson, _block, state: TprState) {
    return state.started && state.index >= state.order.length
  },
}

/** The instruction on screen, or null before starting and after the last one. */
export function tprCurrent(state: TprState): string | null {
  if (!state.started) return null
  return state.order[state.index] ?? null
}
