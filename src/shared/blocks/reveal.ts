import type { BlockOf, Item, RevealState } from '../types'
import { shuffleWithSeed } from '../rng'
import { itemById, renderTemplate } from '../text'
import { resolveItems } from '../validate'
import type { BlockLogic } from './contract'

/**
 * One picture at a time, blurred; *peek* makes it clearer and *reveal* shows it with its
 * line. Nothing here is wrong — the guess is said aloud and the teacher judges it (design D151).
 */
export const revealLogic: BlockLogic<'reveal'> = {
  scored: true,

  init(lesson, block, seed): RevealState {
    return { order: shuffleWithSeed(resolveItems(lesson, block.items).map((i) => i.id), seed), index: 0, stage: 0 }
  },

  reduce(_lesson, _block, state, action) {
    if (action.t !== 'tap') return state
    const shown = state.order[state.index]
    if (shown === undefined) return state
    if (action.target === 'peek') return state.stage === 0 ? { ...state, stage: 1 } : state
    if (action.target === 'reveal') return state.stage < 2 ? { ...state, stage: 2 } : state
    // Moving on names the item being left behind, as everywhere else (design D146).
    if (action.target !== shown || state.stage !== 2 || state.index >= state.order.length - 1) return state
    return { ...state, index: state.index + 1, stage: 0 }
  },

  /** Which item each picture is (spec: the key for a blurred picture). */
  answerKey(lesson, block, state) {
    return {
      title: 'Hidden pictures',
      rows: state.order.flatMap((id, at) => {
        const item = itemById(lesson, id)
        if (item === undefined) return []
        const done = at < state.index || (at === state.index && state.stage === 2)
        return [{
          id,
          label: `Picture ${at + 1}`,
          value: revealLine(block, item),
          mark: done ? ('done' as const) : at === state.index ? ('current' as const) : ('open' as const),
        }]
      }),
    }
  },

  isComplete(_lesson, _block, state) {
    return state.order.length > 0 && state.index === state.order.length - 1 && state.stage === 2
  },
}

export function revealLine(block: BlockOf<'reveal'>, item: Item): string {
  return renderTemplate(block.speak, item)
}
